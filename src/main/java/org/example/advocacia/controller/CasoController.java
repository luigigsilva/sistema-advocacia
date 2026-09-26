package org.example.advocacia.controller;

import org.example.advocacia.model.Caso;
import org.example.advocacia.model.Usuario;
import org.example.advocacia.servico.CasoServico;
import org.example.advocacia.servico.UsuarioServico;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/casos")
public class CasoController {

    @Autowired
    private CasoServico casoServico;

    @Autowired
    private UsuarioServico usuarioServico;

    @GetMapping
    public ResponseEntity<List<Caso>> listarCasos(@AuthenticationPrincipal UserDetails userDetails) {
        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        List<Caso> casosDoUsuario = casoServico.listarCasosDoUsuario(usuarioLogado);
        return ResponseEntity.ok(casosDoUsuario);
    }

    @PostMapping
    public ResponseEntity<?> cadastrarOuAtualizarCaso(
            @RequestBody Caso caso,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body("Usuário não autenticado.");
        }

        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        Caso casoSalvo = casoServico.salvarCaso(caso, usuarioLogado, authentication);
        return ResponseEntity.ok(casoSalvo);
    }

    // RF006: Encerrar Caso
    @PutMapping("/{id}/encerrar")
    public ResponseEntity<?> encerrarCaso(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {

        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        casoServico.encerrarCaso(id, usuarioLogado, authentication);
        return ResponseEntity.ok().build();
    }

    // RF007: Exclusão Lógica
    @DeleteMapping("/{id}")
    public ResponseEntity<?> excluirCaso(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {

        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        casoServico.excluirCaso(id, usuarioLogado, authentication);
        return ResponseEntity.ok().build();
    }
}
