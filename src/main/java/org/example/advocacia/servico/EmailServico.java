package org.example.advocacia.servico;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailServico {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void enviarEmailRecuperacao(String emailDestino, String linkRecuperacao) {
        if (mailSender == null) {
            System.out.println("(TESTE) Link de redefinição para " + emailDestino + ": " + linkRecuperacao);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("nao-responda@jurisync.com");
        message.setTo(emailDestino);
        message.setSubject("JURISYNC - Redefinição de Senha");
        message.setText("Olá,\n\nVocê solicitou a redefinição de sua senha no JURISYNC.\n" +
                "Clique no link abaixo para criar uma nova senha (válido por 30 minutos):\n\n" +
                linkRecuperacao + "\n\n" +
                "Se você não solicitou esta alteração, ignore este e-mail.");

        mailSender.send(message);
    }
}
