// Datos reales para las piezas de redes: partidos jugados (seed_matches.js), fixture y escudos de la
// temporada en curso (los mismos arrays que usa convocatoria.html, así no hay una lista paralela que se
// desactualice) y el plantel. Nada se inventa: lo que no está en estas fuentes no va en una pieza.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ROOT } from '../../lib/env.mjs';

export const TEMPORADA = { id: 'T4', desde: '2026-10-05', torneo: 'Primera División VPUG', liga: 'VPUG', schedule: 'VPUG_T4_SCHEDULE', badges: 'VPUG_T4_BADGES' };

export const hoyART = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
export const diaSemana = f => new Date(f + 'T12:00:00-03:00').toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
export const fechaCorta = f => { const [, m, d] = f.split('-'); return `${Number(d)}/${Number(m)}`; };

// Lee un `const NOMBRE = [...]` o `{...}` de un html del sitio (son literales JS simples).
function literal(archivo, nombre) {
  const src = fs.readFileSync(path.join(ROOT, archivo), 'utf8');
  const i = src.indexOf(`const ${nombre} =`);
  if (i < 0) throw new Error(`No encuentro ${nombre} en ${archivo}`);
  const abre = src.indexOf(src[src.indexOf('=', i) + 2] === '{' ? '{' : '[', i);
  const par = { '[': ']', '{': '}' }[src[abre]];
  let nivel = 0, j = abre;
  for (; j < src.length; j++) { if (src[j] === src[abre]) nivel++; else if (src[j] === par && --nivel === 0) break; }
  return Function(`return (${src.slice(abre, j + 1)})`)();
}

// Desde la competencia oficial de la T4 (2026-10-20) se juegan tres ligas a la vez: VPUG, VPN y Espacio Gamer
// (clave interna '11x11'). Cada partido lleva su liga; el fixture junta el de VPUG (convocatoria.html) con los de
// VPN y Espacio Gamer (Firestore calendario/estado.custom, con edits/suspended aplicados como en calendario.html).
export const LIGA_VISIBLE = l => l === '11x11' ? 'Espacio Gamer' : l;
const OFICIALES = ['VPUG', 'VPN', '11x11'];
const FS = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/';
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const valFS = v => 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue) : 'doubleValue' in v ? v.doubleValue
  : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : 'arrayValue' in v ? (v.arrayValue.values || []).map(valFS)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, valFS(x)])) : null;
const intentar = async (fn, def) => { try { return await fn(); } catch (e) { console.warn(`[datos] ${e.message}`); return def; } };
const clave = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/e[-\s]?sports?/g, '').replace(/[^a-z0-9]/g, '');

async function calendarioCustom() {
  const r = await fetch(FS + 'calendario/estado', { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Firestore calendario/estado: ${r.status}`);
  const cal = Object.fromEntries(Object.entries((await r.json()).fields || {}).map(([k, v]) => [k, valFS(v)]));
  return (cal.custom || []).map((c, i) => {
    const k = `c${i}`, e = cal.edits?.[k] || {}, s = cal.suspended?.[k];
    return { ...c, ...e, date: s?.newDate || e.date || c.date, suspendido: !!s && !s.newDate };
  }).filter(c => (c.tipo || 'partido') === 'partido' && OFICIALES.includes(c.league) && !c.suspendido);
}
async function escudosVPN() {
  const raw = await (await fetch(`${WORKER}/vpn-table`, { signal: AbortSignal.timeout(20000) })).json();
  const m = {};
  for (const e of raw || []) if (e?.team?.name) m[e.team.name] = e.team.logoUrl || e.team.logoSmallUrl || null;
  return m;
}

export async function cargar() {
  const { SEED_MATCHES } = await import(pathToFileURL(path.join(ROOT, 'seed_matches.js')).href + `?t=${Date.now()}`);
  const { ROSTER_T4 } = await import(pathToFileURL(path.join(ROOT, 'roster.js')).href).catch(() => ({}));
  const mapas = {
    VPUG: literal('convocatoria.html', TEMPORADA.badges),
    '11x11': literal('convocatoria.html', 'E11_T4_BADGES'),
    VPN: await intentar(escudosVPN, {}),
  };
  // Escudo por liga (el mismo nombre puede ser otro club en otra liga): nombre exacto, sin mayúsculas/acentos/"eSports".
  const escudo = (league, rival) => {
    const m = mapas[league] || {};
    if (m[rival]) return m[rival];
    const k = Object.keys(m).find(x => clave(x) === clave(rival));
    return k ? m[k] : null;
  };
  const custom = await intentar(calendarioCustom, []);
  const fixture = [...literal('convocatoria.html', TEMPORADA.schedule), ...custom.filter(c => c.league !== 'VPUG')]
    .map(f => ({ date: f.date, time: f.time, league: f.league, rival: f.rival, isHome: f.isHome ?? null, instancia: f.instancia || null, escudo: escudo(f.league, f.rival) }))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const partidos = SEED_MATCHES.filter(m => m.date >= TEMPORADA.desde)
    .map(m => {
      const [gf, gc] = m.match_result.split('-').map(Number);
      // Los partidos cargados desde EA no traen local/visitante: se toma del fixture; si no está, queda null (no se muestra).
      const fx = fixture.find(f => f.date === m.date && clave(f.rival) === clave(m.rival));
      return { ...m, isHome: m.isHome ?? fx?.isHome ?? null, gf, gc, res: gf > gc ? 'V' : gf < gc ? 'D' : 'E', escudo: escudo(m.league, m.rival) };
    });
  return { partidos, fixture, escudos: mapas.VPUG, escudo, roster: ROSTER_T4 || null };
}

// Resumen de un tramo de partidos: récord, goles y figuras individuales (de los players[] de cada partido).
export function resumen(partidos) {
  const r = { pj: partidos.length, v: 0, e: 0, d: 0, gf: 0, gc: 0, jugadores: {}, ligas: {} };
  for (const m of partidos) {
    const k = m.res === 'V' ? 'v' : m.res === 'E' ? 'e' : 'd';
    r[k]++;
    r.gf += m.gf; r.gc += m.gc;
    const l = r.ligas[m.league] ??= { liga: LIGA_VISIBLE(m.league), pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0 };
    l.pj++; l[k]++; l.gf += m.gf; l.gc += m.gc;
    // Partidos que EA registró corruptos ("estadísticas de EA descartadas"): sus notas por jugador no valen.
    const sinNotas = /descartad/i.test(m.notes || '');
    for (const p of m.players || []) {
      const gt = p.matched || p.name;
      if (!gt || /\s/.test(gt) && !p.matched) continue;   // nombres del juego que no son del plantel ("F. van Dijk")
      const j = r.jugadores[gt] ??= { gt, pj: 0, goles: 0, asist: 0, ratings: [] };
      j.pj++; j.goles += p.goals || 0; j.asist += p.assists || 0;
      if (p.rating && !sinNotas) j.ratings.push(p.rating);
    }
  }
  r.pts = r.v * 3 + r.e;
  for (const l of Object.values(r.ligas)) l.pts = l.v * 3 + l.e;
  r.vallas = partidos.filter(m => m.gc === 0).length;
  const lista = Object.values(r.jugadores).map(j => ({ ...j, prom: j.ratings.length ? j.ratings.reduce((a, b) => a + b, 0) / j.ratings.length : 0 }));
  r.goleadores = lista.filter(j => j.goles > 0).sort((a, b) => b.goles - a.goles || b.prom - a.prom);
  // Mejor promedio: solo quienes jugaron al menos la mitad de los partidos (un 7.8 en un partido no es una semana).
  r.promedios = lista.filter(j => j.ratings.length >= Math.max(1, Math.ceil(r.pj / 2))).sort((a, b) => b.prom - a.prom);
  r.asistidores = lista.filter(j => j.asist > 0).sort((a, b) => b.asist - a.asist);
  return r;
}

// Render recortado de un jugador para las piezas (pose de la temporada; si no hay, la de frente).
export function render(gt, preferidos = ['Gesto4', 'Unica4', 'Frente4', 'Brazos4']) {
  for (const n of preferidos) {
    const f = path.join(ROOT, 'Renders', gt, `${n}.png`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}
