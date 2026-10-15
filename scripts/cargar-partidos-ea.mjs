#!/usr/bin/env node
// Carga en SEED_MATCHES los partidos oficiales que el Worker guardó de la API de EA y todavía no están (pedido de Juan,
// 2026-10-15: que los números del sitio y del vivo se actualicen solos noche a noche). Lo corre retransmitir.mjs al
// terminar el horario del vivo.
//   node scripts/cargar-partidos-ea.mjs              → muestra qué cargaría
//   node scripts/cargar-partidos-ea.mjs --aplicar    → escribe seed_matches.js
//   node scripts/cargar-partidos-ea.mjs --aplicar --commit   → y commitea + pushea
//   pruebas: --seed <copia.js> (escribe en otro archivo) · --forzar <ea_match_id> (lo carga aunque ya esté)
//
// Fuente: GET /ea-historial del Worker (solo partidos del calendario oficial, con `calendario` {fecha, hora, liga,
// rival}). No usa los marcados `sospechoso` (cortados, desconexiones) ni los que no cierran: si los goles de nuestros
// jugadores no suman el resultado (un partido cortado/reiniciado queda en EA como 3-0 sin goles ni tiros — pasó el
// 2026-10-14 y el Worker no lo marcó), lo avisa y no lo carga. Un partido ya está cargado si su `ea_match_id`
// está en SEED_MATCHES o si hay una entrada con el mismo rival, fecha y resultado (las cargadas a mano desde el video).
// Lo que EA no trae (posesión, xG, córners, faltas, minuto de los goles, posición exacta) queda en null: la entrada
// lleva origen:'ea-auto' para completarla con el reporte del video (el video manda; ver ea-completar.mjs).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const oa = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SEED = oa('--seed') ? path.resolve(oa('--seed')) : path.join(ROOT, 'seed_matches.js'), FORZAR = oa('--forzar');
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const APLICAR = process.argv.includes('--aplicar'), COMMIT = process.argv.includes('--commit');

const { SEED_MATCHES } = await import(pathToFileURL(SEED).href + '?t=' + Date.now());
const hist = await (await fetch(`${WORKER}/ea-historial`, { signal: AbortSignal.timeout(20000) })).json();

const ids = new Set(SEED_MATCHES.map(m => m.ea_match_id).filter(Boolean));
const triples = SEED_MATCHES.map(m => `${m.rival}|${m.date}|${m.match_result}`);
const POS = { goalkeeper: 'PO', defender: 'DFC', midfielder: 'MC', forward: 'DC' };
const pct = (a, b) => (b ? Math.round(a / b * 100) : null);

const nuevos = [];
for (const p of [...(hist.partidos || [])].reverse()) {                 // del más viejo al más nuevo
  const c = p.calendario;
  if (!c?.rival || !c.fecha || p.sospechoso) continue;
  const res = `${p.gf}-${p.gc}`;
  if (ids.has(p.id) && p.id !== FORZAR) continue;
  const golesJug = (p.jugadores || []).reduce((a, j) => a + (j.goles || 0), 0);
  if (golesJug !== p.gf || (p.jugadores || []).length < 7) {
    console.log(`REVISAR A MANO: ${c.fecha} ${c.liga} vs ${c.rival} figura ${res} en EA pero los goles de los jugadores suman ${golesJug} (${(p.jugadores || []).length} jugadores, EA ${p.id}): no se carga.`);
    continue;
  }
  const k = triples.indexOf(`${c.rival}|${c.fecha}|${res}`);
  if (k >= 0 && p.id !== FORZAR) { triples.splice(k, 1); continue; }                       // ya cargado a mano (consume uno: ida y vuelta)
  const e = p.equipo || {};
  nuevos.push({
    rival: c.rival, league: c.liga, date: c.fecha, match_result: res, uploadedAt: new Date().toISOString(), ea_match_id: p.id, origen: 'ea-auto',
    notes: `${c.hora} hs · cargado automático desde EA (cargar-partidos-ea.mjs): falta completar con el reporte del video (posesión, xG, córners, minutos de los goles, posiciones)`,
    team_stats: { posesion: null, tiros: e.tiros ?? null, tiros_arco: null, goles_esperados: null, pases: e.pases_int ?? null, precision_pases: pct(e.pases, e.pases_int),
      entradas: e.entradas_int ?? null, entradas_exito: e.entradas ?? null, intercepciones: null, paradas: e.atajadas ?? null, faltas: null, fuera_juego: null,
      corneres: null, regates_exito: null, precision_tiro: null },
    players: (p.jugadores || []).map(j => ({
      name: j.gamertag, matched: j.gamertag, played_pos: POS[j.pos] || null, rating: j.nota, goals: j.goles, assists: j.asist,
      passes: j.pases_int, pass_accuracy: pct(j.pases, j.pases_int), distance_km: null, sprints: null, tackles: j.entradas, interceptions: null,
      shots: j.tiros, tackle_attempts: j.entradas_int, saves: j.atajadas, red_cards: j.rojas, minutes: Math.round((j.seg || 0) / 60), mom: !!j.mvp,
      archetype_id: j.arq, ea_pos: j.pos,
    })),
  });
}

if (!nuevos.length) { console.log('No hay partidos nuevos de EA para cargar.'); process.exit(0); }
for (const n of nuevos) console.log(`${n.date} ${n.league} vs ${n.rival}: ${n.match_result} (${n.players.length} jugadores, EA ${n.ea_match_id})`);
if (!APLICAR) { console.log('(sin --aplicar: no se escribió nada)'); process.exit(0); }

// Al final del array, con el estilo del archivo (claves sin comillas)
const lit = v => v === null || typeof v !== 'object' ? JSON.stringify(v).replace(/^"(.*)"$/s, (_, s) => `'${s.replace(/\\"/g, '"').replace(/'/g, "\\'")}'`)
  : Array.isArray(v) ? `[${v.map(lit).join(', ')}]` : `{${Object.entries(v).map(([k, x]) => `${k}:${lit(x)}`).join(', ')}}`;
const bloque = nuevos.map(n => {
  const { players, ...resto } = n;
  return `  // ${n.league} — ${n.rival} — ${n.date} (${n.match_result}) · cargado automático desde EA\n  ${lit(resto).slice(0, -1)},\n  players:[\n${players.map(j => `    ${lit(j)},`).join('\n')}\n  ]},`;
}).join('\n');
let src = fs.readFileSync(SEED, 'utf8');
const fin = src.lastIndexOf('\n];');
src = src.slice(0, fin) + '\n\n' + bloque + src.slice(fin);
fs.writeFileSync(SEED, src);
const { SEED_MATCHES: chequeo } = await import(pathToFileURL(SEED).href + '?t=' + Date.now() + 1);   // que siga siendo JS válido
console.log(`seed_matches.js: ${nuevos.length} partido(s) agregado(s) (total ${chequeo.length}).`);

if (COMMIT && !oa('--seed')) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, stdio: 'inherit' });
  git('add', 'seed_matches.js');
  git('commit', '-q', '-m', `feat: ${nuevos.length} partido(s) cargado(s) automático desde EA (${[...new Set(nuevos.map(n => n.date))].join(', ')})\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
  git('push', '-q');
}
