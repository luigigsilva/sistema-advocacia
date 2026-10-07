// ==========================================
// VARIÁVEIS GLOBAIS E INICIALIZAÇÃO
// ==========================================
let casos = [];
let prazos = []; // Armazena a lista de prazos do caso selecionado
let modoEdicaoCaso = false;
let processoSendoEditado = "";
let statusSendoEditado = "ativo";

// Estado para o formulário de prazos
let prazoEmEdicao = null;

// Inicialização da aplicação
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
            renderTabelaCasos();
        } else if (resposta.status === 401) {
            window.location.href = '/login.html';
        }
    } catch (erro) {
        console.error('Erro ao conectar ao servidor:', erro);
    }
}

function renderTabelaCasos() {
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

function aplicarMascaraCNJ(e) {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,7})(\d{0,2})(\d{0,4})(\d{0,1})(\d{0,2})(\d{0,4})/);
    e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2] + (x[3] ? '.' + x[3] : '') + (x[4] ? '.' + x[4] : '') + (x[5] ? '.' + x[5] : '') + (x[6] ? '.' + x[6] : '');
}

function setarDataAtual() {
    const inputData = document.getElementById('dataAbertura');
    if (inputData) {
        inputData.value = new Date().toISOString().split('T')[0];
    }
}

function limparFormularioCaso() {
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
    modoEdicaoCaso = false;
    processoSendoEditado = "";
    statusSendoEditado = "ativo";
    document.getElementById('modal-caso').style.display = 'flex';
    limparFormularioCaso();
    document.getElementById('titulo-modal').innerText = 'Novo Caso';
    setarDataAtual();
}

function fecharModal() {
    document.getElementById('modal-caso').style.display = 'none';
}

function editarCaso(numeroProcesso) {
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo) === numeroProcesso);
    if (!casoEncontrado) return;

    modoEdicaoCaso = true;
    processoSendoEditado = numeroProcesso;
    statusSendoEditado = casoEncontrado.status;

    document.getElementById('modal-caso').style.display = 'flex';
    limparFormularioCaso();
    document.getElementById('titulo-modal').innerText = 'Editar Caso';

    document.getElementById('casoId').value = casoEncontrado.id || '';
    document.getElementById('tipo').value = casoEncontrado.tipo;
    document.getElementById('processo').value = casoEncontrado.numeroProcesso || casoEncontrado.processo;
    document.getElementById('descricao').value = casoEncontrado.descricao || '';
    document.getElementById('dataAbertura').value = casoEncontrado.dataAbertura;

    if (casoEncontrado.status !== 'ativo') {
        document.getElementById('processo').disabled = true;
        document.getElementById('tipo').disabled = true;
        mostrarErroCaso("Aviso: Este caso está encerrado. Dados principais não podem ser alterados.");
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
                    mostrarErroCaso("Erro ao encerrar o caso no servidor.");
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
        mostrarErroCaso("O número do protocolo está incorreto (exige 20 dígitos).");
        return;
    }

    if (!modoEdicaoCaso || numerosApenas !== processoSendoEditado.replace(/\D/g, '')) {
        let casoDuplicado = casos.find(c => {
            let numProcessoAtual = (c.numeroProcesso || c.processo).replace(/\D/g, '');
            return numProcessoAtual === numerosApenas && c.status === 'ativo';
        });
        if (casoDuplicado) {
            mostrarErroCaso("Este número de processo já está cadastrado em um caso ATIVO.");
            return;
        }
    }

    const payload = {
        id: casoIdVal ? parseInt(casoIdVal) : null,
        tipo: tipoVal,
        numeroProcesso: numerosApenas,
        descricao: descricaoVal,
        dataAbertura: dataAberturaVal,
        status: modoEdicaoCaso ? statusSendoEditado : 'ativo'
    };

    try {
        const urlDestino = (modoEdicaoCaso && casoIdVal) ? `/api/casos/${casoIdVal}` : '/api/casos';
        const metodoHttp = (modoEdicaoCaso && casoIdVal) ? 'PUT' : 'POST';

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
            mostrarErroCaso(msgErro);
        }
    } catch (erro) {
        mostrarErroCaso("Erro de comunicação com o servidor.");
    }
}

function mostrarErroCaso(mensagem) {
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
// MÓDULO DE CONTROLE DE PRAZOS (RN009 - RN014)
// ==========================================

// RN014: Utilitário para calcular vencimento em Dias Corridos ou Dias Úteis
function calcularVencimento(dataInicioISO, quantidadeDias, tipoContagem) {
    if (!dataInicioISO || isNaN(quantidadeDias) || quantidadeDias <= 0) return '';
    
    let data = new Date(dataInicioISO + 'T00:00:00');
    let diasAdicionados = 0;

    while (diasAdicionados < quantidadeDias) {
        data.setDate(data.getDate() + 1);
        
        if (tipoContagem === 'uteis') {
            const diaDaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
            if (diaDaSemana !== 0 && diaDaSemana !== 6) {
                diasAdicionados++;
            }
        } else { // 'corridos'
            diasAdicionados++;
        }
    }

    return data.toISOString().split('T')[0];
}

async function abrirModalPrazos(numeroProcesso) {
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo) === numeroProcesso);
    
    // RN009: Prazo obrigatoriamente vinculado a um caso pericial existente
    if (!casoEncontrado || !casoEncontrado.id) {
        alert("Erro (RN009): Não é possível gerenciar prazos sem um Caso Pericial válido cadastrado.");
        return;
    }

    document.getElementById('casoIdParaPrazo').value = casoEncontrado.id;
    document.getElementById('titulo-modal-prazos').innerText = `Prazos - Proc: ${numeroProcesso}`;
    
    // RN011: Define o valor mínimo do input como a data atual do cadastro
    const hoje = new Date().toISOString().split('T')[0];
    const elVencimento = document.getElementById('dataVencimento');
    if (elVencimento) {
        elVencimento.setAttribute('min', hoje);
    }

    document.getElementById('modal-prazos').style.display = 'flex';
    limparFormularioPrazo();
    
    // Carrega a lista de prazos do servidor para este caso
    await carregarPrazosDoCaso(casoEncontrado.id);
}

function fecharModalPrazos() {
    document.getElementById('modal-prazos').style.display = 'none';
    limparFormularioPrazo();
}

function limparFormularioPrazo() {
    prazoEmEdicao = null;
    const form = document.getElementById('form-prazo');
    if (form) form.reset();

    const inputPrazoId = document.getElementById('prazoId');
    if (inputPrazoId) inputPrazoId.value = '';

    const btnSalvar = document.getElementById('btn-salvar-prazo');
    if (btnSalvar) {
        btnSalvar.innerText = "Cadastrar Prazo";
        btnSalvar.style.display = "inline-block";
    }

    // Habilita novamente os campos do formulário
    document.querySelectorAll('#form-prazo input, #form-prazo select, #form-prazo textarea').forEach(el => el.disabled = false);
    
    const divErro = document.getElementById('modal-prazo-erro');
    if (divErro) divErro.innerHTML = '';
}

async function carregarPrazosDoCaso(casoId) {
    try {
        const resposta = await fetch(`/api/casos/${casoId}/prazos`);
        if (resposta.ok) {
            prazos = await resposta.json();
        } else {
            prazos = [];
        }
    } catch (e) {
        console.warn("Servidor offline ou rota de prazos não encontrada. Utilizando lista local.");
    }
    renderTabelaPrazos();
}

function renderTabelaPrazos() {
    const tbody = document.getElementById('tabela-corpo-prazos');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!prazos || prazos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #777; font-style: italic;">
                    Nenhum prazo cadastrado para este caso.
                </td>
            </tr>
        `;
        return;
    }

    prazos.forEach(prazo => {
        const tr = document.createElement('tr');
        const statusClass = prazo.status === 'cumprido' ? 'badge-encerrado' : 'badge-ativo';
        const statusTexto = prazo.status === 'cumprido' ? 'Cumprido' : 'Pendente';
        const tipoContagemTexto = prazo.tipoContagem === 'uteis' ? 'Dias Úteis' : 'Dias Corridos';

        // Formatação simples da data (AAAA-MM-DD para DD/MM/AAAA)
        const partesData = (prazo.dataVencimento || '').split('-');
        const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : prazo.dataVencimento;

        // Botoes de Ação
        let acoesHTML = '';
        
        // RN013: Se estiver cumprido, apenas consulta (não permite editar/cumprir novamente)
        if (prazo.status === 'cumprido') {
            acoesHTML = `<a href="#" class="link-acao" style="color: #17a2b8;" onclick="consultarPrazo(${prazo.id})">👁 Consultar</a>`;
        } else {
            acoesHTML = `
                <a href="#" class="link-acao" style="color: #28a745; margin-right: 8px;" onclick="marcarPrazoComoCumprido(${prazo.id})">✔ Cumprir</a>
                <a href="#" class="link-acao" style="margin-right: 8px;" onclick="carregarPrazoParaEdicao(${prazo.id})">✏ Editar/Prorrogar</a>
            `;
        }

        // Exibe contador de histórico se houver alterações
        const qtdHistorico = prazo.historico ? prazo.historico.length : 0;
        const tagHistorico = qtdHistorico > 0 ? `<br><small style="color:#6c757d;">(Alterado ${qtdHistorico}x)</small>` : '';

        tr.innerHTML = `
            <td style="padding: 8px; font-size: 14px;">${prazo.descricao}</td>
            <td style="padding: 8px; font-size: 14px;">${dataFormatada} ${tagHistorico}</td>
            <td style="padding: 8px; font-size: 13px;">${tipoContagemTexto}</td>
            <td style="padding: 8px;"><span class="badge ${statusClass}" style="font-size: 11px;">${statusTexto}</span></td>
            <td style="padding: 8px;">${acoesHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

// RN013: Um prazo marcado como cumprido não poderá ser editado, apenas consultado
function consultarPrazo(prazoId) {
    const prazo = prazos.find(p => p.id === prazoId);
    if (!prazo) return;

    prazoEmEdicao = prazo;
    
    document.getElementById('descPrazo').value = prazo.descricao;
    document.getElementById('dataVencimento').value = prazo.dataVencimento;
    document.getElementById('tipoContagem').value = prazo.tipoContagem || 'corridos';

    // Desabilita os campos para somente leitura
    document.querySelectorAll('#form-prazo input, #form-prazo select, #form-prazo textarea').forEach(el => el.disabled = true);
    
    const btnSalvar = document.getElementById('btn-salvar-prazo');
    if (btnSalvar) btnSalvar.style.display = "none";

    mostrarErroPrazo(`<strong>Modo Consulta (RN013):</strong> Este prazo já foi CUMPRIDO em ${prazo.dataCumpriu || 'data não informada'} e não pode ser editado.`, "#d1ecf1", "#0c5460", "#bee5eb");
}

function carregarPrazoParaEdicao(prazoId) {
    const prazo = prazos.find(p => p.id === prazoId);
    if (!prazo) return;

    // RN013: Proteção adicional
    if (prazo.status === 'cumprido') {
        consultarPrazo(prazoId);
        return;
    }

    prazoEmEdicao = prazo;
    limparFormularioPrazo();

    document.getElementById('prazoId').value = prazo.id;
    document.getElementById('descPrazo').value = prazo.descricao;
    document.getElementById('dataVencimento').value = prazo.dataVencimento;
    document.getElementById('tipoContagem').value = prazo.tipoContagem || 'corridos';

    const btnSalvar = document.getElementById('btn-salvar-prazo');
    if (btnSalvar) {
        btnSalvar.innerText = "Salvar / Prorrogar Prazo";
    }
}

// Aceitação: O usuário deverá conseguir marcar um prazo como cumprido
async function marcarPrazoComoCumprido(prazoId) {
    const prazo = prazos.find(p => p.id === prazoId);
    if (!prazo) return;

    if (confirm(`Deseja marcar o prazo "${prazo.descricao}" como CUMPRIDO?`)) {
        prazo.status = 'cumprido';
        prazo.dataCumpriu = new Date().toISOString().split('T')[0];

        try {
            await fetch(`/api/prazos/${prazoId}/cumprir`, { method: 'PUT' });
        } catch (e) {
            console.log("Servidor não conectado. Atualizado localmente.");
        }

        renderTabelaPrazos();
        limparFormularioPrazo();
    }
}

// Submissão e Validação completa de Prazos (RN009 - RN014)
async function salvarPrazo(e) {
    e.preventDefault();

    const casoIdVal = parseInt(document.getElementById('casoIdParaPrazo').value);
    const descVal = document.getElementById('descPrazo').value.trim();
    const dataVencimentoVal = document.getElementById('dataVencimento').value;
    const tipoContagemVal = document.getElementById('tipoContagem').value;
    const prazoIdVal = document.getElementById('prazoId') ? document.getElementById('prazoId').value : null;

    // RN009: Prazo obrigatoriamente vinculado a um caso pericial existente
    if (!casoIdVal || isNaN(casoIdVal)) {
        mostrarErroPrazo("<strong>RN009:</strong> O prazo deve estar obrigatoriamente vinculado a um caso pericial.");
        return;
    }

    // RN010: A descrição do prazo será um campo obrigatório
    if (!descVal) {
        mostrarErroPrazo("<strong>RN010:</strong> A descrição do prazo é obrigatória.");
        return;
    }

    // RN011: Data de vencimento obrigatória e não anterior à data de cadastro/hoje
    if (!dataVencimentoVal) {
        mostrarErroPrazo("<strong>RN011:</strong> A data de vencimento é obrigatória.");
        return;
    }

    const hojeStr = new Date().toISOString().split('T')[0];
    const dataCadastroRef = (prazoEmEdicao && prazoEmEdicao.dataCadastro) ? prazoEmEdicao.dataCadastro : hojeStr;

    if (dataVencimentoVal < dataCadastroRef) {
        mostrarErroPrazo(`<strong>RN011:</strong> A data de vencimento (${dataVencimentoVal}) não pode ser anterior à data de cadastro (${dataCadastroRef}).`);
        return;
    }

    // RN013: Garantir que não está tentando editar um prazo cumprido
    if (prazoEmEdicao && prazoEmEdicao.status === 'cumprido') {
        mostrarErroPrazo("<strong>RN013:</strong> Um prazo marcado como cumprido não pode ser editado.");
        return;
    }

    // Preparação do Histórico de Alterações (RN012)
    let historicoAtualizado = prazoEmEdicao && prazoEmEdicao.historico ? [...prazoEmEdicao.historico] : [];

    // RN012: Toda alteração de data de vencimento deverá gerar registro de histórico
    if (prazoEmEdicao && prazoEmEdicao.dataVencimento !== dataVencimentoVal) {
        const registroHistorico = {
            dataAnterior: prazoEmEdicao.dataVencimento,
            novaData: dataVencimentoVal,
            dataAlteracao: new Date().toISOString()
        };
        historicoAtualizado.push(registroHistorico);
        console.log("RN012 - Histórico registrado:", registroHistorico);
    }

    // Construção do Payload (RN014: forma de contagem definida e salva)
    const payloadPrazo = {
        id: prazoIdVal ? parseInt(prazoIdVal) : Date.now(), // ID provisório se for novo
        casoId: casoIdVal,
        descricao: descVal,
        dataVencimento: dataVencimentoVal,
        tipoContagem: tipoContagemVal, // 'corridos' ou 'uteis'
        status: prazoEmEdicao ? prazoEmEdicao.status : 'pendente',
        dataCadastro: prazoEmEdicao ? prazoEmEdicao.dataCadastro : hojeStr,
        historico: historicoAtualizado
    };

    try {
        const urlDestino = prazoIdVal ? `/api/prazos/${prazoIdVal}` : '/api/prazos';
        const metodoHttp = prazoIdVal ? 'PUT' : 'POST';

        const resposta = await fetch(urlDestino, {
            method: metodoHttp,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPrazo)
        });

        if (resposta.ok) {
            const prazoSalvo = await resposta.json();
            atualizarListaLocalPrazos(prazoSalvo);
        } else {
            // Se o backend falhar/não existir, mantém sincronização local
            atualizarListaLocalPrazos(payloadPrazo);
        }
    } catch (erro) {
        console.warn("Servidor não respondeu. Gravando dados na sessão local.");
        atualizarListaLocalPrazos(payloadPrazo);
    }

    limparFormularioPrazo();
    renderTabelaPrazos();
}

function atualizarListaLocalPrazos(novoPrazo) {
    const idx = prazos.findIndex(p => p.id === novoPrazo.id);
    if (idx >= 0) {
        prazos[idx] = novoPrazo;
    } else {
        prazos.push(novoPrazo);
    }
}

function mostrarErroPrazo(mensagem, bg = "#f8d7da", color = "#721c24", border = "#f5c6cb") {
    const divErro = document.getElementById('modal-prazo-erro');
    if (divErro) {
        divErro.innerHTML = `
            <div class="erro-box" style="background-color: ${bg}; color: ${color}; padding: 10px; margin-bottom: 15px; border-radius: 5px; border: 1px solid ${border}; font-size: 13px;">
                ${mensagem}
            </div>
        `;
    } else {
        alert(mensagem.replace(/<[^>]*>?/gm, ''));
    }
}