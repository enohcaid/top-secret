#!/usr/bin/env node
// Placa de debut / partidos de una competencia (post de Instagram 4:5, 1080×1350): título grande, jugadores
// recortados con sus poses (Renders/<gt>/Gesto4.png) y los partidos con escudo, hora y condición. Sin recuadros.
//
//   node scripts/placa-debut.mjs [--out archivo.png]
// Contenido en CFG (abajo). Primera versión: debut en la Liga Pretemporada VPUG, 2026-10-05.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const CFG = {
  titulo: 'DEBUT',
  copa: ['LIGA', 'PRETEMPORADA'],
  eyebrow: 'LIGA PRETEMPORADA · GRUPO D',
  liga: 'VIRTUAL PRO URUGUAY GAMING',
  fecha: 'LUNES 5 OCT',
  logoLiga: 'logos/VPUG logo.png',
  color: '#3ecf8e',                                            // verde VPUG (token --vpug)
  jugadores: ['Juan_Martinez4', 'Lautavester7', 'NicoBJ_96'],  // el del medio va adelante y más grande
  partidos: [
    { hora: '23:00', rival: 'Villa Dalmine eSports', cond: 'Local', fecha: 'Fecha 1', escudo: 'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P2JRiVP2pCqmqxrPfis.png?alt=media&token=1&m=1790270899743' },
    { hora: '23:30', rival: 'Norpatagonicos eSports', cond: 'Visita', fecha: 'Fecha 2', escudo: 'https://copafacil-storage.b-cdn.net/events%2F-fthh5%2Fb7we%2Fteams%2F-P31SBjRST6W8mTvYHP0.png?alt=media&token=1&m=1791042652994' },
  ],
};
const i = process.argv.indexOf('--out');
const OUT = path.resolve(i > 0 ? process.argv[i + 1] : 'fuentes/placas/debut-vpug-pretemporada.png');
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
const b64 = async f => 'data:image/png;base64,' + (await sharp(f).png().toBuffer()).toString('base64');

const [izq, centro, der] = await Promise.all(CFG.jugadores.map(recorte));
const logo = await b64(CFG.logoLiga);
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;position:relative;overflow:hidden;background:#0a0a0a;font-family:'Barlow Condensed',sans-serif;color:#f4f1ea}
.glow{position:absolute;inset:0;background:radial-gradient(ellipse 75% 40% at 50% 16%,${CFG.color}40,transparent 70%),radial-gradient(ellipse 70% 45% at 50% 52%,rgba(201,168,76,.18),rgba(201,168,76,0) 70%),radial-gradient(ellipse 70% 30% at 50% 100%,${CFG.color}2e,transparent 70%)}
.franja{position:absolute;left:0;right:0;top:0;height:8px;background:${CFG.color};z-index:6}
.top{position:absolute;top:56px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.marca{display:flex;align-items:center;gap:14px;font-weight:800;font-size:28px;letter-spacing:5px}
.marca img{height:52px}
.top .liga{display:none}
.ligabig{display:block;height:250px;margin:0 auto -14px;filter:drop-shadow(0 0 30px ${CFG.color}66)}
.tit{position:absolute;top:70px;left:0;right:0;text-align:center;z-index:4}
.tit small{display:block;color:${CFG.color};font-weight:800;font-size:34px;letter-spacing:10px}
/* nombre de la copa: protagonista */
.copa{font-weight:900;line-height:.86;letter-spacing:3px;text-transform:uppercase}
.copa .a{display:block;font-size:84px;color:#f4f1ea}
.copa .b{display:block;font-size:132px;color:${CFG.color};text-shadow:0 0 40px ${CFG.color}55}
.deb{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:18px;font-weight:800;font-size:44px;letter-spacing:10px}
.deb b{color:#c9a84c;font-weight:900}
.deb i{display:block;width:10px;height:10px;border-radius:50%;background:${CFG.color}}
.tit .grp{display:block;color:rgba(244,241,234,.6);font-weight:700;font-size:24px;letter-spacing:9px;margin-top:10px}
.tit .ln{display:none;color:rgba(244,241,234,.55);font-weight:700;font-size:20px;letter-spacing:8px;margin-bottom:10px}
.tit h1{font-weight:900;font-size:250px;line-height:.84;letter-spacing:6px;background:linear-gradient(180deg,#fff 15%,#c9a84c 100%);-webkit-background-clip:text;color:transparent;margin-top:8px}
.tit .fecha{font-weight:800;font-size:40px;letter-spacing:10px;color:#f4f1ea;margin-top:2px;text-shadow:0 2px 14px rgba(0,0,0,.9)}
.jug{position:absolute;z-index:2}
.jug.c{height:640px;left:50%;transform:translateX(-50%);top:640px;z-index:3}
.jug.l{height:580px;left:130px;top:670px;filter:brightness(.8)}
.jug.r{height:580px;right:130px;top:670px;filter:brightness(.8)}
.fade{position:absolute;left:0;right:0;top:920px;bottom:0;z-index:4;background:linear-gradient(rgba(10,10,10,0),rgba(10,10,10,.92) 38%,#0a0a0a 60%)}
.part{position:absolute;left:64px;right:64px;bottom:96px;z-index:5}
.fila{display:flex;align-items:center;gap:22px;padding:16px 0;border-top:1px solid rgba(244,241,234,.14)}
.fila:last-child{border-bottom:1px solid rgba(244,241,234,.14)}
.hora{font-weight:800;font-size:52px;color:#c9a84c;width:130px}
.esc{width:62px;height:62px;object-fit:contain}
.riv{flex:1;font-weight:800;font-size:44px;line-height:1}
.riv span{display:block;font-weight:700;font-size:22px;letter-spacing:5px;color:${CFG.color};margin-top:6px}
.cond{font-weight:700;font-size:24px;letter-spacing:6px;color:rgba(244,241,234,.6)}
.hora{color:#c9a84c}
.hash{position:absolute;bottom:42px;left:0;right:0;text-align:center;z-index:5;color:#c9a84c;font-weight:700;font-size:24px;letter-spacing:9px}
</style></head><body>
<div class="glow"></div>
<div class="top"><div class="marca"><img src="https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/rebrand/clean-dorado.webp">TOP SECRET FC</div><img class="liga" src="${logo}"></div>
<div class="franja"></div>
<div class="tit"><img class="ligabig" src="${logo}"><div class="copa"><span class="a">${CFG.copa[0]}</span><span class="b">${CFG.copa[1]}</span></div><span class="grp">GRUPO D · FC 27</span><div class="deb"><b>${CFG.titulo}</b><i></i>${CFG.fecha}</div></div>
<img class="jug l" src="${izq}"><img class="jug r" src="${der}"><img class="jug c" src="${centro}">
<div class="fade"></div>
<div class="part">${CFG.partidos.map(p => `<div class="fila"><div class="hora">${p.hora}</div><img class="esc" src="${p.escudo}"><div class="riv">${p.rival}<span>${p.fecha.toUpperCase()}</span></div><div class="cond">${p.cond.toUpperCase()}</div></div>`).join('')}</div>
<div class="hash">#TOPSECRETFC</div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: OUT });
await b.close();
console.log('Listo:', OUT);
