// Carrusel de Instagram "El expediente" (6 placas 1080x1350, JPEG) — estética limpia y gráfica.
//   node scripts/relanzamiento/carrusel.cjs  → fuentes/relanzamiento/carrusel/0N.jpg
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'fuentes', 'relanzamiento', 'carrusel'); fs.mkdirSync(OUT, { recursive: true });
const M = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const b64 = f => `data:image/${f.endsWith('.png') ? 'png' : 'webp'};base64,` + fs.readFileSync(f).toString('base64');
const R = f => b64(path.join(ROOT, f));
const N = 6;
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;800;900&family=Bebas+Neue&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1080px;height:1350px;overflow:hidden;background:#0B0A07;color:#F2EEE0;font-family:Barlow,sans-serif;position:relative}
.abs{position:absolute}.mono{font-family:'JetBrains Mono';font-weight:700;letter-spacing:.28em;color:#C8A84B;font-size:22px}
.h{font-weight:900;letter-spacing:-.05em;line-height:.9}
.top{position:absolute;left:64px;right:64px;top:56px;display:flex;justify-content:space-between;align-items:center;z-index:5}
.top img{height:54px}.cnt{font-family:'JetBrains Mono';font-size:20px;color:rgba(242,238,224,.55);letter-spacing:.2em}
.full{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.fadeb{position:absolute;left:0;right:0;bottom:0;height:62%;background:linear-gradient(0deg,#0B0A07 30%,rgba(11,10,7,0))}
.fadet{position:absolute;left:0;right:0;top:0;height:28%;background:linear-gradient(180deg,rgba(11,10,7,.85),rgba(11,10,7,0))}
.bot{position:absolute;left:64px;right:64px;bottom:84px;z-index:5}</style>`;
const top = i => `<div class="top"><img src="${M}logos/rebrand/clean-dorado.webp"><span class="cnt">0${i}/0${N}</span></div>`;
const S = [
  // 1 portada
  `<img class="full" src="${R('logos/noticias/relanz-archivo-papel.png')}" style="object-position:50% 30%"><div class="fadet"></div><div class="fadeb"></div>${top(1)}
   <div class="bot"><div class="mono">ARCHIVO TOP SECRET FC</div><div class="h" style="font-size:150px;margin-top:22px">Expediente<br><span style="color:#C8A84B">desclasificado.</span></div></div>`,
  // 2 números
  `${top(2)}<div class="abs mono" style="left:64px;top:230px">TSFC://archivo/historial</div>
   ${[['160', 'PARTIDOS'], ['75', 'VICTORIAS'], ['303', 'GOLES']].map(([n, k], i) => `<div class="abs" style="left:64px;right:64px;top:${300 + i * 300}px;border-top:2px solid rgba(200,168,75,.3);display:flex;align-items:baseline;justify-content:space-between">
     <span style="font-family:'Bebas Neue';font-size:${i === 2 ? 290 : 250}px;line-height:.95;color:${i === 2 ? '#C8A84B' : '#F2EEE0'}">${n}</span><span class="mono" style="font-size:26px">${k}</span></div>`).join('')}`,
  // 3 leyenda
  `<div class="abs" style="inset:0;background:radial-gradient(circle at 50% 38%,#3a2c12,#0B0A07 62%)"></div>
   <div class="abs" style="left:0;right:0;top:120px;text-align:center;font-family:'Bebas Neue';font-size:640px;line-height:1;color:rgba(200,168,75,.16)">100</div>
   <img class="abs" src="${R('Renders/Lautavester7/Brazos4.png')}" style="left:50%;top:200px;height:1500px;transform:translateX(-50%)">
   <div class="fadeb" style="height:45%"></div>${top(3)}
   <div class="bot"><div class="mono">MÁXIMO GOLEADOR DE LA HISTORIA</div><div style="display:flex;align-items:baseline;gap:22px;margin-top:14px"><span style="font-family:'Bebas Neue';font-size:170px;line-height:.85;color:#C8A84B">100</span><span class="h" style="font-size:72px">goles<br>Lautavester7</span></div></div>`,
  // 4 identidad
  `<div class="abs" style="inset:0;background:radial-gradient(circle at 50% 42%,#262012,#0B0A07 60%)"></div>${top(4)}
   <img class="abs" src="${M}logos/rebrand/badge-metal.webp" style="left:50%;top:230px;width:640px;transform:translateX(-50%);filter:drop-shadow(0 40px 80px rgba(0,0,0,.7))">
   <div class="bot" style="text-align:center"><div class="h" style="font-size:96px">Misma esencia.</div><div class="h" style="font-size:96px;color:#C8A84B;margin-top:6px">Otra presencia.</div></div>`,
  // 5 camisetas
  `<img class="full" src="${R('logos/noticias/kits-t4-portada-v3.png')}" style="object-position:50% 40%"><div class="fadet"></div><div class="fadeb" style="height:48%"></div>${top(5)}
   <div class="bot"><div class="mono">TEMPORADA 4</div><div class="h" style="font-size:130px;margin-top:20px">Tres camisetas.<br><span style="color:#C8A84B">Un espía.</span></div></div>`,
  // 6 cierre
  `<img class="full" src="${R('logos/noticias/relanz-estadio-final.png')}" style="object-position:50% 30%"><div class="fadeb" style="height:55%"></div>${top(6)}
   <div class="bot"><div class="mono">AHORA EN EA FC 27</div><div class="h" style="font-size:132px;margin-top:20px">La nueva era<br>empieza ahora.</div>
   <div style="font-family:'JetBrains Mono';font-size:24px;color:rgba(242,238,224,.7);margin-top:34px;letter-spacing:.08em">twitch.tv/topsecretfc · youtube.com/@TOPSecretFC</div></div>`,
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let i = 0; i < S.length; i++) {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${HEAD}</head><body>${S[i]}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `0${i + 1}.jpg`), type: 'jpeg', quality: 92 });
  }
  await b.close(); console.log('ok', S.length);
})();
