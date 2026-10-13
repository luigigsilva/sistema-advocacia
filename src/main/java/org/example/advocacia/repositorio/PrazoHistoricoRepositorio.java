package org.example.advocacia.repositorio;

import org.example.advocacia.model.PrazoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

// O PrazoHistoricoRepositorio gerencia o armazenamento do histórico de alterações das datas de vencimento dos prazos.
public interface PrazoHistoricoRepositorio extends JpaRepository<PrazoHistorico, Long> {

    // RF017 / RN020: Busca o histórico ordenado garantindo que o prazo pertença ao usuário logado
    @Query("SELECT h FROM PrazoHistorico h WHERE h.prazo.id = :prazoId AND h.prazo.caso.usuario.id = :usuarioId ORDER BY h.dataAlteracao DESC")
    List<PrazoHistorico> findByPrazoIdEUsuario(@Param("prazoId") Long prazoId, @Param("usuarioId") Long usuarioId);
}