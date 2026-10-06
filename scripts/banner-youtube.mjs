#!/usr/bin/env node
// Banner del canal de YouTube (2560×1440) armado con los renders del plantel, pensado para lo que se ve:
//  - PC: franja central de 2560×423 (y 508–931) → título al centro y 3 jugadores por lado, de cabeza a cintura.
//  - Celular: solo 1546×423 del centro → título + los dos jugadores más cercanos.
//  - TV: la imagen completa → los cuerpos siguen hacia abajo y se funden en negro.
//
//   node scripts/banner-youtube.mjs [--out archivo.jpg]
//   node scripts/banner-youtube.mjs --kick [--out archivo.jpg]   → banner de Kick 1920×1080 (franja visible central ~1920×480)
// Jugadores en IZQ / DER (el primero de cada lista es el más cercano al título). Pose: Brazos4.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const IZQ = ['Juan_Martinez4', 'CipriMancini', 'RS32-DaniStone'];
const DER = ['Lautavester7', 'NicoBJ_96', 'Cabers14'];
const KICK = process.argv.includes('--kick');
const [W, H, FT, FB] = KICK ? [1920, 1080, 300, 780] : [2560, 1440, 508, 931];   // lienzo y franja visible en PC
const ESC = W / 2560;                                       // escala de posiciones/tipografía respecto del de YouTube
const i = process.argv.indexOf('--out');
const OUT = path.resolve(i > 0 ? process.argv[i + 1] : `fuentes/redes/perfiles/out/${KICK ? 'kick-banner' : 'youtube-banner-v2'}.jpg`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });

async function recorte(gt) {
  const src = path.resolve('Renders', gt, 'Brazos4.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const buf = await sharp(src).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).resize({ height: 1100 }).png().toBuffer();
  const m = await sharp(buf).metadata();
  return { url: 'data:image/png;base64,' + buf.toString('base64'), ratio: m.width / m.height };
}

// Alto del cuerpo: la cabeza arranca 36 px debajo del borde de la franja y la cintura cae en el borde de abajo
const ALTO = Math.round((FB - FT - 36) / 0.5);
const capa = async (lista, lado) => {
  const rs = await Promise.all(lista.map(recorte));
  return rs.map((r, k) => {
    const w = ALTO * r.ratio, centro = lado === 'izq' ? (660 - k * 290) * ESC : W - (660 - k * 290) * ESC;
    const esc = 1 - k * 0.06;                                // los de afuera, apenas más chicos y atrás
    return `<img src="${r.url}" style="position:absolute;height:${ALTO * esc}px;left:${centro - (w * esc) / 2}px;top:${FT + 36 + (ALTO - ALTO * esc) * .25}px;z-index:${10 - k};filter:brightness(${1 - k * .12})">`;
  }).join('');
};

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#0a0a0a;font-family:'Barlow Condensed',sans-serif}
.glow{position:absolute;inset:0;background:radial-gradient(ellipse 45% 30% at 50% ${(FT + FB) / 2}px,rgba(201,168,76,.24),rgba(201,168,76,0) 70%)}
.fade{position:absolute;left:0;right:0;top:${FB - 60}px;bottom:0;z-index:20;background:linear-gradient(rgba(10,10,10,0),#0a0a0a 55%)}
.tit{position:absolute;left:0;right:0;top:${FT}px;height:${FB - FT}px;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center}
.tit img{height:${84 * ESC * (KICK ? 1.2 : 1)}px;margin-bottom:${14 * ESC}px}
.tit h1{font-weight:900;font-size:${170 * ESC * (KICK ? 1.2 : 1)}px;line-height:.86;letter-spacing:4px;background:linear-gradient(180deg,#fdfbf4 10%,#bdb6a3 55%,#f4f1ea 95%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 6px 18px rgba(0,0,0,.6))}
.tit .sub{display:flex;align-items:center;gap:${22 * ESC}px;margin-top:${16 * ESC}px;color:#c9a84c;font-weight:800;font-size:${34 * ESC * (KICK ? 1.2 : 1)}px;letter-spacing:${16 * ESC}px}
.tit .sub i{display:block;width:${120 * ESC}px;height:2px;background:#c9a84c}
</style></head><body>
<div class="glow"></div>
${await capa(IZQ, 'izq')}${await capa(DER, 'der')}
<div class="fade"></div>
<div class="tit"><img src="https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/clean-dorado.webp"><h1>TOP SECRET</h1><div class="sub"><i></i>FOOTBALL CLUB<i></i></div></div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H } });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const png = await p.screenshot();
await b.close();
await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toFile(OUT);
console.log('Listo:', OUT);
