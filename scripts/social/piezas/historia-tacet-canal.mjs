#!/usr/bin/env node
// Historia para promocionar el canal de YouTube de Tacet Sin (Juan, 2026-11-07: "corto y simple, una sola imagen";
// él la sube y le pone el sticker con el link). Una imagen fija 1080x1920 con un acercamiento lento y un tema de The Shorts.
// El tercio de abajo queda libre para el sticker del link.
//
//   node scripts/social/piezas/historia-tacet-canal.mjs
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { elegirMusica, infoTema } from '../../lib/musica.mjs';

const ID = 'historia-tacet-canal-2026-11-07';
const DIR = path.join(ROOT, 'fuentes/redes/historias');
const PNG = path.join(DIR, 'tacet-canal.png'), MP4 = path.join(DIR, 'tacet-canal.mp4');
const DUR = 10;
fs.mkdirSync(DIR, { recursive: true });
const ff = args => { const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr); };

// Embebidas: una página cargada con setContent no puede leer file://
const tapa = v => 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, `fuentes/musica/portadas/the-shorts-${v}.webp`)).toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&display=block" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;background:#07070a;color:#f2eee6;font-family:'Barlow Condensed',sans-serif;overflow:hidden;position:relative}
.glow{position:absolute;inset:0;background:radial-gradient(60% 32% at 30% 44%,rgba(226,150,60,.20),transparent 70%),radial-gradient(55% 30% at 72% 56%,rgba(70,120,200,.20),transparent 70%)}
.head{position:absolute;top:250px;left:0;right:0;text-align:center}
.kick{font-weight:600;font-size:36px;letter-spacing:12px;color:#e9c67a;text-transform:uppercase}
h1{font-weight:700;font-size:168px;letter-spacing:22px;margin-top:6px;padding-left:22px;line-height:1}
.covers{position:absolute;top:560px;left:0;right:0;height:640px}
.covers img{position:absolute;width:520px;height:520px;box-shadow:0 30px 80px rgba(0,0,0,.75)}
.v2{left:470px;top:0;transform:rotate(4deg)}
.v1{left:90px;top:110px;transform:rotate(-4deg)}
.info{position:absolute;top:1250px;left:0;right:0;text-align:center}
.info .t{font-weight:600;font-size:56px;letter-spacing:3px}
.info .s{font-weight:500;font-size:38px;letter-spacing:4px;color:#b9b2a6;margin-top:10px;text-transform:uppercase}
.yt{display:inline-flex;align-items:center;gap:18px;margin-top:34px;font-weight:600;font-size:46px;letter-spacing:2px;color:#e9c67a}
.yt svg{width:58px;height:58px;fill:#ff0033}
</style></head><body>
<div class="glow"></div>
<div class="head"><div class="kick">La música del club</div><h1>TACET SIN</h1></div>
<div class="covers"><img class="v2" src="${tapa(2)}"><img class="v1" src="${tapa(1)}"></div>
<div class="info">
  <div class="t">The Shorts · Vol. 1 y 2</div>
  <div class="s">23 temas, completos en YouTube</div>
  <div class="yt"><svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6z"/></svg>@tacetsin</div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: PNG });
await browser.close();
console.log('imagen:', PNG);

// Música: un tema de The Shorts desde que entra la voz.
const musica = await elegirMusica(ID);
const tema = infoTema(musica);
let desde = 20;
try { desde = Math.max(0, JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/letras-tiempos.json'), 'utf8'))[tema.slug].lineas[0].ini - 0.8); } catch {}

// Acercamiento lento (100% → 106%) sobre la imagen al doble de resolución para que no tiemble.
const N = DUR * 30;
ff(['-loop', '1', '-i', PNG, '-ss', String(desde), '-t', String(DUR), '-i', musica,
  '-filter_complex', `[0:v]scale=2160:3840,zoompan=z='1+0.06*on/${N}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${N}:s=1080x1920:fps=30,fade=t=in:d=0.4,fade=t=out:st=${DUR - 0.5}:d=0.5,format=yuv420p[v];[1:a]afade=t=in:d=0.6,afade=t=out:st=${DUR - 1.2}:d=1.2[a]`,
  '-map', '[v]', '-map', '[a]', '-t', String(DUR), '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-color_range', 'tv', '-colorspace', 'bt709',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', MP4]);
console.log(`video: ${MP4} (${tema.titulo}, desde ${desde.toFixed(1)} s)`);
