#!/usr/bin/env node
// Prueba del vivo con overlay SIN transmitir: levanta MediaMTX y OBS con un video grabado en lugar de la señal de
// Enohcaid, dispara eventos de gol en los segundos indicados y graba lo que saldría para las redes (las mismas salidas
// que usa retransmitir.mjs: salidas.mjs) en demo-horizontal.mp4 y demo-vertical.mp4.
//   node scripts/stream/demo-vivo.mjs <video.mp4> --dur 110 --gol 34 --golRival 94 [--lado der@63 …] [--fecha 2026-10-14] [--out carpeta]
// (--lado izq|der@N y --modo pausa|juego@N simulan lo que en vivo detecta vigia-vivo.mjs)
// --eventos <archivo.json>: lista [{seg, tipo, valor}] (tipo gol|golRival|finPartido|modo|lado; valor = resultado,
// modo o lado) con seg = SEGUNDO DEL VIDEO: se disparan según la posición real de la fuente "Partido" en OBS (exacto),
// no según el reloj desde que se lanzó OBS (que tiene 2-3 s de error).
// Con DEMO_IG_URL en el entorno (URL+clave rtmps de un vivo de Instagram en modo "Practicar") la vertical va ahí.
// Al terminar cierra todo y deja la configuración de OBS como estaba (obs-config.mjs).
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { argsSalidas } from './salidas.mjs';
import { temporada, listaMusica } from './datos-vivo.mjs';
import { conectarObs } from './obs-ws.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const VIDEO = path.resolve(process.argv[2]);
const DUR = +arg('--dur', 110), FECHA = arg('--fecha', '2026-10-14');
const OUT = path.resolve(arg('--out', path.join(ROOT, 'fuentes', 'stream', 'preview')));
const eventos = [...['gol', 'golRival'].flatMap(t => process.argv.flatMap((a, i) => a === '--' + t ? [{ tipo: t, seg: +process.argv[i + 1] }] : [])),
  ...(arg('--eventos') ? JSON.parse(fs.readFileSync(arg('--eventos'), 'utf8')) : []),
  ...process.argv.flatMap((a, i) => a === '--modo' ? [{ tipo: 'modo', valor: process.argv[i + 1].split('@')[0], seg: +process.argv[i + 1].split('@')[1] }] : []),
  ...process.argv.flatMap((a, i) => a === '--lado' ? [{ tipo: 'lado', valor: process.argv[i + 1].split('@')[0], seg: +process.argv[i + 1].split('@')[1] }] : [])];
const OBS_DIR = 'C:\\Program Files\\obs-studio\\bin\\64bit';
const ESCENAS = path.join(process.env.APPDATA, 'obs-studio', 'basic', 'scenes');
const ESTADO = path.join(ROOT, 'fuentes', 'stream', 'estado.json');
const espera = ms => new Promise(r => setTimeout(r, ms));
const log = m => console.log(`[${new Date().toLocaleTimeString('es-AR')}] ${m}`);

// Partidos de la fecha para la placa y el modo pausa (como hace retransmitir.mjs)
let todos = [];
try { todos = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'placa-envivo.mjs'), '--json', '--fecha', FECHA], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').pop()); }
catch (e) { try { todos = JSON.parse(String(e.stdout).trim().split('\n').pop()); } catch {} }
const p = todos[0] || {};
const estadoPrevio = fs.existsSync(ESTADO) ? fs.readFileSync(ESTADO, 'utf8') : null;
const escribir = e => { fs.writeFileSync(ESTADO + '.tmp', JSON.stringify(e, null, 1)); fs.renameSync(ESTADO + '.tmp', ESTADO); };
const estado = { torneo: [p.liga, p.torneo !== p.liga && p.torneo, p.etapa].filter(Boolean).join(' · ').toUpperCase(), rival: p.rival || '', escudo: p.escudo || '', eventos: [],
  proximos: todos.slice(1), temporada: await temporada() };
await listaMusica();
escribir(estado);

// La fuente "Partido" pasa a leer el video grabado
for (const c of ['TopSecret']) {
  const f = path.join(ESCENAS, c + '.json'); const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  Object.assign(j.sources.find(s => s.name === 'Partido').settings, { is_local_file: true, local_file: VIDEO.replaceAll('\\', '/'), looping: false });
  fs.writeFileSync(f, JSON.stringify(j, null, 1));
}
const sentinel = path.join(process.env.APPDATA, 'obs-studio', '.sentinel');
if (fs.existsSync(sentinel)) for (const f of fs.readdirSync(sentinel)) fs.rmSync(path.join(sentinel, f), { force: true });

const procs = [];
procs.push(spawn(path.join(ROOT, 'fuentes', 'stream', 'bin', 'mediamtx', 'mediamtx.exe'), [path.join(ROOT, 'scripts', 'stream', 'mediamtx.yml')], { stdio: 'ignore', cwd: path.join(ROOT, 'fuentes', 'stream', 'bin', 'mediamtx') }));
await espera(1500);
const t0 = Date.now();
spawn(path.join(OBS_DIR, 'obs64.exe'), ['--profile', 'TopSecret', '--collection', 'TopSecret', '--startstreaming', '--minimize-to-tray', '--disable-shutdown-check', '--disable-updater'], { cwd: OBS_DIR, detached: true, stdio: 'ignore' }).unref();
log('OBS lanzado');

// Grabar las dos salidas apenas el lienzo aparece en MediaMTX
fs.mkdirSync(OUT, { recursive: true });
const H = path.join(OUT, 'demo-horizontal.flv'), V = path.join(OUT, 'demo-vertical.flv');
const grabaciones = (async () => {
  for (let i = 0; i < 40; i++) {
    // rutas relativas con / (el "D:" de una absoluta confunde al muxer tee)
    const rel = f => path.relative(process.cwd(), f).split(path.sep).join('/');
    const r = spawn(ffmpegPath, ['-y', ...argsSalidas({ entrada: 'rtmp://127.0.0.1:1935/live/mix', horizontales: [rel(H)], vertical: process.env.DEMO_IG_URL || rel(V),
      entradaArgs: ['-rw_timeout', '5000000', '-t', String(DUR)] })], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; r.stderr.on('data', d => err += d);
    const code = await new Promise(res => r.on('close', res));
    if (code === 0 && fs.existsSync(H) && fs.statSync(H).size > 1e5) { log('salidas grabadas'); break; }
    if (i === 39) log('el lienzo no apareció: ' + err.slice(-300));
    await espera(1000);
  }
  for (const f of [H, V]) if (fs.existsSync(f)) {     // a mp4 para mirarlo fácil
    execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-i', f, '-c', 'copy', '-movflags', '+faststart', f.replace(/[.]flv$/, '.mp4')]); fs.rmSync(f);
  }
})();

// Eventos de gol, contados desde que se lanzó OBS (la fuente arranca al cargar la colección)
// Con --eventos, el tiempo es el del video que reproduce OBS (GetMediaInputStatus de "Partido")
const EN_VIDEO = !!arg('--eventos');
let obsCtl = null;
async function cursorVideo() {
  try { obsCtl ||= await conectarObs(); const r = await obsCtl.pedir('GetMediaInputStatus', { inputName: 'Partido' }); return (r.mediaCursor ?? -1000) / 1000; }
  catch { obsCtl = null; return -1; }
}
for (const ev of eventos.sort((a, b) => a.seg - b.seg)) {
  if (EN_VIDEO) { while (await cursorVideo() < ev.seg) await espera(120); }
  else await espera(Math.max(0, t0 + ev.seg * 1000 - Date.now()));
  if (ev.tipo === 'lado') estado.lado = ev.valor; else if (ev.tipo === 'modo') {
    estado.modo = ev.valor;                                  // como retransmitir.mjs: en pausa baja el audio del juego
    try { const o = await conectarObs(); await o.pedir('SetInputVolume', { inputName: 'Partido', inputVolumeDb: ev.valor === 'pausa' ? -22 : 0 }); o.cerrar(); } catch {}
  } else estado.eventos.push({ id: String(Date.now()), tipo: ev.tipo, ...(ev.tipo === 'finPartido' ? { resultado: ev.valor } : {}) });
  escribir(estado);
  log(`evento ${ev.tipo}${ev.valor ? ' ' + ev.valor : ''} (seg ${ev.seg})`);
}
await grabaciones;
try { obsCtl?.cerrar(); } catch {}

try { execFileSync('taskkill', ['/IM', 'obs64.exe'], { stdio: 'ignore' }); } catch {}
await espera(8000);
try { execFileSync('taskkill', ['/IM', 'obs64.exe', '/F'], { stdio: 'ignore' }); } catch {}
procs.forEach(p => p.kill());
if (fs.existsSync(sentinel)) for (const f of fs.readdirSync(sentinel)) fs.rmSync(path.join(sentinel, f), { force: true });
execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'stream', 'obs-config.mjs')], { stdio: 'ignore' });
if (estadoPrevio === null) fs.rmSync(ESTADO, { force: true }); else fs.writeFileSync(ESTADO, estadoPrevio);
log('listo: ' + OUT);
process.exit(0);
