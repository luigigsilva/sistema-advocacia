package org.example.advocacia.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

// Vai criar a tabela do histórico dos casos
@Entity
@Table(name = "tb_casos_historico")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CasoHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long casoId;
    private String tipo;
    private String numeroProcesso;
    private String descricao;
    private LocalDate dataAbertura;
    private String status;

    @ManyToOne
    @JoinColumn(name = "usuario_alteracao_id")
    private Usuario usuarioAlteracao;

    private LocalDateTime dataHistorico = LocalDateTime.now();

    // Construtor utilitário para converter Caso em CasoHistorico
    public CasoHistorico(Caso casoOriginal, Usuario usuarioQueAlterou) {
        this.casoId = casoOriginal.getId();
        this.tipo = casoOriginal.getTipo();
        this.numeroProcesso = casoOriginal.getNumeroProcesso();
        this.descricao = casoOriginal.getDescricao();
        this.dataAbertura = casoOriginal.getDataAbertura();
        this.status = casoOriginal.getStatus();
        this.usuarioAlteracao = usuarioQueAlterou;
    }
}
