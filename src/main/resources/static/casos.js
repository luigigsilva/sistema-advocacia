// ==========================================
// FUNÇÕES AUXILIARES (CNJ, DATAS E STATUS)
// ==========================================

// Corrigi o Ponto 1: Formatação CNJ para exibição limpa na interface
function formatarCNJ(numero) {
    if (!numero) return '';
    const limpo = String(numero).replace(/\D/g, '');
    if (limpo.length !== 20) return numero;
    return limpo.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
}

// Corrigi o Ponto 2: Formatação de data respeitando o fuso horário local (evita bug das 21h do UTC)
function formatarDataLocal(data = new Date()) {
    const d = new Date(data);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// ==========================================
// VARIÁVEIS GLOBAIS E INICIALIZAÇÃO
// ==========================================
let casos = [];
let prazos = [];
let modoEdicaoCaso = false;
let processoSendoEditado = "";
let statusSendoEditado = "ATIVO";
let prazoEmEdicao = null;

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

    // RN014/RF018: Eventos para cálculo automático do vencimento
    const inputDias = document.getElementById('diasPrazo');
    const selectContagem = document.getElementById('tipoContagem');
    if (inputDias) inputDias.addEventListener('input', recalcularVencimentoAuto);
    if (selectContagem) selectContagem.addEventListener('change', recalcularVencimentoAuto);

    carregarCasosDoServidor();
});

// ==========================================
// MÓDULO DE CASOS (Listagem e CRUD)
// ==========================================
async function carregarCasosDoServidor() {
    try {
        const resposta = await fetch('/api/casos');
        if (resposta.ok) {
            const dados = await resposta.json();
            casos = dados.map(cServidor => {
                const casoExistente = casos.find(c => 
                    c.id === cServidor.id || 
                    (c.numeroProcesso || c.processo) === (cServidor.numeroProcesso || cServidor.processo)
                );
                return {
                    ...cServidor,
                    prazos: cServidor.prazos || (casoExistente ? casoExistente.prazos : [])
                };
            });
            renderTabelaCasos();
        } else if (resposta.status === 401) {
            window.location.href = '/login.html';
        }
    } catch (erro) {
        console.warn('Backend indisponível, mantendo dados locais.');
        renderTabelaCasos();
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
        const numProcessoLimpo = (caso.numeroProcesso || caso.processo || '').replace(/\D/g, '');
        const numProcessoFormatado = formatarCNJ(numProcessoLimpo);
        
        // Corrigi o Ponto 5: Tratamento de status insensível a caixa (ATIVO / ATIVO vs ativo)
        const statusAtual = (caso.status || 'ATIVO').toUpperCase();
        const badgeClass = statusAtual === 'ATIVO' ? 'badge-ativo' : 'badge-encerrado';
        const textoStatus = statusAtual === 'ATIVO' ? 'Ativo' : 'Encerrado';

        let acoesHTML = `
            <a href="#" class="link-acao" style="color: #17a2b8;" onclick="abrirModalPrazos('${numProcessoLimpo}')">Prazos</a>
            <a href="#" class="link-acao" onclick="editarCaso('${numProcessoLimpo}')">Editar</a>
            <a href="#" class="link-acao" onclick="consultarCaso('${numProcessoLimpo}')">Consultar</a>
        `;

        if (statusAtual === 'ATIVO') {
            acoesHTML += `<a href="#" class="link-acao" style="color: #dc3545;" onclick="encerrarCaso('${numProcessoLimpo}')">Encerrar</a>`;
        }

        acoesHTML += `<a href="#" class="link-acao" style="color: #6c757d;" onclick="excluirCaso('${numProcessoLimpo}')">Excluir</a>`;

        tr.innerHTML = `
            <td>${numProcessoFormatado}</td>
            <td>${caso.tipo}</td>
            <td><span class="badge ${badgeClass}">${textoStatus}</span></td>
            <td class="acoes-container">${acoesHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

function aplicarMascaraCNJ(e) {
    let x = e.target.value.replace(/\D/g, '').match(/(\d{0,7})(\d{0,2})(\d{0,4})(\d{0,1})(\d{0,2})(\d{0,4})/);
    if (!x) return;
    e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2] + (x[3] ? '.' + x[3] : '') + (x[4] ? '.' + x[4] : '') + (x[5] ? '.' + x[5] : '') + (x[6] ? '.' + x[6] : '');
}

function setarDataAtual() {
    const inputData = document.getElementById('dataAbertura');
    if (inputData) {
        inputData.value = formatarDataLocal(new Date());
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
    statusSendoEditado = "ATIVO";
    document.getElementById('modal-caso').style.display = 'flex';
    limparFormularioCaso();
    document.getElementById('titulo-modal').innerText = 'Novo Caso';
    setarDataAtual();
}

function fecharModal() {
    document.getElementById('modal-caso').style.display = 'none';
}

function editarCaso(numeroProcesso) {
    const numLimpo = String(numeroProcesso).replace(/\D/g, '');
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numLimpo);
    if (!casoEncontrado) return;

    modoEdicaoCaso = true;
    processoSendoEditado = numLimpo;
    statusSendoEditado = (casoEncontrado.status || 'ATIVO').toUpperCase();

    document.getElementById('modal-caso').style.display = 'flex';
    limparFormularioCaso();
    document.getElementById('titulo-modal').innerText = 'Editar Caso';

    document.getElementById('casoId').value = casoEncontrado.id || '';
    document.getElementById('tipo').value = casoEncontrado.tipo;
    document.getElementById('processo').value = formatarCNJ(numLimpo);
    document.getElementById('descricao').value = casoEncontrado.descricao || '';
    document.getElementById('dataAbertura').value = casoEncontrado.dataAbertura ? casoEncontrado.dataAbertura.split('T')[0] : '';

    if (statusSendoEditado === 'ENCERRADO') {
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
    const numLimpo = String(numeroProcesso).replace(/\D/g, '');
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numLimpo);
    if (!casoEncontrado) return;

    if (confirm(`Tem certeza que deseja ENCERRAR o processo ${formatarCNJ(numLimpo)}?`)) {
        casoEncontrado.status = 'ENCERRADO';
        renderTabelaCasos();

        try {
            if (casoEncontrado.id) {
                await fetch(`/api/casos/${casoEncontrado.id}/encerrar`, { method: 'PUT' });
            }
        } catch (erro) {
            console.error("Erro ao sincronizar encerramento:", erro);
        }
    }
}

async function excluirCaso(numeroProcesso) {
    const numLimpo = String(numeroProcesso).replace(/\D/g, '');
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numLimpo);
    if (!casoEncontrado) return;

    if (confirm(`Deseja realmente EXCLUIR o caso ${formatarCNJ(numLimpo)}?`)) {
        casos = casos.filter(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') !== numLimpo);
        renderTabelaCasos();

        if (casoEncontrado.id) {
            try {
                await fetch(`/api/casos/${casoEncontrado.id}`, { method: 'DELETE' });
            } catch (erro) {
                console.warn("Erro ao excluir no servidor backend:", erro);
            }
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

    if (!modoEdicaoCaso) {
        const jaExiste = casos.some(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numerosApenas);
        if (jaExiste) {
            mostrarErroCaso("Já existe um caso cadastrado (ativo ou encerrado) com este número de protocolo.");
            return;
        }
    }

    const casoExistente = casos.find(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numerosApenas || c.id == casoIdVal);
    const prazosGuardados = casoExistente ? (casoExistente.prazos || []) : [];

    // Corrigi o Ponto 5: Status enviado sempre em CAIXA ALTA para compatibilidade com Enums no Java
    const payload = {
        id: casoIdVal ? parseInt(casoIdVal) : Date.now(),
        tipo: tipoVal,
        numeroProcesso: numerosApenas,
        descricao: descricaoVal,
        dataAbertura: dataAberturaVal,
        status: modoEdicaoCaso ? statusSendoEditado.toUpperCase() : 'ATIVO',
        prazos: prazosGuardados
    };

    const idx = casos.findIndex(c => (c.id && c.id == payload.id) || (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === payload.numeroProcesso);
    if (idx >= 0) {
        casos[idx] = payload;
    } else {
        casos.push(payload);
    }

    fecharModal();
    renderTabelaCasos();

    try {
        const urlDestino = (modoEdicaoCaso && casoIdVal) ? `/api/casos/${casoIdVal}` : '/api/casos';
        const metodoHttp = (modoEdicaoCaso && casoIdVal) ? 'PUT' : 'POST';

        const resposta = await fetch(urlDestino, {
            method: metodoHttp,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (resposta.ok) {
            const casoServidor = await resposta.json();
            if (casoServidor && casoServidor.id) {
                payload.id = casoServidor.id;
            }
        }
    } catch (erro) {
        console.warn("Backend offline. Caso gravado em memória local.");
    }
}

function mostrarErroCaso(mensagem) {
    document.getElementById('modal-erro').innerHTML = `<div class="erro-box">${mensagem}</div>`;
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
            let txtProcesso = tdProcesso.textContent || tdProcesso.innerText;
            let txtTipo = tdTipo.textContent || tdTipo.innerText;
            tr[i].style.display = (txtProcesso.toUpperCase().indexOf(filter) > -1 || txtTipo.toUpperCase().indexOf(filter) > -1) ? "" : "none";
        }
    }
}

// ==========================================
// MÓDULO DE PRAZOS (RF009, RF010, RF011, RF018)
// ==========================================

function calcularVencimento(dataInicioISO, quantidadeDias, tipoContagem) {
    if (!dataInicioISO || isNaN(quantidadeDias) || quantidadeDias <= 0) return '';
    
    // Converte mantendo a data local sem desvio do fuso horário
    const partes = dataInicioISO.split('T')[0].split('-');
    let data = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    
    let diasAdicionados = 0;
    const ehDiasUteis = (tipoContagem || '').toUpperCase() === 'DIAS_UTEIS' || tipoContagem === 'uteis';

    while (diasAdicionados < quantidadeDias) {
        data.setDate(data.getDate() + 1);
        
        if (ehDiasUteis) {
            const diaDaSemana = data.getDay();
            if (diaDaSemana !== 0 && diaDaSemana !== 6) {
                diasAdicionados++;
            }
        } else {
            diasAdicionados++;
        }
    }

    return formatarDataLocal(data);
}

// Corrigi o Ponto 3: Pega a data original de cadastro ao editar/prorrogar
function recalcularVencimentoAuto() {
    const elDias = document.getElementById('diasPrazo');
    const elContagem = document.getElementById('tipoContagem');
    const elVencimento = document.getElementById('dataVencimento');

    if (!elDias || !elContagem || !elVencimento) return;

    const qtdDias = parseInt(elDias.value);
    const tipoContagem = elContagem.value;
    
    // Se estiver editando, usa a data de cadastro original. Senão, usa a data atual local.
    const dataInicioRef = (prazoEmEdicao && prazoEmEdicao.dataCadastro) 
        ? prazoEmEdicao.dataCadastro.split('T')[0] 
        : formatarDataLocal(new Date());

    if (qtdDias > 0) {
        elVencimento.value = calcularVencimento(dataInicioRef, qtdDias, tipoContagem);
    }
}

async function abrirModalPrazos(numeroProcesso) {
    const numLimpo = String(numeroProcesso).replace(/\D/g, '');
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numLimpo);
    
    if (!casoEncontrado) {
        alert("Erro: Caso não encontrado.");
        return;
    }

    if (!casoEncontrado.id) {
        casoEncontrado.id = Date.now();
    }

    if (!casoEncontrado.prazos) {
        casoEncontrado.prazos = [];
    }

    document.getElementById('casoIdParaPrazo').value = casoEncontrado.id;
    document.getElementById('titulo-modal-prazos').innerText = `Prazos - Proc: ${formatarCNJ(numLimpo)}`;
    
    const hoje = formatarDataLocal(new Date());
    const elVencimento = document.getElementById('dataVencimento');
    if (elVencimento) elVencimento.setAttribute('min', hoje);

    document.getElementById('modal-prazos').style.display = 'flex';
    limparFormularioPrazo();

    const formPrazo = document.getElementById('form-prazo');
    const isEncerrado = (casoEncontrado.status || '').toUpperCase() === 'ENCERRADO';

    if (isEncerrado) {
        if (formPrazo) formPrazo.style.display = 'none';
        mostrarErroPrazo(
            "<strong>Aviso:</strong> Este caso está <strong>ENCERRADO</strong>. O histórico está disponível apenas para consulta.", 
            "#fff3cd", "#856404", "#ffeeba"
        );
    } else {
        if (formPrazo) formPrazo.style.display = 'block';
    }

    await carregarPrazosDoCaso(casoEncontrado);
}

function fecharModalPrazos() {
    document.getElementById('modal-prazos').style.display = 'none';
    limparFormularioPrazo();
}

function limparFormularioPrazo() {
    prazoEmEdicao = null;
    const form = document.getElementById('form-prazo');
    if (form) form.reset();

    document.getElementById('prazoId').value = '';
    const btnSalvar = document.getElementById('btn-salvar-prazo');
    if (btnSalvar) {
        btnSalvar.innerText = "Cadastrar Prazo";
        btnSalvar.style.display = "inline-block";
    }

    const elVencimento = document.getElementById('dataVencimento');
    if (elVencimento) {
        elVencimento.setAttribute('min', formatarDataLocal(new Date()));
    }

    document.querySelectorAll('#form-prazo input, #form-prazo select, #form-prazo textarea').forEach(el => el.disabled = false);
    document.getElementById('modal-prazo-erro').innerHTML = '';
}

async function carregarPrazosDoCaso(caso) {
    prazos = caso.prazos || [];

    if (caso.id) {
        try {
            const resposta = await fetch(`/api/casos/${caso.id}/prazos`);
            if (resposta.ok) {
                const dadosBackend = await resposta.json();
                if (Array.isArray(dadosBackend) && dadosBackend.length > 0) {
                    caso.prazos = dadosBackend;
                    prazos = caso.prazos;
                }
            }
        } catch (e) {
            console.warn("Backend de prazos não respondeu. Mantendo prazos locais.");
        }
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

    const casoIdVal = document.getElementById('casoIdParaPrazo')?.value;
    const casoAtual = casos.find(c => c.id == casoIdVal);
    const isCasoEncerrado = casoAtual && (casoAtual.status || '').toUpperCase() === 'ENCERRADO';

    prazos.forEach(prazo => {
        const tr = document.createElement('tr');
        const isCumprido = (prazo.status || '').toUpperCase() === 'CUMPRIDO';
        const statusClass = isCumprido ? 'badge-encerrado' : 'badge-ativo';
        const statusTexto = isCumprido ? 'Cumprido' : 'Pendente';
        
        const isUteis = (prazo.tipoContagem || prazo.formaContagem || '').toUpperCase() === 'DIAS_UTEIS' || prazo.tipoContagem === 'uteis';
        const tipoContagemTexto = isUteis ? 'Dias Úteis' : 'Dias Corridos';

        const dataVencStr = prazo.dataVencimento ? prazo.dataVencimento.split('T')[0] : '';
        const partesData = dataVencStr.split('-');
        const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : dataVencStr;

        let acoesHTML = '';
        if (isCumprido || isCasoEncerrado) {
            acoesHTML = `<a href="#" class="link-acao" style="color: #17a2b8;" onclick="consultarPrazo(${prazo.id})">👁 Consultar</a>`;
        } else {
            acoesHTML = `
                <a href="#" class="link-acao" style="color: #28a745; margin-right: 8px;" onclick="marcarPrazoComoCumprido(${prazo.id})">✔ Cumprir</a>
                <a href="#" class="link-acao" style="margin-right: 8px;" onclick="carregarPrazoParaEdicao(${prazo.id})">✏ Editar/Prorrogar</a>
            `;
        }

        const qtdHistorico = prazo.historico ? prazo.historico.length : 0;
        const tagHistorico = qtdHistorico > 0 ? `<br><small style="color:#6c757d;">(Alterado ${qtdHistorico}x)</small>` : '';

        tr.innerHTML = `
            <td>${prazo.descricao}</td>
            <td>${dataFormatada} ${tagHistorico}</td>
            <td>${tipoContagemTexto}</td>
            <td><span class="badge ${statusClass}">${statusTexto}</span></td>
            <td>${acoesHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Corrigi o Ponto 6: Limpa o formulário e remove 'min' para evitar resíduos ao consultar
function consultarPrazo(prazoId) {
    limparFormularioPrazo();

    const prazo = prazos.find(p => p.id === prazoId);
    if (!prazo) return;

    prazoEmEdicao = prazo;

    const elVencimento = document.getElementById('dataVencimento');
    if (elVencimento) elVencimento.removeAttribute('min');

    document.getElementById('descPrazo').value = prazo.descricao || '';
    if (elVencimento) elVencimento.value = prazo.dataVencimento ? prazo.dataVencimento.split('T')[0] : '';
    document.getElementById('tipoContagem').value = ((prazo.tipoContagem || prazo.formaContagem || '').toUpperCase() === 'DIAS_UTEIS' || prazo.tipoContagem === 'uteis') ? 'DIAS_UTEIS' : 'DIAS_CORRIDOS';
    if (prazo.dias) document.getElementById('diasPrazo').value = prazo.dias;

    document.querySelectorAll('#form-prazo input, #form-prazo select, #form-prazo textarea').forEach(el => el.disabled = true);
    
    const btnSalvar = document.getElementById('btn-salvar-prazo');
    if (btnSalvar) btnSalvar.style.display = "none";

    mostrarErroPrazo(`<strong>Modo Consulta (RN013):</strong> Prazo indisponível para alterações.`, "#d1ecf1", "#0c5460", "#bee5eb");
}

function carregarPrazoParaEdicao(prazoId) {
    const prazo = prazos.find(p => p.id === prazoId);
    if (!prazo) return;

    if ((prazo.status || '').toUpperCase() === 'CUMPRIDO') {
        consultarPrazo(prazoId);
        return;
    }

    limparFormularioPrazo();
    prazoEmEdicao = prazo;

    document.getElementById('prazoId').value = prazo.id;
    document.getElementById('descPrazo').value = prazo.descricao || '';
    document.getElementById('dataVencimento').value = prazo.dataVencimento ? prazo.dataVencimento.split('T')[0] : '';
    document.getElementById('tipoContagem').value = ((prazo.tipoContagem || prazo.formaContagem || '').toUpperCase() === 'DIAS_UTEIS' || prazo.tipoContagem === 'uteis') ? 'DIAS_UTEIS' : 'DIAS_CORRIDOS';
    if (prazo.dias) document.getElementById('diasPrazo').value = prazo.dias;

    const btnSalvar = document.getElementById('btn-salvar-prazo');
    if (btnSalvar) btnSalvar.innerText = "Salvar / Prorrogar Prazo";
}

async function marcarPrazoComoCumprido(prazoId) {
    const prazo = prazos.find(p => p.id === prazoId);
    if (!prazo) return;

    if (confirm(`Deseja marcar o prazo "${prazo.descricao}" como CUMPRIDO?`)) {
        prazo.status = 'CUMPRIDO';
        try {
            await fetch(`/api/prazos/${prazoId}/cumprir`, { method: 'PUT' });
        } catch (e) {}
        renderTabelaPrazos();
        limparFormularioPrazo();
    }
}

async function salvarPrazo(e) {
    e.preventDefault();

    const casoIdVal = parseInt(document.getElementById('casoIdParaPrazo').value);
    const descVal = document.getElementById('descPrazo').value.trim();
    const dataVencimentoVal = document.getElementById('dataVencimento').value;
    const tipoContagemVal = document.getElementById('tipoContagem').value;
    const diasVal = document.getElementById('diasPrazo').value;
    const prazoIdVal = document.getElementById('prazoId').value;

    let casoEncontrado = casos.find(c => c.id === casoIdVal);
    if (!casoEncontrado) {
        mostrarErroPrazo("<strong>RN009:</strong> O prazo deve estar vinculado a um caso pericial existente.");
        return;
    }

    if ((casoEncontrado.status || '').toUpperCase() === 'ENCERRADO') {
        mostrarErroPrazo("<strong>Erro:</strong> Não é permitido salvar prazos para um caso encerrado.");
        return;
    }

    if (!descVal) {
        mostrarErroPrazo("<strong>RN010:</strong> A descrição do prazo é obrigatória.");
        return;
    }

    if (!dataVencimentoVal) {
        mostrarErroPrazo("<strong>RN011:</strong> A data de vencimento é obrigatória.");
        return;
    }

    const hojeStr = formatarDataLocal(new Date());
    
    // Corrigi o Ponto 4: Trata ISO com .split('T')[0] evitando erros de string do backend Java
    const dataCadastroRef = (prazoEmEdicao && prazoEmEdicao.dataCadastro) 
        ? prazoEmEdicao.dataCadastro.split('T')[0] 
        : hojeStr;

    if (dataVencimentoVal < dataCadastroRef) {
        mostrarErroPrazo(`<strong>RN011:</strong> A data de vencimento (${dataVencimentoVal}) não pode ser anterior ao cadastro (${dataCadastroRef}).`);
        return;
    }

    let historicoAtualizado = prazoEmEdicao && prazoEmEdicao.historico ? [...prazoEmEdicao.historico] : [];
    const dataVencAnterior = prazoEmEdicao && prazoEmEdicao.dataVencimento ? prazoEmEdicao.dataVencimento.split('T')[0] : null;

    if (prazoEmEdicao && dataVencAnterior !== dataVencimentoVal) {
        historicoAtualizado.push({
            dataAnterior: dataVencAnterior,
            novaData: dataVencimentoVal,
            dataAlteracao: new Date().toISOString()
        });
    }

    const payloadPrazo = {
        id: prazoIdVal ? parseInt(prazoIdVal) : Date.now(),
        caso: { id: casoIdVal },
        casoId: casoIdVal,
        descricao: descVal,
        dias: diasVal ? parseInt(diasVal) : null,
        dataVencimento: dataVencimentoVal,
        tipoContagem: tipoContagemVal,
        formaContagem: tipoContagemVal,
        status: prazoEmEdicao ? (prazoEmEdicao.status || 'PENDENTE').toUpperCase() : 'PENDENTE',
        dataCadastro: prazoEmEdicao ? prazoEmEdicao.dataCadastro : hojeStr,
        historico: historicoAtualizado
    };

    if (!casoEncontrado.prazos) casoEncontrado.prazos = [];
    
    const idx = casoEncontrado.prazos.findIndex(p => p.id === payloadPrazo.id);
    if (idx >= 0) {
        casoEncontrado.prazos[idx] = payloadPrazo;
    } else {
        casoEncontrado.prazos.push(payloadPrazo);
    }

    prazos = casoEncontrado.prazos;

    try {
        const urlDestino = prazoIdVal ? `/api/prazos/${prazoIdVal}` : '/api/prazos';
        const metodoHttp = prazoIdVal ? 'PUT' : 'POST';

        const resposta = await fetch(urlDestino, {
            method: metodoHttp,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPrazo)
        });

        if (resposta.ok) {
            const prazoBackend = await resposta.json();
            if (prazoBackend && prazoBackend.id) {
                const pos = casoEncontrado.prazos.findIndex(p => p.id === payloadPrazo.id);
                if (pos >= 0) casoEncontrado.prazos[pos] = prazoBackend;
            }
        }
    } catch (erro) {
        console.warn("Servidor offline. Prazo mantido localmente.");
    }

    limparFormularioPrazo();
    renderTabelaPrazos();
}

function mostrarErroPrazo(mensagem, bg = "#f8d7da", color = "#721c24", border = "#f5c6cb") {
    const divErro = document.getElementById('modal-prazo-erro');
    if (divErro) {
        divErro.innerHTML = `
            <div class="erro-box" style="background-color: ${bg}; color: ${color}; border-color: ${border}; margin-bottom: 15px;">
                ${mensagem}
            </div>
        `;
    }
}