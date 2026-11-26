#!/usr/bin/env node
// Placas interiores de un carrusel de noticia (Instagram/Facebook/X, 1080x1350), con la estética de las piezas de
// redes (noticia-redes.js: Barlow Condensed, dorado #c9a84c, negro) y de fondo la portada de la nota, oscurecida.
//   node scripts/placas-carrusel.mjs --id <id> --spec <archivo.json> --fondo <imagen> [--subir]
// spec: [{ "kicker": "ATAQUE", "titulo": "…", "items": ["…", "…"], "pie": "…" }, …]   (máx. 3: el lote usa 3 extras)
// Salida: fuentes/redes/noticias/<id>-carrusel<N>.jpg (+ <id>-capa<N>.png, la misma sin fondo para TikTok: n.capasTikTok); con --subir, a R2 logos/noticias/redes/ y muestra las URLs.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { putFile } from './lib/r2.mjs';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const id = arg('--id'), spec = JSON.parse(fs.readFileSync(arg('--spec'), 'utf8')), fondo = arg('--fondo');
const OUT = path.resolve('fuentes/redes/noticias');
fs.mkdirSync(OUT, { recursive: true });
const b64 = async (f, w) => (await sharp(f).resize({ width: w }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
const bg = await b64(fondo, 1080);
const crest = fs.readFileSync(path.resolve('logos/rebrand/Clean logo.png')).toString('base64');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const html = (p, i, n, vert) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@500;600&display=swap" rel="stylesheet">
<style>
:root{--gold:#c9a84c;--ink:#f4f1ea;--bg:#0a0a0a}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;background:var(--bg);color:var(--ink);font-family:'Barlow Condensed',sans-serif;position:relative;overflow:hidden}
.bg{position:absolute;inset:-40px;background:url(data:image/jpeg;base64,${bg}) center/cover;filter:blur(18px) brightness(.5) saturate(.85)}
.velo{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,10,.55),rgba(10,10,10,.82) 45%,rgba(10,10,10,.95))}
.wrap{position:absolute;inset:0;padding:96px 88px 80px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center}
.top img{width:74px}
.cnt{font-weight:700;font-size:30px;letter-spacing:6px;color:rgba(244,241,234,.6)}
.kicker{margin-top:120px;font-weight:800;font-size:32px;letter-spacing:9px;color:var(--gold)}
h1{margin-top:18px;font-weight:900;font-size:112px;line-height:.95;text-transform:uppercase;letter-spacing:.5px}
.bar{width:120px;height:6px;background:var(--gold);margin:44px 0 40px}
ul{list-style:none;display:flex;flex-direction:column;gap:38px}
li{font-family:'Barlow',sans-serif;font-weight:500;font-size:41px;line-height:1.28;padding-left:40px;position:relative;color:rgba(244,241,234,.92)}
li::before{content:'';position:absolute;left:0;top:17px;width:16px;height:16px;background:var(--gold)}
li b{font-weight:600;color:var(--ink)}
.pie{margin-top:auto;font-weight:800;font-size:30px;letter-spacing:8px;color:var(--gold)}
${vert ? `body{height:1920px;background:transparent}.bg,.velo,.cnt{display:none}.wrap{padding:180px 170px 0 72px}.kicker{margin-top:70px}h1{font-size:104px}li{font-size:44px}.pie{display:none}` : ''}
</style></head><body><div class="bg"></div><div class="velo"></div>
<div class="wrap"><div class="top"><img src="data:image/png;base64,${crest}"><span class="cnt">${i + 2} / ${n + 1}</span></div>
<div class="kicker">${esc(p.kicker)}</div><h1>${esc(p.titulo)}</h1><div class="bar"></div>
<ul>${p.items.map(t => `<li>${esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</li>`).join('')}</ul>
<div class="pie">${esc(p.pie || '')}</div></div></body></html>`;

const browser = await chromium.launch();
const files = [];
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [i, p] of spec.slice(0, 3).entries()) {
    await page.setContent(html(p, i, Math.min(spec.length, 3)), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const f = path.join(OUT, `${id}-carrusel${i + 2}.jpg`);
    await sharp(await page.screenshot({ type: 'png' })).jpeg({ quality: 90 }).toFile(f);
    const alto = await page.evaluate(() => document.querySelector('.pie').getBoundingClientRect().top - document.querySelector('ul').getBoundingClientRect().bottom);
    if (alto < 30) console.warn(`  ¡${path.basename(f)}: el texto llega casi al pie (${Math.round(alto)} px)!`);
    files.push(f);
    console.log(`  ${path.relative(process.cwd(), f)}`);
  }
  // TikTok (9:16): la misma placa sin fondo, dentro de la zona segura de noticia-redes.js (TT: x 72, de 250 a 1440,
  // lejos de los botones de la derecha). La dibuja tiktok() entera sobre su fondo oscuro, con el pie del link.
  const pv = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [i, p] of spec.slice(0, 3).entries()) {
    await pv.setContent(html(p, i, Math.min(spec.length, 3), true), { waitUntil: 'networkidle' });
    await pv.evaluate(() => document.fonts.ready);
    const f = path.join(OUT, `${id}-capa${i + 2}.png`);
    await pv.screenshot({ path: f, omitBackground: true });
    const fin = await pv.evaluate(() => document.querySelector('ul').getBoundingClientRect().bottom);
    if (fin > 1400) console.warn(`  ¡${path.basename(f)}: el texto baja hasta ${Math.round(fin)} px (TikTok lo tapa pasando 1440)!`);
    files.push(f);
    console.log(`  ${path.relative(process.cwd(), f)}`);
  }
} finally { await browser.close(); }
if (process.argv.includes('--subir')) {
  const v = Date.now().toString(36);
  for (const f of files) {
    const key = `logos/noticias/redes/${path.basename(f)}`;
    await putFile(f, key);
    console.log(`https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${v}`);
  }
}
