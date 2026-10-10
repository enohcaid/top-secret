// Anima una imagen con "Imagen a video" de Canva (scripts/canva-imagen-a-video.mjs, 5 s) y la deja en cuadros
// JPG para que las plantillas de motion la usen cuadro por cuadro (determinístico, igual que el resto del render).
// Los pasos caros se cachean: si el mp4 o los cuadros ya existen, no se rehacen.
//
// Prompt de Canva: solo movimiento de cámara y de luz; nunca "humo" ni "respirar" (ver reference_canva_imagen_a_video).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../../lib/env.mjs';

export const QUIETOS = 'Las personas posan inmóviles como estatuas, con la boca cerrada.';

export function animar(img, movimiento) {
  const mp4 = img.replace(/\.\w+$/, '.mp4');
  if (fs.existsSync(mp4)) return mp4;
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/canva-imagen-a-video.mjs'), img, '--prompt', `${movimiento} ${QUIETOS}`, '--out', mp4],
    { cwd: ROOT, encoding: 'utf8', timeout: 45 * 60000 });
  if (!fs.existsSync(mp4)) throw new Error(`Canva no generó el clip de ${path.basename(img)}: ${(r.stdout + r.stderr).trim().split('\n').slice(-2).join(' ')}`);
  return mp4;
}

// Cuadros a 30 fps (lo que entrega Canva), escalados al ancho del lienzo vertical. Devuelve la carpeta y la cantidad.
export function cuadros(mp4, ancho = 1080) {
  const dir = mp4.replace(/\.mp4$/, '-cuadros');
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) {
    fs.mkdirSync(dir, { recursive: true });
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-vf', `fps=30,scale=${ancho}:-2`, '-q:v', '2', path.join(dir, '%04d.jpg')], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  }
  return { dir, n: fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length };
}
