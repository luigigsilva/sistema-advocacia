package org.example.advocacia.servico;

import org.example.advocacia.model.Caso;
import org.example.advocacia.model.Usuario;
import org.example.advocacia.repositorio.CasoRepositorio;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class CasoServico {

    @Autowired
    private CasoRepositorio casoRepository;

    public List<Caso> listarCasosDoUsuario(Usuario usuario) {
        return casoRepository.findByUsuario(usuario);
    }

    public Caso salvarCaso(Caso caso, Usuario usuario) {
        caso.setUsuario(usuario); // Associa o caso ao usuário autenticado
        return casoRepository.save(caso);
    }
}
