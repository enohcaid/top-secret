#!/usr/bin/env node
// Prepara el material de cada jugador para los videos de plantel / equipo de la noche.
//
//   node scripts/video-plantel/prep.mjs [gamertag ...]      (sin argumentos: todo ROSTER_T4)
//
// Por jugador, en fuentes/video-plantel/:
//   <gt>.png          imagen base 1080×1920 (Renders/<gt>/Brazos4.png sobre fondo dorado, igual que el reel de fichajes)
//   <gt>.mp4          clip de 5 s "Imagen a video" de Canva (se toma de fuentes/video-fichajes si ya existe;
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
const D = path.join(ROOT, 'fuentes/video-plantel');
const FICHAJES = path.join(ROOT, 'fuentes/video-fichajes');
const W = 1080, H = 1920, FW = 720, FH = 1280, N = 150;

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>
<radialGradient id="g" cx="50%" cy="30%" r="75%"><stop offset="0" stop-color="#6b5424"/><stop offset=".45" stop-color="#241c0e"/><stop offset="1" stop-color="#070605"/></radialGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/></svg>`);

async function base(gt) {
  const out = path.join(D, gt + '.png');
  if (fs.existsSync(out)) return out;
  const prev = path.join(FICHAJES, gt + '.png');
  if (fs.existsSync(prev)) { fs.copyFileSync(prev, out); return out; }
  const src = path.join(ROOT, 'Renders', gt, 'Brazos4.png');
  if (!fs.existsSync(src)) execFileSync('node', [path.join(ROOT, 'scripts/r2.mjs'), 'get', `Renders/${gt}/Brazos4.png`, src], { stdio: 'ignore' });
  const big = await sharp(src).trim({ threshold: 5 }).resize({ height: 2700 }).png().toBuffer();
  const bm = await sharp(big).metadata();
  const cw = Math.min(bm.width, W);
  const pl = await sharp(big).extract({ left: Math.round((bm.width - cw) / 2), top: 0, width: cw, height: H - 230 }).png().toBuffer();
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
