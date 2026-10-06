#!/usr/bin/env node
// Placa "EN VIVO en Twitch" para historia de Instagram (1080×1920): invita a ver los partidos oficiales en
// twitch.tv/topsecretfc. Mismo lenguaje que placa-debut.mjs (sin recuadros, recortes con poses).
// La API de Instagram no deja poner el sticker de link: el link va escrito grande en la placa.
//
//   node scripts/placa-envivo.mjs [--out archivo.png]
// Contenido en CFG (abajo).
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const CFG = {
  liga: 'logos/VPUG logo.png', ligaColor: '#3ecf8e', copa: 'Liga Pretemporada',
  jugadores: ['CipriMancini', 'Juan_Martinez4', 'pepolemmo2710'],
  partidos: [
    { hora: '23:00', rival: 'Villa Dalmine eSports', escudo: 'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2JRiVP2pCqmqxrPfis.png?alt=media&token=1&m=1790270899743' },
    { hora: '23:30', rival: 'Norpatagonicos eSports', escudo: 'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P31SBjRST6W8mTvYHP0.png?alt=media&token=1&m=1791042652994' },
  ],
  canal: 'twitch.tv/topsecretfc',
};
const TW = '#9146ff';                                          // violeta de Twitch
const i = process.argv.indexOf('--out');
const OUT = path.resolve(i > 0 ? process.argv[i + 1] : 'fuentes/placas/envivo-twitch-historia.png');
fs.mkdirSync(path.dirname(OUT), { recursive: true });

async function recorte(gt) {
  const src = path.resolve('Renders', gt, 'Gesto4.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (data[(y * info.width + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const buf = await sharp(src).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).resize({ height: 1100 }).png().toBuffer();
  return 'data:image/png;base64,' + buf.toString('base64');
}
const [izq, centro, der] = await Promise.all(CFG.jugadores.map(recorte));
const liga = 'data:image/png;base64,' + (await sharp(CFG.liga).png().toBuffer()).toString('base64');
const TWITCH_SVG = `<svg viewBox="0 0 24 28" width="66" height="76"><path fill="${TW}" d="M2 0 0 5v19h6v4h3l4-4h5l6-6V0H2zm20 14-4 4h-6l-4 4v-4H3V2h19v12z"/><path fill="${TW}" d="M15 6h2v6h-2zM9 6h2v6H9z"/></svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;position:relative;overflow:hidden;background:#0a0a0a;font-family:'Barlow Condensed',sans-serif;color:#f4f1ea}
.glow{position:absolute;inset:0;background:radial-gradient(ellipse 80% 35% at 50% 22%,${TW}44,transparent 70%),radial-gradient(ellipse 70% 40% at 50% 58%,rgba(201,168,76,.16),transparent 70%),radial-gradient(ellipse 80% 25% at 50% 100%,${TW}33,transparent 70%)}
.top{position:absolute;top:170px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:26px;z-index:5}
.top img.club{height:64px}.top img.liga{height:70px}.top i{width:2px;height:54px;background:rgba(244,241,234,.25)}
.vivo{position:absolute;top:290px;left:0;right:0;text-align:center;z-index:5}
.badge{display:inline-flex;align-items:center;gap:16px;font-weight:800;font-size:40px;letter-spacing:10px;color:#fff}
.badge b{width:24px;height:24px;border-radius:50%;background:#ff3b3b;box-shadow:0 0 0 10px rgba(255,59,59,.22),0 0 30px #ff3b3b}
.vivo h1{font-weight:900;font-size:236px;line-height:.84;letter-spacing:4px;margin-top:18px;background:linear-gradient(180deg,#fff 20%,#c9a84c 100%);-webkit-background-clip:text;color:transparent}
.vivo .sub{font-weight:800;font-size:46px;letter-spacing:12px;color:${CFG.ligaColor};margin-top:10px}
.jug{position:absolute;z-index:2}
.jug.c{height:700px;left:50%;transform:translateX(-50%);top:770px;z-index:3}
.jug.l,.jug.r{height:620px;top:830px;filter:brightness(.78)}.jug.l{left:110px}.jug.r{right:110px}
.fade{position:absolute;left:0;right:0;top:1150px;bottom:0;z-index:4;background:linear-gradient(rgba(10,10,10,0),rgba(10,10,10,.94) 30%,#0a0a0a 42%)}
.part{position:absolute;left:90px;right:90px;top:1360px;z-index:5}
.fila{display:flex;align-items:center;gap:22px;padding:12px 0;border-top:1px solid rgba(244,241,234,.14)}
.fila:last-child{border-bottom:1px solid rgba(244,241,234,.14)}
.hora{font-weight:800;font-size:50px;color:#c9a84c;width:124px}.esc{width:58px;height:58px;object-fit:contain}.riv{flex:1;font-weight:800;font-size:42px}
.canal{position:absolute;left:0;right:0;top:1560px;z-index:5;display:flex;align-items:center;justify-content:center;gap:22px}
.canal span{font-weight:900;font-size:66px;letter-spacing:1px;color:#fff}
.cta{position:absolute;left:0;right:0;top:1660px;text-align:center;z-index:5;font-weight:700;font-size:30px;letter-spacing:9px;color:rgba(244,241,234,.7)}
</style></head><body>
<div class="glow"></div>
<div class="top"><img class="club" src="https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/clean-dorado.webp"><i></i><img class="liga" src="${liga}"></div>
<div class="vivo"><div class="badge"><b></b>AHORA</div><h1>EN VIVO</h1><div class="sub">${CFG.copa.toUpperCase()}</div></div>
<img class="jug l" src="${izq}"><img class="jug r" src="${der}"><img class="jug c" src="${centro}">
<div class="fade"></div>
<div class="part">${CFG.partidos.map(p => `<div class="fila"><div class="hora">${p.hora}</div><img class="esc" src="${p.escudo}"><div class="riv">${p.rival}</div></div>`).join('')}</div>
<div class="canal">${TWITCH_SVG}<span>${CFG.canal}</span></div>
<div class="cta">ENTRÁ Y ALENTÁ AL EQUIPO</div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: OUT });
await b.close();
console.log('Listo:', OUT);
