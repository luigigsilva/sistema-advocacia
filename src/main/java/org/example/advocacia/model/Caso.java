package org.example.advocacia.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

// A classe (Caso.java) vai criar a tabela no banco de dados.
@Entity
@Table(name = "tb_casos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Caso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "O tipo de perícia é obrigatório")
    private String tipo;

    @NotBlank(message = "O número do processo é obrigatório")
    @Column(name = "numero_processo", nullable = false)
    private String numeroProcesso;

    private String descricao;

    @NotNull(message = "A data de abertura é obrigatória")
    @Column(name = "data_abertura")
    private LocalDate dataAbertura;

    @Column(nullable = false)
    private String status = "ativo"; // 'ativo' ou 'encerrado'

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
