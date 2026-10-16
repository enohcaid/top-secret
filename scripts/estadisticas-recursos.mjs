// Prepara en R2 los recursos visuales de estadisticas.html para el plantel T4:
//   Renders/<gt>/Unica4.webp   — pose única liviana (desde Unica4.png, alto 1100 px)
// Saltea lo que ya existe; --forzar lo rehace. Correr de nuevo cuando entra un jugador
// o se regenera su render (y subir RENDER_V en estadisticas-datos.js).
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { list, getFile, putBuffer } from './lib/r2.mjs';
import { ROSTER_T4 } from '../roster.js';

const FORZAR = process.argv.includes('--forzar');
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
  console.log(gt.padEnd(18), hecho.join(' · ') || 'ya estaba');
}
fs.rmSync(tmp, { recursive: true, force: true });
