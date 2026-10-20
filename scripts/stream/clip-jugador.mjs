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
const SOLO = 'Está solo en el cuadro todo el tiempo: no aparece ninguna otra persona, mano ni brazo. No se ríe.';
const VUELVE ='Empieza y termina en la misma postura: parado, quieto, con los brazos al costado.';
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
  // charlas del modo pausa (overlay): uno habla, el otro escucha.
  // Nunca nombrar a otra persona ("un compañero"): Canva la dibuja entrando al cuadro. Ni "sonríe"/"se ríe": se ríen
  // en vez de hablar (Juan, 2026-10-20). SOLO cierra los dos prompts.
  habla: `El jugador habla mirando hacia un costado, fuera de cuadro: mueve la boca con naturalidad como si explicara una jugada, con cara seria y concentrada, y acompaña con una mano a la altura del pecho. ${SOLO} ${VUELVE} ${PLANO}`,
  escucha: `El jugador escucha con atención mirando hacia un costado, fuera de cuadro: boca cerrada, cara seria y concentrada, asiente despacio con la cabeza dos veces. ${SOLO} ${VUELVE} ${PLANO}`,
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
const BASE_ALTO_CUERPO = 1300, SALIDA = [720, 586];
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
// Encuadre FIJO relativo al cuerpo del render (no a lo que ocupa en cada clip): así todos los clips y todos los
// jugadores salen a la misma escala (pedido de Juan; con el zoom por clip, si estiraba los brazos se veía más chico).
// Caja: ancho 0,8 × alto del cuerpo, centrada; desde 0,2 × alto por encima de la cabeza (brazos en alto) hasta
// 0,45 × alto por debajo (el pecho, que en el overlay queda tapado por la placa). Salida fija 720×586.
const cuadros = fs.readdirSync(path.join(T, 'out')).filter(n => n.endsWith('.png'));
const { width: W, height: H } = await sharp(path.join(T, 'out', cuadros[0])).metadata();
const { info: cuerpo } = await sharp(path.join(ROOT, 'Renders', GT, 'Frente4.png')).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
// Canva escala la base por la altura y recorta los costados (1152×1536 → 768×1088: 816 de ancho, 24 px menos por lado)
const esc = BASE_ALTO_CUERPO / 1536, k = H / 1536, corteLado = (1152 * k - W) / 2;   // render → base → cuadro del video
const alto = cuerpo.height * esc * k;
const cabeza = (1536 - BASE_ALTO_CUERPO + -cuerpo.trimOffsetTop * esc) * k;
const cx = ((1152 - 1024 * esc) / 2 + (-cuerpo.trimOffsetLeft + cuerpo.width / 2) * esc) * k - corteLado;
const P = Math.round(alto * 0.3);                                  // margen transparente por si la caja se sale del cuadro
const caja = { x: Math.round(cx - alto * 0.4) + P, y: Math.round(cabeza - alto * 0.2) + P, w: Math.round(alto * 0.8), h: Math.round(alto * 0.65) };
const fps = '30';                                            // Canva entrega 30 fps
execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', '-framerate', fps, '-i', path.join(T, 'out', '%04d.png'),
  '-vf', `format=rgba,pad=iw+${2 * P}:ih+${2 * P}:${P}:${P}:color=0x00000000,crop=${caja.w}:${caja.h}:${caja.x}:${caja.y},scale=${SALIDA[0]}:${SALIDA[1]}`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '2M', '-auto-alt-ref', '0', WEBM]);
fs.rmSync(T, { recursive: true, force: true });
console.log('clip:', WEBM);
