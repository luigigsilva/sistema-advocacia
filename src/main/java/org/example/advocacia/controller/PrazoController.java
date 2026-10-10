package org.example.advocacia.controller;

import jakarta.validation.Valid;
import org.example.advocacia.model.Prazo;
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
}