package org.example.advocacia.repositorio;

import org.example.advocacia.model.Caso;
import org.example.advocacia.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CasoRepositorio extends JpaRepository<Caso, Long> {

    // Regra RN5: Retorna exclusivamente os casos do usuário informado
    List<Caso> findByUsuario(Usuario usuario);

    // Regra RN5: Garante que a busca por ID individual pertença ao usuário logado
    Optional<Caso> findByIdAndUsuario(Long id, Usuario usuario);
}