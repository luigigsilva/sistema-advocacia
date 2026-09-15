package org.example.advocacia.repositorio;

import org.example.advocacia.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// Responsável por executar buscas e gravações no PostgreSQL.
public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {
    boolean existsByEmail(String email);
    Optional<Usuario> findByEmail(String email);
}
