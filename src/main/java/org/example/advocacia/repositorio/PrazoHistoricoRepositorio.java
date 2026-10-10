package org.example.advocacia.repositorio;

import org.example.advocacia.model.PrazoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;

// O PrazoHistoricoRepositorio gerencia o armazenamento do histórico de alterações das datas de vencimento dos prazos.
public interface PrazoHistoricoRepositorio extends JpaRepository<PrazoHistorico, Long> {
}