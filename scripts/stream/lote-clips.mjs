#!/usr/bin/env node
// Genera en tanda los clips de los jugadores para el overlay, por rondas: primero lo mínimo para todos
// (así el vivo tiene variedad desde temprano) y después el resto. Saltea los que ya existen.
//   node scripts/stream/lote-clips.mjs [gamertag …]      (sin gamertags: los habituales de T4)
// Log: fuentes/stream/lote-clips.log. La tarea programada "TopSecret - Clips overlay" (lote-clips.vbs) lo lanza cada
// hora: si ya hay una tanda corriendo (lock con PID vivo) sale, y si está todo hecho termina enseguida.
// Para sumar jugadores o emociones alcanza con agregarlos acá o en clip-jugador.mjs.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const HABITUALES = ['Juan_Martinez4', 'nikileo527', 'NicoBJ_96', 'pepolemmo2710', 'Guiidow', 'RS32-DaniStone',
  'endiabladorojo66', 'Ivan_Cabj_La12', 'Cabers14', 'Lautavester7', 'Huber236'];
const RONDAS = [['aliento', 'indicaciones', 'gol', 'frustrado'], ['agitado', 'sudor', 'pide', 'reclama'], ['aplaude', 'calma', 'festejo', 'triste']];
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const jugadores = args.length ? args : HABITUALES;
const LOG = path.join(ROOT, 'fuentes', 'stream', 'lote-clips.log');
fs.mkdirSync(path.dirname(LOG), { recursive: true });
// Índice que lee el overlay: {gt: {num, emociones}} con lo que ya está generado.
const CLIPS = path.join(ROOT, 'fuentes', 'stream', 'clips');
const { ROSTER_T4 } = await import(pathToFileURL(path.join(ROOT, 'roster.js')).href);
function indice() {
  const out = {};
  for (const gt of fs.readdirSync(CLIPS)) {
    if (!fs.statSync(path.join(CLIPS, gt)).isDirectory()) continue;
    const emociones = fs.readdirSync(path.join(CLIPS, gt)).filter(n => n.endsWith('.webm')).map(n => n.slice(0, -5));
    if (emociones.length) out[gt] = { num: ROSTER_T4.find(p => p.key === gt)?.num || '', emociones };
  }
  fs.writeFileSync(path.join(CLIPS, 'indice.json'), JSON.stringify(out, null, 1));
}
if (process.argv.includes('--indice')) { indice(); process.exit(0); }   // solo rehace el índice
const LOCK = path.join(ROOT, 'fuentes', 'stream', '.lote.lock');
try { process.kill(+fs.readFileSync(LOCK, 'utf8'), 0); process.exit(0); } catch {}   // otra tanda viva → nada que hacer
fs.writeFileSync(LOCK, String(process.pid));
process.on('exit', () => { try { if (fs.readFileSync(LOCK, 'utf8') === String(process.pid)) fs.rmSync(LOCK); } catch {} });
indice();
const log = m => { const l = `[${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })}] ${m}`; console.log(l); fs.appendFileSync(LOG, l + '\n'); };


let fallas = 0;
for (const ronda of RONDAS) for (const gt of jugadores) for (const emo of ronda) {
  if (fs.existsSync(path.join(ROOT, 'fuentes', 'stream', 'clips', gt, `${emo}.webm`))) continue;
  log(`${gt} · ${emo}`);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'stream', 'clip-jugador.mjs'), gt, emo], { cwd: ROOT, encoding: 'utf8' });
  log(r.status === 0 ? `  listo` : `  falló: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ').slice(0, 300)}`);
  fallas = r.status === 0 ? 0 : fallas + 1;
  if (r.status === 0) indice();
  if (fallas >= 3) { log('3 fallas seguidas (¿Chrome cerrado o sesión de Canva vencida?): corto, la tarea reintenta en una hora.'); process.exit(1); }
}
log('Tanda terminada.');
