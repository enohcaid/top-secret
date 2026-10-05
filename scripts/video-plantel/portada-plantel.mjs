#!/usr/bin/env node
// Portada 4:3 (1600×1200) con la grilla completa del plantel: para la noticia de la presentación y su
// vista previa al compartir (horizontal = WhatsApp la muestra grande). Mismas tarjetas que el video.
// Todo va centrado en una zona segura de ~1100×860, para que entre completo en los recortes del sitio
// (destacada 4:3, tarjetas 16:9 y cuadradas).
//
//   node scripts/video-plantel/portada-plantel.mjs [--out archivo.png]
// Necesita los cuadros de prep.mjs (fuentes/video-plantel/Gesto4/frames/<gt>/001.jpg).
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { ROSTER_T4 } from '../../roster.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../..');
const FR = path.join(ROOT, 'fuentes/video-plantel/Gesto4/frames');
const i = process.argv.indexOf('--out');
const OUT = path.resolve(i > 0 ? process.argv[i + 1] : path.join(ROOT, 'fuentes/video-plantel/Gesto4/plantel-t4-portada.png'));
const CREST = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/clean-dorado.webp';

// Tarjeta = pose completa (cuadro 1 del clip), recortada arriba en 3:4
const tarjetas = await Promise.all(ROSTER_T4.map(async p => {
  const buf = await sharp(path.join(FR, p.key, '001.jpg')).extract({ left: 0, top: 0, width: 720, height: 960 }).resize(360, 480).jpeg({ quality: 88 }).toBuffer();
  return `<div class="t"><img src="data:image/jpeg;base64,${buf.toString('base64')}"><b>${p.num}</b><span>${p.key}</span></div>`;
}));
const filas = [tarjetas.slice(0, 7), tarjetas.slice(7, 14), tarjetas.slice(14)];   // 7/7/5, última fila centrada

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:1600px;height:1200px;background:#0a0a0a radial-gradient(ellipse 70% 60% at 50% 18%,rgba(201,168,76,.18),rgba(201,168,76,0));font-family:'Barlow Condensed',sans-serif;color:#f4f1ea;position:relative;overflow:hidden}
.c{position:absolute;width:34px;height:34px;border-color:rgba(201,168,76,.35);border-style:solid}
.c1{top:26px;left:26px;border-width:2px 0 0 2px}.c2{top:26px;right:26px;border-width:2px 2px 0 0}.c3{bottom:26px;left:26px;border-width:0 0 2px 2px}.c4{bottom:26px;right:26px;border-width:0 2px 2px 0}
header{position:absolute;top:196px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:6px}
.marca{display:none}
.marca img{height:46px}
.tit{text-align:center}.tit small{display:block;color:#c9a84c;font-weight:700;font-size:20px;letter-spacing:7px}.tit h1{font-weight:900;font-size:60px;line-height:.95;text-transform:uppercase}
.g{position:absolute;top:338px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:10px}
.f{display:flex;gap:10px}
.t{position:relative;width:160px;height:213px;border-radius:10px;overflow:hidden;border:2px solid rgba(201,168,76,.55)}
.t img{width:100%;height:100%;object-fit:cover;display:block}
.t:after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(rgba(10,10,10,0),rgba(10,10,10,.88))}
.t b{position:absolute;left:10px;bottom:26px;z-index:1;color:#c9a84c;font-weight:900;font-size:30px;line-height:1}
.t span{position:absolute;left:10px;right:6px;bottom:8px;z-index:1;font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style></head><body>
<div class="c c1"></div><div class="c c2"></div><div class="c c3"></div><div class="c c4"></div>
<header><img src="${CREST}" style="height:52px"><div class="tit"><small>TOP SECRET FC · TEMPORADA 4</small><h1>Plantel</h1></div></header>
<div class="g">${filas.map(f => `<div class="f">${f.join('')}</div>`).join('')}</div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1200 } });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: OUT });
await b.close();
console.log('Listo:', OUT);
