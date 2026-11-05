package org.example.advocacia.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

// Cria a tabela no banco de dados

@Entity
@Table(name = "tb_tokens_recuperacao")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TokenRecuperacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "data_expiracao", nullable = false)
    private LocalDateTime dataExpiracao;

    @Column(nullable = false)
    private boolean usado = false;

    public boolean isExpirado() {
        return LocalDateTime.now().isAfter(dataExpiracao);
    }
}