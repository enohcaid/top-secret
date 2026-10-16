#!/usr/bin/env node
// Genera en tanda los clips de los jugadores para el overlay, por rondas: primero lo mínimo para todos
// (así el vivo tiene variedad desde temprano) y después el resto. Saltea los que ya existen.
//   node scripts/stream/lote-clips.mjs [gamertag …]      (sin gamertags: todo el plantel T4, habituales primero)
// Log: fuentes/stream/lote-clips.log. La tarea programada "TopSecret - Clips overlay" (lote-clips.vbs) lo lanza cada
// hora: si ya hay una tanda corriendo (lock con PID vivo) sale, y si está todo hecho termina enseguida.
// El plantel sale de roster.js (ROSTER_T4): un alta o una baja ahí ya entra o sale de la tanda. Emociones: acá y en clip-jugador.mjs.
import fs from 'fs';
import path from 'path';
import { spawnSync, execFileSync } from 'child_process';
import { pathToFileURL } from 'url';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const HABITUALES = ['Juan_Martinez4', 'nikileo527', 'NicoBJ_96', 'pepolemmo2710', 'Guiidow', 'RS32-DaniStone',
  'endiabladorojo66', 'Ivan_Cabj_La12', 'Cabers14', 'Lautavester7', 'Huber236'];
// habla/escucha temprano: son las de las charlas del modo pausa (overlay)
const RONDAS = [['aliento', 'indicaciones', 'gol', 'frustrado'], ['habla', 'escucha', 'agitado', 'reclama'], ['sudor', 'pide', 'aplaude', 'calma'], ['festejo', 'triste']];
const LOG = path.join(ROOT, 'fuentes', 'stream', 'lote-clips.log');
fs.mkdirSync(path.dirname(LOG), { recursive: true });
// Índice que lee el overlay: {gt: {num, emociones}} con lo que ya está generado.
const CLIPS = path.join(ROOT, 'fuentes', 'stream', 'clips');
const { ROSTER_T4 } = await import(pathToFileURL(path.join(ROOT, 'roster.js')).href);
const PLANTEL = ROSTER_T4.map(p => p.key);
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
// Habituales primero (son los que más aparecen en el vivo); en cada ronda pasan todos antes de la siguiente.
const jugadores = args.length ? args : [...HABITUALES.filter(g => PLANTEL.includes(g)), ...PLANTEL.filter(g => !HABITUALES.includes(g))];
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
  // Durante el vivo (MediaMTX corriendo = retransmitir.mjs con overlay) no se generan clips: rembg carga mucho la CPU
  // y la PC está componiendo y codificando las transmisiones. Se espera a que termine.
  const enVivo = () => { try { return /mediamtx\.exe/i.test(execFileSync('tasklist', ['/FI', 'IMAGENAME eq mediamtx.exe'], { encoding: 'utf8' })); } catch { return false; } };
  if (enVivo()) { log('Vivo en curso: pauso la tanda.'); while (enVivo()) await new Promise(r => setTimeout(r, 60000)); log('Terminó el vivo: sigo.'); }
  log(`${gt} · ${emo}`);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'stream', 'clip-jugador.mjs'), gt, emo], { cwd: ROOT, encoding: 'utf8' });
  const err = (r.stderr || '').split('\n').map(l => l.trim()).filter(l => /error|exceeded|timeout/i.test(l)).slice(0, 2).join(' | ');
  log(r.status === 0 ? `  listo` : `  falló: ${(err || (r.stderr || '').trim().split('\n').slice(-3).join(' | ')).slice(0, 300)}`);
  fallas = r.status === 0 ? 0 : fallas + 1;
  if (r.status === 0) indice();
  if (fallas >= 3) { log('3 fallas seguidas (¿Chrome cerrado o sesión de Canva vencida?): corto, la tarea reintenta en una hora.'); process.exit(1); }
}
log('Tanda terminada.');
