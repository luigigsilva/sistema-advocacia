package org.example.advocacia.servico;

import org.example.advocacia.model.TokenRecuperacao;
import org.example.advocacia.model.Usuario;
import org.example.advocacia.repositorio.TokenRecuperacaoRepositorio;
import org.example.advocacia.repositorio.UsuarioRepositorio;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthRecuperacaoServico {

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Autowired
    private UsuarioRepositorio usuarioRepository;

    @Autowired
    private TokenRecuperacaoRepositorio tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailServico emailServico;

    // RF022 / RN040 / RN042: Solicitação de link de redefinição
    @Transactional
    public void solicitarRecuperacao(String email) {
        // 1. Verifica se existe no banco de dados da aplicação
        Optional<Usuario> optUsuario = usuarioRepository.findByEmail(email);

        // Se NÃO existir no banco, o código pula o bloco abaixo e não faz nada (RN042)
        if (optUsuario.isPresent()) {
            Usuario usuario = optUsuario.get();

            String tokenUUID = UUID.randomUUID().toString();
            TokenRecuperacao tokenObj = new TokenRecuperacao();
            tokenObj.setToken(tokenUUID);
            tokenObj.setUsuario(usuario);
            tokenObj.setDataExpiracao(LocalDateTime.now().plusMinutes(30)); // RN040: 30 minutos
            tokenObj.setUsado(false);

            tokenRepository.save(tokenObj);

            String linkRecuperacao = baseUrl + "/redefinir-senha.html?token=" + tokenUUID;

            // 2. Proteção contra falhas no envio do e-mail (e-mail inexistente no Gmail real ou SMTP fora do ar)
            try {
                emailServico.enviarEmailRecuperacao(usuario.getEmail(), linkRecuperacao);
            } catch (Exception e) {
                System.err.println("Falha ao enviar e-mail de recuperação para " + usuario.getEmail() + ": " + e.getMessage());
            }
        }
    }

    // RF022 / RN041 / RN043: Executa a redefinição com nova senha
    @Transactional
    public void redefinirSenha(String token, String novaSenha) {
        if (novaSenha == null || novaSenha.trim().length() < 6) {
            throw new IllegalArgumentException("A nova senha deve ter no mínimo 6 caracteres.");
        }

        TokenRecuperacao tokenObj = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Link de redefinição inválido ou não encontrado."));

        if (tokenObj.isUsado() || tokenObj.isExpirado()) {
            throw new IllegalStateException("Este link de redefinição expirou ou já foi utilizado.");
        }

        Usuario usuario = tokenObj.getUsuario();
        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuarioRepository.save(usuario);

        tokenObj.setUsado(true);
        tokenRepository.save(tokenObj);
    }
}