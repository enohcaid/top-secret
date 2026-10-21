// Calendario por competencia (pedido de Juan, 2026-10-21: "ocultar los torneos que ya pasaron y que se puedan desplegar;
// una forma intuitiva, dinámica y organizada"). Agrupa los partidos de la temporada elegida por torneo:
//   EN CURSO   — abiertos, a todo el ancho: estado, avance (jugados / total), récord, próximo partido y todas las fechas
//   FINALIZADOS — cerrados, en grilla: resumen (fechas, récord, goles); se despliegan con un clic
// El torneo de cada partido: los de RAW por el bloque "// ══ <LIGA> T? — <torneo> ══" bajo el que están en calendario.html
// (se lee del propio <script>, mismo criterio que scripts/placa-envivo.mjs); playoffs por m.playoff; los cargados a mano
// (Firestore calendario/estado.custom) por liga + instancia ("Fecha N" = fase regular); amistosos aparte.
// Datos: window.TSCal (lo expone el script principal). La vista "Por mes" (la grilla de siempre) sigue disponible.
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const TEMP = { t4: 'Temporada 4', t3: 'Temporada 3', t2: 'Temporada 2', t1: 'Temporada 1' };
  const LGKEY = { VPN: 'vpn', VPUG: 'vpug', '11x11': 'e11' };
  const fechaCorta = d => { const x = new Date(d + 'T12:00:00'); return `${x.getDate()} ${MES[x.getMonth()].toLowerCase()}`; };

  // ── Torneo de cada partido de RAW: las cabeceras de bloque del propio script ──
  let cabeceras = null;
  function cabecerasRAW(n) {
    if (cabeceras) return cabeceras;
    const s = [...document.scripts].find(x => x.textContent.includes('const RAW = ['))?.textContent || '';
    const ini = s.indexOf('const RAW = ['), fin = s.indexOf('\n];', ini);
    const out = []; let cab = '';
    for (const l of s.slice(ini, fin).split('\n')) {
      const h = l.match(/\/\/\s*══\s*(.*?)\s*══/);
      if (h) cab = h[1]; else if (/^\s*\{\s*date\s*:/.test(l)) out.push(cab);
    }
    cabeceras = out.length === n ? out : [];          // si no cuadra con RAW, sin nombres (queda la liga)
    return cabeceras;
  }
  const titulo = t => t.replace(/\b(\p{Lu})(\p{Lu}+)\b/gu, (_, a, b) => a + b.toLowerCase());
  function nombreDeCabecera(h, liga) {
    if (!h) return null;
    if (/playoff/i.test(h)) return 'Playoffs';
    const t = (h.split(/\s+—\s+/)[1] || '');
    if (!t) return null;                                // "SEMANA 2-5 MARZO": fase regular de la liga
    const n = t.replace(/\(.*?\)/g, '').replace(/#\d+/g, '').replace(new RegExp('\\b' + liga + '\\b', 'gi'), '')
      .replace(/\s*,\s*/g, ' · ').replace(/\s+/g, ' ').replace(/^[\s·]+|[\s·]+$/g, '').trim();
    return !n || /^temporada\b|^partidos jugados/i.test(n) ? null : titulo(n);
  }

  // ── Agrupar ──
  function competencias() {
    const C = window.TSCal; if (!C) return [];
    const ps = C.partidos(), cabs = cabecerasRAW(C.cantidadRAW());
    const mapa = new Map();
    for (const p of ps) {
      const m = p.m; if (!m || !m.date) continue;
      if (m.tipo && m.tipo !== 'partido') continue;     // entrenamientos y otros eventos no van acá
      const amistoso = !m.league || m.league === 'Amistoso';
      const liga = amistoso ? 'Amistosos' : C.lgLabel(m);
      let nombre = null;
      if (amistoso) nombre = null;
      else if (m.playoff) nombre = m.playoff.replace(/\s*·\s*(Ida|Vuelta)$/i, '');
      else if (typeof p.id === 'number') nombre = nombreDeCabecera(cabs[p.id], m.league);
      else if (m.instancia && !/^Fecha\s*\d+/i.test(m.instancia)) nombre = m.instancia;
      const clave = `${p.season}|${liga}|${nombre || ''}`;
      if (!mapa.has(clave)) mapa.set(clave, { clave, season: p.season, liga, ligaKey: amistoso ? 'amis' : (LGKEY[m.league] || 'amis'), nombre, partidos: [] });
      mapa.get(clave).partidos.push(p);
    }
    const hoy = C.hoy();
    return [...mapa.values()].map(c => {
      c.partidos.sort((a, b) => a.m.date.localeCompare(b.m.date) || (a.m.time || '').localeCompare(b.m.time || ''));
      const jug = c.partidos.filter(p => p.outcome);
      const r = { pj: jug.length, g: 0, e: 0, p: 0, gf: 0, gc: 0 };
      for (const p of jug) {
        r[p.outcome === 'win' ? 'g' : p.outcome === 'loss' ? 'p' : 'e']++;
        const [a, b] = String(p.score || '').split(/\s*[–-]\s*/).map(Number);   // scoreDisplay: Top Secret primero
        if (!isNaN(a) && !isNaN(b)) { r.gf += a; r.gc += b; }
      }
      const pendientes = c.partidos.filter(p => !p.outcome && p.m.date >= hoy);
      return { ...c, r, enCurso: pendientes.length > 0, proximo: pendientes[0] || null,
        desde: c.partidos[0].m.date, hasta: c.partidos[c.partidos.length - 1].m.date };
    });
  }

  // ── Dibujar ──
  const abiertas = (() => { try { return JSON.parse(localStorage.getItem('ts_cal_abiertas') || '{}'); } catch { return {}; } })();
  const guardar = () => { try { localStorage.setItem('ts_cal_abiertas', JSON.stringify(abiertas)); } catch {} };

  function fila(p, hoy, C) {
    const m = p.m, d = new Date(m.date + 'T12:00:00');
    const crest = m.badge || C.vpnBadge?.(m.rival) || null;
    const ini = (m.rival || '').split(/\s+/).filter(w => /^[A-Za-zÁÉÍÓÚÑ0-9]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const etapa = m.playoff ? (m.playoff.match(/(Ida|Vuelta)$/i) || [])[1] : (m.instancia || (m.round ? `Fecha ${m.round}` : ''));
    const der = p.outcome ? `<span class="mmi-score">${esc(p.score.replace('–', '-'))}</span>` : `<span class="mmi-pending">${esc(m.time || '—')}</span>`;
    const cls = `month-match-item${p.outcome ? ' mmi-' + p.outcome : ''}${m.date === hoy ? ' mmi-today' : ''}`;
    const idJs = typeof p.id === 'string' ? `'${p.id}'` : p.id;
    return `<div class="${cls}" onclick="openStatsPanel(${idJs})">
      <span class="mmi-date"><b>${d.getDate()}</b><small>${MES[d.getMonth()]}</small></span>
      <span class="mmi-crest">${crest ? `<img src="${esc(crest)}" alt="" loading="lazy" onerror="this.replaceWith('${ini}')">` : ini}</span>
      <div class="mmi-main"><span class="mmi-rival">${esc(m.rival || '?')}</span>
        <span class="mmi-meta">${DIA[d.getDay()]} · ${m.isHome ? 'Local' : 'Visita'}${etapa ? ' · ' + esc(etapa) : ''}</span></div>
      ${der}</div>`;
  }

  function tarjeta(c, hoy, C) {
    const abierta = c.clave in abiertas ? abiertas[c.clave] : c.enCurso;
    const total = c.partidos.length, jug = c.r.pj;
    const rec = jug ? `${c.r.g}G ${c.r.e}E ${c.r.p}P · ${c.r.gf}-${c.r.gc}` : 'Sin jugar';
    const prox = c.proximo ? (() => { const d = new Date(c.proximo.m.date + 'T12:00:00'); return `${c.proximo.m.date === hoy ? 'HOY' : DIA[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1)} · ${c.proximo.m.time || ''} · vs ${c.proximo.m.rival}`; })() : '';
    const chip = c.ligaKey === 'amis' ? 'AMI' : c.liga === 'Espacio Gamer' ? 'EG' : c.liga;
    return `<section class="comp-card ${c.enCurso ? 'en-curso' : 'fin'}${abierta ? ' abierta' : ''}" data-clave="${esc(c.clave)}">
      <button class="comp-head" type="button" aria-expanded="${abierta}">
        <span class="nh-lbadge ${c.ligaKey}">${esc(chip)}</span>
        <span class="comp-tit"><b>${esc(c.liga === 'Amistosos' ? 'Amistosos' : c.liga)}</b>${c.nombre ? `<span>${esc(c.nombre)}</span>` : ''}</span>
        <span class="comp-estado">${c.enCurso ? '<i></i>EN CURSO' : 'FINALIZADO'}</span>
        <span class="comp-chev" aria-hidden="true">▾</span>
      </button>
      <div class="comp-resumen">
        <span>${fechaCorta(c.desde)}${c.hasta !== c.desde ? ' – ' + fechaCorta(c.hasta) : ''}</span>
        <span>${total} ${total === 1 ? 'partido' : 'partidos'}</span>
        <span class="comp-rec">${rec}</span>
      </div>
      ${c.enCurso ? `<div class="comp-avance"><div class="barra"><i style="width:${Math.round(100 * jug / total)}%"></i></div><span>${jug} de ${total} jugados</span></div>
        ${prox ? `<div class="comp-prox"><span>PRÓXIMO</span>${esc(prox)}</div>` : ''}` : ''}
      <div class="comp-body"><div class="month-match-list">${c.partidos.map(p => fila(p, hoy, C)).join('')}</div></div>
    </section>`;
  }

  function render() {
    const raiz = $('#compGrid'), C = window.TSCal; if (!raiz || !C) return;
    const vista = vistaActual(), temp = C.temporada();
    const porMes = vista === 'mes' || temp === 'pre';   // PRE (Invierno VPUG de CopáFácil) usa su propia sección
    raiz.hidden = porMes; $('#yearGrid').hidden = !porMes;
    document.querySelectorAll('.vista-btn').forEach(b => b.classList.toggle('active', b.dataset.vista === (porMes ? 'mes' : 'comp')));
    if (porMes) return;
    const hoy = C.hoy();
    const todas = competencias().filter(c => temp === 'all' || c.season === temp);
    const temporadas = temp === 'all' ? ['t4', 't3', 't2', 't1'] : [temp];
    let html = '';
    for (const t of temporadas) {
      const cs = todas.filter(c => c.season === t); if (!cs.length) continue;
      const vivos = cs.filter(c => c.enCurso).sort((a, b) => a.proximo.m.date.localeCompare(b.proximo.m.date));
      const fin = cs.filter(c => !c.enCurso).sort((a, b) => b.hasta.localeCompare(a.hasta));
      if (temp === 'all') html += `<div class="comp-temp">${TEMP[t] || t}</div>`;
      if (vivos.length) html += `<div class="comp-grupo"><div class="comp-grupo-tit">En curso</div><div class="comp-lista vivos">${vivos.map(c => tarjeta(c, hoy, C)).join('')}</div></div>`;
      if (fin.length) html += `<div class="comp-grupo"><div class="comp-grupo-tit">Finalizados <span>${fin.length}</span></div><div class="comp-lista fins">${fin.map(c => tarjeta(c, hoy, C)).join('')}</div></div>`;
    }
    raiz.innerHTML = html || '<div class="comp-vacio">Sin partidos en esta temporada.</div>';
  }

  // abrir / cerrar una tarjeta (se recuerda en este navegador)
  document.addEventListener('click', e => {
    const h = e.target.closest('.comp-head'); if (!h) return;
    const card = h.closest('.comp-card'), ab = !card.classList.contains('abierta');
    card.classList.toggle('abierta', ab); h.setAttribute('aria-expanded', ab);
    abiertas[card.dataset.clave] = ab; guardar();
  });

  function vistaActual() { try { return localStorage.getItem('ts_cal_vista') || 'comp'; } catch { return 'comp'; } }
  window.setVistaCal = v => { try { localStorage.setItem('ts_cal_vista', v); } catch {} render(); };
  window.TSComp = { render };
})();
