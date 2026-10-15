#!/usr/bin/env node
// Clip de un jugador para el overlay del vivo: se genera de cuerpo entero (así el modelo ve brazos, guantes,
// medias) y recién al final se recorta del pecho para arriba, con fondo transparente.
//   node scripts/stream/clip-jugador.mjs <gamertag> <emocion> [--solo-alpha]
// 1) base: render T4 entero (Renders/<gt>/Frente4.png) sobre fondo gris liso, con aire arriba y a los costados
//    para que pueda levantar los brazos sin salirse del cuadro
// 2) Canva "Imagen a video" (scripts/canva-imagen-a-video.mjs) con el prompt de la emoción
// 3) rembg cuadro por cuadro, recorte del pecho para arriba → WebM VP9 con alfa en fuentes/stream/clips/<gt>/<emocion>.webm
// --solo-alpha rehace solo el paso 3 con el mp4 ya generado (si el mp4 existe se saltea Canva igual; --rehacer lo pide de nuevo).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const [GT, EMO] = process.argv.slice(2);
const PLANO = 'Cámara fija, plano entero: se lo ve de pies a cabeza todo el tiempo. El fondo gris liso no cambia.';
const VUELVE = 'Empieza y termina en la misma postura: parado, quieto, con los brazos al costado.';
// espera: rotan todo el partido (empiezan y terminan en la pose del render, así se encadenan sin salto).
// evento: gol nuestro / gol del rival.
export const EMOCIONES = {
  aliento: `El jugador arenga a sus compañeros: les grita con energía mirando a un costado, golpea el escudo de la camiseta con el puño y aplaude dos veces. ${VUELVE} ${PLANO}`,
  indicaciones: `El jugador da indicaciones tácticas: señala con el brazo hacia un costado y después hacia adelante, mueve la boca dando órdenes, con cara seria y concentrada. ${VUELVE} ${PLANO}`,
  agitado: `El jugador está cansado después de un pique largo: apoya las manos en las rodillas, sube y baja los hombros con fuerza, se incorpora. ${VUELVE} ${PLANO}`,
  sudor: `El jugador se seca la frente con el antebrazo, se acomoda el pelo con una mano y mira el partido con atención. ${VUELVE} ${PLANO}`,
  aplaude: `El jugador aplaude a un compañero por una buena jugada, asiente con la cabeza y levanta el pulgar. ${VUELVE} ${PLANO}`,
  pide: `El jugador pide la pelota: levanta una mano bien alta, la agita y grita mirando a un costado. ${VUELVE} ${PLANO}`,
  calma: `El jugador pide calma a sus compañeros: baja las dos manos abiertas despacio, con cara tranquila y segura. ${VUELVE} ${PLANO}`,
  gol: `El jugador grita un gol con euforia: abre bien la boca, aprieta los dos puños y los sacude a la altura del pecho, mirando a cámara con los ojos encendidos. ${PLANO}`,
  festejo: `El jugador festeja feliz: sonríe de oreja a oreja, levanta los brazos y aplaude, mirando a cámara. ${PLANO}`,
  frustrado: `El jugador se lamenta por un gol en contra: se lleva las dos manos a la cabeza, cierra los ojos y niega con la cabeza. ${PLANO}`,
  reclama: `El jugador reclama indignado: abre los brazos con las palmas hacia arriba, mueve la boca protestando y niega con la cabeza. ${PLANO}`,
  triste: `El jugador está triste tras una derrota: baja la mirada, deja caer los hombros y se pasa una mano por la cara. ${PLANO}`,
};
export const ESPERA = ['aliento', 'indicaciones', 'agitado', 'sudor', 'aplaude', 'pide', 'calma'];
if (!GT || !EMOCIONES[EMO]) { console.error(`Uso: clip-jugador.mjs <gamertag> <${Object.keys(EMOCIONES).join('|')}>`); process.exit(1); }

const DIR = path.join(ROOT, 'fuentes', 'stream', 'clips', GT);
fs.mkdirSync(DIR, { recursive: true });
// Base 1152×1536 (3:4): cuerpo de 1300 px apoyado abajo → 236 px de aire arriba. El pecho termina
// cerca del 45 % del cuerpo, así que el recorte final es el 54 % superior del cuadro.
const BASE_ALTO_CUERPO = 1300, RECORTE = 0.54;
const BASE = path.join(DIR, 'base-entero.png'), MP4 = path.join(DIR, `${EMO}.mp4`), WEBM = path.join(DIR, `${EMO}.webm`);

if (!process.argv.includes('--solo-alpha') && (process.argv.includes('--rehacer') || !fs.existsSync(MP4))) {
  if (!fs.existsSync(BASE)) {
    const src = path.join(ROOT, 'Renders', GT, 'Frente4.png');
    const cuerpo = await sharp(src).resize({ height: BASE_ALTO_CUERPO }).toBuffer();
    const { width: w } = await sharp(cuerpo).metadata();
    await sharp({ create: { width: 1152, height: 1536, channels: 3, background: '#8c8c8c' } })
      .composite([{ input: cuerpo, left: Math.round((1152 - w) / 2), top: 1536 - BASE_ALTO_CUERPO }]).png().toFile(BASE);
  }
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'canva-imagen-a-video.mjs'), BASE, '--prompt', EMOCIONES[EMO], '--out', MP4], { stdio: 'inherit', cwd: ROOT });
}

// Fondo transparente: rembg (modelo de personas) sobre cada cuadro, después VP9 con alfa.
const T = path.join(DIR, `_${EMO}`); fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, 'in'), { recursive: true }); fs.mkdirSync(path.join(T, 'out'));
execFileSync(ffmpegPath, ['-loglevel', 'error', '-i', MP4, path.join(T, 'in', '%04d.png')]);
execFileSync('python', [path.join(ROOT, 'scripts', 'stream', 'quitar-fondo.py'), path.join(T, 'in'), path.join(T, 'out')], { stdio: 'inherit' });
// Zoom: caja que ocupa el jugador en todo el clip (unión de los cuadros, solo la parte de arriba del corte),
// con un margen; el borde de abajo es siempre la línea del pecho, que en el overlay queda tapada por la placa.
const cuadros = fs.readdirSync(path.join(T, 'out')).filter(n => n.endsWith('.png'));
const { width: W, height: H } = await sharp(path.join(T, 'out', cuadros[0])).metadata();
const corte = Math.round(H * RECORTE);
let x0 = W, y0 = corte, x1 = 0;
for (const n of cuadros) {
  const arriba = await sharp(path.join(T, 'out', n)).extract({ left: 0, top: 0, width: W, height: corte }).png().toBuffer();
  const { info } = await sharp(arriba).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 40 }).toBuffer({ resolveWithObject: true });
  const l = -(info.trimOffsetLeft || 0), t = -(info.trimOffsetTop || 0);
  x0 = Math.min(x0, l); y0 = Math.min(y0, t); x1 = Math.max(x1, l + info.width);
}
const m = Math.round(W * 0.03);
x0 = Math.max(0, x0 - m); x1 = Math.min(W, x1 + m); y0 = Math.max(0, y0 - m);
const cw = (x1 - x0) & ~1, ch = (corte - y0) & ~1;
const fps = '30';                                            // Canva entrega 30 fps
execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-framerate', fps, '-i', path.join(T, 'out', '%04d.png'),
  '-vf', `crop=${cw}:${ch}:${x0}:${y0}`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '2M', '-auto-alt-ref', '0', WEBM]);
fs.rmSync(T, { recursive: true, force: true });
console.log('clip:', WEBM);
