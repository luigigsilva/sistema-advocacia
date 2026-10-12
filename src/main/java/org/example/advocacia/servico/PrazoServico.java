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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

// O PrazoServico aplica as regras e validações do módulo de prazos.
// Controla cadastros, edições, histórico de vencimentos, alteração de status e cálculo de dias úteis/corridos.

@Service
public class PrazoServico {

    private static final Logger log = LoggerFactory.getLogger(PrazoServico.class);

    @Autowired
    private PrazoRepositorio prazoRepository;

    @Autowired
    private PrazoHistoricoRepositorio prazoHistoricoRepository;

    @Autowired
    private CasoRepositorio casoRepository;

    @Autowired
    private CasoServico casoServico;

    // ==========================================
    // RN018: ROTINA DE VERIFICAÇÃO AUTOMÁTICA/CARD 05
    // ==========================================

    // Executa diariamente à 01:00 AM
    @Scheduled(cron = "0 0 1 * * ?")
    public void verificarPrazosDiario() {
        log.info("Iniciando verificação diária agendada de prazos");
        executarVerificacaoPrazos();
    }

    // Executa no arranque do servidor
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void verificarPrazosNoArranque() {
        log.info("Servidor inicializado. Executando varredura imediata de prazos...");
        executarVerificacaoPrazos();
    }

    // Executa a varredura e contagem dos prazos
    @Transactional
    public Map<String, Object> executarVerificacaoPrazos() {
        // Altera para usar a consulta com JOIN FETCH
        List<Prazo> pendentes = prazoRepository.findByStatusComCasoEUsuario(StatusPrazo.PENDENTE);
        LocalDate hoje = LocalDate.now();

        int totalVerificados = pendentes.size();
        int totalVencidos = 0;
        int totalProximos = 0;

        for (Prazo prazo : pendentes) {
            if (prazo.getDataVencimento() != null) {
                if (prazo.getDataVencimento().isBefore(hoje)) {
                    totalVencidos++;
                } else {
                    int antecedencia = (prazo.getCaso() != null && prazo.getCaso().getUsuario() != null && prazo.getCaso().getUsuario().getDiasAntecedencia() != null)
                            ? prazo.getCaso().getUsuario().getDiasAntecedencia()
                            : 3;

                    long diasRestantes = ChronoUnit.DAYS.between(hoje, prazo.getDataVencimento());
                    if (diasRestantes <= antecedencia) {
                        totalProximos++;
                    }
                }
            }
        }

        log.info("Varredura concluída: {} analisados | {} vencidos | {} próximos.", totalVerificados, totalVencidos, totalProximos);

        Map<String, Object> resultado = new HashMap<>();
        resultado.put("status", "Sucesso");
        resultado.put("totalVerificados", totalVerificados);
        resultado.put("totalVencidos", totalVencidos);
        resultado.put("totalProximos", totalProximos);
        resultado.put("dataVerificacao", hoje.toString());

        return resultado;
    }

    // ==========================================
    // RF012 / RF013 / RN015: CONSULTA DE ALERTAS/CARD 05
    // ==========================================
    public Map<String, Object> buscarAlertasDoUsuario(Usuario usuario) {
        List<Prazo> pendentes = prazoRepository.findPrazosPendentesDoUsuario(usuario);
        LocalDate hoje = LocalDate.now();
        int antecedencia = (usuario.getDiasAntecedencia() != null) ? usuario.getDiasAntecedencia() : 3;

        List<Prazo> vencidos = new ArrayList<>();
        List<Prazo> proximos = new ArrayList<>();
        List<Prazo> emDia = new ArrayList<>();

        for (Prazo prazo : pendentes) {
            if (prazo.getDataVencimento() != null) {
                if (prazo.getDataVencimento().isBefore(hoje)) {
                    vencidos.add(prazo);
                } else {
                    long diasRestantes = ChronoUnit.DAYS.between(hoje, prazo.getDataVencimento());
                    if (diasRestantes <= antecedencia) {
                        proximos.add(prazo);
                    } else {
                        emDia.add(prazo);
                    }
                }
            }
        }

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("vencidos", vencidos);
        resposta.put("proximos", proximos);
        resposta.put("emDia", emDia);
        resposta.put("diasAntecedenciaConfigurado", antecedencia);

        return resposta;
    }

    // ==========================================
    // MÉTODOS CRUD EXISTENTES
    // ==========================================

    @Transactional
    public Prazo cadastrarPrazo(Long casoId, Prazo novoPrazo, Usuario usuarioLogado) {
        Caso caso = casoRepository.findById(casoId)
                .orElseThrow(() -> new IllegalArgumentException("Caso não encontrado."));

        casoServico.validarNovoPrazo(caso);

        if (novoPrazo.getDias() != null && novoPrazo.getDias() > 0) {
            LocalDate vencimentoCalculado = calcularVencimento(LocalDate.now(), novoPrazo.getDias(), novoPrazo.getTipoContagem());
            novoPrazo.setDataVencimento(vencimentoCalculado);
        }

        if (novoPrazo.getDataVencimento() == null || novoPrazo.getDataVencimento().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("A data de vencimento não pode ser anterior à data atual de cadastro.");
        }

        novoPrazo.setCaso(caso);
        novoPrazo.setDataCadastro(LocalDate.now());
        novoPrazo.setStatus(StatusPrazo.PENDENTE);

        return prazoRepository.save(novoPrazo);
    }

    public List<Prazo> listarPrazosDoCaso(Long casoId) {
        return prazoRepository.findByCasoId(casoId);
    }

    @Transactional
    public Prazo atualizarPrazo(Long prazoId, Prazo dadosAtualizados, Usuario usuarioLogado, Authentication authentication) {
        Prazo prazoExistente = prazoRepository.findById(prazoId)
                .orElseThrow(() -> new IllegalArgumentException("Prazo não encontrado."));

        if (StatusPrazo.CUMPRIDO.equals(prazoExistente.getStatus())) {
            throw new IllegalStateException("Um prazo marcado como cumprido não pode ser editado, apenas consultado.");
        }

        if (dadosAtualizados.getDias() != null && dadosAtualizados.getTipoContagem() != null) {
            LocalDate novoVencimento = calcularVencimento(prazoExistente.getDataCadastro(), dadosAtualizados.getDias(), dadosAtualizados.getTipoContagem());
            dadosAtualizados.setDataVencimento(novoVencimento);
        }

        if (dadosAtualizados.getDataVencimento().isBefore(prazoExistente.getDataCadastro())) {
            throw new IllegalArgumentException("A nova data de vencimento não pode ser anterior à data de cadastro do prazo.");
        }

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

    @Transactional
    public Prazo marcarComoCumprido(Long prazoId) {
        Prazo prazo = prazoRepository.findById(prazoId)
                .orElseThrow(() -> new IllegalArgumentException("Prazo não encontrado."));

        prazo.setStatus(StatusPrazo.CUMPRIDO);
        return prazoRepository.save(prazo);
    }

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