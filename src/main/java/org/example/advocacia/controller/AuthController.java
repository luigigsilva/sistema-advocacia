package org.example.advocacia.controller;

import org.example.advocacia.model.Usuario;
import org.example.advocacia.servico.UsuarioServico;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

// CONTROLADORA WEB: Conecta as requisições dos formulários ao serviço do Java.
@Controller
public class AuthController {

    @Autowired
    private UsuarioServico usuarioService;

    @PostMapping("/cadastrar")
        try {
            usuarioService.cadastrarUsuario(usuario);
            return "redirect:/login.html?sucesso=true";
        } catch (IllegalArgumentException e) {
            return "redirect:/cadastro.html?erro=email_duplicado";
        }
    }
}
