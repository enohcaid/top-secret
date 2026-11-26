// Placas interiores del carrusel de una noticia (estructura y reglas: scripts/lib/reglas-redes.mjs).
// Dos salidas por placa:
//   <id>-carrusel<N>.jpg  1080x1350 con fondo (la foto de la nota, desenfocada y oscura): Instagram, Facebook y X
//   <id>-capa<N>.png      1080x1920 sin fondo, dentro de la zona segura de TikTok (noticia-redes.js: x 72, de 250 a
//                         1440, lejos de los botones de la derecha): tiktok() la dibuja sobre su fondo oscuro
// Estética de las piezas de redes (noticia-redes.js): Barlow Condensed, dorado #c9a84c, negro.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { putFile } from './r2.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '../..');
const OUT = path.join(ROOT, 'fuentes/redes/noticias');
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const KICKER = { clave: 'Por qué importa', resumen: 'En resumen', cta: '' };

async function leerFondo(fondo) {
  const buf = /^https?:/.test(fondo) ? Buffer.from(await (await fetch(fondo)).arrayBuffer()) : fs.readFileSync(fondo);
  return (await sharp(buf).resize({ width: 1080 }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
}

function html(p, i, total, { bg, crest, kickerBase, vert }) {
  const tipo = p.tipo || 'lista';
  const kicker = [kickerBase, p.kicker ?? KICKER[tipo] ?? (tipo === 'idea' ? String(i + 1).padStart(2, '0') : '')].filter(Boolean).join(' · ');
  const ultima = i === total - 1;
  const cuerpo = tipo === 'resumen' || tipo === 'lista'
    ? `<ul>${(p.items || []).map(t => `<li>${fmt(t)}</li>`).join('')}</ul>`
    : p.texto ? `<p class="txt">${fmt(p.texto)}</p>` : '';
  return `<!doctype html><html><head><meta charset="utf-8">
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
.kicker{margin-top:120px;font-weight:800;font-size:32px;letter-spacing:9px;color:var(--gold);text-transform:uppercase}
h1{margin-top:18px;font-weight:900;font-size:112px;line-height:.95;text-transform:uppercase;letter-spacing:.5px}
.bar{width:120px;height:6px;background:var(--gold);margin:44px 0 40px}
.txt{font-family:'Barlow',sans-serif;font-weight:500;font-size:48px;line-height:1.3;color:rgba(244,241,234,.92)}
.txt b,li b{font-weight:600;color:var(--ink)}
ul{list-style:none;display:flex;flex-direction:column;gap:38px}
li{font-family:'Barlow',sans-serif;font-weight:500;font-size:41px;line-height:1.28;padding-left:40px;position:relative;color:rgba(244,241,234,.92)}
li::before{content:'';position:absolute;left:0;top:17px;width:16px;height:16px;background:var(--gold)}
.pie{margin-top:auto;font-weight:800;font-size:30px;letter-spacing:8px;color:var(--gold);text-transform:uppercase}
.clave h1{font-size:120px}
.cta .wrap{justify-content:center}.cta .top{position:absolute;top:96px;left:88px;right:88px}
.cta .kicker{margin-top:0}.cta h1{color:var(--gold);font-size:128px}.cta .pie{display:none}
${vert ? `body{height:1920px;background:transparent}.bg,.velo,.cnt,.pie{display:none}.wrap{padding:180px 170px 0 72px}
.kicker{margin-top:70px}h1{font-size:104px}.clave h1{font-size:108px}.txt{font-size:50px}li{font-size:44px}
.cta .wrap{justify-content:flex-start}.cta .top{position:static}.cta .kicker{margin-top:70px}.cta h1{font-size:116px;margin-top:240px}` : ''}
</style></head><body class="${tipo}"><div class="bg"></div><div class="velo"></div>
<div class="wrap"><div class="top"><img src="data:image/png;base64,${crest}"><span class="cnt">${i + 2} / ${total + 1}</span></div>
<div class="kicker">${esc(kicker)}</div><h1>${esc(p.titulo)}</h1><div class="bar"></div>${cuerpo}
<div class="pie">${esc(p.pie ?? (ultima ? 'Nota completa · link en la bio' : 'Deslizá'))}</div></div></body></html>`;
}

// placas: [{ tipo: clave|idea|resumen|cta, kicker?, titulo, texto?, items? }] (o el formato viejo { kicker, titulo, items })
// fondo: archivo local o URL de la foto limpia de la nota. kicker: prefijo de todas (p. ej. "FC 27 · 1.3.0").
export async function armarCarrusel({ id, placas, fondo, kicker = '', subir = false }) {
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = { bg: await leerFondo(fondo), crest: fs.readFileSync(path.join(ROOT, 'logos/rebrand/Clean logo.png')).toString('base64'), kickerBase: kicker };
  const lista = placas.slice(0, 9), avisos = [], jpgs = [], capas = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
    const pv = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    for (const [i, p] of lista.entries()) {
      await page.setContent(html(p, i, lista.length, ctx), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const jpg = path.join(OUT, `${id}-carrusel${i + 2}.jpg`);
      await sharp(await page.screenshot({ type: 'png' })).jpeg({ quality: 90 }).toFile(jpg);
      const hueco = await page.evaluate(() => { const c = document.querySelector('ul,.txt') || document.querySelector('h1'); return document.querySelector('.pie').getBoundingClientRect().top - c.getBoundingClientRect().bottom; });
      if (p.tipo !== 'cta' && hueco < 30) avisos.push(`${path.basename(jpg)}: el texto llega al pie: acortalo`);
      jpgs.push(jpg);
      await pv.setContent(html(p, i, lista.length, { ...ctx, vert: true }), { waitUntil: 'networkidle' });
      await pv.evaluate(() => document.fonts.ready);
      const png = path.join(OUT, `${id}-capa${i + 2}.png`);
      await pv.screenshot({ path: png, omitBackground: true });
      const fin = await pv.evaluate(() => (document.querySelector('ul,.txt') || document.querySelector('h1')).getBoundingClientRect().bottom);
      if (fin > 1400) avisos.push(`${path.basename(png)}: el texto baja hasta ${Math.round(fin)} px y TikTok lo tapa: acortalo`);
      capas.push(png);
    }
  } finally { await browser.close(); }
  const res = { jpgs, capas, avisos, urls: [], urlsCapas: [] };
  if (subir) {
    const v = Date.now().toString(36);
    for (const [lista_, dest] of [[jpgs, res.urls], [capas, res.urlsCapas]]) for (const f of lista_) {
      const key = `logos/noticias/redes/${path.basename(f)}`;
      await putFile(f, key);
      dest.push(`${WORKER}/media/${key}?v=${v}`);
    }
  }
  return res;
}
