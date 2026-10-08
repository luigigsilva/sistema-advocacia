package org.example.advocacia.servico;

import org.example.advocacia.model.Caso;
import org.example.advocacia.model.CasoHistorico;
import org.example.advocacia.model.Usuario;
import org.example.advocacia.repositorio.CasoHistoricoRepositorio;
import org.example.advocacia.repositorio.CasoRepositorio;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

//O CasoServico aplica as regras e validações dos casos jurídicos, controlando cadastros, edições e históricos.
//Ele verifica processos duplicados, define a data de abertura, controla permissões de edição,
//registra alterações no histórico e impede modificações em casos encerrados.
@Service
public class CasoServico {

    @Autowired
    private CasoRepositorio casoRepository;

    @Autowired
    private CasoHistoricoRepositorio historicoRepository;

    // RN006 / RN025: Lista apenas os casos do usuário que NÃO estão excluídos
    public List<Caso> listarCasosDoUsuario(Usuario usuarioLogado) {
        return casoRepository.findByUsuarioAndStatusNot(usuarioLogado, "excluido");
    }

    @Transactional
    public Caso salvarCaso(Caso novoCaso, Usuario usuarioLogado, Authentication authentication) {

        // --- NOVO CASO ---
        if (novoCaso.getId() == null) {
            // Valida duplicidade de processo ativo para o mesmo usuário
            boolean jaExiste = casoRepository.existsByNumeroProcessoAndUsuarioAndStatus(
                    novoCaso.getNumeroProcesso(), usuarioLogado, "ativo");
            if (jaExiste) {
                throw new IllegalArgumentException("Este número de processo já está cadastrado em um caso ativo.");
            }

            novoCaso.setUsuario(usuarioLogado);

            // RN023: Preenchimento automático no cadastro
            if (novoCaso.getDataAbertura() == null) {
                novoCaso.setDataAbertura(LocalDate.now());
            }
            novoCaso.setStatus("ativo");
            return casoRepository.save(novoCaso);
        }

        // --- EDIÇÃO DE CASO EXISTENTE ---
        Caso casoExistente = casoRepository.findById(novoCaso.getId())
                .orElseThrow(() -> new RuntimeException("Caso não encontrado"));

        validarPermissao(casoExistente, usuarioLogado, authentication);

        // RN028: Preserva os dados ORIGINAIS salvando uma cópia no histórico
        CasoHistorico historico = new CasoHistorico(casoExistente, usuarioLogado);
        historicoRepository.save(historico);

        // RN027: Impede alteração de tipo e número se estiver encerrado
        if ("encerrado".equalsIgnoreCase(casoExistente.getStatus())) {
            novoCaso.setTipo(casoExistente.getTipo());
            novoCaso.setNumeroProcesso(casoExistente.getNumeroProcesso());
        }

        // RN023: Valida se alterou data sem permissão
        boolean tentouAlterarData = !casoExistente.getDataAbertura().equals(novoCaso.getDataAbertura());
        boolean ehAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_ADMIN"));

        if (tentouAlterarData && !ehAdmin) {
            novoCaso.setDataAbertura(casoExistente.getDataAbertura());
        }

        novoCaso.setStatus(casoExistente.getStatus());
        novoCaso.setUsuario(usuarioLogado);

        return casoRepository.save(novoCaso);
    }

    // RF006 / RN007: Encerrar o caso mantendo histórico
    @Transactional
    public void encerrarCaso(Long id, Usuario usuarioLogado, Authentication authentication) {
        Caso caso = casoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Caso não encontrado"));

        validarPermissao(caso, usuarioLogado, authentication);

        CasoHistorico historico = new CasoHistorico(caso, usuarioLogado);
        historicoRepository.save(historico);

        caso.setStatus("encerrado");
        casoRepository.save(caso);
    }

    // RF007 / RN006: Exclusão Lógica (Soft Delete)
    @Transactional
    public void excluirCaso(Long id, Usuario usuarioLogado, Authentication authentication) {
        Caso caso = casoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Caso não encontrado"));

        validarPermissao(caso, usuarioLogado, authentication);

        CasoHistorico historico = new CasoHistorico(caso, usuarioLogado);
        historicoRepository.save(historico);

        caso.setStatus("excluido");
        casoRepository.save(caso);
    }

    // RN005: Trava para validar adição de prazos
    public void validarNovoPrazo(Caso caso) {
        if ("encerrado".equalsIgnoreCase(caso.getStatus()) || "excluido".equalsIgnoreCase(caso.getStatus())) {
            throw new IllegalStateException("RN005: Não é possível cadastrar prazos em casos encerrados ou excluídos.");
        }
    }

    // RN007: Validação de permissão centralizada
    private void validarPermissao(Caso caso, Usuario usuarioLogado, Authentication authentication) {
        boolean ehDono = caso.getUsuario().getId().equals(usuarioLogado.getId());
        boolean ehAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!ehDono && !ehAdmin) {
            throw new SecurityException("Acesso negado: Você não tem permissão para esta operação.");
        }
    }
}
