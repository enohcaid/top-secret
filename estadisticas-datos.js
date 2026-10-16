// Cálculos de estadisticas.html: temporadas, competencias, agregados de equipo y jugadores, líderes.
// Funciones puras sobre SEED_MATCHES + roster.js (sin DOM), para poder verificarlas desde Node.
import { SEED_MATCHES } from './seed_matches.js';
import { ROSTER_T3, ROSTER_T4 } from './roster.js';
import { ESCUDOS } from './estadisticas-escudos.js?v=5';

export const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
// RENDER_V: mismo valor que plantilla.html / convocatoria.html / index-home.js (R2 cachea un año).
export const RENDER_V = '2026-09-30';
// Fotos grupales T4 en R2 logos/grupales/. Generadas con ChatGPT (scripts/grupales-chatgpt.mjs): el hero de
// estadisticas.html usa "tunel". Las compuestas con los renders (scripts/fotos-grupales-t4.mjs) quedan de respaldo.
export const GRUPALES_IA_T4 = {
  estudio: 'logos/grupales/grupal-ia-estudio-bb6225.webp', estadio: 'logos/grupales/grupal-ia-estadio-bb6225.webp',
  tunel: 'logos/grupales/grupal-ia-tunel-bb6225.webp', vestuario: 'logos/grupales/grupal-ia-vestuario-bb6225.webp',
};
export const GRUPALES_T4 = {
  campana: 'logos/grupales/grupal-t4-campana-babndv.webp', piramide: 'logos/grupales/grupal-t4-piramide-babndv.webp',
  bloque: 'logos/grupales/grupal-t4-bloque-babndv.webp', noche: 'logos/grupales/grupal-t4-noche-babndv.webp',
};

// ── Temporadas ──────────────────────────────────────────────
const T2_CUTOFF = '2026-04-30';
const T2_END    = '2026-06-17';   // entre T2_END y T3_CUTOFF hubo una pretemporada VPUG que no cuenta
const T3_CUTOFF = '2026-08-02';
export const T4_CUTOFF = '2026-09-28';   // T4 arranca con su pretemporada (cuenta como T4)
export const SEASONS = [
  { n: 1, label: 'T1', estado: 'Finalizada' },
  { n: 2, label: 'T2', estado: 'Finalizada' },
  { n: 3, label: 'T3', estado: 'Finalizada' },
  { n: 4, label: 'T4', estado: 'En curso' },
];
export const CURRENT_SEASON = 4;

export function matchesOfSeason(n) {
  const all = SEED_MATCHES.filter(m => m.date);
  const ms = n === 1 ? all.filter(m => m.date <= T2_CUTOFF)
    : n === 2 ? all.filter(m => m.date > T2_CUTOFF && m.date <= T2_END)
    : n === 3 ? all.filter(m => m.date > T3_CUTOFF && m.date <= T4_CUTOFF)
    : all.filter(m => m.date > T4_CUTOFF);
  return [...ms].sort((a, b) => a.date.localeCompare(b.date));
}
export function rosterOf(n) {
  return (n >= 4 ? ROSTER_T4 : ROSTER_T3).map(p => ({ name: p.key, pos: p.pos, num: p.num, folder: p.folderOverride || p.key }));
}
export const T4_KEYS = new Set(ROSTER_T4.map(p => p.key));

// ── Ligas y competencias ────────────────────────────────────
const LEAGUE_ORDER = ['11x11', 'VPN', 'VPUG'];
export const leagueClass = l => l === 'VPUG' ? 'vpug' : l === '11x11' ? 'e11' : l === 'VPN' ? 'vpn' : 'otro';
// Desde la T4 la 11x11 se llama Espacio Gamer (la clave interna sigue '11x11').
export const leagueLabel = (l, season) => l === '11x11' && season >= 4 ? 'Espacio Gamer' : (l || '—');

// Filtro de competencia: Todas + cada liga + cada torneo (campo `torneo`) de la temporada.
export function competitions(ms, season) {
  const ligas = [...new Set(ms.map(m => m.league).filter(Boolean))]
    .sort((a, b) => (LEAGUE_ORDER.indexOf(a) + 1 || 99) - (LEAGUE_ORDER.indexOf(b) + 1 || 99));
  const torneos = [...new Set(ms.map(m => m.torneo).filter(Boolean))];
  return [
    { id: 'all', label: 'Todas', cls: '' },
    ...ligas.map(l => ({ id: 'l:' + l, label: leagueLabel(l, season), cls: leagueClass(l) })),
    ...torneos.map(t => ({ id: 't:' + t, label: torneoLabel(t), cls: 'torneo' })),
  ];
}
// "Liga Pretemporada VPUG (FC27)" → "Liga Pretemporada VPUG"; sin sufijos de temporada en lo público.
export const torneoLabel = t => String(t).replace(/\s*\((?:FC\s?\d+|T\d[^)]*)\)\s*/gi, ' ').trim();
export function filterComp(ms, comp) {
  if (!comp || comp === 'all') return ms;
  if (comp.startsWith('l:')) return ms.filter(m => m.league === comp.slice(2));
  if (comp.startsWith('t:')) return ms.filter(m => m.torneo === comp.slice(2));
  return ms;
}

// ── Resultados ──────────────────────────────────────────────
export function parseScore(r) {
  const m = String(r || '').match(/^(\d+)\s*[-–]\s*(\d+)$/);
  return m ? { own: +m[1], rival: +m[2] } : null;
}
export function wld(r) { const s = parseScore(r); return !s ? '' : s.own > s.rival ? 'win' : s.own < s.rival ? 'loss' : 'draw'; }
export const wldLetter = c => c === 'win' ? 'V' : c === 'loss' ? 'D' : c === 'draw' ? 'E' : '';

// `notes` mezcla datos públicos (instancia, fecha, W.O.) con apuntes de carga (goleadores, fuente del reporte).
export function publicNote(notes) {
  return String(notes || '').split(' · ').map(x => x.trim())
    .filter(x => x && !/^(goles?|reporte|arquero|ex|minutos)\b/i.test(x) && !/https?:/i.test(x))
    .join(' · ');
}
// Goleadores del rival y propios salen del apunte "goles: X 12', Y 30'": solo los propios (gamertags del plantel).
export function goalMinutes(m) {
  const seg = String(m.notes || '').split(' · ').find(x => /^goles?:/i.test(x.trim()));
  if (!seg) return [];
  return seg.replace(/^goles?:\s*/i, '').split(/,\s*/).map(x => {
    const mm = x.match(/^(.+?)\s+((?:\d+'?(?:\s*y\s*)?)+)/);
    if (!mm) return null;
    return { who: mm[1].trim(), mins: (mm[2].match(/\d+/g) || []).map(Number) };
  }).filter(Boolean);
}

// ── Formato ─────────────────────────────────────────────────
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export function fmtDate(d) { if (!d) return '—'; const t = new Date(d + 'T12:00:00'); return `${DAYS[t.getDay()]} ${t.getDate()} ${MONTHS[t.getMonth()]}`; }
export function fmtShort(d) { if (!d) return ''; const [, mo, da] = d.split('-'); return `${+da}/${+mo}`; }
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
export const round = (v, d = 1) => v == null ? null : +v.toFixed(d);
export function initials(name) {
  const p = String(name).replace(/[-_]/g, ' ').trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : String(name).slice(0, 2)).toUpperCase();
}

// ── Imágenes ────────────────────────────────────────────────
export const media = p => `${MEDIA}/${p.split('/').map(encodeURIComponent).join('/')}${p.startsWith('Renders/') ? '?v=' + RENDER_V : ''}`;
// kind: 'busto' (Frente4.webp, recorte de cara/pecho) | 'pose' (Unica4.webp de cuerpo entero)
export function playerMedia(p, kind) {
  const f = p.folder || p.name;
  if (kind === 'pose') return T4_KEYS.has(p.name) ? media(`Renders/${f}/Unica4.webp`) : media(`Renders/${f}/Frente4.webp`);
  return media(`Renders/${f}/Frente4.webp`);
}
export const crest = rival => ESCUDOS[rival] || null;

// ── Agregados de equipo ─────────────────────────────────────
// regates_exito fue porcentaje hasta el 2026-08-03; desde ahí es cantidad. Solo se promedia la convención nueva.
const REGATES_COUNT_SINCE = '2026-08-04';
function tirosArco(t) {
  if (t.tiros_arco != null) return t.tiros_arco;
  if (t.tiros != null && t.precision_tiro != null) return t.tiros * t.precision_tiro / 100;
  return null;
}
export function teamAgg(ms) {
  const played = ms.filter(m => parseScore(m.match_result));
  const res = played.map(m => ({ s: parseScore(m.match_result), c: wld(m.match_result) }));
  const ts = ms.filter(m => m.team_stats && !/W\.?O\.?/i.test(m.notes || ''));
  const tsAvg = (k, list = ts) => { const v = list.map(m => m.team_stats[k]).filter(x => x != null); return v.length ? avg(v) : null; };
  const arcoMs = ts.filter(m => tirosArco(m.team_stats) != null && m.team_stats.tiros != null);
  const entr = ts.reduce((s, m) => s + (m.team_stats.entradas || 0), 0);
  const entrOk = ts.reduce((s, m) => s + (m.team_stats.entradas_exito || 0), 0);
  const regMs = ts.filter(m => m.date >= REGATES_COUNT_SINCE && m.team_stats.regates_exito != null);
  const xgMs = ts.filter(m => m.team_stats.goles_esperados != null);
  const xgGoals = xgMs.reduce((s, m) => s + (parseScore(m.match_result)?.own || 0), 0);
  const xgTotal = xgMs.reduce((s, m) => s + m.team_stats.goles_esperados, 0);
  const ratings = ms.flatMap(m => (m.players || []).map(p => p.rating).filter(v => v != null));
  return {
    n: ms.length, played: played.length, nStats: ts.length,
    wins: res.filter(r => r.c === 'win').length, draws: res.filter(r => r.c === 'draw').length, losses: res.filter(r => r.c === 'loss').length,
    gf: res.reduce((s, r) => s + r.s.own, 0), ga: res.reduce((s, r) => s + r.s.rival, 0),
    rating: avg(ratings),
    posesion: tsAvg('posesion'), tiros: tsAvg('tiros'),
    arcoPct: arcoMs.length ? arcoMs.reduce((s, m) => s + tirosArco(m.team_stats), 0) / Math.max(1, arcoMs.reduce((s, m) => s + m.team_stats.tiros, 0)) * 100 : null,
    tirosArco: arcoMs.length ? avg(arcoMs.map(m => tirosArco(m.team_stats))) : null,
    precTiro: tsAvg('precision_tiro'), xg: tsAvg('goles_esperados'),
    xgGoals, xgTotal, xgN: xgMs.length,
    pases: tsAvg('pases'), precPases: tsAvg('precision_pases'), intercep: tsAvg('intercepciones'),
    paradas: tsAvg('paradas'), corneres: tsAvg('corneres'), faltas: tsAvg('faltas'),
    regates: regMs.length ? avg(regMs.map(m => m.team_stats.regates_exito)) : null,
    tackles: entr > 0 ? entrOk / entr * 100 : null,
  };
}
// Ejes del radar del equipo, 0–100. Los topes son referencias razonables de EA FC 11v11.
export function teamRadar(t) {
  const c = v => Math.max(0, Math.min(100, v || 0));
  return [
    { k: 'Ataque', v: c((t.xg || 0) / 4 * 100), d: t.xg != null ? round(t.xg) + ' xG' : '—' },
    { k: 'Puntería', v: c(t.precTiro), d: t.precTiro != null ? Math.round(t.precTiro) + '%' : '—' },
    { k: 'Posesión', v: c(t.posesion), d: t.posesion != null ? Math.round(t.posesion) + '%' : '—' },
    { k: 'Pase', v: c(t.precPases), d: t.precPases != null ? Math.round(t.precPases) + '%' : '—' },
    { k: 'Recuperación', v: c((t.intercep || 0) / 30 * 100), d: t.intercep != null ? round(t.intercep) + ' int.' : '—' },
    { k: 'Regate', v: c((t.regates || 0) / 150 * 100), d: t.regates != null ? Math.round(t.regates) + ' reg.' : '—' },
  ];
}

// ── Jugadores ───────────────────────────────────────────────
// Incluye a todos los que figuran con `matched` en los partidos (ex jugadores de temporadas viejas
// también), además del plantel de la temporada aunque no haya jugado.
export function playerAgg(ms, roster) {
  const by = new Map();
  const get = (name, extra) => {
    const key = name.toLowerCase();
    if (!by.has(key)) by.set(key, { name, pos: extra?.pos || null, num: extra?.num || null, folder: extra?.folder || name, inRoster: !!extra, entries: [] });
    return by.get(key);
  };
  roster.forEach(r => get(r.name, r));
  ms.forEach(m => (m.players || []).forEach(p => {
    // Sin gamertag, o nombre de bot del juego ("F. Kaya", "X.Huang"): no es un jugador del club.
    if (!p.matched || /^[A-Z]\.\s?\S/.test(p.matched)) return;
    get(p.matched).entries.push({ ...p, rival: m.rival, date: m.date, league: m.league, result: m.match_result, notes: m.notes });
  }));
  return [...by.values()].map(p => {
    const e = p.entries;
    const vals = k => e.map(x => x[k]).filter(v => v != null);
    const ratings = vals('rating');
    const mean = avg(ratings);
    const std = ratings.length > 1 ? Math.sqrt(ratings.reduce((s, r) => s + (r - mean) ** 2, 0) / ratings.length) : null;
    const games = e.length;
    const sumK = k => vals(k).reduce((s, v) => s + v, 0);
    return {
      ...p, games,
      goals: sumK('goals'), assists: sumK('assists'),
      ratings, rating: mean, std,
      passAcc: avg(vals('pass_accuracy')), passes: avg(vals('passes')),
      dist: avg(vals('distance_km')),
      tackles: vals('tackles').length ? sumK('tackles') / vals('tackles').length : null,
      intercep: vals('interceptions').length ? sumK('interceptions') / vals('interceptions').length : null,
      positions: [...new Set(e.map(x => x.played_pos).filter(Boolean))],
    };
  });
}
export const minRatingGames = n => Math.max(1, Math.min(3, Math.ceil(n * 0.25)));

// Líderes por categoría: el primero va destacado y `list` trae el top 5 para comparar.
// `low: true` = gana el valor más bajo (variación del rating).
export function leaders(players, nMatches) {
  const played = players.filter(p => p.games > 0);
  const minG = minRatingGames(nMatches);
  const cats = [
    { id: 'goles', kicker: 'Goleador', pool: played.filter(p => p.goals > 0), val: p => p.goals, tie: p => -p.games, dec: 0,
      unit: v => v === 1 ? 'gol' : 'goles', sub: p => `${p.games} PJ · ${p.assists} asist.` },
    { id: 'asist', kicker: 'Asistidor', pool: played.filter(p => p.assists > 0), val: p => p.assists, tie: p => -p.games, dec: 0,
      unit: v => v === 1 ? 'asistencia' : 'asistencias', sub: p => `${p.games} PJ · ${p.goals} goles` },
    { id: 'rating', kicker: 'Mejor rating', pool: played.filter(p => p.ratings.length >= minG), val: p => p.rating, tie: p => p.ratings.length, dec: 1,
      unit: () => 'de promedio', sub: p => `${p.ratings.length} partidos con nota`, note: `mín. ${minG} PJ` },
    { id: 'regular', kicker: 'El más regular', pool: played.filter(p => p.ratings.length >= Math.max(4, minG) && p.std != null), val: p => p.std, tie: p => p.ratings.length, dec: 2, low: true, prefix: '±',
      unit: () => 'de variación', sub: p => `promedio ${String(round(p.rating)).replace('.', ',')} en ${p.ratings.length} partidos`, note: 'variación del rating' },
  ];
  return cats.map(c => {
    const sorted = [...c.pool].sort((x, y) => (c.low ? c.val(x) - c.val(y) : c.val(y) - c.val(x)) || c.tie(y) - c.tie(x));
    if (!sorted.length) return null;
    const p = sorted[0], v = c.val(p);
    return { id: c.id, kicker: c.kicker, player: p, value: v, dec: c.dec, prefix: c.prefix || '', unit: c.unit(v), sub: c.sub(p), note: c.note || '', low: !!c.low,
      list: sorted.slice(0, 5).map(x => ({ player: x, value: c.val(x) })) };
  }).filter(Boolean);
}

// Radar de un jugador contra el máximo del plantel en cada eje (0–100).
export function playerRadar(p, players) {
  const pool = players.filter(x => x.games > 0);
  const max = k => Math.max(...pool.map(x => x[k] ?? 0), 0.0001);
  const per = (x, k) => x.games ? x[k] / x.games : 0;
  const maxPer = k => Math.max(...pool.map(x => per(x, k)), 0.0001);
  const c = v => Math.max(0, Math.min(100, v));
  return [
    { k: 'Rating', v: c(((p.rating || 0) - 5) / (Math.max(...pool.map(x => x.rating || 0)) - 5 || 1) * 100) },
    { k: 'Goles/PJ', v: c(per(p, 'goals') / maxPer('goals') * 100) },
    { k: 'Asist./PJ', v: c(per(p, 'assists') / maxPer('assists') * 100) },
    { k: 'Pase', v: c((p.passAcc || 0) / max('passAcc') * 100) },
    { k: 'Entradas', v: c((p.tackles || 0) / max('tackles') * 100) },
    { k: 'Intercep.', v: c((p.intercep || 0) / max('intercep') * 100) },
  ];
}

// Métricas del comparador: [etiqueta, valor, decimales, sufijo]
export function compareRows(p) {
  return [
    ['Partidos', p.games, 0, ''],
    ['Goles', p.goals, 0, ''],
    ['Asistencias', p.assists, 0, ''],
    ['G + A por partido', p.games ? (p.goals + p.assists) / p.games : null, 2, ''],
    ['Rating promedio', p.rating, 1, ''],
    ['Precisión de pase', p.passAcc, 0, '%'],
    ['Entradas por partido', p.tackles, 1, ''],
    ['Intercepciones por partido', p.intercep, 1, ''],
    ['Distancia por partido', p.dist, 1, ' km'],
  ];
}
export const POS_NAME = { POR: 'Arquero', DEF: 'Defensa', LAT: 'Lateral', MED: 'Mediocampista', DEL: 'Delantero' };
