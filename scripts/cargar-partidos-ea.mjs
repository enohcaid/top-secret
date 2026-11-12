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
//
// Contraste con las ligas (2026-11-12): el 11/11 EA dejó dos partidos completos (0-0 y 1-1) como 0-3 con 0 tiros y
// casi nadie con pases (registro de partido abandonado/corrupto) y el chequeo de goles no lo frenó porque nuestros
// goles daban 0 igual. Ahora:
//   · estadísticas vacías (0 tiros y ≤2 jugadores con pases) → no se usan los números de EA;
//   · resultado oficial de la liga: VPN por /vpn-results del Worker (partido por partido); VPUG Primera por la tabla
//     pública (/vpug-table-primera: si ya cuenta el partido, el resultado sale por diferencia de GF/GC con lo cargado).
//     Espacio Gamer no publica resultados por partido: queda solo con el chequeo de EA.
//   · si la liga lo tiene y no coincide con EA, o EA vino vacío, se carga con el resultado de la liga, sin estadísticas
//     de EA (team_stats en null, players vacío) y avisando; si la liga todavía no lo tiene y EA vino vacío, no se carga.
//   · partidos de VPN que la liga ya publicó y no están ni en EA ni en el seed (EA no los guardó) → aviso "FALTA".
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

// ── Resultados oficiales de las ligas ──
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const mismoClub = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.startsWith(y.slice(0, 12)) || y.startsWith(x.slice(0, 12))); };
const traer = async ruta => { try { const r = await fetch(WORKER + ruta, { signal: AbortSignal.timeout(40000) }); return r.ok ? await r.json() : null; } catch { return null; } };
const [vpn, vpugTabla] = await Promise.all([traer('/vpn-results'), traer('/vpug-table-primera')]);
const VPUG_PRIMERA_DESDE = '2026-11-10';                                 // inicio de "2026 · Temporada 1" (Primera)
const filaTop = (vpugTabla?.teams || []).find(t => /top\s*secret/i.test(t.name));
const cargados = [...SEED_MATCHES];                                     // lo del seed + lo que se va agregando en esta corrida
const goles = r => String(r).split('-').map(Number);

function oficial(c, ea) {
  if (c.liga === 'VPN') {
    const m = (Array.isArray(vpn) ? vpn : []).find(x => x.date === c.fecha && mismoClub(x.rival, c.rival) && x.ts != null && x.rv != null);
    return m ? `${m.ts}-${m.rv}` : null;
  }
  if (c.liga === 'VPUG' && c.fecha >= VPUG_PRIMERA_DESDE && filaTop && !vpugTabla?.cache) {
    const prev = cargados.filter(m => m.league === 'VPUG' && m.date >= VPUG_PRIMERA_DESDE);
    if (filaTop.gp !== prev.length + 1) return null;                    // la tabla todavía no lo cuenta (o falta otro): no se sabe
    const [gf, gc] = prev.reduce(([a, b], m) => { const [x, y] = goles(m.match_result); return [a + x, b + y]; }, [0, 0]);
    const r = `${filaTop.gf - gf}-${filaTop.gc - gc}`;
    return /^\d+-\d+$/.test(r) ? r : null;
  }
  return null;
}

const nuevos = [];
for (const p of [...(hist.partidos || [])].reverse()) {                 // del más viejo al más nuevo
  const c = p.calendario;
  if (!c?.rival || !c.fecha || p.sospechoso) continue;
  let res = `${p.gf}-${p.gc}`;
  if (ids.has(p.id) && p.id !== FORZAR) continue;
  const jug = p.jugadores || [];
  const e = p.equipo || {};
  const vacio = (e.tiros || 0) === 0 && jug.filter(j => (j.pases_int || 0) > 0).length <= 2;
  const ofi = oficial(c, res);
  const golesJug = jug.reduce((a, j) => a + (j.goles || 0), 0);
  const cierra = golesJug === p.gf && jug.length >= 7;
  let usarEA = true, aviso = '';
  if (ofi && ofi !== res) { usarEA = false; aviso = `EA dice ${res}, la liga ${ofi}`; res = ofi; }
  else if (vacio) {
    if (!ofi) { console.log(`REVISAR A MANO: ${c.fecha} ${c.liga} vs ${c.rival} figura ${res} en EA con estadísticas vacías (0 tiros, casi sin pases: partido abandonado o mal registrado, EA ${p.id}) y no hay resultado de la liga para contrastar: no se carga.`); continue; }
    usarEA = false; aviso = `EA ${res} con estadísticas vacías; la liga confirma ${ofi}`;
  } else if (!cierra) {
    console.log(`REVISAR A MANO: ${c.fecha} ${c.liga} vs ${c.rival} figura ${res} en EA pero los goles de los jugadores suman ${golesJug} (${jug.length} jugadores, EA ${p.id}): no se carga.`);
    continue;
  }
  if (aviso) console.log(`CORREGIDO CON LA LIGA: ${c.fecha} ${c.liga} vs ${c.rival}: ${aviso} → se carga ${res} sin las estadísticas de EA.`);
  const k = triples.indexOf(`${c.rival}|${c.fecha}|${res}`);
  if (k >= 0 && p.id !== FORZAR) { triples.splice(k, 1); continue; }                       // ya cargado a mano (consume uno: ida y vuelta)
  if (!usarEA) {
    const n = { rival: c.rival, league: c.liga, date: c.fecha, match_result: res, uploadedAt: new Date().toISOString(), ea_match_id: p.id, origen: 'ea-auto',
      notes: `${c.hora} hs · resultado de la web de la liga (${aviso}); estadísticas de EA descartadas. Falta completar con el reporte del video (posesión, xG, córners, goleadores y minutos, posiciones)`,
      team_stats: Object.fromEntries(['posesion', 'tiros', 'tiros_arco', 'goles_esperados', 'pases', 'precision_pases', 'entradas', 'entradas_exito', 'intercepciones', 'paradas', 'faltas', 'fuera_juego', 'corneres', 'regates_exito', 'precision_tiro'].map(x => [x, null])),
      players: [] };
    nuevos.push(n); cargados.push(n); continue;
  }
  nuevos.push({
    rival: c.rival, league: c.liga, date: c.fecha, match_result: res, uploadedAt: new Date().toISOString(), ea_match_id: p.id, origen: 'ea-auto',
    notes: `${c.hora} hs · cargado automático desde EA (cargar-partidos-ea.mjs)${ofi ? ', resultado confirmado por la liga' : ''}: falta completar con el reporte del video (posesión, xG, córners, minutos de los goles, posiciones)`,
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
  cargados.push(nuevos.at(-1));
}

// Partidos de VPN de los últimos 7 días que la liga ya publicó y no están cargados (EA no los guardó: el 11/11 pasó con
// Division Palermo). Solo se avisa: sin EA ni video no hay de dónde sacar más que el resultado.
const hace7 = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
for (const m of (Array.isArray(vpn) ? vpn : []).filter(x => x.date >= hace7 && x.ts != null && x.rv != null))
  if (!cargados.some(s => s.league === 'VPN' && s.date === m.date && mismoClub(s.rival, m.rival)))
    console.log(`FALTA: ${m.date} VPN vs ${m.rival} ${m.ts}-${m.rv} según la liga, y no está en EA ni en seed_matches.js: cargarlo desde el reporte del video.`);

if (!nuevos.length) { console.log('No hay partidos nuevos de EA para cargar.'); process.exit(0); }
for (const n of nuevos) console.log(`${n.date} ${n.league} vs ${n.rival}: ${n.match_result} (${n.players.length} jugadores, EA ${n.ea_match_id})`);
if (!APLICAR) { console.log('(sin --aplicar: no se escribió nada)'); process.exit(0); }

// Al final del array, con el estilo del archivo (claves sin comillas)
const lit = v => v === null || typeof v !== 'object' ? JSON.stringify(v).replace(/^"(.*)"$/s, (_, s) => `'${s.replace(/\\"/g, '"').replace(/'/g, "\\'")}'`)
  : Array.isArray(v) ? `[${v.map(lit).join(', ')}]` : `{${Object.entries(v).map(([k, x]) => `${k}:${lit(x)}`).join(', ')}}`;
const bloque = nuevos.map(n => {
  const { players, ...resto } = n;
  const de = players.length ? 'cargado automático desde EA' : 'resultado de la liga (EA inconsistente)';
  return `  // ${n.league} — ${n.rival} — ${n.date} (${n.match_result}) · ${de}\n  ${lit(resto).slice(0, -1)},\n  players:[${players.length ? `\n${players.map(j => `    ${lit(j)},`).join('\n')}\n  ` : ''}]},`;
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
