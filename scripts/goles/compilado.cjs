#!/usr/bin/env node
// Arma el compilado de goles de una noche a partir del VOD de Twitch y un JSON con los goles.
//   node scripts/goles/compilado.cjs <datos.json> [--subir]
// Espera el VOD en fuentes/goles/v<vod>/source.mp4 (bajarlo antes, ver README). Genera placas que
// tapan el HUD de FC27 en las 4 esquinas (partido · gol · goleador · club) y el video final en
// fuentes/goles/v<vod>/goles-<fecha>.mp4. Con --subir lo sube a R2 videos/goles/<fecha>/compilado.mp4.
const { chromium } = require('playwright');
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs'); const path = require('path'); const sharp = require('sharp');
const FF = require('ffmpeg-static');

const ROOT = path.resolve(__dirname, '..', '..');
const datos = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8'));
const DIR = path.join(ROOT, 'fuentes', 'goles', 'v' + datos.vod);
const W = path.join(DIR, 'comp'); fs.mkdirSync(W, { recursive: true });
const SRC = path.join(DIR, 'source.mp4');
if (!fs.existsSync(SRC)) { console.error('Falta el VOD:', SRC); process.exit(1); }
const M = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const TR_H = Math.max(110, (datos.hudTopRightHasta || 210) - 6);   // alto de la placa de arriba a la derecha
const F = `<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;700;800;900&family=Bebas+Neue&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">`;
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

const placa = (g, foto) => `<!doctype html><html><head><meta charset="utf-8">${F}<style>
*{margin:0;box-sizing:border-box}body{width:1280px;height:720px;overflow:hidden;font-family:Barlow,sans-serif;color:#F2EEE0;background:transparent;position:relative}
.p{position:absolute;background:linear-gradient(180deg,#17140d,#0B0A07);border:1px solid rgba(200,168,75,.35);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.mono{font-family:'JetBrains Mono';font-weight:700;letter-spacing:.18em;color:#C8A84B}
.tl{left:18px;top:18px;width:340px;height:96px;white-space:nowrap;display:flex;align-items:center;gap:14px;padding:0 16px}
.tl .cr{height:50px;width:50px;object-fit:contain}.tl .vs{font-family:'Bebas Neue';font-size:22px;color:rgba(242,238,224,.5)}
.tl .t{display:flex;flex-direction:column;gap:3px;min-width:0}.tl .k{font-size:11px}.tl .m{font-weight:800;font-size:20px;line-height:1.05;overflow:hidden;text-overflow:ellipsis}
.tr{left:918px;top:18px;width:344px;height:${TR_H}px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.tr .k{font-size:15px}.tr .sc{font-family:'Bebas Neue';font-size:${TR_H > 150 ? 104 : 64}px;line-height:.9;margin-top:${TR_H > 150 ? 8 : 2}px}.tr .mn{font-weight:500;font-size:${TR_H > 150 ? 20 : 16}px;color:rgba(242,238,224,.75)}
.bl{left:14px;top:600px;width:360px;height:108px;display:flex;align-items:flex-end;overflow:visible}
.bl .ph{position:absolute;left:10px;bottom:0;width:118px;height:150px;overflow:hidden;border-radius:0 0 0 12px}
.bl .ph img{position:absolute;left:50%;top:0;width:170px;transform:translateX(-50%)}
.bl .tx{margin-left:138px;padding-bottom:16px}.bl .k{font-size:12px}
.bl .n{display:flex;align-items:baseline;gap:10px;margin-top:4px}.bl .num{font-family:'Bebas Neue';font-size:54px;line-height:.85;color:#C8A84B}.bl .gt{font-weight:900;font-size:27px;letter-spacing:-.02em}
.br{left:930px;top:612px;width:336px;height:96px;display:flex;align-items:center;gap:14px;padding:0 18px}
.br img{height:60px}.br .a{font-weight:900;font-size:22px;letter-spacing:.06em}.br .b{font-size:12px;margin-top:4px}
</style></head><body>
<div class="p tl"><img class="cr" src="${M}logos/rebrand/clean-dorado.webp"><span class="vs">VS</span>${g.escudoRival ? `<img class="cr" src="${g.escudoRival}">` : ''}
  <div class="t"><div class="mono k">${datos.etiqueta}</div><div class="m">${g.rival}</div></div></div>
<div class="p tr"><div class="mono k">GOL DE TOP SECRET</div><div class="sc">${g.marcador}</div><div class="mn">minuto ${g.minuto}</div></div>
<div class="p bl">${foto ? `<div class="ph"><img src="${b64(foto)}"></div>` : ''}
  <div class="tx" style="${foto ? '' : 'margin-left:20px'}"><div class="mono k">GOLEADOR</div><div class="n"><span class="num">${g.numero || ''}</span><span class="gt">${g.goleador}</span></div></div></div>
<div class="p br"><img src="${M}logos/rebrand/badge-metal.webp"><div><div class="a">TOP SECRET FC</div><div class="mono b">TWITCH.TV/TOPSECRETFC</div></div></div>
</body></html>`;
const tarjeta = inner => `<!doctype html><html><head><meta charset="utf-8">${F}<style>*{margin:0;box-sizing:border-box}body{width:1280px;height:720px;overflow:hidden;font-family:Barlow,sans-serif;color:#F2EEE0;background:radial-gradient(circle at 50% 40%,#2a2111,#0B0A07 65%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}</style></head><body>${inner}</body></html>`;

(async () => {
  // Fotos de los goleadores (render T4 con brazos cruzados, recortado).
  for (const g of datos.goles) {
    const src = ['Brazos4.png', 'Frente4.png'].map(f => path.join(ROOT, 'Renders', g.goleador, f)).find(f => fs.existsSync(f));
    g._foto = src ? path.join(W, `p-${g.goleador}.png`) : null;
    if (src && !fs.existsSync(g._foto)) await sharp(src).trim({ threshold: 5 }).resize({ width: 420 }).png().toFile(g._foto);
  }
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const shot = async (html, out, transp) => { await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250); await p.screenshot({ path: out, omitBackground: !!transp }); };
  await shot(tarjeta(`<img src="${M}logos/rebrand/clean-dorado.webp" style="height:150px;margin-bottom:34px"><div style="font-family:'JetBrains Mono';font-weight:700;font-size:20px;letter-spacing:.24em;color:#C8A84B">${datos.titulo}</div><div style="font-weight:900;font-size:110px;letter-spacing:-.05em;line-height:.95;margin-top:16px">Los goles</div><div style="font-weight:300;font-size:32px;margin-top:10px">Top Secret FC · EA FC 27</div>`), path.join(W, 'intro.png'));
  await shot(tarjeta(`<img src="${M}logos/rebrand/badge-metal.webp" style="height:240px;margin-bottom:30px"><div style="font-weight:900;font-size:64px;letter-spacing:-.04em">TOP SECRET FC</div><div style="font-family:'JetBrains Mono';font-size:18px;letter-spacing:.2em;color:#C8A84B;margin-top:12px">twitch.tv/topsecretfc</div>`), path.join(W, 'outro.png'));
  for (let i = 0; i < datos.goles.length; i++) await shot(placa(datos.goles[i], datos.goles[i]._foto), path.join(W, `l${i + 1}.png`), true);
  await b.close();

  // Montaje: intro + goles (placa desde el primer cuadro) + cierre, fundidos cortos, audio del juego.
  const fadeV = d => `fade=t=in:st=0:d=0.35,fade=t=out:st=${(d - 0.35).toFixed(2)}:d=0.35`;
  const fadeA = d => `afade=t=in:st=0:d=0.3,afade=t=out:st=${(d - 0.35).toFixed(2)}:d=0.35`;
  const inputs = [], f = []; let n = 0;
  const add = a => { inputs.push(...a); return n++; };
  const card = (img, d, lab) => {
    const i = add(['-loop', '1', '-t', String(d), '-i', path.join(W, img)]);
    const a = add(['-f', 'lavfi', '-t', String(d), '-i', 'anullsrc=r=48000:cl=stereo']);
    f.push(`[${i}:v]scale=1280:720,setsar=1,fps=30,format=yuv420p,${fadeV(d)}[${lab}v]`, `[${a}:a]anull[${lab}a]`);
  };
  card('intro.png', 2.4, 'c0');
  datos.goles.forEach((g, k) => {
    const d = +(g.fin - g.inicio).toFixed(2);
    const v = add(['-ss', String(g.inicio), '-t', String(d), '-i', SRC]);
    const o = add(['-loop', '1', '-t', String(d), '-i', path.join(W, `l${k + 1}.png`)]);
    f.push(`[${v}:v]scale=1280:720,setsar=1,fps=30[r${k}]`, `[${o}:v]format=rgba[o${k}]`,
      `[r${k}][o${k}]overlay=0:0:shortest=1,format=yuv420p,${fadeV(d)}[g${k}v]`,
      `[${v}:a]aresample=48000,aformat=channel_layouts=stereo,${fadeA(d)}[g${k}a]`);
  });
  card('outro.png', 2.6, 'c9');
  const segs = ['c0', ...datos.goles.map((_, k) => 'g' + k), 'c9'];
  f.push(segs.map(s => `[${s}v][${s}a]`).join('') + `concat=n=${segs.length}:v=1:a=1[v][a]`);
  const out = path.join(DIR, `goles-${datos.fecha}.mp4`);
  execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('video:', out);
  if (process.argv.includes('--subir')) {
    const key = `videos/goles/${datos.fecha}/compilado.mp4`;
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'r2.mjs'), 'put', out, key], { stdio: 'inherit' });
    if (!r.status) console.log('online:', M + key);
  }
})();
