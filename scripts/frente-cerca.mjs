// Imagen "Frente4 cerca" de cada jugador del plantel actual: recorte de cabeza y torso del
// render Frente4 con fondo transparente, 1200x1200. Es la que descarga el botón de plantilla.html.
//   node scripts/frente-cerca.mjs [--subir] [gamertag…]   (sin gamertags = todo ROSTER_T4)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const OUT = 'pruebas/frente-cerca';
const LADO = 1200;
const args = process.argv.slice(2);
const subir = args.includes('--subir');
let keys = args.filter(a => !a.startsWith('--'));
if (!keys.length) {
  const { ROSTER_T4 } = await import(pathToFileURL(path.resolve('roster.js')).href);
  keys = ROSTER_T4.map(p => p.folderOverride || p.key);
}
fs.mkdirSync(OUT, { recursive: true });
for (const k of keys) {
  const src = path.join(OUT, `${k}.src.png`);
  execFileSync('node', ['scripts/r2.mjs', 'get', `Renders/${k}/Frente4.png`, src], { stdio: 'pipe' });
  const t = await sharp(src).trim({ threshold: 5 }).toBuffer({ resolveWithObject: true });
  const bw = t.info.width, bh = t.info.height;
  const left = -t.info.trimOffsetLeft, top = -t.info.trimOffsetTop;
  const S = Math.round(bh * 0.42);                       // lado del recorte (cabeza arriba, cintura abajo)
  const y0 = Math.round(top - S * 0.05);
  const x0 = Math.round(left + bw / 2 - S / 2);
  // Recorte que puede salirse del render: se extiende con transparente.
  const ext = await sharp(src).extend({ top: S, bottom: S, left: S, right: S, background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const base = await sharp(ext)
    .extract({ left: x0 + S, top: y0 + S, width: S, height: S }).toBuffer();
  const dest = path.join(OUT, `${k}-frente-cerca.png`);
  await sharp(base).resize(LADO, LADO).png({ compressionLevel: 9 }).toFile(dest);
  fs.unlinkSync(src);
  console.log(k, `${bw}x${bh}`, 'S=' + S, dest);
  if (subir) execFileSync('node', ['scripts/r2.mjs', 'put', dest, `Renders/${k}/Frente4-cerca.png`], { stdio: 'inherit' });
}
