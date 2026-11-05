package org.example.advocacia.controller;

import org.example.advocacia.servico.AuthRecuperacaoServico;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class RecuperacaoSenhaController {

    @Autowired
    private AuthRecuperacaoServico recuperacaoServico;

    // RF022 / RN042: Solicitar e-mail de redefinição
    @PostMapping("/recuperar-senha")
    public ResponseEntity<?> solicitarRecuperacao(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        if (email != null && !email.isBlank()) {
            recuperacaoServico.solicitarRecuperacao(email.trim().toLowerCase());
        }

        // RN042: Retorna HTTP 200 OK genérico independentemente de existir ou não
        return ResponseEntity.ok(Map.of(
                "mensagem", "Se o e-mail informado estiver cadastrado, você receberá o link de redefinição em breve."
        ));
    }

    // RF022 / RN041 / RN043: Processar a nova senha
    @PostMapping("/redefinir-senha")
    public ResponseEntity<?> redefinirSenha(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        String novaSenha = payload.get("novaSenha");

        try {
            recuperacaoServico.redefinirSenha(token, novaSenha);
            return ResponseEntity.ok(Map.of("mensagem", "Senha redefinida com sucesso!"));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
    }
}