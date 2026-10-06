// ==========================================
// VARIÁVEIS GLOBAIS E INICIALIZAÇÃO
// ==========================================
let casos = [];
let modoEdicao = false;
let processoSendoEditado = "";
let statusSendoEditado = "ativo";

// ==========================================
// MÓDULO DE CASOS (Listagem e CRUD)
// ==========================================
async function carregarCasosDoServidor() {
    try {
        const resposta = await fetch('/api/casos');
        if (resposta.ok) {
            casos = await resposta.json();
            renderTabela();
        } else if (resposta.status === 401) {
            window.location.href = '/login.html';
        }
    } catch (erro) {
        console.error('Erro ao conectar ao servidor:', erro);
    }
}

function renderTabela() {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '';

    if (!casos || casos.length === 0) {
        tbody.innerHTML = `
            <tr id="mensagem-vazio">
                <td colspan="4" style="text-align: center; padding: 40px; color: #666; font-style: italic;">
                    Você não tem nenhum protocolo cadastrado.
                </td>
            </tr>
        `;
        return;
    }

    casos.forEach(caso => {
        const tr = document.createElement('tr');
        const numProcesso = caso.numeroProcesso || caso.processo;
        let badgeClass = caso.status === 'ativo' ? 'badge-ativo' : 'badge-encerrado';
        let textoStatus = caso.status === 'ativo' ? 'Ativo' : 'Encerrado';

        // Botões de ação (Novo botão de Prazos incluído)
        let acoesHTML = `
            <a href="#" class="link-acao" style="color: #17a2b8;" onclick="abrirModalPrazos('${numProcesso}')">Prazos</a>
            <a href="#" class="link-acao" onclick="editarCaso('${numProcesso}')">Editar</a>
            <a href="#" class="link-acao" onclick="consultarCaso('${numProcesso}')">Consultar</a>
        `;

        if (caso.status === 'ativo') {
            acoesHTML += `<a href="#" class="link-acao" style="color: #dc3545;" onclick="encerrarCaso('${numProcesso}')">Encerrar</a>`;
        }

        acoesHTML += `<a href="#" class="link-acao" style="color: #6c757d;" onclick="excluirCaso('${numProcesso}')">Excluir</a>`;

        tr.innerHTML = `
            <td>${numProcesso}</td>
            <td>${caso.tipo}</td>
            <td><span class="badge ${badgeClass}">${textoStatus}</span></td>
            <td class="acoes-container">${acoesHTML}</td>
        `;
        tbody.prepend(tr);
    });
}

// Máscara CNJ automática
document.getElementById('processo').addEventListener('input', function(e) {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,7})(\d{0,2})(\d{0,4})(\d{0,1})(\d{0,2})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2] + (x[3] ? '.' + x[3] :