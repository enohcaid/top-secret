// estadisticas.html — "Informe de rendimiento": una sola página larga que se recorre con el scroll.
// Versión de los módulos (?v=N en cada import y en estadisticas.html): subirla en TODOS al cambiar cualquiera,
// porque GitHub Pages cachea cada archivo ~10 min y un módulo nuevo con otro viejo rompe la página.
// Datos: estadisticas-datos.js · gráficos SVG: estadisticas-graficos.js · animación: estadisticas-motion.js
import * as D from './estadisticas-datos.js?v=4';
import * as G from './estadisticas-graficos.js?v=4';
import * as M from './estadisticas-motion.js?v=4';
import { mountClubEA } from './estadisticas-club-ea.js?v=4';

const $ = (s, r = document) => r.querySelector(s);
const esc = D.esc;
const num = (v, dec = 0) => v == null ? '—' : (+v).toFixed(dec).replace('.', ',');
const cnt = (v, dec = 0, pre = '', suf = '') => v == null ? '—' : `<span data-count="${v}" data-dec="${dec}" data-prefix="${pre}" data-suffix="${suf}">${pre}${num(v, dec)}${suf}</span>`;
const ratingCls = r => r == null ? '' : r >= 8 ? 'r-hi' : r >= 6.5 ? 'r-mid' : 'r-lo';

// ── Estado (se refleja en la URL: ?t=3&c=l:VPN) ──
const qs = new URLSearchParams(location.search);
const state = {
  season: D.SEASONS.some(s => s.n === +qs.get('t')) ? +qs.get('t') : D.CURRENT_SEASON,
  comp: qs.get('c') || 'all', sort: 'rating', pos: 'all', radar: 'all', cmpA: null, cmpB: null,
};
let C = {};   // datos calculados para el estado actual

function compute() {
  const sms = D.matchesOfSeason(state.season);
  const comps = D.competitions(sms, state.season);
  if (!comps.some(c => c.id === state.comp)) state.comp = 'all';
  const ms = D.filterComp(sms, state.comp);
  const players = D.playerAgg(ms, D.rosterOf(state.season));
  C = { sms, comps, ms, team: D.teamAgg(ms), players, played: players.filter(p => p.games > 0), comp: comps.find(c => c.id === state.comp) };
}
const lgLabel = l => D.leagueLabel(l, state.season);

// Imagen con respaldo: si el render no existe queda el monograma con las iniciales.
function photo(p, kind, cls = '') {
  return `<span class="ph ${cls}" data-ini="${esc(D.initials(p.name))}"><img src="${D.playerMedia(p, kind)}" alt="" loading="lazy" decoding="async" onerror="this.remove()"></span>`;
}
function crestHTML(rival, cls = 'crest') {
  const u = D.crest(rival);
  return u ? `<img class="${cls}" src="${u}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${cls} mono',textContent:'${esc(D.initials(rival)).replace(/'/g, '')}'}))">`
    : `<span class="${cls} mono">${esc(D.initials(rival))}</span>`;
}

// ════════ BARRA FIJA: temporada · competencia · secciones ════════
const SECTIONS = [['protagonistas', 'Protagonistas'], ['juego', 'Juego'], ['partidos', 'Partidos'], ['plantel', 'Plantel'], ['comparador', 'Cara a cara'], ['club-ea', 'Club EA']];
function renderBar() {
  $('#stSeasons').innerHTML = D.SEASONS.map(s => `<button class="seg${s.n === state.season ? ' on' : ''}" data-season="${s.n}" aria-pressed="${s.n === state.season}">${s.label}${s.estado === 'En curso' ? '<i class="live" title="En curso"></i>' : ''}</button>`).join('');
  $('#stComps').innerHTML = C.comps.length > 2 || C.comps.some(c => c.id.startsWith('t:'))
    ? C.comps.map(c => `<button class="chip ${c.cls}${c.id === state.comp ? ' on' : ''}" data-comp="${esc(c.id)}">${esc(c.label)}</button>`).join('')
    : '';
  $('#stAnchors').innerHTML = SECTIONS.map(([id, l]) => `<a href="#${id}" data-anchor="${id}">${l}</a>`).join('');
}

// ════════ 1 · MARCADOR ════════
function renderHero() {
  const t = C.team, n = C.ms.length;
  const compTxt = state.comp === 'all' ? '' : ` · ${C.comp.label}`;
  $('#heroSub').innerHTML = `Temporada ${state.season}${esc(compTxt)} · ${n ? `${n} partido${n === 1 ? '' : 's'}` : 'sin partidos todavía'}`;
  const dif = t.gf - t.ga;
  $('#heroScore').innerHTML = `
    <div class="hs"><span class="hs-n">${cnt(n)}</span><span class="hs-l">Partidos</span></div>
    <div class="hs"><span class="hs-n"><b class="c-win">${cnt(t.wins)}</b><i>·</i><b class="c-draw">${cnt(t.draws)}</b><i>·</i><b class="c-loss">${cnt(t.losses)}</b></span><span class="hs-l"><span class="long">Ganados · Empatados · Perdidos</span><span class="short">G · E · P</span></span></div>
    <div class="hs"><span class="hs-n">${cnt(t.gf)}<i>:</i>${cnt(t.ga)}</span><span class="hs-l">Goles · dif. ${dif > 0 ? '+' : ''}${dif}</span></div>
    <div class="hs"><span class="hs-n c-gold">${t.rating != null ? cnt(D.round(t.rating), 1) : '—'}</span><span class="hs-l">Rating promedio</span></div>`;
  const last = C.ms.filter(m => D.wld(m.match_result)).slice(-5);
  $('#heroForm').innerHTML = last.length ? `<span class="hf-l">Últimos ${last.length}</span>` + last.map(m => {
    const c = D.wld(m.match_result);
    return `<button class="hf-m ${c}" data-match="${C.ms.indexOf(m)}" title="${esc(D.fmtDate(m.date))} · vs ${esc(m.rival)}">${crestHTML(m.rival, 'hf-crest')}<span class="hf-s">${esc(m.match_result)}</span><span class="hf-c">${D.wldLetter(c)}</span></button>`;
  }).join('') : '';
}

// ════════ 2 · PROTAGONISTAS ════════
// Los cuatro líderes a la vista: el número manda; foto chica y el top 5 de la categoría para comparar.
function renderLeaders() {
  const L = D.leaders(C.players, C.ms.length);
  const el = $('#protagonistas');
  if (!L.length) { el.innerHTML = secHead('01', 'Protagonistas', '') + empty('Los protagonistas aparecen con el primer partido.'); return; }
  el.innerHTML = `${secHead('01', 'Protagonistas', 'Los líderes de la temporada en cada rubro y quiénes los siguen.')}
    <div class="leads">${L.map(l => {
      const p = l.player;
      const best = l.low ? Math.min(...l.list.map(x => x.value)) : Math.max(...l.list.map(x => x.value));
      const pct = v => l.low ? (best / (v || 1)) * 100 : (v / (best || 1)) * 100;
      return `<article class="lead" data-reveal>
        <p class="lead-kicker">${esc(l.kicker)}${l.note ? `<span>${esc(l.note)}</span>` : ''}</p>
        <div class="lead-top">
          <div class="lead-data">
            <p class="lead-num">${cnt(D.round(l.value, l.dec), l.dec, l.prefix)}<small>${esc(l.unit)}</small></p>
            <button class="lead-name" data-player="${esc(p.name)}">${esc(p.name)}</button>
            <p class="lead-sub">${esc(l.sub)}</p>
          </div>
          <button class="lead-photo" data-player="${esc(p.name)}" aria-label="Perfil de ${esc(p.name)}">${photo(p, 'busto', 'lead-ph')}</button>
        </div>
        <ol class="lead-list">${l.list.map((x, i) => `<li${i ? '' : ' class="first"'}>
          <span class="ll-pos">${i + 1}</span>
          <button class="ll-name" data-player="${esc(x.player.name)}">${esc(x.player.name)}</button>
          <span class="ll-bar"><i style="width:${Math.max(4, Math.round(pct(x.value)))}%" data-bar></i></span>
          <span class="ll-val">${l.prefix}${num(x.value, l.dec)}</span>
        </li>`).join('')}</ol>
      </article>`;
    }).join('')}</div>`;
}

// ════════ 3 · CÓMO JUEGA ════════
function radarSets() {
  const sets = [['all', 'Temporada', C.ms]];
  if (C.ms.length >= 8) sets.push(['first', 'Primeros 5', C.ms.slice(0, 5)], ['last', 'Últimos 5', C.ms.slice(-5)]);
  if (state.comp === 'all') {
    const ligas = [...new Set(C.ms.map(m => m.league))];
    if (ligas.length > 1) ligas.forEach(l => sets.push(['l:' + l, lgLabel(l), C.ms.filter(m => m.league === l)]));
  }
  return sets.filter(s => s[2].some(m => m.team_stats));
}
function renderJuego() {
  const t = C.team, el = $('#juego');
  if (!t.nStats) { el.innerHTML = secHead('02', 'Cómo juega el equipo', '') + empty('Todavía no hay partidos con estadísticas de equipo.'); return; }
  const sets = radarSets();
  if (!sets.some(s => s[0] === state.radar)) state.radar = 'all';
  const cur = sets.find(s => s[0] === state.radar);
  const ax = D.teamRadar(D.teamAgg(cur[2]));
  const bars = [
    ['Pases por partido', t.pases, 0, '', Math.min(100, (t.pases || 0) / 300 * 100), 'var(--e11)'],
    ['Precisión de pase', t.precPases, 0, '%', t.precPases, 'var(--e11)'],
    ['Regates exitosos', t.regates, 0, '', Math.min(100, (t.regates || 0) / 150 * 100), 'var(--gold)'],
    ['Intercepciones', t.intercep, 1, '', Math.min(100, (t.intercep || 0) / 30 * 100), 'var(--vpug)'],
    ['Entradas ganadas', t.tackles, 0, '%', t.tackles, 'var(--vpug)'],
    ['Atajadas', t.paradas, 1, '', Math.min(100, (t.paradas || 0) / 6 * 100), 'var(--muted)'],
    ['Córners', t.corneres, 1, '', Math.min(100, (t.corneres || 0) / 8 * 100), 'var(--muted)'],
    ['Faltas', t.faltas, 1, '', Math.min(100, (t.faltas || 0) / 10 * 100), 'var(--loss)'],
  ].filter(b => b[1] != null);
  const eff = t.xgN >= 3 && t.xgTotal > 0 ? (t.xgGoals / t.xgTotal - 1) * 100 : null;
  el.innerHTML = `${secHead('02', 'Cómo juega el equipo', `Promedio de ${t.nStats} partido${t.nStats === 1 ? '' : 's'} con estadísticas del reporte.`)}
    <div class="juego-top">
      <figure class="arc-fig" data-reveal>${G.arc({ pct: t.posesion, color: 'var(--gold)', label: 'Posesión', sub: 'posesión' })}<figcaption>Tenemos la pelota ${num(t.posesion)}% del partido</figcaption></figure>
      <figure class="arc-fig" data-reveal>${G.arc({ pct: t.arcoPct, color: 'var(--win)', label: 'Tiros al arco', sub: 'al arco' })}<figcaption>${num(t.tirosArco, 1)} de ${num(t.tiros, 1)} tiros por partido van al arco</figcaption></figure>
      <figure class="radar-fig" data-reveal>
        ${G.radar(ax, { size: 340, id: 'teamRadar' })}
        ${sets.length > 1 ? `<div class="radar-modes">${sets.map(s => `<button class="chip${s[0] === state.radar ? ' on' : ''}" data-radar="${esc(s[0])}">${esc(s[1])}</button>`).join('')}</div>` : ''}
      </figure>
    </div>
    <div class="juego-nums" data-stagger>
      <div class="jn"><span class="jn-n">${t.tiros != null ? cnt(D.round(t.tiros), 1) : '—'}</span><span class="jn-l">Tiros por partido</span></div>
      <div class="jn"><span class="jn-n c-gold">${t.xg != null ? cnt(D.round(t.xg), 1) : '—'}</span><span class="jn-l">xG por partido</span></div>
      <div class="jn"><span class="jn-n">${t.precTiro != null ? cnt(Math.round(t.precTiro), 0, '', '%') : '—'}</span><span class="jn-l">Precisión de tiro</span></div>
      <div class="jn"><span class="jn-n">${t.n ? cnt(D.round(t.gf / Math.max(1, t.played), 1), 1) : '—'}</span><span class="jn-l">Goles por partido</span></div>
    </div>
    <div class="juego-bars">${bars.map(b => G.bar({ label: b[0], value: num(b[1], b[2]) + b[3], pct: b[4], color: b[5] })).join('')}</div>
    ${eff != null ? `<p class="statement" data-reveal>Con <b>${num(t.xgTotal, 1)}</b> de goles esperados hicimos <b>${t.xgGoals}</b>: <b class="${eff >= 0 ? 'c-win' : 'c-loss'}">${Math.abs(Math.round(eff))}% ${eff >= 0 ? 'más' : 'menos'}</b> de lo que marcaba el juego.</p>` : ''}`;
}
function setRadar(id) {
  const sets = radarSets(), s = sets.find(x => x[0] === id);
  if (!s) return;
  state.radar = id;
  const ax = D.teamRadar(D.teamAgg(s[2]));
  const svg = $('#teamRadar');
  M.morphRadar(svg.querySelector('[data-radar]'), G.radarPoints(ax, 340));
  svg.querySelectorAll('.g-radar-d').forEach((t, i) => { t.textContent = ax[i].d; });
  document.querySelectorAll('[data-radar].chip').forEach(b => b.classList.toggle('on', b.dataset.radar === id));
}

// ════════ 4 · PARTIDO A PARTIDO ════════
function matchRating(m) { const r = (m.players || []).map(p => p.rating).filter(v => v != null); return r.length ? D.avg(r) : null; }
function renderPartidos() {
  const el = $('#partidos');
  if (!C.ms.length) { el.innerHTML = secHead('03', 'Partido a partido', '') + empty('Sin partidos todavía.'); return; }
  el.innerHTML = `${secHead('03', 'Partido a partido', 'El rating promedio del equipo en cada partido. Tocá un partido para ver el detalle.')}
    <div class="line-wrap" id="lineWrap"></div>
    <div class="ribbon-wrap">
      <button class="rb-nav prev" data-rb="-1" aria-label="Anteriores">‹</button>
      <div class="ribbon" id="ribbon" data-stagger>${C.ms.map((m, i) => {
        const c = D.wld(m.match_result), note = D.publicNote(m.notes);
        return `<button class="mt ${c}" data-match="${i}">
          <span class="mt-top">${crestHTML(m.rival)}<span class="mt-score ${c}">${esc(m.match_result || '—')}</span></span>
          <span class="mt-rival">${esc(m.rival)}</span>
          <span class="mt-meta">${esc(D.fmtDate(m.date))} · <span class="lg ${D.leagueClass(m.league)}">${esc(lgLabel(m.league))}</span></span>
          ${note ? `<span class="mt-note">${esc(note)}</span>` : ''}
        </button>`;
      }).join('')}</div>
      <button class="rb-nav next" data-rb="1" aria-label="Siguientes">›</button>
    </div>`;
  drawLine();
  const rb = $('#ribbon'); rb.scrollLeft = rb.scrollWidth;
}
let lineW = 0;
function drawLine() {
  const wrap = $('#lineWrap');
  if (!wrap) return;
  const pts = C.ms.map((m, i) => ({ m, i, v: matchRating(m) })).filter(x => x.v != null)
    .map(x => ({ v: x.v, label: D.fmtShort(x.m.date), cls: D.wld(x.m.match_result), title: `${D.fmtDate(x.m.date)} · vs ${x.m.rival} ${x.m.match_result} · rating ${num(x.v, 1)}`, i: x.i }));
  lineW = wrap.clientWidth;
  wrap.innerHTML = pts.length > 1 ? G.line(pts, { width: Math.max(320, lineW), height: lineW < 600 ? 190 : 230 }) : '';
  wrap.querySelectorAll('.g-dot').forEach((g, k) => { g.dataset.match = pts[k].i; g.style.cursor = 'pointer'; });
}

function openMatch(i) {
  const m = C.ms[i];
  if (!m) return;
  const c = D.wld(m.match_result), s = D.parseScore(m.match_result), t = m.team_stats;
  const wo = /W\.?O\.?/i.test(m.notes || '');
  const own = new Set(C.players.map(p => p.name.toLowerCase()));
  const goals = D.goalMinutes(m).filter(g => own.has(g.who.toLowerCase()) || C.players.some(p => g.who.toLowerCase().startsWith(p.name.toLowerCase().slice(0, 5))));
  const stat = (l, a, suf = '') => a == null ? '' : `<div><dt>${l}</dt><dd>${num(a, Number.isInteger(a) ? 0 : 1)}${suf}</dd></div>`;
  const rows = (m.players || []).slice().sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).map(p => `<tr>
      <td class="tp-name">${esc(p.matched || p.name)}${p.played_pos ? `<span class="tp-pos">${esc(p.played_pos)}</span>` : ''}</td>
      <td><span class="rpill ${ratingCls(p.rating)}">${p.rating != null ? num(p.rating, 1) : '—'}</span></td>
      <td>${p.goals || 0}</td><td>${p.assists || 0}</td>
      <td>${p.pass_accuracy != null ? Math.round(p.pass_accuracy) + '%' : '—'}</td>
      <td>${p.tackles ?? '—'}</td><td>${p.distance_km != null ? num(p.distance_km, 1) : '—'}</td></tr>`).join('');
  $('#matchBox').innerHTML = `
    <button class="panel-close" data-close aria-label="Cerrar">×</button>
    <p class="pm-kicker" data-in>${esc(D.fmtDate(m.date))} · <span class="lg ${D.leagueClass(m.league)}">${esc(lgLabel(m.league))}</span></p>
    <div class="pm-score" data-in>
      <span class="pm-team"><img src="${D.MEDIA}/logos/rebrand/favicon-180.png" alt="">Top Secret</span>
      <span class="pm-res ${c}">${s ? `${cnt(s.own)}<i>-</i>${cnt(s.rival)}` : esc(m.match_result || '—')}</span>
      <span class="pm-team">${crestHTML(m.rival, 'pm-crest')}${esc(m.rival)}</span>
    </div>
    ${D.publicNote(m.notes) ? `<p class="pm-note" data-in>${esc(D.publicNote(m.notes))}</p>` : ''}
    ${goals.length ? `<p class="pm-goals" data-in>${goals.map(g => `<span>${esc(g.who)} <b>${g.mins.map(x => x + "'").join(' ')}</b></span>`).join('')}</p>` : ''}
    ${wo ? '<p class="pm-note" data-in>Ganado por W.O.: no hay estadísticas del partido.</p>' : ''}
    ${t && !wo ? `<dl class="pm-stats" data-in>${stat('Posesión', t.posesion, '%')}${stat('Tiros', t.tiros)}${stat('Al arco', t.tiros_arco)}${stat('xG', t.goles_esperados)}${stat('Pases', t.pases)}${stat('Precisión de pase', t.precision_pases, '%')}${stat('Intercepciones', t.intercepciones)}${stat('Atajadas', t.paradas)}${stat('Córners', t.corneres)}</dl>` : ''}
    ${rows ? `<div class="pm-table" data-in><table><thead><tr><th>Jugador</th><th>Nota</th><th>G</th><th>A</th><th>Pase</th><th>Entr.</th><th>Km</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}`;
  openPanel('#matchPanel', 'right');
}

// ════════ 5 · PLANTEL ════════
const SORTS = [['rating', 'Rating'], ['goals', 'Goles'], ['assists', 'Asistencias'], ['games', 'Partidos']];
const POS = [['all', 'Todos'], ['POR', 'Arqueros'], ['DEF', 'Defensas'], ['LAT', 'Laterales'], ['MED', 'Medios'], ['DEL', 'Delanteros']];
const sortVal = (p, k) => k === 'rating' ? (p.ratings.length >= D.minRatingGames(C.ms.length) ? p.rating : -1 + (p.rating || 0) / 100) : p[k];
function renderPlantel() {
  const el = $('#plantel');
  const list = C.players.filter(p => p.games > 0 || p.inRoster);
  const withG = list.filter(p => p.games > 0), noG = list.filter(p => !p.games && state.season === D.CURRENT_SEASON);
  if (!withG.length) { el.innerHTML = secHead('04', 'El plantel', '') + empty('Sin partidos todavía.'); return; }
  el.innerHTML = `${secHead('04', 'El plantel', 'Tocá un jugador para ver su perfil completo.')}
    <div class="pl-controls">
      <div class="seg-group" role="group" aria-label="Ordenar">${SORTS.map(([k, l]) => `<button class="seg${state.sort === k ? ' on' : ''}" data-sort="${k}">${l}</button>`).join('')}</div>
      <div class="chips">${POS.filter(([k]) => k === 'all' || withG.some(p => p.pos === k)).map(([k, l]) => `<button class="chip${state.pos === k ? ' on' : ''}" data-pos="${k}">${l}</button>`).join('')}</div>
    </div>
    <ul class="pl-grid" id="plGrid">${withG.map(p => `<li class="pl-item" data-name="${esc(p.name)}" data-pos="${p.pos || ''}">
      <button class="pl-btn" data-player="${esc(p.name)}">
        ${photo(p, 'busto', 'pl-photo')}
        <span class="pl-name">${esc(p.name)}</span>
        <span class="pl-meta">${esc(D.POS_NAME[p.pos] || (p.inRoster ? '' : 'Ex jugador'))}${p.num ? ` · ${esc(p.num)}` : ''}</span>
        <span class="pl-nums"><span><b>${p.games}</b>PJ</span><span><b>${p.goals}</b>G</span><span><b>${p.assists}</b>A</span><span><b class="${ratingCls(p.rating)}">${num(p.rating, 1)}</b>Nota</span></span>
      </button></li>`).join('')}</ul>
    ${noG.length ? `<p class="pl-nodata"><span>Sin partidos esta temporada</span>${noG.map(p => `<i>${esc(p.name)}</i>`).join('')}</p>` : ''}`;
  applyPlantel(false);
}
function applyPlantel(animate = true) {
  const grid = $('#plGrid');
  if (!grid) return;
  const mutate = () => {
    const items = [...grid.children];
    const byName = new Map(C.players.map(p => [p.name, p]));
    items.sort((a, b) => (sortVal(byName.get(b.dataset.name), state.sort) ?? -9) - (sortVal(byName.get(a.dataset.name), state.sort) ?? -9) || byName.get(b.dataset.name).games - byName.get(a.dataset.name).games);
    items.forEach(li => { li.classList.toggle('is-hidden', state.pos !== 'all' && li.dataset.pos !== state.pos); grid.appendChild(li); });
  };
  animate ? M.flip(grid, mutate) : mutate();
}

function openPlayer(name) {
  const p = C.players.find(x => x.name.toLowerCase() === String(name).toLowerCase())
    || D.playerAgg(D.matchesOfSeason(state.season), D.rosterOf(state.season)).find(x => x.name.toLowerCase() === String(name).toLowerCase());
  if (!p) return;
  const pool = C.played.filter(x => x.ratings.length >= D.minRatingGames(C.ms.length));
  const ax = D.playerRadar(p, C.played);
  const avgAx = ax.map((a, i) => ({ k: a.k, v: D.avg(pool.map(x => D.playerRadar(x, C.played)[i].v)) || 0 }));
  const pts = p.entries.filter(e => e.rating != null).map(e => ({ v: e.rating, label: D.fmtShort(e.date), cls: D.wld(e.result), title: `vs ${e.rival} ${e.result} · ${num(e.rating, 1)}` }));
  const posCount = p.entries.reduce((o, e) => (e.played_pos ? (o[e.played_pos] = (o[e.played_pos] || 0) + 1, o) : o), {});
  const list = [...p.entries].reverse().map(e => `<li><span class="pe-date">${esc(D.fmtShort(e.date))}</span><span class="pe-rival">vs ${esc(e.rival)} <span class="score ${D.wld(e.result)}">${esc(e.result || '')}</span></span>
      <span class="pe-ga">${e.goals ? `<b>${e.goals}</b> G` : ''}${e.assists ? ` <b>${e.assists}</b> A` : ''}</span><span class="rpill ${ratingCls(e.rating)}">${e.rating != null ? num(e.rating, 1) : '—'}</span></li>`).join('');
  $('#playerBox').innerHTML = `
    <button class="panel-close" data-close aria-label="Cerrar">×</button>
    <div class="pp-media">${photo(p, 'pose', 'pp-img')}<span class="pp-num" aria-hidden="true">${esc(p.num || '')}</span></div>
    <div class="pp-body">
      <p class="pp-kicker" data-in>${esc(D.POS_NAME[p.pos] || 'Jugador')} · Temporada ${state.season}${state.comp !== 'all' ? ' · ' + esc(C.comp.label) : ''}</p>
      <h2 class="pp-name" data-in>${esc(p.name)}</h2>
      <div class="pp-kpis" data-in>
        <div><b>${cnt(p.games)}</b><span>Partidos</span></div><div><b class="c-win">${cnt(p.goals)}</b><span>Goles</span></div>
        <div><b class="c-vpug">${cnt(p.assists)}</b><span>Asistencias</span></div><div><b class="c-gold">${p.rating != null ? cnt(D.round(p.rating), 1) : '—'}</b><span>Rating</span></div>
      </div>
      ${p.games ? `<div class="pp-row" data-in>
        <figure class="pp-radar">${G.radar(ax, { size: 280, compare: avgAx })}<figcaption><i class="lg-sw me"></i>${esc(p.name)} <i class="lg-sw avg"></i>promedio del plantel</figcaption></figure>
        <dl class="pp-dl">
          <div><dt>Precisión de pase</dt><dd>${p.passAcc != null ? Math.round(p.passAcc) + '%' : '—'}</dd></div>
          <div><dt>Entradas por partido</dt><dd>${num(p.tackles, 1)}</dd></div>
          <div><dt>Intercepciones por partido</dt><dd>${num(p.intercep, 1)}</dd></div>
          <div><dt>Distancia por partido</dt><dd>${p.dist != null ? num(p.dist, 1) + ' km' : '—'}</dd></div>
          ${Object.keys(posCount).length ? `<div><dt>Jugó de</dt><dd>${Object.entries(posCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${esc(k)} <small>${v}</small>`).join(' · ')}</dd></div>` : ''}
        </dl>
      </div>` : ''}
      ${pts.length > 1 ? `<div class="pp-line" data-in><h3 class="mini-h">Rating partido a partido</h3>${G.line(pts, { width: 560, height: 180 })}</div>` : ''}
      ${list ? `<div data-in><h3 class="mini-h">Partidos</h3><ul class="pp-list">${list}</ul></div>` : ''}
      ${p.games ? `<button class="pill" data-compare="${esc(p.name)}" data-in>Comparar con otro jugador</button>` : ''}
    </div>`;
  openPanel('#playerPanel', 'up');
  history.replaceState(null, '', urlFor({ player: p.name }));
}

// ════════ 6 · CARA A CARA ════════
function defaultPair() {
  const ranked = [...C.played].sort((a, b) => (b.games * (b.rating || 6)) - (a.games * (a.rating || 6)));
  if (!C.played.some(p => p.name === state.cmpA)) state.cmpA = ranked[0]?.name || null;
  if (!C.played.some(p => p.name === state.cmpB) || state.cmpB === state.cmpA) state.cmpB = ranked.find(p => p.name !== state.cmpA)?.name || null;
}
function renderCompare() {
  const el = $('#comparador');
  if (C.played.length < 2) { el.innerHTML = secHead('05', 'Cara a cara', '') + empty('Hacen falta al menos dos jugadores con partidos.'); return; }
  defaultPair();
  const opts = sel => [...C.played].sort((a, b) => a.name.localeCompare(b.name)).map(p => `<option value="${esc(p.name)}"${p.name === sel ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  el.innerHTML = `${secHead('05', 'Cara a cara', 'Elegí dos jugadores y compará sus números de la temporada.')}
    <div class="cmp" data-reveal>
      <div class="cmp-side a"><span class="cmp-ph" id="cmpPhA"></span><label class="sel"><span class="sr">Jugador A</span><select id="cmpA">${opts(state.cmpA)}</select></label></div>
      <div class="cmp-rows" id="cmpRows"></div>
      <div class="cmp-side b"><span class="cmp-ph" id="cmpPhB"></span><label class="sel"><span class="sr">Jugador B</span><select id="cmpB">${opts(state.cmpB)}</select></label></div>
    </div>`;
  updateCompare(false);
}
function updateCompare(animate = true) {
  const A = C.played.find(p => p.name === state.cmpA), B = C.played.find(p => p.name === state.cmpB);
  if (!A || !B) return;
  $('#cmpPhA').innerHTML = photo(A, 'pose', 'cmp-img'); $('#cmpPhB').innerHTML = photo(B, 'pose', 'cmp-img');
  const ra = D.compareRows(A), rb = D.compareRows(B);
  const rows = $('#cmpRows');
  if (!rows.children.length || !animate) {
    rows.innerHTML = ra.map(([l], i) => `<div class="cmp-row"><span class="cmp-v a"></span><span class="cmp-b a"><i data-w="0"></i></span><span class="cmp-l">${esc(l)}</span><span class="cmp-b b"><i data-w="0"></i></span><span class="cmp-v b"></span></div>`).join('');
  }
  [...rows.children].forEach((row, i) => {
    const [, va, dec, suf] = ra[i], vb = rb[i][1];
    const mx = Math.max(va || 0, vb || 0) || 1;
    row.querySelector('.cmp-v.a').textContent = va == null ? '—' : num(va, dec) + suf;
    row.querySelector('.cmp-v.b').textContent = vb == null ? '—' : num(vb, dec) + suf;
    const ia = row.querySelector('.cmp-b.a i'), ib = row.querySelector('.cmp-b.b i');
    ia.dataset.w = Math.round((va || 0) / mx * 100); ib.dataset.w = Math.round((vb || 0) / mx * 100);
    row.classList.toggle('win-a', (va ?? -1) > (vb ?? -1)); row.classList.toggle('win-b', (vb ?? -1) > (va ?? -1));
  });
  M.tweenWidths(rows.querySelectorAll('.cmp-b i'));
}

// ════════ helpers de markup ════════
function secHead(n, title, sub) {
  return `<header class="sec-head" data-reveal><span class="sec-n">${n}</span><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</header>`;
}
const empty = t => `<p class="empty">${esc(t)}</p>`;

// ════════ paneles ════════
let lastFocus = null;
function openPanel(sel, from) {
  const el = $(sel);
  lastFocus = document.activeElement;
  el.hidden = false;
  document.documentElement.classList.add('panel-open');
  el.querySelector('.panel-box').scrollTop = 0;
  M.panelIn(el, from);
  el.querySelector('[data-close]')?.focus({ preventScroll: true });
}
function closePanels() {
  document.querySelectorAll('.panel:not([hidden])').forEach(el => M.panelOut(el, () => {
    el.hidden = true;
    if (!document.querySelector('.panel:not([hidden])')) document.documentElement.classList.remove('panel-open');
  }));
  if (new URLSearchParams(location.search).has('player')) history.replaceState(null, '', urlFor());
  lastFocus?.focus?.({ preventScroll: true });
}

// ════════ render general ════════
function urlFor(extra = {}) {
  const q = new URLSearchParams();
  if (state.season !== D.CURRENT_SEASON) q.set('t', state.season);
  if (state.comp !== 'all') q.set('c', state.comp);
  Object.entries(extra).forEach(([k, v]) => q.set(k, v));
  return location.pathname + (q.toString() ? '?' + q : '') + location.hash;
}
function renderAll() {
  compute();
  renderBar(); renderHero(); renderLeaders(); renderJuego(); renderPartidos(); renderPlantel(); renderCompare();
  history.replaceState(null, '', urlFor());
  M.initMotion($('#st'));
}
function rerender(scrollToBar) {
  const run = () => { renderAll(); if (scrollToBar && window.scrollY > $('#stBar').offsetTop) $('#resumen').scrollIntoView({ block: 'start' }); };
  if (document.startViewTransition && !M.reduced()) document.startViewTransition(run); else run();
}

// ════════ eventos (delegados) ════════
document.addEventListener('click', e => {
  const b = e.target.closest('button, a, .g-dot');
  if (!b) { if (e.target.classList?.contains('panel')) closePanels(); return; }
  if (b.dataset.season) { state.season = +b.dataset.season; state.comp = 'all'; state.radar = 'all'; rerender(true); return; }
  if (b.dataset.comp) { state.comp = b.dataset.comp; state.radar = 'all'; rerender(true); return; }
  if (b.dataset.radar && b.classList.contains('chip')) { setRadar(b.dataset.radar); return; }
  if (b.dataset.sort) { state.sort = b.dataset.sort; document.querySelectorAll('[data-sort]').forEach(x => x.classList.toggle('on', x === b)); applyPlantel(); return; }
  if (b.dataset.pos) { state.pos = b.dataset.pos; document.querySelectorAll('[data-pos]').forEach(x => x.classList.toggle('on', x === b)); applyPlantel(); return; }
  if (b.dataset.match != null) { openMatch(+b.dataset.match); return; }
  if (b.dataset.player) { openPlayer(b.dataset.player); return; }
  if (b.dataset.compare) {
    state.cmpA = b.dataset.compare;
    if (state.cmpB === state.cmpA) state.cmpB = C.played.find(p => p.name !== state.cmpA)?.name;
    closePanels(); $('#cmpA').value = state.cmpA; $('#cmpB').value = state.cmpB; updateCompare();
    setTimeout(() => $('#comparador').scrollIntoView({ behavior: M.reduced() ? 'auto' : 'smooth' }), 320);
    return;
  }
  if (b.dataset.rb) { const rb = $('#ribbon'); rb.scrollBy({ left: +b.dataset.rb * rb.clientWidth * .8, behavior: 'smooth' }); return; }
  if (b.dataset.close != null) { closePanels(); return; }
  if (b.dataset.anchor) { e.preventDefault(); $('#' + b.dataset.anchor)?.scrollIntoView({ behavior: M.reduced() ? 'auto' : 'smooth' }); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'cmpA' || e.target.id === 'cmpB') {
    state[e.target.id] = e.target.value;
    if (state.cmpA === state.cmpB) { const other = C.played.find(p => p.name !== e.target.value)?.name; state[e.target.id === 'cmpA' ? 'cmpB' : 'cmpA'] = other; $('#cmpA').value = state.cmpA; $('#cmpB').value = state.cmpB; }
    updateCompare();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanels(); });

// Sección activa en la barra
const spy = new IntersectionObserver(es => es.forEach(x => {
  if (x.isIntersecting) document.querySelectorAll('[data-anchor]').forEach(a => a.classList.toggle('on', a.dataset.anchor === x.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });

// Redibujar la línea si cambia el ancho (no los demás gráficos: son SVG escalables)
let rT;
addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { const w = $('#lineWrap')?.clientWidth; if (w && Math.abs(w - lineW) > 40) drawLine(); }, 200); });
// Al cambiar de tema (layout.js cambia la clase de <html>) los SVG ya siguen los tokens; solo se recalculan posiciones.
addEventListener('load', () => M.refresh());

// ════════ arranque ════════
renderAll();
SECTIONS.forEach(([id]) => { const s = document.getElementById(id); if (s) spy.observe(s); });
mountClubEA($('#eaBody'), el => M.initMotion(el));
if (qs.get('player')) openPlayer(qs.get('player'));
