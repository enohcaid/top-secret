// Datos para el overlay del vivo (los usan retransmitir.mjs y demo-vivo.mjs; rutas relativas a la raíz del repo).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

// Números de la temporada desde seed_matches.js (Juan, 2026-10-15): la T4 empieza después del 28/9 (fin de la T3,
// mismo corte que T4_CUTOFF del sitio) y la PRETEMPORADA es parte de la T4. Los números son siempre de toda la
// temporada; la etapa solo cambia el nombre: pretemporada hasta el 19/10 y competencia oficial desde el martes 20/10,
// que arranca con Espacio Gamer.
const TEMPORADA = { nombre: 'Temporada 4', desde: '2026-09-29' };
const ETAPAS = [
  { nombre: 'Temporada 4', desde: '2026-10-20' },
  { nombre: 'Temporada 4 · Pretemporada', desde: '2026-09-29', frase: 'la pretemporada' },
];
const hoyArt = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
export const etapaActual = (hoy = hoyArt()) => {
  const i = ETAPAS.findIndex(e => hoy >= e.desde);
  return { nombre: ETAPAS[i].nombre, frase: ETAPAS[i].frase || 'la temporada' };
};
export async function temporada() {
  try {
    const { SEED_MATCHES } = await import(pathToFileURL(path.resolve('seed_matches.js')).href + '?' + Date.now());
    const t = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 }, goles = {};
    const et = etapaActual();
    for (const m of SEED_MATCHES.filter(m => m.date >= TEMPORADA.desde)) {
      const [a, b] = String(m.match_result || '').split('-').map(Number); if (Number.isNaN(a) || Number.isNaN(b)) continue;
      t.pj++; t.gf += a; t.gc += b; if (a > b) t.g++; else if (a < b) t.p++; else t.e++;
      for (const j of m.players || []) { const gt = j.matched || j.name; if (j.goals) goles[gt] = (goles[gt] || 0) + j.goals; }
    }
    const [goleador, golesGoleador] = Object.entries(goles).sort((x, y) => y[1] - x[1])[0] || [];
    return { ...t, goleador, golesGoleador, etapa: et.nombre, frase: et.frase };
  } catch { return null; }
}

// Espacio Gamer en el modo pausa (Juan, 2026-10-21): la tabla de la liga (Worker /eg-table, en el orden de EG) y
// nuestros números en la competencia oficial (11x11 en seed_matches.js desde el debut del 20/10).
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const EG_DESDE = '2026-10-20';
export async function espacioGamer() {
  try {
    const raw = await fetch(WORKER + '/eg-table', { signal: AbortSignal.timeout(10000) }).then(r => r.json());
    const tabla = (Array.isArray(raw) ? raw : []).map((t, i) => ({ pos: i + 1, nombre: t.name, escudo: t.logo, pj: t.gp, pts: t.pts, dg: t.gd, nos: /top secret/i.test(t.name) }));
    const { SEED_MATCHES } = await import(pathToFileURL(path.resolve('seed_matches.js')).href + '?' + Date.now());
    const n = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 }, goles = {};
    for (const m of SEED_MATCHES.filter(m => m.league === '11x11' && m.date >= EG_DESDE)) {
      const [a, b] = String(m.match_result || '').split('-').map(Number); if (Number.isNaN(a) || Number.isNaN(b)) continue;
      n.pj++; n.gf += a; n.gc += b; if (a > b) n.g++; else if (a < b) n.p++; else n.e++;
      for (const j of m.players || []) { const gt = j.matched || j.name; if (j.goals) goles[gt] = (goles[gt] || 0) + j.goals; }
    }
    const [goleador, golesGoleador] = Object.entries(goles).sort((x, y) => y[1] - x[1])[0] || [];
    return tabla.length || n.pj ? { tabla, ...n, goleador, golesGoleador } : null;
  } catch { return null; }
}

// Música de fondo del modo pausa: los temas propios del club (fuentes/musica/propios, de R2), lista para el overlay
export async function listaMusica(log = console.log) {
  try {
    execFileSync(process.execPath, ['scripts/r2.mjs', 'sync-down', '_fuentes/musica/propios', 'fuentes/musica/propios'], { stdio: 'ignore', timeout: 300000 });
    const temas = fs.readdirSync('fuentes/musica/propios').filter(a => /[.]mp3$/i.test(a)).map(a => '../../fuentes/musica/propios/' + encodeURIComponent(a));
    fs.writeFileSync(path.resolve('fuentes/stream/musica.json'), JSON.stringify(temas));
    log(`Música del modo pausa: ${temas.length} temas propios.`);
  } catch (e) { log('No pude preparar la música del modo pausa:', e.message.slice(0, 150)); }
}


// Convocados de hoy (convocatoria/state en Firestore) con la misma regla que getStatus() de convocatoria.html:
// presentes = verde o amarillo (los fijos, salvo que tengan un cambio cargado para hoy; vacaciones = ausente).
export async function convocados() {
  try {
    const r = await fetch('https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/convocatoria/state', { signal: AbortSignal.timeout(10000) });
    const un = v => v.mapValue ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, un(x)]))
      : v.arrayValue ? (v.arrayValue.values || []).map(un) : Object.values(v)[0];
    const d = un({ mapValue: await r.json() });
    const HOY = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
    const fijos = d.alwaysPresent || [], disp = d.availability || {}, cambios = d.dailyOverrides || {};
    const estadoDe = n => {
      const a = disp[n];
      if (a?.status === 'black' && a.returnDate > HOY) return 'black';
      if (fijos.includes(n)) return cambios[n]?.day === HOY ? cambios[n].status : 'green';
      return a?.status || 'pending';
    };
    const conf = [...new Set([...fijos, ...Object.keys(disp)])].filter(n => ['green', 'yellow'].includes(estadoDe(n)));
    // Los que juegan: la formación de la convocatoria (lineup.slots) cruzada con los confirmados de hoy. Antes salían
    // todos los confirmados y aparecía gente que no jugó (Lil_Dekuroko, 2026-10-20). Si la formación es de otro día
    // y casi nadie coincide, quedan los confirmados.
    const once = Object.values(d.lineup?.slots || {}).filter(Boolean);
    const juegan = conf.filter(n => once.includes(n));
    return juegan.length >= 5 ? juegan : conf;
  } catch { return null; }
}
