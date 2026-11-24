// Trae de EA los últimos partidos y las estadísticas del plantel, por el Chrome del pipeline (CDP 9222): a los pedidos
// directos (Worker, node) EA les responde 403 desde mediados de noviembre de 2026; a la página abierta en Chrome no.
// Los deja en KV `ea_crudo`, y el Worker (syncEaPartidos) los asigna al calendario como siempre.
//   node scripts/ea-traer.mjs               → trae, sincroniza y carga a seed_matches.js lo nuevo (tarea cada 30 min)
//   node scripts/ea-traer.mjs --solo-traer  → sin cargar (retransmitir.mjs carga después)
// Entre las 22:00 y las 00:30 solo trae: la liga tarda en publicar y la carga es al final de la noche.
import { execFileSync } from 'child_process';
import path from 'path';
import { chromium } from 'playwright';
import { ROOT, loadEnv } from './lib/env.mjs';
import { leerKV, guardarKV } from './social/lib/aprobaciones.mjs';

loadEnv();
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev', CLUB = '404340', TIPOS = ['friendlyMatch'];
const log = m => console.log(`${new Date().toLocaleString('sv-SE')} [ea] ${m}`);
setTimeout(() => { log('cortado a los 6 minutos'); process.exit(1); }, 360000).unref();

const b = await chromium.connectOverCDP('http://localhost:9222', { timeout: 20000 });
const p = await b.contexts()[0].newPage();
let crudo;
try {
  await p.goto(`https://www.ea.com/games/ea-sports-fc/clubs/overview?clubId=${CLUB}&platform=common-gen5`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const get = ruta => p.evaluate(async u => {
    const r = await fetch(u);
    if (!r.ok) throw new Error('EA ' + r.status);
    return r.json();
  }, `https://proclubs.ea.com/api/fc/${ruta}`);
  crudo = { ts: Date.now(), partidos: {} };
  for (const t of TIPOS) crudo.partidos[t] = await get(`clubs/matches?platform=common-gen5&clubIds=${CLUB}&matchType=${t}&maxResultCount=10`);
  crudo.stats = (await get(`members/stats?platform=common-gen5&clubId=${CLUB}`)).members || [];
  crudo.carrera = (await get(`members/career/stats?platform=common-gen5&clubId=${CLUB}`)).members || [];
} finally { await p.close().catch(() => {}); }

const ids = d => TIPOS.flatMap(t => (d?.partidos?.[t] || []).map(m => m.matchId)).sort().join();
const antes = await leerKV('ea_crudo', null);
const nuevo = ids(antes) !== ids(crudo);
if (nuevo || Date.now() - (antes?.ts || 0) > 3600e3) {
  await guardarKV('ea_crudo', crudo);
  if (nuevo) await new Promise(r => setTimeout(r, 65000));            // KV tarda hasta 60 s en verse en el Worker
  const s = await (await fetch(`${WORKER}/ea-historial/refrescar`, { method: 'POST' })).json();
  log(`${crudo.partidos.friendlyMatch.length} partidos de EA; nuevos del calendario: ${s.nuevos}`);
} else log('sin partidos nuevos');

const h = new Date().getHours() * 60 + new Date().getMinutes();
if (!process.argv.includes('--solo-traer') && h >= 30 && h < 22 * 60) {
  for (const s of ['cargar-partidos-ea.mjs', 'completar-goleadores.mjs']) {
    if (s.startsWith('completar') && !nuevo) continue;
    try { log(execFileSync(process.execPath, [path.join(ROOT, 'scripts', s), '--aplicar', '--commit'], { cwd: ROOT, encoding: 'utf8', timeout: 110000, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').slice(-3).join(' · ')); }
    catch (e) { log(`${s}: ${String(e.message).slice(0, 150)}`); }
  }
}
process.exit(0);
