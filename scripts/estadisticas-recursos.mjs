// Prepara en R2 los recursos visuales de estadisticas.html para el plantel T4:
//   Renders/<gt>/Unica4.webp   — pose única liviana (desde Unica4.png, alto 1100 px)
//   Renders/<gt>/clip-gol.webm — clip de festejo con alfa (el gol.webm de los clips del vivo)
//   Renders/<gt>/clip-gol.webp — primer cuadro del clip, de espera mientras carga
// Saltea lo que ya existe; --forzar lo rehace. Correr de nuevo cuando entra un jugador
// o se regenera su render (y subir RENDER_V en estadisticas-datos.js).
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { execFileSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { list, getFile, putBuffer, putFile } from './lib/r2.mjs';
import { ROSTER_T4 } from '../roster.js';

const FORZAR = process.argv.includes('--forzar');
const CLIPS = path.resolve('fuentes/stream/clips');
const existentes = new Set((await list('Renders/')).map(o => o.key));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-stats-'));

for (const p of ROSTER_T4) {
  const gt = p.folderOverride || p.key;
  const hecho = [];
  const webpKey = `Renders/${gt}/Unica4.webp`;
  if (FORZAR || !existentes.has(webpKey)) {
    if (existentes.has(`Renders/${gt}/Unica4.png`)) {
      const local = path.join(tmp, `${gt}.png`);
      await getFile(`Renders/${gt}/Unica4.png`, local);
      const buf = await sharp(local).resize({ height: 1100, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
      await putBuffer(buf, webpKey, 'image/webp');
      hecho.push(`Unica4.webp ${Math.round(buf.length / 1024)} KB`);
    } else hecho.push('sin Unica4.png');
  }
  const clipKey = `Renders/${gt}/clip-gol.webm`;
  const clipLocal = path.join(CLIPS, gt, 'gol.webm');
  if ((FORZAR || !existentes.has(clipKey)) && fs.existsSync(clipLocal)) {
    await putFile(clipLocal, clipKey, 'video/webm');
    hecho.push(`clip-gol.webm ${Math.round(fs.statSync(clipLocal).size / 1024)} KB`);
  }
  // Cuadro de espera del clip (mismo encuadre), para que se vea algo mientras el video carga.
  const posterKey = `Renders/${gt}/clip-gol.webp`;
  if ((FORZAR || !existentes.has(posterKey)) && fs.existsSync(clipLocal)) {
    const png = path.join(tmp, `${gt}-poster.png`);
    execFileSync(ffmpeg, ['-y', '-v', 'error', '-c:v', 'libvpx-vp9', '-ss', '0.6', '-i', clipLocal, '-frames:v', '1', png]);
    const buf = await sharp(png).webp({ quality: 80, alphaQuality: 90 }).toBuffer();
    await putBuffer(buf, posterKey, 'image/webp');
    hecho.push(`clip-gol.webp ${Math.round(buf.length / 1024)} KB`);
  }
  console.log(gt.padEnd(18), hecho.join(' · ') || 'ya estaba');
}
fs.rmSync(tmp, { recursive: true, force: true });
