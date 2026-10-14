// Completa SEED_MATCHES con las stats por jugador que guarda el Worker desde la API de EA.
//
// Regla (Juan, 2026-10-13): el reporte del video es la fuente fiel — marcador, stats de
// equipo y notas salen de ahí. EA solo COMPLETA lo que el video no trae: campos en null
// y campos nuevos (tiros, entradas intentadas, atajadas, minutos, MVP, arquetipo).
// Nunca pisa un valor existente. Las diferencias se informan, no se corrigen.
//
//   node scripts/ea-completar.mjs            → muestra qué haría (no escribe)
//   node scripts/ea-completar.mjs --aplicar  → escribe seed_matches.js
//
// El Worker solo guarda partidos del calendario oficial y anota a cuál corresponde
// (`calendario.rival` + `calendario.fecha`): con eso se cruza contra SEED_MATCHES, más al
// menos 6 gamertags en común. Sin esa anotación (datos viejos) se cae al cruce por rival
// (alias en ea-alias-rivales.json o palabra en común) y fecha ±1 día. Los partidos
// marcados `sospechoso` por el Worker (cortados, desconexiones) no se usan.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = path.join(ROOT, 'seed_matches.js');
const ALIAS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'ea-alias-rivales.json'), 'utf8'));
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const APLICAR = process.argv.includes('--aplicar');

const { SEED_MATCHES } = await import(pathToFileURL(SEED).href + '?t=' + Date.now());
const hist = await (await fetch(`${WORKER}/ea-historial`)).json();

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RUIDO = new Set(['esports', 'esport', 'esp', 'club', 'gaming', 'team', 'the']);
const palabras = s => norm(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !RUIDO.has(w));
function mismoRival(eaNombre, seedRival) {
  const alias = ALIAS[eaNombre];
  if (alias) return alias === seedRival;
  const a = new Set(palabras(eaNombre));
  return palabras(seedRival).some(w => a.has(w));
}
const difDias = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

let src = fs.readFileSync(SEED, 'utf8');
const informe = [];
let cambios = 0;

for (const ea of hist.partidos) {
  const eaGts = new Set(ea.jugadores.map(j => j.gamertag));
  // El Worker ya asignó cada partido a uno del calendario (rival y fecha del sitio)
  const cal = ea.calendario;
  // 3er partido de una serie (el Worker lo agregó al calendario): fecha ±1 día porque su
  // horario es estimado, y solo contra una entrada marcada como desempate — nunca la ida/vuelta
  const esDesempate = cal?.origen === 'desempate';
  const cands = SEED_MATCHES.filter(s =>
    (cal ? (s.rival === cal.rival && (esDesempate
            ? difDias(s.date, cal.fecha) <= 1 && /desempate|3er|tercer/i.test(`${s.notes || ''} ${s.torneo || ''}`)
            : s.date === cal.fecha))
         : (mismoRival(ea.rival.nombre, s.rival) && difDias(s.date, ea.fecha) <= 1)) &&
    (s.players || []).filter(p => eaGts.has(p.matched)).length >= 6);
  const titulo = `${ea.fecha} ${ea.hora} · EA ${ea.gf}-${ea.gc} ${ea.rival.nombre} (${ea.tipo})`;
  if (!cands.length) { informe.push(`— ${titulo}: no está en SEED_MATCHES`); continue; }
  // Si EA tiene dos registros del mismo cruce (uno cortado), gana el que coincide en marcador
  const seed = cands.find(s => s.match_result === `${ea.gf}-${ea.gc}`) || cands[0];
  const etiqueta = `${seed.date} ${seed.rival} ${seed.match_result}`;
  if (ea.sospechoso) { informe.push(`⚠ ${titulo}: ${ea.sospechoso} → ignorado (en el sitio: ${etiqueta})`); continue; }
  if (seed.match_result !== `${ea.gf}-${ea.gc}`) { informe.push(`⚠ ${titulo}: el marcador no coincide con ${etiqueta} → ignorado`); continue; }

  // Ubicar el bloque del partido en el texto: línea con rival + fecha, hasta el cierre de players
  const re = new RegExp(`rival:'${seed.rival.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',[^\\n]*date:'${seed.date}'`);
  const ini = src.search(re);
  if (ini < 0) { informe.push(`⚠ ${titulo}: no encontré el bloque de ${etiqueta} en el archivo`); continue; }
  const fin = src.indexOf(']},', ini);
  let bloque = src.slice(ini, fin);
  const notas = [];
  const antes = bloque;

  // Partido: id de EA
  if (!/ea_match_id:/.test(bloque)) bloque = bloque.replace(/^([^\n]*?)(\n)/, `$1 ea_match_id:'${ea.id}',$2`);

  // Stats de equipo: solo nulls
  const eq = ea.equipo;
  const ts = seed.team_stats || {};
  const fillTs = { tiros: eq.tiros, pases: eq.pases_int, entradas: eq.entradas_int, entradas_exito: eq.entradas, paradas: eq.atajadas,
    precision_pases: eq.pases_int ? Math.round(eq.pases / eq.pases_int * 100) : null };
  for (const [k, v] of Object.entries(fillTs)) {
    if (v === null || v === undefined) continue;
    if (ts[k] === null) bloque = bloque.replace(new RegExp(`(team_stats:\\{[^}]*\\b${k}:)null`), `$1${v}`);
    else if (ts[k] !== undefined && ts[k] !== v) notas.push(`equipo ${k}: video ${ts[k]} / EA ${v}`);
  }

  // Jugadores
  for (const j of ea.jugadores) {
    const p = (seed.players || []).find(x => x.matched === j.gamertag);
    if (!p) { notas.push(`${j.gamertag} jugó según EA y no está en el reporte`); continue; }
    const lineaRe = new RegExp(`\\{[^\\n]*matched:'${j.gamertag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[^\\n]*\\}`);
    const m = bloque.match(lineaRe);
    if (!m) continue;
    let linea = m[0];
    const llenar = { passes: j.pases_int, pass_accuracy: j.pases_int ? Math.round(j.pases / j.pases_int * 100) : null, tackles: j.entradas };
    for (const [k, v] of Object.entries(llenar)) {
      if (v === null) continue;
      if (p[k] === null) linea = linea.replace(new RegExp(`\\b${k}:null`), `${k}:${v}`);
      else if (p[k] !== undefined && p[k] !== v) notas.push(`${j.gamertag} ${k}: video ${p[k]} / EA ${v}`);
    }
    if (p.rating !== null && p.rating !== undefined && j.nota !== null && Math.abs(p.rating - j.nota) > 0.05) notas.push(`${j.gamertag} nota: video ${p.rating} / EA ${j.nota}`);
    if (p.goals !== j.goles || p.assists !== j.asist) notas.push(`${j.gamertag} G/A: video ${p.goals}/${p.assists} / EA ${j.goles}/${j.asist}`);
    const nuevos = { shots: j.tiros, tackle_attempts: j.entradas_int, saves: j.atajadas, red_cards: j.rojas,
      minutes: j.seg !== null ? Math.round(j.seg / 60) : null, mom: j.mvp, archetype_id: j.arq, ea_pos: j.pos };
    const extra = Object.entries(nuevos)
      .filter(([k, v]) => v !== null && v !== undefined && !new RegExp(`\\b${k}:`).test(linea))
      .map(([k, v]) => `${k}:${typeof v === 'string' ? `'${v}'` : v}`);
    if (extra.length) linea = linea.replace(/\s*\}$/, `, ${extra.join(', ')}}`);
    bloque = bloque.replace(m[0], linea);
  }

  if (bloque !== antes) { src = src.slice(0, ini) + bloque + src.slice(fin); cambios++; }
  informe.push(`${bloque !== antes ? '✓' : '='} ${titulo} → ${etiqueta}${bloque !== antes ? ' (completado)' : ' (ya estaba completo)'}`);
  for (const n of notas) informe.push(`    · ${n}`);
}

console.log(informe.join('\n'));
if (APLICAR && cambios) { fs.writeFileSync(SEED, src, 'utf8'); console.log(`\nseed_matches.js: ${cambios} partido(s) completado(s).`); }
else if (cambios) console.log(`\n${cambios} partido(s) para completar. Correr con --aplicar para escribir.`);
