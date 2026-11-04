#!/usr/bin/env node
// Caras circulares de las fichas de pizarra.html: recorta la cabeza de cada render T4
// (Renders/T4-Frentes) a 128x128 webp. Correr cuando cambia el plantel o un render.
//   node scripts/pizarra-caras.mjs            → genera en fuentes/pizarra-caras + hoja de control
//   node scripts/pizarra-caras.mjs --subir    → además sube a R2 logos/pizarra/caras/<gamertag>.webp
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ROSTER_T4 } from '../roster.js';

const SRC = path.resolve('Renders/T4-Frentes');
const OUT = path.resolve('fuentes/pizarra-caras');
const SIZE = 128;
fs.mkdirSync(OUT, { recursive: true });

// Ajuste a mano si un recorte automático queda corrido: dx/dy en fracción del lado, z = zoom.
const AJUSTES = {};

// Ubica la cabeza por el canal alfa: arranca en la primera fila con contenido y toma el centro
// de esa franja, que es angosta (cabeza) aunque el cuerpo de abajo sea ancho (brazos cruzados).
async function recorte(file, ajuste = {}) {
  const { data, info } = await sharp(file).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithFile: false, resolveWithObject: true })
    .then(r => ({ data: r.data, info: r.info }));
  const { width: W, height: H } = info;
  const lleno = (x, y) => data[y * W + x] > 40;
  let top = 0;
  outer: for (; top < H; top++) for (let x = 0; x < W; x++) if (lleno(x, top)) break outer;
  let bottom = H - 1;
  outer2: for (; bottom > top; bottom--) for (let x = 0; x < W; x++) if (lleno(x, bottom)) break outer2;
  const alto = bottom - top;
  const franja = Math.round(alto * 0.09);
  let suma = 0, n = 0;
  for (let y = top; y < top + franja; y++) for (let x = 0; x < W; x++) if (lleno(x, y)) { suma += x; n++; }
  const cx = suma / n;
  const lado = Math.round(alto * 0.2 / (ajuste.z || 1));
  const left = Math.round(cx - lado / 2 + (ajuste.dx || 0) * lado);
  const y0 = Math.round(top - lado * 0.08 + (ajuste.dy || 0) * lado);
  return { left, top: y0, lado, W, H };
}

const hoja = [];
for (const { key, num } of ROSTER_T4) {
  const file = path.join(SRC, `${key}.png`);
  if (!fs.existsSync(file)) { console.warn('Falta render:', key); continue; }
  const r = await recorte(file, AJUSTES[key]);
  // Se extiende el lienzo por si el recorte se sale del render (transparente).
  const pad = r.lado;
  const buf = await sharp(file)
    .ensureAlpha()
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  const cara = await sharp(buf)
    .extract({ left: r.left + pad, top: r.top + pad, width: r.lado, height: r.lado })
    .resize(SIZE, SIZE)
    .webp({ quality: 82, alphaQuality: 90 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT, `${key}.webp`), cara);
  hoja.push({ key, num, cara });
}

// Hoja de control para revisar cada cara a ojo (círculo como en la pizarra).
const COLS = 6, CELDA = 170;
const filas = Math.ceil(hoja.length / COLS);
const mascara = Buffer.from(`<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`);
const comps = [];
for (let i = 0; i < hoja.length; i++) {
  const left = (i % COLS) * CELDA + 21, top = Math.floor(i / COLS) * CELDA + 8;
  const circ = await sharp(hoja[i].cara).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();
  comps.push({ input: circ, left, top });
  comps.push({ input: Buffer.from(`<svg width="${CELDA}" height="26"><text x="${CELDA / 2}" y="18" text-anchor="middle" font-family="Arial" font-size="14" fill="#fff">${hoja[i].key} #${hoja[i].num}</text></svg>`), left: left - 21, top: top + SIZE + 2 });
}
await sharp({ create: { width: COLS * CELDA, height: filas * CELDA, channels: 3, background: '#3a3a3a' } })
  .composite(comps).png().toFile(path.join(OUT, '_hoja.png'));
console.log(`${hoja.length} caras en ${OUT}`);

if (process.argv.includes('--subir')) {
  const { execFileSync } = await import('child_process');
  for (const { key } of hoja) {
    execFileSync(process.execPath, ['scripts/r2.mjs', 'put', path.join(OUT, `${key}.webp`), `logos/pizarra/caras/${key}.webp`], { stdio: 'inherit' });
  }
}
