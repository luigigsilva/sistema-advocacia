// ==========================================
// VARIÁVEIS GLOBAIS E INICIALIZAÇÃO
// ==========================================
let casos = [];
let modoEdicao = false;
let processoSendoEditado = "";
let statusSendoEditado = "ativo";

// Inicializa os eventos da aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const inputProcesso = document.getElementById('processo');
    if (inputProcesso) {
        inputProcesso.addEventListener('input', aplicarMascaraCNJ);
    }

    const formCaso = document.getElementById('form-caso');
    if (formCaso) {
        formCaso.addEventListener('submit', salvarCaso);
    }

    const formPrazo = document.getElementById('form-prazo');
    if (formPrazo) {
        formPrazo.addEventListener('submit', salvarPrazo);
    }

    carregarCasosDoServidor();
});

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
    if (!tbody) return;

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
        const badgeClass = caso.status === 'ativo' ? 'badge-ativo' : 'badge-encerrado';
        const textoStatus = caso.status === 'ativo' ? 'Ativo' : 'Encerrado';

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
function aplicarMascaraCNJ(e) {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,7})(\d{0,2})(\d{0,4})(\d{0,1})(\d{0,2})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2] + (x[3] ? '.' + x[3] : '') + (x[4] ? '.' + x[4] : '') + (x[5] ? '.' + x[5] : '') + (x[6] ? '.' + x[6] : '');
}

function setarDataAtual() {
    const inputData = document.getElementById('dataAbertura');
    if (inputData) {
        const hoje = new Date().toISOString().split('T')[0];
        inputData.value = hoje;
    }
}

function limparFormulario() {
    const form = document.getElementById('form-caso');
    if (form) form.reset();

    document.getElementById('casoId').value = '';
    document.getElementById('modal-erro').innerHTML = '';
    document.querySelectorAll('#form-caso input, #form-caso select, #form-caso textarea').forEach(el => el.disabled = false);
    
    const btnSalvar = document.getElementById('btn-salvar');
    if (btnSalvar) {
        btnSalvar.style.display = 'block';
        btnSalvar.innerText = 'Concluir';
    }
}

function abrirModalNovo() {
    modoEdicao = false;
    processoSendoEditado = "";
    statusSendoEditado = "ativo";
    document.getElementById('modal-caso').style.display = 'flex';
    limparFormulario();
    document.getElementById('titulo-modal').innerText = 'Novo Caso';
    setarDataAtual();
}

function fecharModal() {
    document.getElementById('modal-caso').style.display = 'none';
}

function editarCaso(numeroProcesso) {
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo) === numeroProcesso);
    if (!casoEncontrado) return;

    modoEdicao = true;
    processoSendoEditado = numeroProcesso;
    statusSendoEditado = casoEncontrado.status;

    document.getElementById('modal-caso').style.display = 'flex';
    limparFormulario();
    document.getElementById('titulo-modal').innerText = 'Editar Caso';

    document.getElementById('casoId').value = casoEncontrado.id || '';
    document.getElementById('tipo').value = casoEncontrado.tipo;
    document.getElementById('processo').value = casoEncontrado.numeroProcesso || casoEncontrado.processo;
    document.getElementById('descricao').value = casoEncontrado.descricao || '';
    document.getElementById('dataAbertura').value = casoEncontrado.dataAbertura;

    if (casoEncontrado.status !== 'ativo') {
        document.getElementById('processo').disabled = true;
        document.getElementById('tipo').disabled = true;
        document.getElementById('modal-erro').innerHTML = `
            <div class="erro-box" style="background-color: #fff3cd; color: #856404; border-color: #ffeeba;">
                <strong>Aviso:</strong> Este caso está encerrado. Dados principais não podem ser alterados.
            </div>
        `;
    }
}

function consultarCaso(numeroProcesso) {
    editarCaso(numeroProcesso);
    document.getElementById('titulo-modal').innerText = 'Consultar Caso';
    document.querySelectorAll('#form-caso input, #form-caso select, #form-caso textarea').forEach(el => el.disabled = true);
    
    const btnSalvar = document.getElementById('btn-salvar');
    if (btnSalvar) btnSalvar.style.display = 'none';
    
    document.getElementById('modal-erro').innerHTML = '';
}

async function encerrarCaso(numeroProcesso) {
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo) === numeroProcesso);
    if (!casoEncontrado) return;

    if (confirm(`Tem certeza que deseja ENCERRAR o processo ${numeroProcesso}?\nEle ficará disponível apenas para consulta.`)) {
        try {
            if (casoEncontrado.id) {
                const resposta = await fetch(`/api/casos/${casoEncontrado.id}/encerrar`, { method: 'PUT' });
                if (!resposta.ok) {
                    mostrarErro("Erro ao encerrar o caso no servidor.");
                    return;
                }
            }
            carregarCasosDoServidor();
        } catch (erro) {
            console.error("Erro de conexão:", erro);
        }
    }
}

async function salvarCaso(event) {
    event.preventDefault();

    const casoIdVal = document.getElementById('casoId').value;
    const processoVal = document.getElementById('processo').value;
    const tipoVal = document.getElementById('tipo').value;
    const descricaoVal = document.getElementById('descricao').value;
    const dataAberturaVal = document.getElementById('dataAbertura').value;

    const numerosApenas = processoVal.replace(/\D/g, '');
    if (numerosApenas.length !== 20) {
        mostrarErro("O número do protocolo está incorreto (exige 20 dígitos).");
        return;
    }

    if (!modoEdicao || numerosApenas !== processoSendoEditado.replace(/\D/g, '')) {
        let casoDuplicado = casos.find(c => {
            let numProcessoAtual = (c.numeroProcesso || c.processo).replace(/\D/g, '');
            return numProcessoAtual === numerosApenas && c.status === 'ativo';
        });
        if (casoDuplicado) {
            mostrarErro("Este número de processo já está cadastrado em um caso ATIVO.");
            return;
        }
    }

    const payload = {
        id: casoIdVal ? parseInt(casoIdVal) : null,
        tipo: tipoVal,
        numeroProcesso: numerosApenas,
        descricao: descricaoVal,
        dataAbertura: dataAberturaVal,
        status: modoEdicao ? statusSendoEditado : 'ativo'
    };

    try {
        const urlDestino = (modoEdicao && casoIdVal) ? `/api/casos/${casoIdVal}` : '/api/casos';
        const metodoHttp = (modoEdicao && casoIdVal) ? 'PUT' : 'POST';

        const resposta = await fetch(urlDestino, {
            method: metodoHttp,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (resposta.ok) {
            fecharModal();
            carregarCasosDoServidor();
        } else {
            let msgErro = "Erro ao salvar o caso no servidor.";
            try {
                const dadosErro = await resposta.json();
                if (dadosErro.message || dadosErro.erro) msgErro = dadosErro.message || dadosErro.erro;
            } catch (e) {}
            mostrarErro(msgErro);
        }
    } catch (erro) {
        mostrarErro("Erro de comunicação com o servidor.");
    }
}

function mostrarErro(mensagem) {
    document.getElementById('modal-erro').innerHTML = `
        <div class="erro-box" style="background-color: #f8d7da; color: #721c24; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #f5c6cb;">
            ${mensagem}
        </div>
    `;
}

function filtrarTabela() {
    let input = document.getElementById("pesquisaCaso");
    let filter = input.value.toUpperCase();
    let table = document.getElementById("tabelaCasos");
    let tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        if (tr[i].id === "mensagem-vazio") continue;
        let tdProcesso = tr[i].getElementsByTagName("td")[0];
        let tdTipo = tr[i].getElementsByTagName("td")[1];
        if (tdProcesso || tdTipo) {
            let txtValueProcesso = tdProcesso.textContent || tdProcesso.innerText;
            let txtValueTipo = tdTipo.textContent || tdTipo.innerText;
            if (txtValueProcesso.toUpperCase().indexOf(filter) > -1 || txtValueTipo.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}

async function excluirCaso(numeroProcesso) {
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo) === numeroProcesso);
    if (!casoEncontrado) return;

    if (confirm(`Atenção: Deseja realmente EXCLUIR o caso ${numeroProcesso}?\nEle será ocultado da listagem, mas mantido em histórico.`)) {
        try {
            if (casoEncontrado.id) {
                const resposta = await fetch(`/api/casos/${casoEncontrado.id}`, { method: 'DELETE' });
                if (!resposta.ok) {
                    alert("Erro ao excluir o caso no servidor.");
                    return;
                }
            }
            carregarCasosDoServidor();
        } catch (erro) {
            console.error("Erro de conexão ao excluir:", erro);
        }
    }
}

// ==========================================
// MÓDULO DE CONTROLE DE PRAZOS
// ==========================================
function abrirModalPrazos(numeroProcesso) {
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo) === numeroProcesso);
    if (!casoEncontrado) return;

    document.getElementById('casoIdParaPrazo').value = casoEncontrado.id || '';
    document.getElementById('titulo-modal-prazos').innerText = `Prazos - Proc: ${numeroProcesso}`;
    
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataVencimento').setAttribute('min', hoje);

    document.getElementById('modal-prazos').style.display = 'flex';
    renderListaPrazosMock();
}

function fecharModalPrazos() {
    document.getElementById('modal-prazos').style.display = 'none';
    const form = document.getElementById('form-prazo');
    if (form) form.reset();
}

function renderListaPrazosMock() {
    const tbody = document.getElementById('tabela-corpo-prazos');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td style="padding: 8px; font-size: 14px;">Entregar Laudo</td>
            <td style="padding: 8px; font-size: 14px;">15/11/2026</td>
            <td style="padding: 8px;"><span class="badge badge-ativo" style="font-size: 11px;">Pendente</span></td>
            <td style="padding: 8px;">
                <a href="#" class="link-acao" style="color: #28a745; font-size: 13px;">✔ Cumprir</a>
                <a href="#" class="link-acao" style="font-size: 13px;">✏ Editar</a>
            </td>
        </tr>
    `;
}

function salvarPrazo(e) {
    e.preventDefault();
    
    const payloadPrazo = {
        casoId: parseInt(document.getElementById('casoIdParaPrazo').value) || null,
        descricao: document.getElementById('descPrazo').value,
        dataVencimento: document.getElementById('dataVencimento').value,
        tipoContagem: document.getElementById('tipoContagem').value
    };

    console.log("JSON pronto para o Backend:", payloadPrazo);
    alert("Dados do prazo preparados com sucesso! Verifique a consola (F12) para ver o JSON.");
    
    const form = document.getElementById('form-prazo');
    if (form) form.reset();
}