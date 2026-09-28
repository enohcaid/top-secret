// Portada: noticias, plantel, competencias y redes. Módulo cargado por index.html.
import { SEED_MATCHES } from './seed_matches.js';
import { generateMatchNews } from './auto-noticias.js';
import { ROSTER_T4 } from './roster.js';

const WORKER     = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const MEDIA_BASE = WORKER + '/media';
const mediaUrl = p => MEDIA_BASE + '/' + p.split('/').map(encodeURIComponent).join('/');

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  gsap.to(e.target, { opacity: 1, y: 0, duration: .6, ease: 'power3.out' });
  io.unobserve(e.target);
}), { threshold: .12 });
function revealIn(els) {
  if (reduced || typeof gsap === 'undefined') return;
  [...els].forEach(el => { gsap.set(el, { opacity: 0, y: 24 }); io.observe(el); });
}

/* ── RENDERS ── */
const FOLDER_OVERRIDE = { 'Buraa07': 'Buraa7' };
const ROSTER_POSN = {
  // ex-jugadores que todavía aparecen en rankings de temporadas cerradas
  'Woolfyboyzx2':'Portero','Zurdo-_CABJ12':'Defensa','Agubostero7':'Defensa','Buraa07':'Mediocampista',
  'zPibu__':'Lateral','BlackPanther-CG':'Delantero','cansitrGd22_':'Delantero','Lucasmati_akd':'Delantero',
  'pauloco10':'Portero','fedeavv9':'Delantero','Eli_No-SKILL':'Mediocampista',
  ...Object.fromEntries(ROSTER_T4.map(p => [p.key, p.posn])),
};

function renderChain(key, kind) {
  const f = FOLDER_OVERRIDE[key] || key;
  return ['4', '3', '2', ''].map(s => mediaUrl(`Renders/${f}/${kind}${s}.png`));
}
function tryImages(paths, idx, onSuccess, onFail) {
  if (idx >= paths.length) { onFail(); return; }
  const img = new Image();
  img.onload = () => onSuccess(paths[idx]);
  img.onerror = () => tryImages(paths, idx + 1, onSuccess, onFail);
  img.src = paths[idx];
}
const SILUETA = mediaUrl('Renders/silueta-prueba.png');
function fillRender(imgEl, key, kind) {
  tryImages(renderChain(key, kind), 0, src => { imgEl.src = src; }, () => { imgEl.src = SILUETA; imgEl.style.opacity = '.4'; });
}
document.querySelectorAll('img[data-render]').forEach(img => fillRender(img, img.dataset.render, 'Brazos'));

/* ── TEMPORADA MOSTRADA ── */
// Hasta el primer partido de T4 el dashboard sigue mostrando T3 (última temporada con datos).
const T3_CUTOFF = '2026-08-02';
const T4_CUTOFF = '2026-09-28'; // T4 aún sin fecha de arranque: todo partido posterior cuenta como T4
const T4_MATCHES = SEED_MATCHES.filter(m => m.date > T4_CUTOFF);
const SHOW_T4    = T4_MATCHES.length > 0;
const SEASON_TAG = SHOW_T4 ? 'T4' : 'T3';
const SEASON_LBL = SEASON_TAG + ' 2026';
const SEASON_MATCHES = SHOW_T4 ? T4_MATCHES : SEED_MATCHES.filter(m => m.date > T3_CUTOFF && m.date <= T4_CUTOFF);
const $ = id => document.getElementById(id);
$('season-title').textContent = `Temporada ${SHOW_T4 ? 4 : 3} · 2026`;
$('season-badge').textContent = SHOW_T4 ? 'En curso' : 'Finalizada';
$('sq-pj-sub').textContent    = SEASON_TAG;
$('tops-badge').textContent   = SEASON_LBL;

/* ── STATS ── */
const parseScore = s => { const p = String(s || '').split('-').map(Number); return [p[0] || 0, p[1] || 0]; };
const outcome = s => { const [gf, gc] = parseScore(s); return gf > gc ? 'win' : gf === gc ? 'draw' : 'loss'; };

let totalGoals = 0, totalWins = 0;
const allRatings = [];
const playerStats = {};
SEASON_MATCHES.forEach(m => {
  if (!m.match_result) return;
  if (outcome(m.match_result) === 'win') totalWins++;
  totalGoals += parseScore(m.match_result)[0];
  (m.players || []).forEach(p => {
    const k = p.matched || p.name;
    const s = playerStats[k] ||= { pj: 0, g: 0, a: 0, ratings: [] };
    s.pj++; s.g += p.goals || 0; s.a += p.assists || 0;
    if (p.rating != null) { s.ratings.push(p.rating); allRatings.push(p.rating); }
  });
});
Object.values(playerStats).forEach(p => {
  p.avgRating = p.ratings.length ? +(p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length).toFixed(2) : 0;
});
const totalGames = SEASON_MATCHES.length;
$('sq-pj').textContent    = totalGames;
$('sq-wins').textContent  = totalWins;
$('sq-goals').textContent = totalGoals;
$('sq-rat').textContent   = allRatings.length ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2) : '—';
$('sq-eff').textContent   = (totalGames ? Math.round(totalWins / totalGames * 100) : 0) + '% efectividad';
$('sq-gpg').textContent   = (totalGames ? (totalGoals / totalGames).toFixed(1) : '—') + ' por partido';

/* ── TOP JUGADORES ── */
const keys = Object.keys(playerStats);
const topBy = (fn, filter) => keys.filter(filter).sort((a, b) => fn(b) - fn(a)).slice(0, 3);
const ratQualified = keys.filter(k => playerStats[k].pj >= 3);
const TOPS = [
  ['Goleadores',   topBy(k => playerStats[k].g, k => playerStats[k].g > 0), k => playerStats[k].g, ''],
  ['Asistencias',  topBy(k => playerStats[k].a, k => playerStats[k].a > 0), k => playerStats[k].a, ''],
  ['Calificación', topBy(k => playerStats[k].avgRating, k => (ratQualified.length ? ratQualified.includes(k) : playerStats[k].ratings.length > 0)), k => playerStats[k].avgRating.toFixed(2), '★'],
];
$('tops-grid').innerHTML = TOPS.map(([title, list, val, suf]) => `
  <div class="top-card"><div class="top-card-head">${title}</div>
    ${list.map((k, i) => `<div class="top-entry">
      <span class="top-rank${i === 0 ? ' gold' : ''}">${i + 1}</span>
      <div class="top-av" data-key="${k}" onclick="showPlayerModal('${k}')"><div class="top-av-init">${k.charAt(0).toUpperCase()}</div></div>
      <div class="top-info"><div class="top-name">${k}</div><div class="top-sub">${ROSTER_POSN[k] || ''} · ${playerStats[k].pj} PJ</div></div>
      <div class="top-val">${val(k)}${suf}</div>
    </div>`).join('')}
  </div>`).join('');
document.querySelectorAll('.top-av[data-key]').forEach(av => {
  tryImages(renderChain(av.dataset.key, 'Frente'), 0, src => {
    const el = document.createElement('img'); el.src = src; el.alt = av.dataset.key;
    av.prepend(el); av.querySelector('.top-av-init').style.display = 'none';
  }, () => {});
});

/* ── ÚLTIMOS RESULTADOS ── */
const M_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const LG_CLASS = { VPN: 'vpn', VPUG: 'vpug', '11x11': 'e11' };
const PILL = { win: ['pill-w', 'V'], draw: ['pill-d', 'E'], loss: ['pill-l', 'D'] };
$('results-list').innerHTML = [...SEASON_MATCHES].filter(m => m.match_result)
  .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  .map(m => {
    const dt = new Date(m.date + 'T12:00:00');
    const [cls, lbl] = PILL[outcome(m.match_result)];
    const [gf, gc] = parseScore(m.match_result);
    return `<div class="result-row">
      <span class="result-pill ${cls}">${lbl}</span>
      <span class="result-league ${LG_CLASS[m.league] || ''}">${m.league || ''}</span>
      <span class="result-rival">${m.rival || '—'}</span>
      <span class="result-score">${gf} – ${gc}</span>
      <span class="result-date">${dt.getDate()} ${M_NAMES[dt.getMonth()]}</span>
    </div>`;
  }).join('');

/* ── NOTICIAS (imágenes grandes) ── */
const autoNews   = generateMatchNews(SEED_MATCHES);
const manualNews = typeof NOTICIAS !== 'undefined' ? NOTICIAS : [];
const PLAY_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>';

function newsMedia(n) {
  if (n.image) return `<img src="${n.image}" alt="" loading="lazy">`;
  if (n.videoId && n.videoProvider !== 'tiktok') return `<img src="https://i.ytimg.com/vi/${n.videoId}/hqdefault.jpg" alt="" loading="lazy">`;
  return `<div class="news-fallback"><img src="${mediaUrl('logos/rebrand/clean-white.webp')}" alt=""></div>`;
}

function renderNews(list) {
  const shown = list.filter(n => !n.noStrip).slice(0, 5);
  $('news-grid').innerHTML = shown.map((n, i) => `
    <a class="news-card${i === 0 ? ' big' : ''}" href="noticias.html?id=${encodeURIComponent(n.id)}">
      ${newsMedia(n)}
      ${n.videoId ? `<span class="news-play">${PLAY_SVG}</span>` : ''}
      <div class="news-body">
        <span class="news-cat">${n.category || 'Noticia'}</span>
        <div class="news-title">${n.title}</div>
        <div class="news-excerpt">${n.excerpt || ''}</div>
        <div class="news-date">${n.dateLabel || n.date || ''}</div>
      </div>
    </a>`).join('');
  revealIn($('news-grid').children);
}

const byDate = (a, b) => (b.date || '').localeCompare(a.date || '');
renderNews([...autoNews, ...manualNews].sort(byDate));
(async () => {
  try {
    const r = await fetch(WORKER + '/published-noticias');
    if (!r.ok) return;
    const { articles } = await r.json();
    if (!articles || !articles.length) return;
    renderNews([...articles, ...manualNews, ...autoNews].sort(byDate));
  } catch (e) { /* mantiene el render local si falla el fetch */ }
})();

/* ── MIEMBROS ── */
$('squad-count').textContent = ROSTER_T4.length;
$('squad-rail').innerHTML = ROSTER_T4.map(p => `
  <a class="sq-card" href="plantilla.html?player=${encodeURIComponent(p.key)}">
    <div class="sq-img"><img data-sq="${p.key}" alt="${p.key}" loading="lazy"><span class="sq-num">${p.num}</span></div>
    <div class="sq-info"><div class="sq-name">${p.key}</div><div class="sq-pos">${p.posn}</div></div>
  </a>`).join('');
document.querySelectorAll('img[data-sq]').forEach(img => fillRender(img, img.dataset.sq, 'Brazos'));

/* ── REDES ── */
$('social-grid').innerHTML = (window.TS_SOCIAL || []).map(s => `
  <a class="social-tile" href="${s.url}" target="_blank" rel="noopener" style="--brand:${s.color}">
    <svg viewBox="0 0 24 24" fill="currentColor">${s.svg}</svg>
    <div><div class="social-name">${s.label}</div><div class="social-handle">${s.handle}</div></div>
  </a>`).join('');

/* ── LIGAS (posición en vivo) ── */
(async function () {
  const isUs = n => /top.?secret/i.test(n || '');
  function applyCard(prefix, rows) {
    const idx = rows.findIndex(r => isUs(r.name));
    if (idx < 0) return;
    const t = rows[idx];
    const gd = t.gd != null ? t.gd : (t.gf != null ? t.gf - t.gc : null);
    $(`lc-${prefix}-pos`).textContent = idx + 1;
    $(`lc-${prefix}-pts`).textContent = `${t.w}V ${t.d}E ${t.l}D · ${t.pts} pts · ${t.gp} PJ${gd != null ? ` · DG ${gd > 0 ? '+' + gd : gd}` : ''}`;
    $(`lc-${prefix}-badge`).textContent = `${SEASON_TAG} · Fecha ${t.gp}`;
  }
  async function load(prefix, url, map) {
    try {
      const raw = await (await fetch(url)).json();
      const rows = map(raw);
      if (!rows.length) throw new Error('empty');
      applyCard(prefix, rows);
    } catch (_) { $(`lc-${prefix}-pts`).textContent = 'Sin datos'; }
  }
  load('vpn', WORKER + '/vpn-table', raw => (Array.isArray(raw) ? raw : []).map(e => ({
    name: e.team?.name || '', gp: e.gp || 0, w: e.gw || 0, d: e.gt || 0, l: e.gl || 0,
    gf: e.gf ?? null, gc: e.gc ?? null, gd: e.gd ?? null, pts: e.pts || 0 })));
  load('vpug', WORKER + '/vpug-table', raw => (Array.isArray(raw) ? raw : []).map(e => ({
    name: e.name || '', gp: e.gp || 0, w: e.w || 0, d: e.d || 0, l: e.l || 0,
    gf: e.gf ?? null, gc: e.gc ?? null, gd: e.gd ?? null, pts: e.pts || 0 })));
  load('e11', 'https://api.virtualprogaming.com/public/tournaments/challengers-t3/groups/', raw => {
    const g1 = Array.isArray(raw[0]) ? raw[0] : Object.values(raw[0] || {});
    return g1.map(e => ({
      name: e.team_name || e.name || '', gp: e.played ?? e.gp ?? 0, w: e.wins ?? e.w ?? 0, d: e.draws ?? e.d ?? 0,
      l: e.losses ?? e.l ?? 0, gf: e.score_for ?? e.gf ?? null, gc: e.score_against ?? e.gc ?? null, gd: e.gd ?? null, pts: e.points ?? e.pts ?? 0 }));
  });
})();

/* ── MODAL DE JUGADOR ── */
function showPlayerModal(key) {
  const st = playerStats[key];
  if (!st) return;
  $('playerModalBox').innerHTML = `
    <div class="pmob-img"><img id="pmob-photo-img" alt="${key}"><button class="pmob-close" onclick="closePlayerModal()">×</button></div>
    <div class="pmob-body">
      <div class="pmob-name">${key}</div>
      <div class="pmob-pos">${ROSTER_POSN[key] || ''} · ${SEASON_LBL}</div>
      <div class="pmob-stats">
        <div class="pmob-stat"><div class="pmob-stat-val" style="color:var(--gold)">${st.pj}</div><div class="pmob-stat-lbl">PJ</div></div>
        <div class="pmob-stat"><div class="pmob-stat-val" style="color:var(--win)">${st.g}</div><div class="pmob-stat-lbl">Goles</div></div>
        <div class="pmob-stat"><div class="pmob-stat-val" style="color:var(--gold)">${st.avgRating.toFixed(2)}</div><div class="pmob-stat-lbl">Rating</div></div>
      </div>
      <div class="pmob-btns">
        <a class="pmob-btn" href="estadisticas.html?player=${encodeURIComponent(key)}">Stats</a>
        <a class="pmob-btn primary" href="plantilla.html?player=${encodeURIComponent(key)}">Ficha</a>
      </div>
    </div>`;
  $('playerModalOverlay').classList.add('open');
  fillRender($('pmob-photo-img'), key, 'Frente');
}
function closePlayerModal() { $('playerModalOverlay').classList.remove('open'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlayerModal(); });
window.showPlayerModal  = showPlayerModal;
window.closePlayerModal = closePlayerModal;

/* ── ANIMACIONES ── */
if (!reduced && typeof gsap !== 'undefined') {
  gsap.from('.hero-copy > *', { opacity: 0, y: 26, duration: .8, stagger: .12, ease: 'power3.out', delay: .05 });
  gsap.from('.hero-photo', { opacity: 0, scale: 1.04, duration: 1.1, ease: 'power3.out' });
  revealIn(document.querySelectorAll('.block-head, .stat-card, .league-card, .top-card, .result-row, .tile, .social-tile'));
}

/* ── TWITCH EN VIVO (sobre la imagen del hero) ── */
(function () {
  const CHANNEL = 'topsecretfc';
  const liveWrap = $('hero-live-wrap'), liveFrame = $('hero-live-frame');
  let isLive = false;
  function setLive(live) {
    if (live === isLive) return;
    isLive = live;
    liveFrame.src = live ? `https://player.twitch.tv/?channel=${CHANNEL}&parent=${location.hostname || 'localhost'}&muted=true&autoplay=true` : '';
    liveWrap.style.display = live ? 'block' : 'none';
  }
  // Los vivos solo pasan entre 22:30 y 00:30 ART — fuera de esa franja (con
  // margen) ni siquiera se pregunta al Worker, para no gastar cuota de KV.
  function isLiveWindow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const mins = +parts.find(p => p.type === 'hour').value * 60 + +parts.find(p => p.type === 'minute').value;
    return mins >= 21 * 60 + 45 || mins <= 45;
  }
  async function checkLive() {
    if (!isLiveWindow()) { setLive(false); return; }
    try { setLive(!!(await (await fetch(WORKER + '/twitch-live')).json()).live); } catch (e) { /* deja el estado actual */ }
  }
  checkLive();
  setInterval(checkLive, 45000);
})();
