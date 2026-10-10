package org.example.advocacia.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.example.advocacia.model.enums.StatusPrazo;
import org.example.advocacia.model.enums.TipoContagem;

import java.time.LocalDate;

// A classe (Prazo.java) cria a tabela de prazos vinculados aos casos no banco de dados.
@Entity
@Table(name = "tb_prazos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Prazo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // RN010: Descrição obrigatória
    @NotBlank(message = "A descrição do prazo é obrigatória")
    @Column(nullable = false)
    private String descricao;

    private Integer dias;

    // RN011: Data de vencimento obrigatória
    @NotNull(message = "A data de vencimento é obrigatória")
    @Column(name = "data_vencimento", nullable = false)
    private LocalDate dataVencimento;

    // RN014: Define se é contagem em dias úteis ou corridos
    @NotNull(message = "A forma de contagem é obrigatória")
    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_contagem", nullable = false)
    private TipoContagem tipoContagem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusPrazo status = StatusPrazo.PENDENTE;

    @Column(name = "data_cadastro", nullable = false)
    private LocalDate dataCadastro = LocalDate.now();

    // RN009: Vínculo obrigatório com o caso pericial
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "caso_id", nullable = false)
    private Caso caso;
}
