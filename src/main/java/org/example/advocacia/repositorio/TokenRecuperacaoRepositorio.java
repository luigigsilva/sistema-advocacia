package org.example.advocacia.repositorio;

import org.example.advocacia.model.TokenRecuperacao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface TokenRecuperacaoRepositorio extends JpaRepository<TokenRecuperacao, Long> {
    Optional<TokenRecuperacao> findByToken(String token);
}