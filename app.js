/* ========================================================================
   APP.JS — navegação Bloco → Semana/Ciclo → Dia, estado local e renderização
   ======================================================================== */

const STORAGE_KEY = 'treinohibrido.state.v1';
const DONE_KEY = 'treinohibrido.done.v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { blocoId: 'b1', semana: 1, cicloId: 'forca', semanaCiclo: 1, diaKey: hojeKey() };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadDone() {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
}

function saveDone() {
  localStorage.setItem(DONE_KEY, JSON.stringify(Array.from(doneSet)));
}

function hojeKey() {
  const idx = new Date().getDay(); // 0=domingo
  const map = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };
  return map[idx];
}

let state = loadState();
let doneSet = loadDone();

function doneKey() {
  if (state.blocoId === 'b5') return `b5-${state.cicloId}-${state.semanaCiclo}-${state.diaKey}`;
  return `${state.blocoId}-${state.semana}-${state.diaKey}`;
}

/* ---------------------- resolver o plano do dia atual ---------------------- */

function resolverDia() {
  const dia = WEEKDAYS.find(d => d.key === state.diaKey);
  if (dia.tipoBase === 'descanso') {
    return { tipo: 'descanso', dia, info: DESCANSO_INFO };
  }
  if (state.blocoId === 'b1') {
    return dia.tipoBase === 'forca'
      ? { tipo: 'forca', dia, dados: b1Musculacao(state.semana) }
      : { tipo: 'corrida', dia, dados: b1Corrida(state.semana) };
  }
  if (state.blocoId === 'b2') {
    return dia.tipoBase === 'forca'
      ? { tipo: 'forca', dia, dados: b2Musculacao(state.semana, state.diaKey) }
      : { tipo: 'corrida', dia, dados: b2Corrida(state.semana) };
  }
  if (state.blocoId === 'b3') {
    return dia.tipoBase === 'forca'
      ? { tipo: 'forca', dia, dados: b3Musculacao(state.diaKey) }
      : { tipo: 'corrida', dia, dados: b3Corrida(state.semana) };
  }
  if (state.blocoId === 'b4') {
    return dia.tipoBase === 'forca'
      ? { tipo: 'forca', dia, dados: b4Musculacao(state.semana, state.diaKey) }
      : { tipo: 'corrida', dia, dados: b4Corrida(state.semana, state.diaKey) };
  }
  if (state.blocoId === 'b5') {
    return dia.tipoBase === 'forca'
      ? { tipo: 'forca', dia, dados: b5Musculacao(state.cicloId, state.semanaCiclo, state.diaKey) }
      : { tipo: 'corrida', dia, dados: b5Corrida() };
  }
}

/* ---------------------- render: seletores (bloco / semana / dia) ---------------------- */

const el = sel => document.querySelector(sel);

function renderBlocoSeletor() {
  const wrap = el('#bloco-seletor');
  wrap.innerHTML = '';
  const todos = BLOCKS.concat([B5_META]);
  todos.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'pill' + (state.blocoId === b.id ? ' active' : '');
    btn.textContent = `B${b.numero}`;
    btn.onclick = () => {
      state.blocoId = b.id;
      if (b.id === 'b5') {
        if (!state.cicloId) state.cicloId = 'forca';
        if (!state.semanaCiclo) state.semanaCiclo = 1;
      } else {
        state.semana = b.semanas[0];
      }
      saveState();
      renderAll();
    };
    wrap.appendChild(btn);
  });
}

function renderSemanaSeletor() {
  const wrap = el('#semana-seletor');
  wrap.innerHTML = '';

  if (state.blocoId === 'b5') {
    const rowCiclo = document.createElement('div');
    rowCiclo.className = 'sub-row';
    B5_CICLOS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'pill pill-ciclo' + (state.cicloId === c.id ? ' active' : '');
      btn.textContent = c.nome;
      btn.onclick = () => { state.cicloId = c.id; saveState(); renderAll(); };
      rowCiclo.appendChild(btn);
    });
    wrap.appendChild(rowCiclo);

    const rowSemana = document.createElement('div');
    rowSemana.className = 'sub-row scroll-x';
    range(1, 7).forEach(n => {
      const btn = document.createElement('button');
      btn.className = 'pill pill-week' + (state.semanaCiclo === n ? ' active' : '') + (n === 7 ? ' deload' : '');
      btn.textContent = n === 7 ? 'Deload' : `S${n}`;
      btn.onclick = () => { state.semanaCiclo = n; saveState(); renderAll(); };
      rowSemana.appendChild(btn);
    });
    wrap.appendChild(rowSemana);
    return;
  }

  const bloco = BLOCKS.find(b => b.id === state.blocoId);
  const row = document.createElement('div');
  row.className = 'sub-row scroll-x';
  bloco.semanas.forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'pill pill-week' + (state.semana === n ? ' active' : '');
    btn.textContent = n;
    btn.onclick = () => { state.semana = n; saveState(); renderAll(); };
    row.appendChild(btn);
  });
  wrap.appendChild(row);
}

function renderDiaSeletor() {
  const wrap = el('#dia-seletor');
  wrap.innerHTML = '';
  WEEKDAYS.forEach(d => {
    const btn = document.createElement('button');
    const key = state.blocoId === 'b5' ? `b5-${state.cicloId}-${state.semanaCiclo}-${d.key}` : `${state.blocoId}-${state.semana}-${d.key}`;
    const isDone = doneSet.has(key);
    btn.className = 'day-btn tipo-' + d.tipoBase + (state.diaKey === d.key ? ' active' : '') + (isDone ? ' done' : '');
    btn.innerHTML = `<span>${d.label}</span>${isDone ? '<i class="check">✓</i>' : ''}`;
    btn.onclick = () => { state.diaKey = d.key; saveState(); renderAll(); };
    wrap.appendChild(btn);
  });
}

/* ---------------------- render: card principal do dia ---------------------- */

function tipoBadge(tipo) {
  if (tipo === 'forca') return '<span class="badge-tipo forca">Musculação</span>';
  if (tipo === 'corrida') return '<span class="badge-tipo corrida">Corrida</span>';
  return '<span class="badge-tipo descanso">Descanso</span>';
}

function renderExercicioCard(ex) {
  const linhas = [];
  linhas.push(`<div class="stat-line"><span>Séries</span><b>${ex.series ?? '—'}</b></div>`);
  linhas.push(`<div class="stat-line"><span>Reps</span><b>${ex.reps ?? '—'}</b></div>`);
  if (ex.rir) linhas.push(`<div class="stat-line"><span>RIR</span><b>${ex.rir}</b></div>`);
  if (ex.descanso) linhas.push(`<div class="stat-line"><span>Descanso</span><b>${ex.descanso}</b></div>`);
  return `
    <div class="ex-card ${ex.principal === false ? 'acessorio' : (ex.principal ? 'principal' : '')}">
      <div class="ex-nome">${ex.nome}${ex.principal !== undefined ? `<span class="ex-tag">${ex.principal ? 'principal' : 'acessório'}</span>` : ''}</div>
      <div class="ex-stats">${linhas.join('')}</div>
    </div>`;
}

function renderForca(dados) {
  let html = `<h2 class="dia-titulo">${dados.titulo}</h2>`;
  if (dados.faseLabel) html += `<div class="fase-chip ${dados.deload ? 'deload' : ''}">${dados.faseLabel}</div>`;
  if (dados.globalEsforco || dados.globalDescanso) {
    html += `<div class="meta-mini">${dados.globalEsforco ? `Esforço: <b>${dados.globalEsforco}</b>` : ''}${dados.globalDescanso ? ` · Descanso: <b>${dados.globalDescanso}</b>` : ''}</div>`;
  }
  html += `<div class="aquecimento-mini">🔸 Aquecimento: ${AQUECIMENTO_PADRAO}</div>`;
  html += '<div class="ex-list">' + dados.exercicios.map(renderExercicioCard).join('') + '</div>';
  if (dados.nota) html += `<div class="callout">${dados.nota}</div>`;
  return html;
}

function renderSequenciaPrincipal(p) {
  if (p.tipo === 'continuo') {
    return `<div class="seq-step principal"><div class="seq-label">PARTE PRINCIPAL</div><div class="seq-body"><b>${p.duracao}</b><br>${p.descricao}</div></div>`;
  }
  return `<div class="seq-step principal"><div class="seq-label">PARTE PRINCIPAL</div><div class="seq-body"><b>${p.trote}</b> + <b>${p.caminhada}</b><br>Repetir ${p.repeticoes}</div></div>`;
}

function renderCorrida(dados) {
  let html = `<h2 class="dia-titulo">${dados.titulo}</h2>`;
  html += `<div class="meta-mini">RPE-alvo: <b>${dados.rpeAlvo}</b></div>`;
  html += '<div class="sequencia">';
  html += `<div class="seq-step"><div class="seq-label">AQUECIMENTO</div><div class="seq-body">${dados.aquecimento}</div></div>`;
  html += `<div class="seq-arrow">↓</div>`;
  html += renderSequenciaPrincipal(dados.principal);
  html += `<div class="seq-arrow">↓</div>`;
  html += `<div class="seq-step"><div class="seq-label">DESAQUECIMENTO</div><div class="seq-body">${dados.desaquecimento}</div></div>`;
  html += '</div>';
  if (dados.nota) html += `<div class="callout cardio">${dados.nota}</div>`;
  (dados.criterios || []).forEach(c => { html += `<div class="callout alerta">${c}</div>`; });
  if (dados.criterios && dados.criterios.length === 0) {
    html += `<div class="callout">Sem critério fixo de avanço — no Bloco 5 você escolhe o próximo ciclo conforme seu objetivo do momento (veja "Sobre este bloco" em Mais).</div>`;
  }
  return html;
}

function renderDescanso(info) {
  return `<h2 class="dia-titulo">${info.titulo}</h2><div class="callout rest">${info.texto}</div>`;
}

function renderConteudoDia() {
  const resolvido = resolverDia();
  const wrap = el('#conteudo-dia');
  let html = `<div class="dia-header">${tipoBadge(resolvido.tipo)}<span class="dia-nome">${resolvido.dia.full}</span></div>`;
  if (resolvido.tipo === 'forca') html += renderForca(resolvido.dados);
  else if (resolvido.tipo === 'corrida') html += renderCorrida(resolvido.dados);
  else html += renderDescanso(resolvido.info);
  wrap.innerHTML = html;

  const btnDone = el('#btn-concluido');
  if (resolvido.tipo === 'descanso') {
    btnDone.style.display = 'none';
  } else {
    btnDone.style.display = 'flex';
    const marcado = doneSet.has(doneKey());
    btnDone.classList.toggle('marcado', marcado);
    btnDone.innerHTML = marcado ? '✓ Treino concluído' : 'Marcar como concluído';
  }
}

function renderContexto() {
  let label;
  if (state.blocoId === 'b5') {
    const ciclo = b5Ciclo(state.cicloId);
    label = `Bloco 5 · Ciclo ${ciclo.nome} · ${state.semanaCiclo === 7 ? 'Deload' : 'Semana ' + state.semanaCiclo}`;
  } else {
    const bloco = BLOCKS.find(b => b.id === state.blocoId);
    label = `Bloco ${bloco.numero} · ${bloco.nome} · Semana ${state.semana}`;
  }
  el('#contexto-atual').textContent = label;
}

function renderProgressoSemana() {
  const wrap = el('#progresso-semana');
  const treinoKeys = WEEKDAYS.filter(d => d.tipoBase !== 'descanso').map(d => {
    return state.blocoId === 'b5' ? `b5-${state.cicloId}-${state.semanaCiclo}-${d.key}` : `${state.blocoId}-${state.semana}-${d.key}`;
  });
  const feitos = treinoKeys.filter(k => doneSet.has(k)).length;
  wrap.textContent = `${feitos}/${treinoKeys.length} treinos concluídos nesta semana`;
}

function renderAll() {
  renderBlocoSeletor();
  renderSemanaSeletor();
  renderDiaSeletor();
  renderContexto();
  renderConteudoDia();
  renderProgressoSemana();
}

/* ---------------------- ações ---------------------- */

el('#btn-concluido').addEventListener('click', () => {
  const k = doneKey();
  if (doneSet.has(k)) doneSet.delete(k); else doneSet.add(k);
  saveDone();
  renderDiaSeletor();
  renderConteudoDia();
  renderProgressoSemana();
});

el('#btn-hoje').addEventListener('click', () => {
  state.diaKey = hojeKey();
  saveState();
  renderAll();
});

/* ---------------------- painel "Mais" (informações secundárias) ---------------------- */

function conteudoMais() {
  const bloco = state.blocoId === 'b5' ? B5_META : BLOCKS.find(b => b.id === state.blocoId);
  const sections = [];

  sections.push({
    titulo: 'Sobre este bloco',
    html: `<p>${bloco.objetivo}</p>`,
  });

  sections.push({
    titulo: 'Progressão da musculação (dupla progressão)',
    html: '<ol>' + PROGRESSAO_MUSCULACAO.map(t => `<li>${t}</li>`).join('') + '</ol>',
  });

  sections.push({
    titulo: 'Critérios gerais para avançar, manter ou regredir',
    html: '<table>' + CRITERIOS_GERAIS.map(c => `<tr><td>${c.sinal}</td><td><b>${c.acao}</b></td></tr>`).join('') + '</table>',
  });

  sections.push({
    titulo: 'RPE e RIR',
    html: `<p><b>RPE</b> — ${RPE_RIR_GLOSSARIO.rpe.split('— ')[1]}</p><p><b>RIR</b> — ${RPE_RIR_GLOSSARIO.rir.split('— ')[1]}</p>`,
  });

  sections.push({
    titulo: 'Recuperação e prevenção de lesões',
    html: '<ul>' + RECUPERACAO.basica.map(r => `<li><b>${r.label}:</b> ${r.texto}</li>`).join('') + '</ul>'
      + `<p class="alerta-txt">${RECUPERACAO.procurarAjuda}</p>`
      + `<p>${RECUPERACAO.excessoDeTreino}</p>`,
  });

  sections.push({
    titulo: 'Semanas ruins e retorno após pausas',
    html: '<ul>' + RETORNO_PAUSAS.map(t => `<li>${t}</li>`).join('') + '</ul>',
  });

  sections.push({
    titulo: 'Marcos de evolução',
    html: '<ol>' + MARCOS.map(m => `<li>${m}</li>`).join('') + '</ol>',
  });

  return sections;
}

function renderMais() {
  const wrap = el('#mais-conteudo');
  wrap.innerHTML = conteudoMais().map((s, i) => `
    <details class="accordion" ${i === 0 ? 'open' : ''}>
      <summary>${s.titulo}</summary>
      <div class="accordion-body">${s.html}</div>
    </details>`).join('');
}

function abrirMais() {
  renderMais();
  el('#mais-sheet').classList.add('aberto');
  el('#mais-backdrop').classList.add('aberto');
}
function fecharMais() {
  el('#mais-sheet').classList.remove('aberto');
  el('#mais-backdrop').classList.remove('aberto');
}
el('#btn-mais').addEventListener('click', abrirMais);
el('#mais-fechar').addEventListener('click', fecharMais);
el('#mais-backdrop').addEventListener('click', fecharMais);

/* ---------------------- espaço reservado para a barra fixa inferior ---------------------- */
/* Mede a altura real de .acoes (sem a safe-area, que é somada à parte na
   fórmula do CSS) e atualiza --acoes-h, para que o padding-bottom do body
   nunca fique curto nem sobre — funciona em qualquer tela, com qualquer
   quantidade de conteúdo, sem valores fixos "no chute". */

function medirSafeBottomPx() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed; left:0; bottom:0; height:0; margin:0; border:0; padding:0; padding-bottom:env(safe-area-inset-bottom, 0px); visibility:hidden; pointer-events:none;';
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px;
}

function ajustarEspacoRodape() {
  const acoes = document.querySelector('.acoes');
  if (!acoes) return;
  const alturaTotal = acoes.getBoundingClientRect().height;
  const safeBottom = medirSafeBottomPx();
  const alturaSemSafeArea = Math.max(0, Math.round(alturaTotal - safeBottom));
  document.documentElement.style.setProperty('--acoes-h', alturaSemSafeArea + 'px');
}

window.addEventListener('load', ajustarEspacoRodape);
window.addEventListener('resize', ajustarEspacoRodape);
window.addEventListener('orientationchange', ajustarEspacoRodape);
if ('ResizeObserver' in window) {
  const acoesEl = document.querySelector('.acoes');
  if (acoesEl) new ResizeObserver(ajustarEspacoRodape).observe(acoesEl);
}

/* ---------------------- init ---------------------- */

renderAll();
ajustarEspacoRodape();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
