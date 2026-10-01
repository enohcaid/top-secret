// Video "Bienvenidos a la nueva era" (reel vertical 1080x1920, ~30 s) con material propio del club.
// Uso (desde la raíz): node scripts/video-nueva-era/armar.cjs
// Materiales en fuentes/nueva-era/ (kits.mp4 = travelling de Canva, goles.mp4 = compilado del 30/9)
// y fuentes/video-fichajes/<gt>.mp4 (clips de fichajes). Ver README.md.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const FF = require('ffmpeg-static');
const ROOT = path.resolve(__dirname, '..', '..');
const D = path.join(ROOT, 'fuentes', 'nueva-era'); const T = path.join(D, 'tmp'); fs.mkdirSync(T, { recursive: true });
const M = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const FICHAJES = require('../video-fichajes/jugadores.json');
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;800;900&family=Bebas+Neue&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">`;
const page = (body, bg) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:Barlow,sans-serif;color:#F2EEE0;background:${bg || 'transparent'};position:relative}
.mono{font-family:'JetBrains Mono';font-weight:700;letter-spacing:.24em;color:#C8A84B}
.c{position:absolute;left:0;right:0;text-align:center}
.h{font-weight:900;letter-spacing:-.05em;line-height:.9}
.shade-b{position:absolute;left:0;right:0;bottom:0;height:820px;background:linear-gradient(0deg,rgba(7,6,5,.95),rgba(7,6,5,0))}
.shade-t{position:absolute;left:0;right:0;top:0;height:520px;background:linear-gradient(180deg,rgba(7,6,5,.85),rgba(7,6,5,0))}
</style></head><body>${body}</body></html>`;
const BG = 'radial-gradient(circle at 50% 42%,#2a2111 0%,#0B0A07 62%)';

const OV = {
  // Tarjetas completas (fondo propio)
  logo: page(`<div class="c" style="top:640px"><img src="${M}logos/rebrand/clean-dorado.webp" style="height:420px;filter:drop-shadow(0 30px 80px rgba(200,168,75,.35))"></div>
    <div class="c h" style="top:1150px;font-size:150px">TOP SECRET</div><div class="c mono" style="top:1320px;font-size:30px">FOOTBALL CLUB</div>`, BG),
  era: page(`<div class="c mono" style="top:760px;font-size:30px">BIENVENIDOS A</div>
    <div class="c h" style="top:840px;font-size:190px">una nueva<br>era</div>`, BG),
  esencia: page(`<div class="c" style="top:470px"><img src="${M}logos/rebrand/badge-metal.webp" style="height:640px;filter:drop-shadow(0 30px 80px rgba(0,0,0,.6))"></div>
    <div class="c h" style="top:1260px;font-size:96px">Misma esencia.</div><div class="c h" style="top:1370px;font-size:96px;color:#C8A84B">Otra presencia.</div>`, BG),
  fin: page(`<div class="c" style="top:420px"><img src="${M}logos/rebrand/badge-metal.webp" style="height:520px"></div>
    <div class="c mono" style="top:1030px;font-size:28px">TEMPORADA 4 · EA FC 27</div>
    <div class="c h" style="top:1100px;font-size:120px">Bienvenidos<br>a la nueva era</div>
    <div class="c" style="top:1430px;font-family:'JetBrains Mono';font-size:30px;line-height:1.7;color:rgba(242,238,224,.8)">@fctopsecret<br>twitch.tv/topsecretfc<br>youtube.com/@TOPSecretFC</div>`, BG),
  // Textos sobre video (transparentes)
  kits: page(`<div class="shade-b"></div><div class="c mono" style="bottom:330px;font-size:28px">TEMPORADA 4</div><div class="c h" style="bottom:170px;font-size:120px">Camisetas<br>nuevas</div>`),
  plantel: page(`<div class="shade-b"></div><div class="c mono" style="bottom:330px;font-size:28px">MIEMBROS</div><div class="c h" style="bottom:170px;font-size:120px">El plantel<br>de la T4</div>`),
  goles: page(`<div class="shade-t"></div><div class="c mono" style="top:150px;font-size:28px">AHORA EN</div><div class="c h" style="top:210px;font-size:130px">EA FC 27</div>`),
  web: page(`<div class="shade-t" style="height:560px;background:linear-gradient(180deg,rgba(7,6,5,.97) 55%,rgba(7,6,5,0))"></div><div class="c h" style="top:150px;font-size:120px">Sitio renovado</div><div class="c mono" style="top:300px;font-size:26px">ENOHCAID.GITHUB.IO/TOP-SECRET</div>`),
};
FICHAJES.forEach(([gt, num, pos], i) => {
  OV['f' + i] = page(`<div class="shade-b" style="height:640px"></div>
    <div class="c mono" style="top:120px;font-size:30px">NUEVOS FICHAJES</div>
    <div class="c" style="bottom:140px"><div style="font-family:'Bebas Neue';font-size:150px;line-height:.85;color:#C8A84B">${num}</div>
    <div class="h fit" style="font-size:96px;white-space:nowrap;display:inline-block;margin-top:6px">${gt}</div><div class="mono" style="font-size:24px;margin-top:14px">${pos.toUpperCase()}</div></div>
    <script>for(const e of document.querySelectorAll('.fit')){let z=96;while(e.scrollWidth>980&&z>40){z-=4;e.style.fontSize=z+'px';}}</script>`);
});

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [k, html] of Object.entries(OV)) {
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(T, k + '.png'), omitBackground: !/^(logo|era|esencia|fin)$/.test(k) });
  }
  await b.close();

  const X = 0.3, inputs = [], f = [], durs = []; let n = 0;
  const add = a => { inputs.push(...a); return n++; };
  const seg = (label, d, chain) => { durs.push(d); f.push(chain + `,trim=duration=${d},setpts=PTS-STARTPTS,fps=30,format=yuv420p,setsar=1[${label}]`); };
  const zoomCard = (img, d, z = 0.0008) => { const i = add(['-loop', '1', '-t', String(d), '-i', path.join(T, img)]);
    return `[${i}:v]scale=1188:2112,zoompan=z='min(zoom+${z},1.1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`; };
  // video horizontal → vertical con fondo desenfocado del mismo video
  const padV = (file, ss, d, ov) => { const v = add(['-ss', String(ss), '-t', String(d), '-i', file]); const o = add(['-loop', '1', '-t', String(d), '-i', path.join(T, ov)]);
    const k = 'p' + n; f.push(`[${v}:v]split[${k}a][${k}b]`, `[${k}a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.25[${k}bg]`,
      `[${k}b]scale=1080:-2[${k}fg]`, `[${k}bg][${k}fg]overlay=(W-w)/2:(H-h)/2[${k}m]`);
    return `[${k}m][${o}:v]overlay=0:0`; };
  let s = 0; const L = [];
  const push = (d, chain) => { const lab = 's' + (s++); seg(lab, d, chain); L.push(lab); };

  push(2.4, zoomCard('logo.png', 2.4 + X));
  push(1.9, zoomCard('era.png', 1.9 + X, 0.0012));
  push(2.8, zoomCard('esencia.png', 2.8 + X));
  push(3.6, padV(path.join(D, 'kits.mp4'), 0.3, 3.6 + X, 'kits.png'));
  { // plantel: paneo horizontal de la foto grupal
    const i = add(['-loop', '1', '-t', String(3.6 + X), '-i', path.join(ROOT, 'logos', 'plantel-t4-munfhq5w.webp')]); const o = add(['-loop', '1', '-t', String(3.6 + X), '-i', path.join(T, 'plantel.png')]);
    push(3.6, `[${i}:v]scale=-2:1920,crop=1080:1920:x='(iw-1080)*t/${3.6 + X}':y=0[pl];[pl][${o}:v]overlay=0:0`);
  }
  FICHAJES.forEach(([gt], i) => {
    const d = 0.95, v = add(['-ss', '1.2', '-t', String(d + X), '-i', path.join(ROOT, 'fuentes', 'video-fichajes', gt + '.mp4')]); const o = add(['-loop', '1', '-t', String(d + X), '-i', path.join(T, 'f' + i + '.png')]);
    push(d, `[${v}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[fv${i}];[fv${i}][${o}:v]overlay=0:0`);
  });
  push(4.4, padV(path.join(D, 'goles.mp4'), 22.9, 4.4 + X, 'goles.png'));
  { // sitio: captura del celular que se desplaza hacia abajo
    const i = add(['-loop', '1', '-t', String(3.0 + X), '-i', path.join(ROOT, 'logos', 'noticias', 'web-movil-portada.png')]); const o = add(['-loop', '1', '-t', String(3.0 + X), '-i', path.join(T, 'web.png')]);
    push(3.0, `[${i}:v]scale=1080:-2,crop=1080:1920:x=0:y='min(ih-1920,(ih-1920)*t/${3.0 + X})'[wb];[wb][${o}:v]overlay=0:0`);
  }
  push(3.4, zoomCard('fin.png', 3.4 + X, 0.0006));

  // fundidos cruzados (los segmentos de fichajes, cortes secos y rápidos)
  let prev = L[0], t = durs[0];
  for (let k = 1; k < L.length; k++) {
    const out = k === L.length - 1 ? 'vout' : 'x' + k;
    const corto = durs[k] < 1.2 && durs[k - 1] < 1.2;
    f.push(`[${prev}][${L[k]}]xfade=transition=${corto ? 'slideleft' : 'fade'}:duration=${corto ? 0.15 : X}:offset=${(t - (corto ? 0.15 : X)).toFixed(3)}[${out}]`);
    t += durs[k] - (corto ? 0.15 : X); prev = out;
  }
  f.push(`[vout]fade=t=out:st=${(t - 0.5).toFixed(2)}:d=0.5[vf]`);
  const out = path.join(D, 'nueva-era.mp4');
  execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', f.join(';'), '-map', '[vf]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('ok', out, t.toFixed(1) + ' s');
})();
