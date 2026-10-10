package org.example.advocacia.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

// A classe (PrazoHistorico.java) cria a tabela para registrar o histórico de alterações de datas de vencimento.
@Entity
@Table(name = "tb_prazos_historico")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PrazoHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "data_anterior")
    private LocalDate dataAnterior;

    @Column(name = "nova_data", nullable = false)
    private LocalDate novaData;

    @Column(name = "data_alteracao", nullable = false)
    private LocalDateTime dataAlteracao = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prazo_id", nullable = false)
    private Prazo prazo;

    public PrazoHistorico(LocalDate dataAnterior, LocalDate novaData, Prazo prazo) {
        this.dataAnterior = dataAnterior;
        this.novaData = novaData;
        this.prazo = prazo;
        this.dataAlteracao = LocalDateTime.now();
    }
}