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

// O CasoController gerencia as rotas HTTP dos casos jurídicos, recebendo requisições para listar,
// criar ou editar casos e encaminhando essas informações ao CasoServico para processamento
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
    public ResponseEntity<?> cadastrarCaso(
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

    // Rota de Edição por ID (Corrige o erro 405 Method Not Allowed)
    @PutMapping("/{id}")
    public ResponseEntity<?> atualizarCaso(
            @PathVariable Long id,
            @RequestBody Caso caso,
            @AuthenticationPrincipal UserDetails userDetails,
            Authentication authentication) {

        if (userDetails == null) {
            return ResponseEntity.status(401).body("Usuário não autenticado.");
        }

        caso.setId(id); // Garante que o ID da URL seja atribuído ao objeto
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