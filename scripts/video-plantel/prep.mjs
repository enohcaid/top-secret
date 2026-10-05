#!/usr/bin/env node
// Prepara el material de cada jugador para los videos de plantel / equipo de la noche.
//
//   node scripts/video-plantel/prep.mjs [gamertag ...]      (sin argumentos: todo ROSTER_T4)
//
// POSE (env, default Gesto4) elige el render de origen: Renders/<gt>/<POSE>.png. Gesto4 = gesto propio de cada
// jugador mirando a cámara (scripts/video-plantel/poses.mjs). Brazos4 = brazos cruzados (reusa el reel de fichajes).
// Por jugador, en fuentes/video-plantel/<POSE>/:
//   <gt>.png          imagen base 1080×1920 (el render sobre fondo dorado, igual que el reel de fichajes)
//   <gt>.mp4          clip de 5 s "Imagen a video" de Canva (con Brazos4 se toma de fuentes/video-fichajes si existe;
//                     si no hay, se genera con scripts/canva-imagen-a-video.mjs <gt>.png — ver README)
//   frames/<gt>/NNN.jpg  los 150 cuadros del clip a 720×1280, los usa render.mjs
// Si un jugador todavía no tiene clip de Canva, sus cuadros salen de un acercamiento simulado sobre la
// imagen base (marcado como provisorio en frames/<gt>/PROVISORIO) para poder ver el video igual.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { ROSTER_T4 } from '../../roster.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const POSE = process.env.POSE || 'Gesto4';
const D = path.join(ROOT, 'fuentes/video-plantel', POSE);
const FICHAJES = POSE === 'Brazos4' ? path.join(ROOT, 'fuentes/video-fichajes') : path.join(D, '__no_existe__');
const W = 1080, H = 1920, FW = 720, FH = 1280, N = 150;

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
<radialGradient id="g" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#6b5424"/><stop offset=".45" stop-color="#241c0e"/><stop offset="1" stop-color="#070605"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/></svg>`);

async function base(gt) {
  const out = path.join(D, gt + '.png');
  if (fs.existsSync(out)) return out;
  const prev = path.join(FICHAJES, gt + '.png');
  if (fs.existsSync(prev)) { fs.copyFileSync(prev, out); return out; }
  const src = path.join(ROOT, 'Renders', gt, POSE + '.png');
  if (!fs.existsSync(src)) execFileSync('node', [path.join(ROOT, 'scripts/r2.mjs'), 'get', `Renders/${gt}/${POSE}.png`, src], { stdio: 'ignore' });
  if (!fs.existsSync(src)) throw new Error(`falta Renders/${gt}/${POSE}.png`);
  // Alto 2700 (cabeza a rodillas en cuadro), salvo poses anchas (brazos abiertos/bíceps): se achican hasta
  // que el cuerpo entre a lo ancho con margen, así no quedan brazos cortados.
  // Contorno de lo opaco (alfa > 60): trim() a secas toma sombras casi transparentes y achica de más.
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const trimmed = await sharp(src).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
  const tm = { width: x1 - x0 + 1, height: y1 - y0 + 1 };
  // Como mucho se achica al 80% del tamaño normal, para que ningún jugador quede chico en la tarjeta.
  const scale = Math.max(Math.min(2700 / tm.height, (W - 60) / tm.width), 0.8 * 2700 / tm.height);
  const big = await sharp(trimmed).resize({ height: Math.round(tm.height * scale) }).png().toBuffer();
  const bm = await sharp(big).metadata();
  const cw = Math.min(bm.width, W);
  const pl = await sharp(big).extract({ left: Math.round((bm.width - cw) / 2), top: 0, width: cw, height: Math.min(H - 230, bm.height) }).png().toBuffer();
  const m = await sharp(pl).metadata();
  await sharp(bg).composite([{ input: pl, left: Math.round((W - m.width) / 2), top: 230 }]).png().toFile(out);
  return out;
}

async function frames(gt, img) {
  const dir = path.join(D, 'frames', gt);
  const clip = [path.join(D, gt + '.mp4'), path.join(FICHAJES, gt + '.mp4')].find(f => fs.existsSync(f));
  const marker = path.join(dir, 'PROVISORIO');
  const done = fs.existsSync(path.join(dir, '150.jpg'));
  if (done && !(clip && fs.existsSync(marker))) return clip ? 'canva' : 'provisorio';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  if (clip) {
    if (!clip.startsWith(D)) fs.copyFileSync(clip, path.join(D, gt + '.mp4'));
    execFileSync(ffmpegPath, ['-v', 'error', '-i', clip, '-vf', `scale=${FW}:${FH}:force_original_aspect_ratio=increase,crop=${FW}:${FH}`,
      '-frames:v', String(N), '-q:v', '3', path.join(dir, '%03d.jpg')]);
    return 'canva';
  }
  // Acercamiento simulado: de cuerpo entero a primer plano, como hacen los clips de Canva.
  const meta = await sharp(img).metadata();
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), e = t * t * (3 - 2 * t);
    const z = 1 + 0.55 * e;
    const w = Math.round(meta.width / z), h = Math.round(meta.height / z);
    const left = Math.round((meta.width - w) / 2), top = Math.round((meta.height * 0.12) * e);
    await sharp(img).extract({ left, top, width: w, height: h }).resize(FW, FH).jpeg({ quality: 85 })
      .toFile(path.join(dir, String(i + 1).padStart(3, '0') + '.jpg'));
  }
  fs.writeFileSync(marker, 'sin clip de Canva todavía\n');
  return 'provisorio';
}

fs.mkdirSync(D, { recursive: true });
const pedidos = process.argv.slice(2);
const lista = pedidos.length ? ROSTER_T4.filter(p => pedidos.includes(p.key)) : ROSTER_T4;
const res = { canva: [], provisorio: [] };
for (const p of lista) {
  const img = await base(p.key);
  res[await frames(p.key, img)].push(p.key);
}
console.log(`con clip de Canva (${res.canva.length}): ${res.canva.join(', ')}`);
console.log(`provisorios (${res.provisorio.length}): ${res.provisorio.join(', ')}`);
