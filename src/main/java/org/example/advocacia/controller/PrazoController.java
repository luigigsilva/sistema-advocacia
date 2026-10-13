package org.example.advocacia.controller;

import jakarta.validation.Valid;
import org.example.advocacia.model.Prazo;
import org.example.advocacia.model.PrazoHistorico;
import org.example.advocacia.model.Usuario;
import org.example.advocacia.servico.PrazoServico;
import org.example.advocacia.servico.UsuarioServico;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// O PrazoController gerencia as rotas HTTP para cadastro, listagem, edição e baixa de prazos dos casos jurídicos.
@RestController
@RequestMapping("/api")
public class PrazoController {

    @Autowired
    private PrazoServico prazoServico;

    @Autowired
    private UsuarioServico usuarioServico;

    // RF009: Cadastrar prazo vinculado a um caso
    @PostMapping("/casos/{casoId}/prazos")
    public ResponseEntity<?> cadastrarPrazo(
            @PathVariable Long casoId,
            @Valid @RequestBody Prazo prazo,
            @AuthenticationPrincipal UserDetails userDetails) {

        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        Prazo prazoCriado = prazoServico.cadastrarPrazo(casoId, prazo, usuarioLogado);
        return ResponseEntity.status(HttpStatus.CREATED).body(prazoCriado);
    }

    // Listar todos os prazos de um caso
    @GetMapping("/casos/{casoId}/prazos")
    public ResponseEntity<List<Prazo>> listarPrazosPorCaso(@PathVariable Long casoId) {
        List<Prazo> prazos = prazoServico.listarPrazosDoCaso(casoId);
        return ResponseEntity.ok(prazos);
    }

    // RF010: Editar ou prorrogar prazo
    @PutMapping("/prazos/{id}")
    public ResponseEntity<?> atualizarPrazo(
            @PathVariable Long id,
            @Valid @RequestBody Prazo prazo,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {

        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        Prazo prazoAtualizado = prazoServico.atualizarPrazo(id, prazo, usuarioLogado, authentication);
        return ResponseEntity.ok(prazoAtualizado);
    }

    // RF011: Marcar prazo como cumprido
    @PutMapping("/prazos/{id}/cumprir")
    public ResponseEntity<?> cumprirPrazo(@PathVariable Long id) {
        Prazo prazoCumprido = prazoServico.marcarComoCumprido(id);
        return ResponseEntity.ok(prazoCumprido);
    }

    // RF012 / RF013 / RN015: Endpoint de alertas categorizados do usuário
    @GetMapping("/prazos/alertas")
    public ResponseEntity<?> obterAlertas(@AuthenticationPrincipal UserDetails userDetails) {
        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        Map<String, Object> alertas = prazoServico.buscarAlertasDoUsuario(usuarioLogado);
        return ResponseEntity.ok(alertas);
    }

    // RF015 / RN019: Endpoint do Painel Consolidado de Prazos com suporte a Filtro por Status
    // Ex: GET /api/prazos/painel?status=VENCIDO
    @GetMapping("/prazos/painel")
    public ResponseEntity<?> obterPainelConsolidado(
            @RequestParam(required = false, defaultValue = "TODOS") String status,
            @AuthenticationPrincipal UserDetails userDetails) {

        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        Map<String, Object> painel = prazoServico.obterPainelConsolidado(usuarioLogado, status);
        return ResponseEntity.ok(painel);
    }

    // RF017 / RN020: Consulta do histórico de alterações de um prazo (Somente Leitura)
    @GetMapping("/prazos/{id}/historico")
    public ResponseEntity<List<PrazoHistorico>> obterHistoricoPrazo(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        List<PrazoHistorico> historico = prazoServico.obterHistoricoDoPrazo(id, usuarioLogado);
        return ResponseEntity.ok(historico);
    }

    // ENDPOINT MANUAL DE TESTES (RN018): Força a execução imediata da varredura
    @PostMapping("/prazos/executar-verificacao")
    public ResponseEntity<?> dispararVerificacaoManual() {
        Map<String, Object> resultado = prazoServico.executarVerificacaoPrazos();
        return ResponseEntity.ok(resultado);
    }

    // RF014 / RN016: Salva os dias de antecedência no banco de dados
    @PutMapping("/usuarios/preferencias")
    public ResponseEntity<?> atualizarPreferenciasAntecedencia(
            @RequestBody Map<String, Integer> payload,
            @AuthenticationPrincipal UserDetails userDetails) {

        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        Integer dias = payload.get("diasAntecedencia");
        Usuario atualizado = usuarioServico.atualizarDiasAntecedencia(usuarioLogado, dias);

        return ResponseEntity.ok(Map.of(
                "mensagem", "Preferência salva com sucesso!",
                "diasAntecedencia", atualizado.getDiasAntecedencia()
        ));
    }
}