package org.example.advocacia.servico;

import org.example.advocacia.model.Caso;
import org.example.advocacia.model.Prazo;
import org.example.advocacia.model.PrazoHistorico;
import org.example.advocacia.model.Usuario;
import org.example.advocacia.model.enums.StatusPrazo;
import org.example.advocacia.model.enums.TipoContagem;
import org.example.advocacia.repositorio.CasoRepositorio;
import org.example.advocacia.repositorio.PrazoHistoricoRepositorio;
import org.example.advocacia.repositorio.PrazoRepositorio;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

// O PrazoServico aplica as regras e validações do módulo de prazos.
// Controla cadastros, edições, histórico de vencimentos, alteração de status e cálculo de dias úteis/corridos.
@Service
public class PrazoServico {

    @Autowired
    private PrazoRepositorio prazoRepository;

    @Autowired
    private PrazoHistoricoRepositorio prazoHistoricoRepository;

    @Autowired
    private CasoRepositorio casoRepository;

    @Autowired
    private CasoServico casoServico;

    // RF009 & RN009, RN010, RN011, RN014: Cadastrar Prazo
    @Transactional
    public Prazo cadastrarPrazo(Long casoId, Prazo novoPrazo, Usuario usuarioLogado) {
        // RN009: Vínculo obrigatório com um caso existente
        Caso caso = casoRepository.findById(casoId)
                .orElseThrow(() -> new IllegalArgumentException("Caso não encontrado."));

        // Garante a trava de segurança/permissão do caso
        casoServico.validarNovoPrazo(caso);

        // Se o usuário informou quantidade de dias e tipo de contagem, calcula o vencimento (RN014)
        if (novoPrazo.getDias() != null && novoPrazo.getDias() > 0) {
            LocalDate vencimentoCalculado = calcularVencimento(LocalDate.now(), novoPrazo.getDias(), novoPrazo.getTipoContagem());
            novoPrazo.setDataVencimento(vencimentoCalculado);
        }

        // RN011: A data de vencimento não pode ser anterior à data de cadastro
        if (novoPrazo.getDataVencimento() == null || novoPrazo.getDataVencimento().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("RN011: A data de vencimento não pode ser anterior à data atual de cadastro.");
        }

        novoPrazo.setCaso(caso);
        novoPrazo.setDataCadastro(LocalDate.now());
        novoPrazo.setStatus(StatusPrazo.PENDENTE);

        return prazoRepository.save(novoPrazo);
    }

    // Listar Prazos de um Caso
    public List<Prazo> listarPrazosDoCaso(Long casoId) {
        return prazoRepository.findByCasoId(casoId);
    }

    // RF010 / RN012, RN013: Editar ou prorrogar prazo
    @Transactional
    public Prazo atualizarPrazo(Long prazoId, Prazo dadosAtualizados, Usuario usuarioLogado, Authentication authentication) {
        Prazo prazoExistente = prazoRepository.findById(prazoId)
                .orElseThrow(() -> new IllegalArgumentException("Prazo não encontrado."));

        // RN013: Prazo cumprido não pode ser editado
        if (StatusPrazo.CUMPRIDO.equals(prazoExistente.getStatus())) {
            throw new IllegalStateException("RN013: Um prazo marcado como cumprido não pode ser editado, apenas consultado.");
        }

        // Recalcula a nova data se tiver alterado a quantidade de dias/tipo de contagem
        if (dadosAtualizados.getDias() != null && dadosAtualizados.getTipoContagem() != null) {
            LocalDate novoVencimento = calcularVencimento(prazoExistente.getDataCadastro(), dadosAtualizados.getDias(), dadosAtualizados.getTipoContagem());
            dadosAtualizados.setDataVencimento(novoVencimento);
        }

        // RN011: Validação de data retroativa
        if (dadosAtualizados.getDataVencimento().isBefore(prazoExistente.getDataCadastro())) {
            throw new IllegalArgumentException("RN011: A nova data de vencimento não pode ser anterior à data de cadastro do prazo.");
        }

        // RN012: Se houve alteração na data de vencimento, gera registro no histórico
        if (!prazoExistente.getDataVencimento().equals(dadosAtualizados.getDataVencimento())) {
            PrazoHistorico historico = new PrazoHistorico(
                    prazoExistente.getDataVencimento(),
                    dadosAtualizados.getDataVencimento(),
                    prazoExistente
            );
            prazoHistoricoRepository.save(historico);
        }

        prazoExistente.setDescricao(dadosAtualizados.getDescricao());
        prazoExistente.setDias(dadosAtualizados.getDias());
        prazoExistente.setTipoContagem(dadosAtualizados.getTipoContagem());
        prazoExistente.setDataVencimento(dadosAtualizados.getDataVencimento());

        return prazoRepository.save(prazoExistente);
    }

    // RF011: Marcar prazo como cumprido
    @Transactional
    public Prazo marcarComoCumprido(Long prazoId) {
        Prazo prazo = prazoRepository.findById(prazoId)
                .orElseThrow(() -> new IllegalArgumentException("Prazo não encontrado."));

        prazo.setStatus(StatusPrazo.CUMPRIDO);
        return prazoRepository.save(prazo);
    }

    // RF018 & RN014: Cálculo de data de vencimento (Dias Corridos vs Dias Úteis)
    public LocalDate calcularVencimento(LocalDate dataInicio, int dias, TipoContagem tipoContagem) {
        if (tipoContagem == TipoContagem.DIAS_CORRIDOS) {
            return dataInicio.plusDays(dias);
        }

        LocalDate dataResultado = dataInicio;
        int diasAdicionados = 0;

        while (diasAdicionados < dias) {
            dataResultado = dataResultado.plusDays(1);
            if (dataResultado.getDayOfWeek() != DayOfWeek.SATURDAY && dataResultado.getDayOfWeek() != DayOfWeek.SUNDAY) {
                diasAdicionados++;
            }
        }
        return dataResultado;
    }
}