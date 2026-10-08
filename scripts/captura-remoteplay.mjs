// Captura la imagen de la PS5 desde la ventana de PS Remote Play (ffmpeg gdigrab).
//
//   node scripts/captura-remoteplay.mjs foto            -> un cuadro PNG
//   node scripts/captura-remoteplay.mjs cuadros [fps]   -> cuadros JPG continuos (default 1 fps) hasta Ctrl+C
//   node scripts/captura-remoteplay.mjs video [seg]     -> MP4 de N segundos (default 30)
//
// Salida: capturas-tv/ (gitignored). La ventana tiene que estar visible, no minimizada.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';

const VENTANA = 'title=PS Remote Play';
const OUT = path.resolve('capturas-tv');
mkdirSync(OUT, { recursive: true });

const [modo = 'foto', arg] = process.argv.slice(2);
const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
  .replace(/[: ]/g, '-');

const entrada = ['-hide_banner', '-loglevel', 'error', '-f', 'gdigrab', '-framerate', '30', '-i', VENTANA];
let salida;
if (modo === 'foto') {
  salida = ['-frames:v', '1', path.join(OUT, `foto-${stamp}.png`)];
} else if (modo === 'cuadros') {
  const dir = path.join(OUT, `cuadros-${stamp}`);
  mkdirSync(dir, { recursive: true });
  salida = ['-vf', `fps=${Number(arg) || 1}`, '-q:v', '2', path.join(dir, '%05d.jpg')];
} else if (modo === 'video') {
  salida = ['-t', String(Number(arg) || 30), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-pix_fmt', 'yuv420p', path.join(OUT, `video-${stamp}.mp4`)];
} else {
  console.error('Modo desconocido. Usar: foto | cuadros [fps] | video [seg]');
  process.exit(1);
}

const p = spawn(ffmpeg, [...entrada, ...salida], { stdio: 'inherit' });
p.on('exit', code => {
  if (code === 0) console.log(`OK -> ${OUT}`);
  else console.error(`ffmpeg salió con ${code}. ¿Está abierta (y no minimizada) la ventana "PS Remote Play"?`);
  process.exit(code ?? 1);
});
