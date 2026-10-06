#!/usr/bin/env node
// Banner "fuera de línea" (1920×1080, 16:9) para Kick (se muestra 2 min al terminar el stream) — sirve también
// para Twitch offline. Genérico, para cualquier día: cierre de transmisión + dónde seguirnos.
//
//   node scripts/banner-offline.mjs [--out archivo.jpg]
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const JUG = ['RS32-DaniStone', 'Juan_Martinez4', 'Lautavester7', 'NicoBJ_96', 'CipriMancini'];   // el del medio adelante
const i = process.argv.indexOf('--out');
const OUT = path.resolve(i > 0 ? process.argv[i + 1] : 'fuentes/redes/perfiles/out/kick-offline.jpg');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

async function recorte(gt) {
  const src = path.resolve('Renders', gt, 'Gesto4.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const buf = await sharp(src).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).resize({ height: 1000 }).png().toBuffer();
  return 'data:image/png;base64,' + buf.toString('base64');
}
const imgs = await Promise.all(JUG.map(recorte));
// posiciones: del centro hacia afuera, los de afuera más chicos y oscuros
const pos = [[-560, .78], [-290, .9], [0, 1], [290, .9], [560, .78]];
const jug = imgs.map((u, k) => {
  const [dx, e] = pos[k];
  return `<img src="${u}" style="position:absolute;height:${720 * e}px;left:calc(50% + ${dx}px);transform:translateX(-50%);bottom:${-170 * e}px;z-index:${10 - Math.abs(k - 2)};filter:brightness(${e < 1 ? .72 : 1})">`;
}).join('');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1920px;height:1080px;position:relative;overflow:hidden;background:#0a0a0a;font-family:'Barlow Condensed',sans-serif;color:#f4f1ea}
.glow{position:absolute;inset:0;background:radial-gradient(ellipse 55% 45% at 50% 30%,rgba(201,168,76,.22),transparent 70%),radial-gradient(ellipse 60% 35% at 50% 100%,rgba(201,168,76,.12),transparent 70%)}
.c{position:absolute;width:44px;height:44px;border-color:rgba(201,168,76,.4);border-style:solid}
.c1{top:36px;left:36px;border-width:2px 0 0 2px}.c2{top:36px;right:36px;border-width:2px 2px 0 0}.c3{bottom:36px;left:36px;border-width:0 0 2px 2px}.c4{bottom:36px;right:36px;border-width:0 2px 2px 0}
.tit{position:absolute;top:80px;left:0;right:0;text-align:center;z-index:20}
.tit img{height:84px}
.tit small{display:block;margin-top:14px;color:#c9a84c;font-weight:700;font-size:30px;letter-spacing:12px}
.tit h1{font-weight:900;font-size:150px;line-height:.9;letter-spacing:4px;background:linear-gradient(180deg,#fff 15%,#c9a84c 100%);-webkit-background-clip:text;color:transparent;margin-top:6px}
.tit p{font-weight:700;font-size:34px;letter-spacing:6px;color:rgba(244,241,234,.75);margin-top:10px}
.fade{position:absolute;left:0;right:0;bottom:0;height:300px;z-index:15;background:linear-gradient(rgba(10,10,10,0),rgba(10,10,10,.95) 65%)}
.redes{position:absolute;left:0;right:0;bottom:58px;z-index:20;display:flex;justify-content:center;gap:44px;font-weight:800;font-size:32px;letter-spacing:3px}
.redes span{display:flex;align-items:center;gap:12px}.redes i{width:12px;height:12px;border-radius:50%;display:block}
</style></head><body>
<div class="glow"></div><div class="c c1"></div><div class="c c2"></div><div class="c c3"></div><div class="c c4"></div>
<div class="tit"><img src="https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/clean-dorado.webp"><small>TOP SECRET FC</small><h1>GRACIAS POR VER</h1><p>LA TRANSMISIÓN TERMINÓ · NOS VEMOS EN EL PRÓXIMO PARTIDO</p></div>
${jug}
<div class="fade"></div>
<div class="redes"><span><i style="background:#9146ff"></i>TWITCH</span><span><i style="background:#53fc18"></i>KICK</span><span><i style="background:#ff0033"></i>YOUTUBE</span><span><i style="background:#c9a84c"></i>@FCTOPSECRET</span></div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const png = await p.screenshot();
await b.close();
await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toFile(OUT);
console.log('Listo:', OUT);
