// Datos para el overlay del vivo (los usan retransmitir.mjs y demo-vivo.mjs; rutas relativas a la raíz del repo).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

// Números de la etapa actual (partidos después de T4_CUTOFF) desde seed_matches.js. ETAPA es lo que se muestra:
// al 2026-10-15 el club está en PRETEMPORADA (la T4 todavía no arrancó, corrección de Juan). Cuando arranque la T4,
// cambiar ETAPA a 'Temporada 4' y T4_CUTOFF a la fecha real de inicio (es la misma que usan las páginas del sitio).
export const ETAPA = 'Pretemporada';
const T4_CUTOFF = '2026-09-28';
export async function temporada() {
  try {
    const { SEED_MATCHES } = await import(pathToFileURL(path.resolve('seed_matches.js')).href + '?' + Date.now());
    const t = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 }, goles = {};
    for (const m of SEED_MATCHES.filter(m => m.date > T4_CUTOFF)) {
      const [a, b] = String(m.match_result || '').split('-').map(Number); if (Number.isNaN(a) || Number.isNaN(b)) continue;
      t.pj++; t.gf += a; t.gc += b; if (a > b) t.g++; else if (a < b) t.p++; else t.e++;
      for (const j of m.players || []) { const gt = j.matched || j.name; if (j.goals) goles[gt] = (goles[gt] || 0) + j.goals; }
    }
    const [goleador, golesGoleador] = Object.entries(goles).sort((x, y) => y[1] - x[1])[0] || [];
    return { ...t, goleador, golesGoleador, etapa: ETAPA };
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
    return [...new Set([...fijos, ...Object.keys(disp)])].filter(n => ['green', 'yellow'].includes(estadoDe(n)));
  } catch { return null; }
}
