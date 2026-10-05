#!/usr/bin/env node
// Video "Nuevos fichajes" (vertical 1080×1920, 30 fps): cada fichaje tiene su momento a pantalla completa —
// brazos cruzados → destello → su pose— con estética libre y minimalista (sin recuadros). Escena en
// escena-fichajes.js. Lleva música trap libre (regla del club) y portada "NUEVOS FICHAJES" en los 2 primeros cuadros.
//
//   node scripts/video-plantel/fichajes.mjs gt1 gt2 ...      (en el orden del video)
//   opciones: --out archivo.mp4 · --musica "<nombre>" (default Whoop) · --sin-musica
// Salida: el mp4, <mp4>-portada.jpg (vertical) y <mp4>-portada-4x3.jpg (noticia / vista previa).
// Necesita los cuadros de prep.mjs en las dos poses: POSE=Brazos4 y Gesto4 (default), y Renders/<gt>/Gesto4.png.
import fs from 'fs';
import http from 'http';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { elegirMusica } from '../lib/musica.mjs';
import { ROSTER_T4 } from '../../roster.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const HERE = path.join(ROOT, 'scripts/video-plantel');
const argv = process.argv.slice(2);
const opt = (k, def = null) => { const i = argv.indexOf(k); return i < 0 ? def : argv[i + 1]; };
const valores = new Set(['--out', '--musica', '--id'].map(k => opt(k)).filter(Boolean));
const keys = argv.filter(a => !a.startsWith('--') && !valores.has(a));
if (!keys.length) { console.error('uso: node scripts/video-plantel/fichajes.mjs gt1 gt2 ...'); process.exit(1); }
const porKey = Object.fromEntries(ROSTER_T4.map(p => [p.key, p]));
const items = keys.map(k => { if (!porKey[k]) throw new Error('no está en ROSTER_T4: ' + k); return { key: k, num: String(porKey[k].num), puesto: porKey[k].posn }; });

const DIR = { brazos: path.join(ROOT, 'fuentes/video-plantel/Brazos4/frames'), gesto: path.join(ROOT, 'fuentes/video-plantel/Gesto4/frames') };
for (const it of items) for (const [p, d] of Object.entries(DIR))
  if (!fs.existsSync(path.join(d, it.key, '150.jpg'))) { console.error(`faltan cuadros ${p} de ${it.key} (prep.mjs)`); process.exit(1); }
const OUT = path.resolve(opt('--out', path.join(ROOT, 'fuentes/video-plantel/fichajes/nuevos-fichajes-t4.mp4')));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// Música: cada video publicado lleva un tema propio que no se repite (scripts/lib/musica.mjs + scripts/musica-usada.json).
// --musica "<nombre>" para elegir uno (tiene que estar libre); --id para el nombre del video en el registro.
const SIN_MUSICA = argv.includes('--sin-musica'), MUSICA = opt('--musica');
const VIDEO_ID = opt('--id', path.basename(OUT, '.mp4'));

// Recortes de la pose (fondo transparente, contorno de lo opaco) para la portada y el cierre
const recortes = {};
for (const it of items) {
  const src = path.join(ROOT, 'Renders', it.key, 'Gesto4.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  recortes[it.key] = await sharp(src).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).resize({ height: 1100 }).png().toBuffer();
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet">
<style>html,body{margin:0;background:#000}</style></head><body>
<canvas id="c" width="1080" height="1920"></canvas><canvas id="h" width="1600" height="1200"></canvas>
<script>${fs.readFileSync(path.join(HERE, 'escena-fichajes.js'), 'utf8')}</script></body></html>`;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(PAGE); }
  const m = u.match(/^\/(brazos|gesto)\/([^/]+)\/(\d{3}\.jpg)$/);
  if (m) { const f = path.join(DIR[m[1]], m[2], m[3]); if (fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return fs.createReadStream(f).pipe(res); } }
  const r = u.match(/^\/recorte\/([^/]+)\.png$/);
  if (r && recortes[r[1]]) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(recortes[r[1]]); }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(0, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1920 } });
await page.goto(`http://localhost:${server.address().port}/`);
const total = await page.evaluate(async its => {
  window.V = crearFichajes(document.getElementById('c'), { items: its });
  window.Hz = crearFichajes(document.getElementById('h'), { items: its });
  await window.Hz.preparar();
  return window.V.preparar();
}, items);
const base = OUT.replace(/\.mp4$/, '');
fs.writeFileSync(base + '-portada-4x3.jpg', Buffer.from(await page.evaluate(() => window.Hz.portada()), 'base64'));

const tmp = base + '.sin-audio.mp4';
const ff = spawn(ffmpegPath, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const b64 = await page.evaluate(n => window.V.cuadro(n), f);
  const buf = Buffer.from(b64, 'base64');
  if (f === 0) fs.writeFileSync(base + '-portada.jpg', buf);
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0) process.stdout.write(`\r${f}/${total} cuadros`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close(); server.close();
console.log(`\r${total}/${total} cuadros en ${Math.round((Date.now() - t0) / 1000)} s`);

if (!SIN_MUSICA) {
  const mp3Path = elegirMusica(VIDEO_ID, { preferida: MUSICA });
  const mp3 = path.basename(mp3Path), dirM = path.dirname(mp3Path);
  const dur = total / 30;
  execFileSync(ffmpegPath, ['-y', '-v', 'error', '-i', tmp, '-i', path.join(dirM, mp3),
    '-filter_complex', `[1:a]atrim=0:${dur},afade=t=in:d=0.5,afade=t=out:st=${(dur - 2).toFixed(2)}:d=2,loudnorm=I=-14:TP=-1.5,aresample=48000[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT]);
  fs.rmSync(tmp);
  console.log('Música:', mp3);
} else fs.renameSync(tmp, OUT);
console.log('Listo:', OUT);
