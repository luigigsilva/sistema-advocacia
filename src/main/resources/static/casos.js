// ==========================================
// FUNÇÕES AUXILIARES (CNJ, DATAS, IDS, XSS E STATUS)
// ==========================================

function formatarCNJ(numero) {
    if (!numero) return '';
    const limpo = String(numero).replace(/\D/g, '');
    if (limpo.length !== 20) return numero;
    return limpo.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
}

function formatarDataLocal(data = new Date()) {
    if (typeof data === 'string') {
        const apenasData = data.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(apenasData)) return apenasData;
        data = new Date(data);
    }
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function formatarDataHoraBR(dataISO) {
    if (!dataISO) return '-';
    const d = new Date(dataISO);
    if (isNaN(d.getTime())) return dataISO;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const seg = String(d.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`;
}

function converterIdSeguro(id) {
    if (id === null || id === undefined || id === '') return null;
    return /^\d+$/.test(String(id)) ? parseInt(id, 10) : String(id);
}

function escaparHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ==========================================
// CONFIGURAÇÃO DE ANTECEDÊNCIA (RF014 / RN016)
// ==========================================

function obterDiasAntecedencia() {
    const config = localStorage.getItem('jurisync_antecedencia_dias');
    return config !== null ? parseInt(config, 10) : 3;
}

function salvarConfiguracaoAntecedencia() {
    const input = document.getElementById('diasAntecedencia');
    if (!input) return;

    const valor = parseInt(input.value, 10);
    if (isNaN(valor) || valor < 1) {
        alert('Informe um número válido de dias para a antecedência (mínimo 1).');
        return;
    }

    localStorage.setItem('jurisync_antecedencia_dias', valor);
    alert('Preferência de alerta atualizada!');

    const casoIdVal = document.getElementById('casoIdParaPrazo')?.value;
    if (casoIdVal) {
        renderTabelaPrazos();
    }
}

// ==========================================
// MOTOR DE CÁLCULO DE ALERTAS (RF012, RF013 / RN015, RN018)
// ==========================================

function calcularStatusPrazo(prazo) {
    const isCumprido = (prazo.status || '').toUpperCase() === 'CUMPRIDO' || prazo.cumprido === true;
    if (isCumprido) {
        return 'CUMPRIDO';
    }

    if (!prazo.dataVencimento) return 'EM_DIA';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataVencStr = prazo.dataVencimento.split('T')[0];
    const partes = dataVencStr.split('-').map(Number);
    const dataVenc = new Date(partes[0], partes[1] - 1, partes[2]);
    dataVenc.setHours(0, 0, 0, 0);

    const diffTempo = dataVenc.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffTempo / (1000 * 3600 * 24));

    if (diffDias < 0) {
        return 'VENCIDO';
    }

    const antecedencia = obterDiasAntecedencia();
    if (diffDias <= antecedencia) {
        return 'PROXIMO';
    }

    return 'EM_DIA';
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

            if (Array.isArray(dados)) {
                const idsBackend = new Set(dados.map(d => String(d.id)));
                const cnjsBackend = new Set(dados.map(d => (d.numeroProcesso || d.processo || '').replace(/\D/g, '')));

                const casosLocaisNaoSincronizados = casos.filter(c => {
                    const cnjLocal = (c.numeroProcesso || c.processo || '').replace(/\D/g, '');
                    return c.id && !idsBackend.has(String(c.id)) && !cnjsBackend.has(cnjLocal);
                });

                casos = [
                    ...dados.map(cServidor => {
                        const casoExistente = casos.find(c =>
                            String(c.id) === String(cServidor.id) ||
                            (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === (cServidor.numeroProcesso || cServidor.processo || '').replace(/\D/g, '')
                        );

                        const prazosServidor = Array.isArray(cServidor.prazos) && cServidor.prazos.length > 0 ? cServidor.prazos : null;
                        const prazosLocais = casoExistente ? casoExistente.prazos : [];

                        return {
                            ...cServidor,
                            prazos: prazosServidor || prazosLocais
                        };
                    }),
                    ...casosLocaisNaoSincronizados
                ];
                renderTabelaCasos();
            }
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

        const statusAtual = (caso.status || 'ATIVO').toUpperCase();
        const badgeClass = statusAtual === 'ATIVO' ? 'badge-ativo' : 'badge-encerrado';
        const textoStatus = statusAtual === 'ATIVO' ? 'Ativo' : 'Encerrado';

        let acoesHTML = `
            <a href="#" class="link-acao" onclick="abrirModalPrazos('${numProcessoLimpo}')">Prazos</a>
            <a href="#" class="link-acao" onclick="editarCaso('${numProcessoLimpo}')">Editar</a>
            <a href="#" class="link-acao" onclick="consultarCaso('${numProcessoLimpo}')">Consultar</a>
        `;

        if (statusAtual === 'ATIVO') {
            acoesHTML += `<a href="#" class="link-acao" onclick="encerrarCaso('${numProcessoLimpo}')">Encerrar</a>`;
        }

        acoesHTML += `<a href="#" class="link-acao" onclick="excluirCaso('${numProcessoLimpo}')">Excluir</a>`;

        tr.innerHTML = `
            <td>${escaparHTML(numProcessoFormatado)}</td>
            <td>${escaparHTML(caso.tipo)}</td>
            <td><span class="badge ${badgeClass}">${escaparHTML(textoStatus)}</span></td>
            <td class="td-acoes"><div class="acoes-container">${acoesHTML}</div></td>
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

    const campoCasoId = document.getElementById('casoId');
    if (campoCasoId) campoCasoId.value = '';

    const modalErro = document.getElementById('modal-erro');
    if (modalErro) modalErro.innerHTML = '';

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

    const jaExisteOutro = casos.some(c => {
        const cNum = (c.numeroProcesso || c.processo || '').replace(/\D/g, '');
        const cId = c.id ? String(c.id) : null;
        const idAtual = casoIdVal ? String(casoIdVal) : null;

        if (idAtual && cId === idAtual) return false;

        return cNum === numerosApenas;
    });

    if (jaExisteOutro) {
        mostrarErroCaso("Já existe um caso cadastrado (ativo ou encerrado) com este número de protocolo.");
        return;
    }

    const casoExistente = casoIdVal
        ? casos.find(c => String(c.id) === String(casoIdVal))
        : casos.find(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numerosApenas);

    const prazosGuardados = casoExistente ? (casoExistente.prazos || []) : [];

    const payloadBackend = {
        tipo: tipoVal,
        numeroProcesso: numerosApenas,
        descricao: descricaoVal,
        dataAbertura: dataAberturaVal,
        status: modoEdicaoCaso ? statusSendoEditado.toUpperCase() : 'ATIVO'
    };

    if (modoEdicaoCaso && casoIdVal) {
        payloadBackend.id = converterIdSeguro(casoIdVal);
    }

    const payloadLocal = {
        ...payloadBackend,
        id: casoIdVal ? converterIdSeguro(casoIdVal) : Date.now(),
        prazos: prazosGuardados
    };

    const idx = (modoEdicaoCaso && casoIdVal)
        ? casos.findIndex(c => String(c.id) === String(casoIdVal))
        : casos.findIndex(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === payloadBackend.numeroProcesso);

    if (idx >= 0) {
        casos[idx] = payloadLocal;
    } else {
        casos.push(payloadLocal);
    }

    fecharModal();
    renderTabelaCasos();

    try {
        const urlDestino = (modoEdicaoCaso && casoIdVal) ? `/api/casos/${casoIdVal}` : '/api/casos';
        const metodoHttp = (modoEdicaoCaso && casoIdVal) ? 'PUT' : 'POST';

        const resposta = await fetch(urlDestino, {
            method: metodoHttp,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadBackend)
        });

        if (resposta.ok) {
            const casoServidor = await resposta.json();
            if (casoServidor && casoServidor.id) {
                const idServidorSeguro = converterIdSeguro(casoServidor.id);

                const idxLocal = casos.findIndex(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numerosApenas);
                if (idxLocal >= 0) {
                    casos[idxLocal].id = idServidorSeguro;
                    if (prazosGuardados && prazosGuardados.length > 0) {
                        casos[idxLocal].prazos = prazosGuardados.map(p => ({
                            ...p,
                            casoId: idServidorSeguro,
                            caso: { id: idServidorSeguro }
                        }));
                    }
                }
                renderTabelaCasos();
            }
        }
    } catch (erro) {
        console.warn("Backend offline. Caso gravado em memória local.");
    }
}

function mostrarErroCaso(mensagem) {
    document.getElementById('modal-erro').innerHTML = `<div class="erro-box">${escaparHTML(mensagem)}</div>`;
}

function filtrarTabela() {
    let input = document.getElementById("pesquisaCaso");
    let table = document.getElementById("tabelaCasos");
    if (!input || !table) return;

    let filter = input.value.toUpperCase();
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
// MÓDULO DE PRAZOS
// ==========================================

function calcularVencimento(dataInicioISO, quantidadeDias, tipoContagem) {
    if (!dataInicioISO || isNaN(quantidadeDias) || quantidadeDias <= 0) return '';

    const partes = dataInicioISO.split('T')[0].split('-');
    let data = new Date(
        parseInt(partes[0], 10),
        parseInt(partes[1], 10) - 1,
        parseInt(partes[2], 10)
    );

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

function recalcularVencimentoAuto() {
    const elDias = document.getElementById('diasPrazo');
    const elContagem = document.getElementById('tipoContagem');
    const elVencimento = document.getElementById('dataVencimento');

    if (!elDias || !elContagem || !elVencimento) return;

    const qtdDias = parseInt(elDias.value, 10);
    const tipoContagem = elContagem.value;

    const dataInicioRef = (prazoEmEdicao && prazoEmEdicao.dataCadastro)
        ? prazoEmEdicao.dataCadastro.split('T')[0]
        : formatarDataLocal(new Date());

    if (!isNaN(qtdDias) && qtdDias > 0) {
        elVencimento.value = calcularVencimento(dataInicioRef, qtdDias, tipoContagem);
    } else if (!prazoEmEdicao) {
        elVencimento.value = '';
    }
}

async function abrirModalPrazos(numeroProcesso) {
    const numLimpo = String(numeroProcesso).replace(/\D/g, '');
    let casoEncontrado = casos.find(c => (c.numeroProcesso || c.processo || '').replace(/\D/g, '') === numLimpo);

    if (!casoEncontrado) {
        alert("Erro: Caso não encontrado.");
        return;
    }

    if (!casoEncontrado.prazos) {
        casoEncontrado.prazos = [];
    }

    document.getElementById('casoIdParaPrazo').value = casoEncontrado.id || '';
    document.getElementById('titulo-modal-prazos').innerText = `Prazos - Proc: ${formatarCNJ(numLimpo)}`;

    const elAntecedencia = document.getElementById('diasAntecedencia');
    if (elAntecedencia) {
        elAntecedencia.value = obterDiasAntecedencia();
    }

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

    const casoIdAtual = document.getElementById('casoIdParaPrazo')?.value;

    const form = document.getElementById('form-prazo');
    if (form) {
        form.reset();
        form.style.display = 'block';
    }

    if (casoIdAtual) {
        const elCasoIdParaPrazo = document.getElementById('casoIdParaPrazo');
        if (elCasoIdParaPrazo) elCasoIdParaPrazo.value = casoIdAtual;
    }

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
    const casoAtual = casos.find(c => String(c.id) === String(casoIdVal));
    const isCasoEncerrado = casoAtual && (casoAtual.status || '').toUpperCase() === 'ENCERRADO';

    prazos.forEach(prazo => {
        const tr = document.createElement('tr');
        
        const statusCalculado = calcularStatusPrazo(prazo);
        const isCumprido = statusCalculado === 'CUMPRIDO';

        let classeLinha = '';
        let badgeClass = '';
        let statusTexto = '';

        switch (statusCalculado) {
            case 'CUMPRIDO':
                classeLinha = 'linha-cumprido';
                badgeClass = 'badge-encerrado';
                statusTexto = 'Cumprido';
                break;
            case 'VENCIDO':
                classeLinha = 'linha-vencido';
                badgeClass = 'badge-danger';
                statusTexto = 'VENCIDO';
                break;
            case 'PROXIMO':
                classeLinha = 'linha-proximo';
                badgeClass = 'badge-warning';
                statusTexto = 'Atenção';
                break;
            default:
                classeLinha = '';
                badgeClass = 'badge-ativo';
                statusTexto = 'Em dia';
                break;
        }

        tr.className = classeLinha;

        const isUteis = (prazo.tipoContagem || prazo.formaContagem || '').toUpperCase() === 'DIAS_UTEIS' || prazo.tipoContagem === 'uteis';
        const tipoContagemTexto = isUteis ? 'Dias Úteis' : 'Dias Corridos';

        const dataVencStr = prazo.dataVencimento ? prazo.dataVencimento.split('T')[0] : '';
        const partesData = dataVencStr.split('-');
        const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : dataVencStr;

        const idEscapado = escaparHTML(String(prazo.id));

        let acoesHTML = '';
        if (isCumprido || isCasoEncerrado) {
            acoesHTML = `
                <a href="#" class="link-acao-prazo" style="color: #17a2b8;" onclick="consultarPrazo('${idEscapado}')">👁 Consultar</a>
                <a href="#" class="link-acao-prazo" style="color: #6c757d;" onclick="abrirModalHistoricoPrazo('${idEscapado}')">📜 Histórico</a>
            `;
        } else {
            acoesHTML = `
                <a href="#" class="link-acao-prazo" style="color: #28a745;" onclick="marcarPrazoComoCumprido('${idEscapado}')">✔ Cumprir</a>
                <a href="#" class="link-acao-prazo" onclick="carregarPrazoParaEdicao('${idEscapado}')">✏ Editar</a>
                <a href="#" class="link-acao-prazo" style="color: #6c757d;" onclick="abrirModalHistoricoPrazo('${idEscapado}')">📜 Histórico</a>
            `;
        }

        const qtdHistorico = prazo.historico ? prazo.historico.length : 0;
        const tagHistorico = qtdHistorico > 0 ? `<br><small style="color:#6c757d;">(Alterado ${qtdHistorico}x)</small>` : '';

        tr.innerHTML = `
            <td>${escaparHTML(prazo.descricao)}</td>
            <td>${escaparHTML(dataFormatada)}${tagHistorico}</td>
            <td>${escaparHTML(tipoContagemTexto)}</td>
            <td><span class="badge ${badgeClass}">${escaparHTML(statusTexto)}</span></td>
            <td class="td-acoes-prazos"><div class="acoes-container-prazos">${acoesHTML}</div></td>
        `;
        tbody.appendChild(tr);
    });
}

function consultarPrazo(prazoId) {
    limparFormularioPrazo();

    const prazo = prazos.find(p => String(p.id) === String(prazoId));
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
    const prazo = prazos.find(p => String(p.id) === String(prazoId));
    if (!prazo) return;

    if ((prazo.status || '').toUpperCase() === 'CUMPRIDO') {
        consultarPrazo(prazoId);
        return;
    }

    limparFormularioPrazo();
    prazoEmEdicao = prazo;

    const elVencimento = document.getElementById('dataVencimento');
    if (elVencimento && prazo.dataCadastro) {
        elVencimento.setAttribute('min', prazo.dataCadastro.split('T')[0]);
    } else if (elVencimento) {
        elVencimento.removeAttribute('min');
    }

    document.getElementById('prazoId').value = prazo.id;
    document.getElementById('descPrazo').value = prazo.descricao || '';
    document.getElementById('dataVencimento').value = prazo.dataVencimento ? prazo.dataVencimento.split('T')[0] : '';
    document.getElementById('tipoContagem').value = ((prazo.tipoContagem || prazo.formaContagem || '').toUpperCase() === 'DIAS_UTEIS' || prazo.tipoContagem === 'uteis') ? 'DIAS_UTEIS' : 'DIAS_CORRIDOS';
    if (prazo.dias) document.getElementById('diasPrazo').value = prazo.dias;

    const btnSalvar = document.getElementById('btn-salvar-prazo');
    if (btnSalvar) btnSalvar.innerText = "Salvar / Prorrogar Prazo";
}

async function marcarPrazoComoCumprido(prazoId) {
    const prazo = prazos.find(p => String(p.id) === String(prazoId));
    if (!prazo) return;

    if (confirm(`Deseja marcar o prazo "${prazo.descricao}" como CUMPRIDO?`)) {
        prazo.status = 'CUMPRIDO';
        prazo.cumprido = true;

        renderTabelaPrazos();
        limparFormularioPrazo();

        try {
            await fetch(`/api/prazos/${prazoId}/cumprir`, { method: 'PUT' });
        } catch (e) {
            console.warn("Falha na sincronização do prazo cumprido com o backend.", e);
        }
    }
}

async function salvarPrazo(e) {
    e.preventDefault();

    const casoIdVal = document.getElementById('casoIdParaPrazo').value;
    const descVal = document.getElementById('descPrazo').value.trim();
    const dataVencimentoVal = document.getElementById('dataVencimento').value;
    const tipoContagemVal = document.getElementById('tipoContagem').value;
    const diasVal = document.getElementById('diasPrazo').value;
    const prazoIdVal = document.getElementById('prazoId').value;

    let casoEncontrado = casos.find(c => String(c.id) === String(casoIdVal));
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

    const dataCadastroRef = (prazoEmEdicao && prazoEmEdicao.dataCadastro)
        ? prazoEmEdicao.dataCadastro.split('T')[0]
        : hojeStr;

    if (dataVencimentoVal < dataCadastroRef) {
        mostrarErroPrazo(`<strong>RN011:</strong> A data de vencimento (${dataVencimentoVal}) não pode ser anterior ao cadastro (${dataCadastroRef}).`);
        return;
    }

    let historicoAtualizado = prazoEmEdicao && prazoEmEdicao.historico ? [...prazoEmEdicao.historico] : [];
    const dataVencAnterior = prazoEmEdicao && prazoEmEdicao.dataVencimento ? prazoEmEdicao.dataVencimento.split('T')[0] : null;

    if (prazoEmEdicao && dataVencAnterior && dataVencAnterior !== dataVencimentoVal) {
        historicoAtualizado.push({
            dataAnterior: dataVencAnterior,
            novaData: dataVencimentoVal,
            dataAlteracao: new Date().toISOString()
        });
    }

    const payloadBackendPrazo = {
        caso: { id: converterIdSeguro(casoIdVal) },
        casoId: converterIdSeguro(casoIdVal),
        descricao: descVal,
        dias: diasVal ? parseInt(diasVal, 10) : null,
        dataVencimento: dataVencimentoVal,
        tipoContagem: tipoContagemVal,
        formaContagem: tipoContagemVal,
        status: prazoEmEdicao ? (prazoEmEdicao.status || 'PENDENTE').toUpperCase() : 'PENDENTE',
        cumprido: prazoEmEdicao ? (prazoEmEdicao.cumprido || false) : false,
        dataCadastro: prazoEmEdicao ? prazoEmEdicao.dataCadastro : hojeStr,
        historico: historicoAtualizado
    };

    if (prazoIdVal) {
        payloadBackendPrazo.id = converterIdSeguro(prazoIdVal);
    }

    const payloadPrazoLocal = {
        ...payloadBackendPrazo,
        id: prazoIdVal ? converterIdSeguro(prazoIdVal) : Date.now()
    };

    if (!casoEncontrado.prazos) casoEncontrado.prazos = [];

    const idx = casoEncontrado.prazos.findIndex(p => String(p.id) === String(payloadPrazoLocal.id));
    if (idx >= 0) {
        casoEncontrado.prazos[idx] = payloadPrazoLocal;
    } else {
        casoEncontrado.prazos.push(payloadPrazoLocal);
    }

    prazos = casoEncontrado.prazos;

    limparFormularioPrazo();
    renderTabelaPrazos();

    try {
        const urlDestino = prazoIdVal ? `/api/prazos/${prazoIdVal}` : `/api/casos/${casoIdVal}/prazos`;
        const metodoHttp = prazoIdVal ? 'PUT' : 'POST';

        const resposta = await fetch(urlDestino, {
            method: metodoHttp,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadBackendPrazo)
        });

        if (resposta.ok) {
            const prazoBackend = await resposta.json();
            if (prazoBackend && prazoBackend.id) {
                const pos = casoEncontrado.prazos.findIndex(p => String(p.id) === String(payloadPrazoLocal.id));
                if (pos >= 0) {
                    casoEncontrado.prazos[pos] = prazoBackend;
                    prazos = casoEncontrado.prazos;
                    renderTabelaPrazos();
                }
            }
        }
    } catch (erro) {
        console.warn("Servidor offline. Prazo mantido localmente.");
    }
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

// ==========================================
// PAINEL CONSOLIDADO DE PRAZOS
// ==========================================

let prazosConsolidados = [];

function obterTodosOsPrazosConsolidados() {
    const lista = [];
    casos.forEach(caso => {
        const cnjFormatado = formatarCNJ((caso.numeroProcesso || caso.processo || '').replace(/\D/g, ''));
        if (Array.isArray(caso.prazos)) {
            caso.prazos.forEach(prazo => {
                lista.push({
                    ...prazo,
                    numeroProcesso: cnjFormatado,
                    statusCalculado: calcularStatusPrazo(prazo)
                });
            });
        }
    });
    return lista;
}

function abrirPainelGeralPrazos() {
    const modal = document.getElementById('modal-painel-geral');
    if (!modal) return;

    prazosConsolidados = obterTodosOsPrazosConsolidados();
    
    const filtroSelect = document.getElementById('filtroStatusPainel');
    if (filtroSelect) filtroSelect.value = 'TODOS';

    renderTabelaPainelGeral(prazosConsolidados);
    modal.style.display = 'flex';
}

function fecharModalPainelGeral() {
    const modal = document.getElementById('modal-painel-geral');
    if (modal) modal.style.display = 'none';
}

function filtrarPainelPrazos() {
    const filtro = document.getElementById('filtroStatusPainel').value;
    
    if (filtro === 'TODOS') {
        renderTabelaPainelGeral(prazosConsolidados);
        return;
    }

    const filtrados = prazosConsolidados.filter(prazo => prazo.statusCalculado === filtro);
    renderTabelaPainelGeral(filtrados);
}

function renderTabelaPainelGeral(listaPrazos) {
    const tbody = document.getElementById('tabela-corpo-painel-geral');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!listaPrazos || listaPrazos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #777; font-style: italic;">
                    Nenhum prazo encontrado para os filtros selecionados.
                </td>
            </tr>
        `;
        return;
    }

    listaPrazos.forEach(prazo => {
        const tr = document.createElement('tr');
        
        let classeLinha = '';
        let badgeClass = '';
        let statusTexto = '';

        switch (prazo.statusCalculado) {
            case 'CUMPRIDO':
                classeLinha = 'linha-cumprido';
                badgeClass = 'badge-encerrado';
                statusTexto = 'Cumprido';
                break;
            case 'VENCIDO':
                classeLinha = 'linha-vencido';
                badgeClass = 'badge-danger';
                statusTexto = 'VENCIDO';
                break;
            case 'PROXIMO':
                classeLinha = 'linha-proximo';
                badgeClass = 'badge-warning';
                statusTexto = 'Atenção';
                break;
            default:
                classeLinha = '';
                badgeClass = 'badge-ativo';
                statusTexto = 'Em dia';
                break;
        }

        tr.className = classeLinha;

        const dataVencStr = prazo.dataVencimento ? prazo.dataVencimento.split('T')[0] : '';
        const partesData = dataVencStr.split('-');
        const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}/${partesData[0]}` : dataVencStr;
        const idEscapado = escaparHTML(String(prazo.id));

        tr.innerHTML = `
            <td>${escaparHTML(prazo.numeroProcesso)}</td>
            <td>${escaparHTML(prazo.descricao)}</td>
            <td>${escaparHTML(dataFormatada)}</td>
            <td><span class="badge ${badgeClass}">${escaparHTML(statusTexto)}</span></td>
            <td class="td-acoes-prazos">
                <div class="acoes-container-prazos">
                    <a href="#" class="link-acao-prazo" style="color: #6c757d;" onclick="abrirModalHistoricoPrazo('${idEscapado}')">📜 Histórico</a>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// CONSULTA DE HISTÓRICO DE ALTERAÇÕES
// ==========================================

function abrirModalHistoricoPrazo(prazoId) {
    let prazoEncontrado = null;

    for (const caso of casos) {
        if (Array.isArray(caso.prazos)) {
            const p = caso.prazos.find(item => String(item.id) === String(prazoId));
            if (p) {
                prazoEncontrado = p;
                break;
            }
        }
    }

    if (!prazoEncontrado) {
        alert("Erro: Prazo não encontrado para carregar o histórico.");
        return;
    }

    const modal = document.getElementById('modal-historico-prazo');
    const subtitulo = document.getElementById('subtitulo-historico');
    const tbody = document.getElementById('tabela-corpo-historico');

    if (!modal || !tbody) return;

    subtitulo.innerText = `Histórico do Prazo: "${prazoEncontrado.descricao}"`;
    tbody.innerHTML = '';

    const historico = prazoEncontrado.historico || [];

    if (historico.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 25px; color: #777; font-style: italic;">
                    Nenhuma alteração registrada para este prazo.
                </td>
            </tr>
        `;
    } else {
        historico.forEach(item => {
            const tr = document.createElement('tr');

            const dtAnt = item.dataAnterior ? item.dataAnterior.split('-').reverse().join('/') : '-';
            const dtNova = item.novaData ? item.novaData.split('-').reverse().join('/') : '-';
            const dtAlt = formatarDataHoraBR(item.dataAlteracao);

            tr.innerHTML = `
                <td>${escaparHTML(dtAnt)}</td>
                <td><strong>${escaparHTML(dtNova)}</strong></td>
                <td>${escaparHTML(dtAlt)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    modal.style.display = 'flex';
}

function fecharModalHistorico() {
    const modal = document.getElementById('modal-historico-prazo');
    if (modal) modal.style.display = 'none';
}

// ==========================================
// CONTROLE DO MENU LATERAL (SIDEBAR RETRÁTIL)
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('expanded');
    }
}