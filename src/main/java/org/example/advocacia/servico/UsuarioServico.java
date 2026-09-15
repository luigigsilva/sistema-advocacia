package org.example.advocacia.servico;

import org.example.advocacia.model.Usuario;
import org.example.advocacia.repositorio.UsuarioRepositorio;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

// Aplica as regras de negócio RN001 e RF001 (validação de e-mail duplicado e criptografia de senha).
@Service
public class UsuarioServico {

    @Autowired
    private UsuarioRepositorio usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public Usuario cadastrarUsuario(Usuario usuario) {
        if (usuarioRepository.existsByEmail(usuario.getEmail())) {
            throw new IllegalArgumentException("Este e-mail já está cadastrado.");
        }


        usuario.setSenha(passwordEncoder.encode(usuario.getSenha()));
        return usuarioRepository.save(usuario);
    }
}
