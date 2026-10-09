// Datos reales para las piezas de redes: partidos jugados (seed_matches.js), fixture y escudos de la
// temporada en curso (los mismos arrays que usa convocatoria.html, así no hay una lista paralela que se
// desactualice) y el plantel. Nada se inventa: lo que no está en estas fuentes no va en una pieza.
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ROOT } from '../../lib/env.mjs';

export const TEMPORADA = { id: 'T4', desde: '2026-10-05', torneo: 'Liga Pretemporada VPUG', liga: 'VPUG', schedule: 'VPUG_T4_SCHEDULE', badges: 'VPUG_T4_BADGES' };

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

export async function cargar() {
  const { SEED_MATCHES } = await import(pathToFileURL(path.join(ROOT, 'seed_matches.js')).href + `?t=${Date.now()}`);
  const { ROSTER_T4 } = await import(pathToFileURL(path.join(ROOT, 'roster.js')).href).catch(() => ({}));
  const fixture = literal('convocatoria.html', TEMPORADA.schedule).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const escudos = literal('convocatoria.html', TEMPORADA.badges);
  const partidos = SEED_MATCHES.filter(m => m.date >= TEMPORADA.desde)
    .map(m => {
      const [gf, gc] = m.match_result.split('-').map(Number);
      return { ...m, gf, gc, res: gf > gc ? 'V' : gf < gc ? 'D' : 'E', escudo: escudos[m.rival] || null };
    });
  return { partidos, fixture, escudos, roster: ROSTER_T4 || null };
}

// Resumen de un tramo de partidos: récord, goles y figuras individuales (de los players[] de cada partido).
export function resumen(partidos) {
  const r = { pj: partidos.length, v: 0, e: 0, d: 0, gf: 0, gc: 0, jugadores: {} };
  for (const m of partidos) {
    r[m.res === 'V' ? 'v' : m.res === 'E' ? 'e' : 'd']++;
    r.gf += m.gf; r.gc += m.gc;
    for (const p of m.players || []) {
      const gt = p.matched || p.name;
      if (!gt || /\s/.test(gt) && !p.matched) continue;   // nombres del juego que no son del plantel ("F. van Dijk")
      const j = r.jugadores[gt] ??= { gt, pj: 0, goles: 0, asist: 0, ratings: [] };
      j.pj++; j.goles += p.goals || 0; j.asist += p.assists || 0;
      if (p.rating) j.ratings.push(p.rating);
    }
  }
  r.pts = r.v * 3 + r.e;
  const lista = Object.values(r.jugadores).map(j => ({ ...j, prom: j.ratings.length ? j.ratings.reduce((a, b) => a + b, 0) / j.ratings.length : 0 }));
  r.goleadores = lista.filter(j => j.goles > 0).sort((a, b) => b.goles - a.goles || b.prom - a.prom);
  // Mejor promedio: solo quienes jugaron al menos la mitad de los partidos (un 7.8 en un partido no es una semana).
  r.promedios = lista.filter(j => j.pj >= Math.max(1, Math.ceil(r.pj / 2))).sort((a, b) => b.prom - a.prom);
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
