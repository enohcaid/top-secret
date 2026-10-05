#!/usr/bin/env node
// Material liviano para generar el video del equipo EN EL NAVEGADOR (botón "Compartir video" de convocatoria.html,
// video-equipo.js). Por jugador, una hoja de cuadros (sprite) con la entrada ya en el orden en que se ve
// (del primer plano a la pose completa) + la música recortada. Se sube a R2 en video-equipo/<VER>/.
//
//   node scripts/video-plantel/web-assets.mjs            (todo ROSTER_T4; necesita prep.mjs antes)
//   node scripts/video-plantel/web-assets.mjs <gt> ...   (solo esos — p. ej. un jugador nuevo)
//
// Si cambian los cuadros de alguien, subir VER (y el mismo VER en video-equipo.js): el Worker sirve /media con
// caché immutable de un año, así que pisar el archivo no alcanza.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';
import { ROSTER_T4 } from '../../roster.js';
import { putFile } from '../lib/r2.mjs';

export const VER = 'v1';
export const SPRITE = { n: 22, cols: 6, fw: 480, fh: 854 };   // 22 cuadros = uno cada 2 de los 44 de la entrada
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const FR = path.join(ROOT, 'fuentes/video-plantel/Gesto4/frames');
const OUT = path.join(ROOT, 'fuentes/video-plantel/web', VER);
fs.mkdirSync(OUT, { recursive: true });

const NF = 150, outCubic = t => 1 - Math.pow(1 - t, 3);
// Mismo recorrido que escena.js: cuadro k = 150 → 1 con outCubic
const indices = Array.from({ length: SPRITE.n }, (_, i) => Math.round(NF - (NF - 1) * outCubic(i / (SPRITE.n - 1))));

const pedidos = process.argv.slice(2);
// Sin argumentos: todo ROSTER_T4 + variantes "<gt>-campo" que tengan cuadros
const lista = pedidos.length ? pedidos : [...ROSTER_T4.map(p => p.key), ...ROSTER_T4.map(p => p.key + '-campo').filter(k => fs.existsSync(path.join(FR, k, '150.jpg')))];
const rows = Math.ceil(SPRITE.n / SPRITE.cols);
for (const gt of lista) {
  if (!fs.existsSync(path.join(FR, gt, '150.jpg'))) { console.log('sin cuadros (correr prep.mjs):', gt); continue; }
  const cells = await Promise.all(indices.map(k => sharp(path.join(FR, gt, String(k).padStart(3, '0') + '.jpg')).resize(SPRITE.fw, SPRITE.fh).toBuffer()));
  const out = path.join(OUT, gt + '.webp');
  await sharp({ create: { width: SPRITE.cols * SPRITE.fw, height: rows * SPRITE.fh, channels: 3, background: '#0a0a0a' } })
    .composite(cells.map((b, i) => ({ input: b, left: (i % SPRITE.cols) * SPRITE.fw, top: Math.floor(i / SPRITE.cols) * SPRITE.fh })))
    .webp({ quality: 72 }).toFile(out);
  await putFile(out, `video-equipo/${VER}/${gt}.webp`);
  console.log(`${gt}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

// Música: los primeros 30 s de "Locked In" (trap libre, regla del club); el fundido de salida lo hace el navegador
const mp3 = path.join(OUT, 'musica.mp3');
if (!pedidos.length || !fs.existsSync(mp3)) {
  const src = path.join(ROOT, 'fuentes/musica/trap/Locked In - Anno Domini Beats.mp3');
  execFileSync(ffmpegPath, ['-y', '-v', 'error', '-i', src, '-t', '30', '-af', 'loudnorm=I=-14:TP=-1.5', '-ar', '48000', '-b:a', '160k', mp3]);
  await putFile(mp3, `video-equipo/${VER}/musica.mp3`);
  console.log('musica.mp3:', (fs.statSync(mp3).size / 1024).toFixed(0), 'KB');
}
