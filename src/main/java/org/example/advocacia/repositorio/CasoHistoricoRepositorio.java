package org.example.advocacia.repositorio;

import org.example.advocacia.model.CasoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;

//O CasoHistoricoRepositorio gerencia o histórico dos casos no banco de dados,
//salvando alterações e permitindo consultar versões anteriores.
public interface CasoHistoricoRepositorio extends JpaRepository<CasoHistorico, Long> {
}
