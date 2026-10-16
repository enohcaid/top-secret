// Sección "Club EA" de estadisticas.html: acumulado del club en EA Sports FC 27, en vivo vía Worker /ea.
// Club 404340 en common-gen5 (PC devuelve lo mismo por crossplay; PS4 no existe en FC 27).
import { esc } from './estadisticas-datos.js?v=6';

const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const CLUB = '404340', PLAT = 'common-gen5';
export const PCH_URL = 'https://proclubshead.com/27/club/gen5/404340/';

async function ea(path) {
  const r = await fetch(`${WORKER}/ea?path=${encodeURIComponent(path)}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Worker ' + r.status);
  const d = await r.json();
  if (d && d.error) throw new Error(d.preview || d.error);
  return d;
}
const ci = v => parseInt(v) || 0;

function errorHTML(detail) {
  return `<div class="ea-error">
    <p class="ea-error-t">EA Sports no respondió</p>
    <p class="ea-error-s">Los datos del club vienen en vivo de EA y a veces su servicio se cae un rato. Probá de nuevo en unos minutos.</p>
    ${detail ? `<details><summary>Detalle técnico</summary><pre>${esc(String(detail).slice(0, 400))}</pre></details>` : ''}
    <div class="ea-actions"><button class="pill" data-ea-retry>Reintentar</button><a class="pill ghost" href="${PCH_URL}" target="_blank" rel="noopener">Ver en Pro Clubs Head ↗</a></div>
  </div>`;
}

function render(o, matches) {
  const d = Array.isArray(o) ? o[0] : o;
  const pj = ci(d.gamesPlayed), w = ci(d.wins), e = ci(d.ties), l = ci(d.losses);
  const gf = ci(d.goals), ga = ci(d.goalsAgainst), sr = ci(d.skillRating);
  const wr = pj ? w / pj * 100 : 0;
  const form = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ci(d[`lastMatch${i}`])).filter(v => v > 0);
  const fCls = { 1: 'win', 2: 'draw', 3: 'loss' }, fLbl = { 1: 'V', 2: 'E', 3: 'D' };
  const raw = matches ? (Array.isArray(matches) ? matches : (matches.matches || [])) : [];
  const last = raw.slice(0, 5).map(m => {
    const clubs = m.clubs || {};
    const mine = clubs[CLUB] || {}, oppKey = Object.keys(clubs).find(k => k !== CLUB), opp = clubs[oppKey] || {};
    const a = ci(mine.goals), b = ci(opp.goals), c = a > b ? 'win' : a < b ? 'loss' : 'draw';
    const when = m.timestamp ? new Date(ci(m.timestamp) * 1000).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' }) : '';
    return `<li><span class="ea-m-date">${when}</span><span class="ea-m-rival">${esc(opp.details?.name || 'Rival')}</span><span class="score ${c}">${a}-${b}</span></li>`;
  }).join('');
  const kpi = (v, lbl, cls = '', dec = 0, suf = '') => `<div class="ea-kpi"><span class="big ${cls}" data-count="${v}" data-dec="${dec}" data-suffix="${suf}">${dec ? v.toFixed(dec).replace('.', ',') : v}${suf}</span><span class="lbl">${lbl}</span></div>`;
  return `
    <div class="ea-kpis" data-stagger>
      ${kpi(pj, 'Partidos')}${kpi(w, 'Ganados', 'c-win')}${kpi(e, 'Empatados', 'c-draw')}${kpi(l, 'Perdidos', 'c-loss')}
      ${kpi(Math.round(wr * 10) / 10, 'De victorias', 'c-gold', 1, '%')}${kpi(sr, 'Skill rating', 'c-gold')}
    </div>
    <div class="ea-wdl" aria-hidden="true"><span class="win" style="flex:${w}"></span><span class="draw" style="flex:${e}"></span><span class="loss" style="flex:${l}"></span></div>
    <div class="ea-cols">
      <div class="ea-col" data-reveal>
        <h3 class="mini-h">Goles</h3>
        <dl class="ea-dl">
          <div><dt>A favor</dt><dd class="c-win">${gf}</dd></div>
          <div><dt>En contra</dt><dd class="c-loss">${ga}</dd></div>
          <div><dt>Diferencia</dt><dd>${gf - ga >= 0 ? '+' : ''}${gf - ga}</dd></div>
          <div><dt>Por partido</dt><dd>${pj ? (gf / pj).toFixed(2).replace('.', ',') : '—'}</dd></div>
        </dl>
        ${form.length ? `<h3 class="mini-h">Forma reciente</h3><div class="form-row">${form.map(r => `<span class="form-chip ${fCls[r]}">${fLbl[r]}</span>`).join('')}</div>` : ''}
        <dl class="ea-dl">
          <div><dt>Racha de victorias</dt><dd>${ci(d.wstreak)}</dd></div>
          <div><dt>Sin perder</dt><dd>${ci(d.unbeatenstreak)}</dd></div>
          <div><dt>Ascensos · descensos</dt><dd>${ci(d.promotions)} · ${ci(d.relegations)}</dd></div>
        </dl>
      </div>
      <div class="ea-col" data-reveal>
        <h3 class="mini-h">Últimos partidos en EA</h3>
        ${last ? `<ul class="ea-last">${last}</ul>` : '<p class="muted">Sin partidos recientes.</p>'}
        <p class="ea-note">Es el acumulado del club en el juego (incluye amistosos y partidos que se cortaron). Los números de la temporada, arriba, salen de los reportes de cada partido.</p>
        <a class="pill ghost" href="${PCH_URL}" target="_blank" rel="noopener">Ver en Pro Clubs Head ↗</a>
      </div>
    </div>`;
}

// Carga una vez, cuando la sección está por entrar en pantalla. `after(el)` re-arma animaciones.
export function mountClubEA(el, after) {
  let loaded = false;
  const load = async () => {
    loaded = true;
    el.innerHTML = '<div class="ea-loading"><span class="spinner"></span>Cargando datos de EA Sports…</div>';
    const [o, m] = await Promise.allSettled([
      ea(`clubs/overallStats?platform=${PLAT}&clubIds=${CLUB}`),
      ea(`clubs/matches?platform=${PLAT}&clubIds=${CLUB}&matchType=friendlyMatch`),
    ]);
    el.innerHTML = o.status === 'fulfilled' ? render(o.value, m.status === 'fulfilled' ? m.value : null) : errorHTML(o.reason?.message);
    el.querySelector('[data-ea-retry]')?.addEventListener('click', load);
    after?.(el);
  };
  const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting) && !loaded) { io.disconnect(); load(); } }, { rootMargin: '600px 0px' });
  io.observe(el);
}
