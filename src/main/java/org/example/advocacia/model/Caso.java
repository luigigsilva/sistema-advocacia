package org.example.advocacia.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

// Regra RN4: Associa o caso diretamente ao usuário criador
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

    @NotBlank(message = "O número do processo é obrigatório")
    private String numeroProcesso;

    @NotBlank(message = "O título do caso é obrigatório")
    private String titulo;

    private String descricao;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
