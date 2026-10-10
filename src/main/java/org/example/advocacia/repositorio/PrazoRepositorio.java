package org.example.advocacia.repositorio;

import org.example.advocacia.model.Caso;
import org.example.advocacia.model.Prazo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// O PrazoRepositorio realiza operações no banco de dados relacionadas aos prazos,
// permitindo consultar prazos vinculados a um caso específico.
public interface PrazoRepositorio extends JpaRepository<Prazo, Long> {
    List<Prazo> findByCaso(Caso caso);
    List<Prazo> findByCasoId(Long casoId);
}