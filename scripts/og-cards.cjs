// Genera las placas de vista previa (WhatsApp/redes) 1200x630 de cada sección del sitio.
// Salida: scripts/.og-out/og-<id>.jpg -> subir a R2 logos/og/. Correr: node scripts/og-cards.cjs
const { chromium } = require('playwright');
const M='https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const CARDS=[
 ['home','Inicio','TOP SECRET','Football Club','VPN · VPUG · 11x11 — Temporada 4','logos/plantel-t4-mum79hui.webp','50% 30%',1],
 ['noticias','Noticias','Noticias','Archivo del club','Expedientes desclasificados','logos/noticias/kits-t4-portada-v2.webp','50% 25%'],
 ['plantel','Miembros','El Plantel','Temporada 4','Los agentes de Top Secret FC','logos/plantel-t4-mum79hui.webp','50% 30%'],
 ['convocatoria','Miembros','Convocatoria','Quién juega hoy','Formación y presentes del día','logos/duos/duo-mediocampo-k1.webp','50% 12%'],
 ['plan','Miembros','Plan de juego','Información clasificada','Solo para el plantel','logos/plan/boveda.webp','50% 50%'],
 ['competencias','Competencias','Competencias','VPN · VPUG · 11x11','Posiciones, calendario y estadísticas','logos/duos/duo-ataque-k1.webp','50% 12%'],
 ['nosotros','Nosotros','Nosotros','El club por dentro','Proyecto, identidad y equipaciones','logos/nosotros/manada-k1.webp','50% 35%'],
 ['reclutamiento','Sumate','Sumate','Buscamos agentes','Postulate para Top Secret FC','logos/duos/solo-juanchyroman-k2-v2.webp','50% 10%'],
];
const html=([id,kick,t1,t2,sub,img,pos,brand])=>`<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#0B0A07;overflow:hidden;font-family:Barlow,sans-serif;color:#F2EEE0;position:relative}
.ph{position:absolute;top:0;right:0;width:720px;height:630px;background:url(${M+img}) ${pos}/cover no-repeat}
.ph:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#0B0A07 0%,rgba(11,10,7,.75) 22%,rgba(11,10,7,0) 60%),linear-gradient(0deg,rgba(11,10,7,.55),rgba(11,10,7,0) 35%)}
.glow{position:absolute;left:-160px;top:-120px;width:700px;height:700px;background:radial-gradient(circle,rgba(200,168,75,.13),rgba(200,168,75,0) 65%)}
.tx{position:absolute;left:64px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center}
.path{font-family:'JetBrains Mono';font-size:20px;color:rgba(242,238,224,.6);display:flex;align-items:center;gap:12px;margin-bottom:34px}
.path i{width:10px;height:10px;border-radius:50%;background:#3ECF8E;box-shadow:0 0 10px #3ECF8E}
.logo{height:74px;margin-bottom:26px;align-self:flex-start;filter:drop-shadow(0 6px 18px rgba(0,0,0,.5))}
h1{font-weight:900;font-size:${brand?112:96}px;line-height:.88;letter-spacing:-.045em}
h1 b{color:#C8A84B;font-weight:900}
h2{font-weight:300;font-size:${brand?54:46}px;letter-spacing:-.02em;margin-top:10px}
.sub{font-family:'JetBrains Mono';font-weight:700;font-size:19px;letter-spacing:.14em;text-transform:uppercase;color:#C8A84B;margin-top:30px}
.c{position:absolute;width:34px;height:34px;border-color:rgba(200,168,75,.5);border-style:solid;border-width:0}
.tl{top:26px;left:26px;border-top-width:2px;border-left-width:2px}.tr{top:26px;right:26px;border-top-width:2px;border-right-width:2px}
.bl{bottom:26px;left:26px;border-bottom-width:2px;border-left-width:2px}.br{bottom:26px;right:26px;border-bottom-width:2px;border-right-width:2px}
.id{position:absolute;right:52px;bottom:40px;font-family:'JetBrains Mono';font-size:16px;color:rgba(242,238,224,.55);letter-spacing:.1em}
</style></head><body><div class="glow"></div><div class="ph"></div>
<div class="tx"><div class="path"><i></i>TSFC://archivo/${kick.toLowerCase()}</div>
<img class="logo" src="${M}logos/rebrand/clean-dorado.webp">
<h1>${brand?'<b>TOP</b> SECRET':t1}</h1><h2>${t2}</h2><div class="sub">${sub}</div></div>
<div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
<div class="id">DESCLASIFICADO</div></body></html>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630}});
for(const c of CARDS){await p.setContent(html(c),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
await p.screenshot({path:`scripts/.og-out/og-${c[0]}.jpg`,type:'jpeg',quality:88});}
await b.close();console.log('ok');})();
