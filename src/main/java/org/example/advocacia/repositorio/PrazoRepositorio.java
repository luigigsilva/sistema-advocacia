package org.example.advocacia.repositorio;

import org.example.advocacia.model.Caso;
import org.example.advocacia.model.Prazo;
import org.example.advocacia.model.Usuario;
import org.example.advocacia.model.enums.StatusPrazo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// O PrazoRepositorio realiza operações no banco de dados relacionadas aos prazos,
// permitindo consultar prazos vinculados a um caso específico.
public interface PrazoRepositorio extends JpaRepository<Prazo, Long> {
    List<Prazo> findByCaso(Caso caso);
    List<Prazo> findByCasoId(Long casoId);

    // RN015: Carrega os prazos pendentes trazendo Caso e Usuário juntos
    @Query("SELECT p FROM Prazo p JOIN FETCH p.caso c JOIN FETCH c.usuario WHERE c.usuario = :usuario AND p.status = org.example.advocacia.model.enums.StatusPrazo.PENDENTE")
    List<Prazo> findPrazosPendentesDoUsuario(@Param("usuario") Usuario usuario);

    // RN018: Busca prazos com JOIN FETCH evitando LazyInitializationException
    @Query("SELECT p FROM Prazo p JOIN FETCH p.caso c JOIN FETCH c.usuario u WHERE p.status = :status")
    List<Prazo> findByStatusComCasoEUsuario(@Param("status") StatusPrazo status);
}