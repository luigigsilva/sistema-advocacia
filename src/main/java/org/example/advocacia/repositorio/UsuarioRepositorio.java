package org.example.advocacia.repositorio;

import org.example.advocacia.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// O UsuarioRepositorio realiza operações no banco de dados relacionadas aos usuários,
// permitindo buscar usuários pelo e-mail e verificar se um e-mail já está cadastrado.
public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {
    boolean existsByEmail(String email);
    Optional<Usuario> findByEmail(String email);
}
