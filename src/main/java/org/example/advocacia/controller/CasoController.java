package org.example.advocacia.controller;

import org.example.advocacia.model.Caso;
import org.example.advocacia.model.Usuario;
import org.example.advocacia.servico.CasoServico;
import org.example.advocacia.servico.UsuarioServico;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// PRECISA DA TELA DE CASOS PARA SER TESTADO!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
@Controller
@RequestMapping("/casos")
public class CasoController {

    @Autowired
    private CasoServico casoServico;

    @Autowired
    private UsuarioServico usuarioServico;

    // CT009: Lista apenas os casos pertencentes ao usuário logado
    @GetMapping
    public String listarCasos(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        List<Caso> casosDoUsuario = casoServico.listarCasosDoUsuario(usuarioLogado);

        model.addAttribute("casos", casosDoUsuario);
        return "index";
    }

    // CT009: Associa o novo caso diretamente ao ID do usuário autenticado
    @PostMapping("/cadastrar")
    public String cadastrarCaso(@ModelAttribute Caso caso, @AuthenticationPrincipal UserDetails userDetails) {
        Usuario usuarioLogado = usuarioServico.buscarPorEmail(userDetails.getUsername());
        casoServico.salvarCaso(caso, usuarioLogado);

        return "redirect:/casos?sucesso=true";
    }
}
