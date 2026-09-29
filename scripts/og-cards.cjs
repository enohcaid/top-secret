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
// Composición centrada: WhatsApp de escritorio recorta la placa a un CUADRADO del centro
// (x 285-915), así que escudo + título tienen que entrar ahí; la foto va de fondo.
const html=([id,kick,t1,t2,sub,img,pos,brand])=>`<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#0B0A07;overflow:hidden;font-family:Barlow,sans-serif;color:#F2EEE0;position:relative}
.ph{position:absolute;inset:0;background:url(${M+img}) ${pos}/cover no-repeat;filter:saturate(.8)}
.ph:after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 34% 62% at 50% 50%,rgba(11,10,7,.9),rgba(11,10,7,.72) 60%,rgba(11,10,7,.5) 100%)}
.glow{position:absolute;left:300px;top:-40px;width:600px;height:600px;background:radial-gradient(circle,rgba(200,168,75,.16),rgba(200,168,75,0) 65%)}
.tx{position:absolute;left:300px;width:600px;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.logo{height:150px;margin-bottom:26px;filter:drop-shadow(0 8px 24px rgba(0,0,0,.6))}
h1{font-weight:900;font-size:${brand?104:88}px;line-height:.9;letter-spacing:-.045em;white-space:nowrap}
h1 b{color:#C8A84B;font-weight:900}
h2{font-weight:300;font-size:${brand?44:38}px;letter-spacing:-.02em;margin-top:10px;white-space:nowrap}
.sub{font-family:'JetBrains Mono';font-weight:700;font-size:17px;letter-spacing:.14em;text-transform:uppercase;color:#C8A84B;margin-top:24px;white-space:nowrap}
.path{position:absolute;left:52px;top:44px;font-family:'JetBrains Mono';font-size:18px;color:rgba(242,238,224,.6);display:flex;align-items:center;gap:10px}
.path i{width:9px;height:9px;border-radius:50%;background:#3ECF8E;box-shadow:0 0 10px #3ECF8E}
.c{position:absolute;width:34px;height:34px;border-color:rgba(200,168,75,.5);border-style:solid;border-width:0}
.tl{top:26px;left:26px;border-top-width:2px;border-left-width:2px}.tr{top:26px;right:26px;border-top-width:2px;border-right-width:2px}
.bl{bottom:26px;left:26px;border-bottom-width:2px;border-left-width:2px}.br{bottom:26px;right:26px;border-bottom-width:2px;border-right-width:2px}
.id{position:absolute;right:52px;bottom:40px;font-family:'JetBrains Mono';font-size:15px;color:rgba(242,238,224,.55);letter-spacing:.1em}
</style></head><body><div class="ph"></div><div class="glow"></div>
<div class="path"><i></i>TSFC://archivo</div>
<div class="tx"><img class="logo" src="${M}logos/rebrand/clean-dorado.webp">
<h1>${brand?'<b>TOP</b> SECRET':t1}</h1><h2>${t2}</h2><div class="sub">${sub}</div></div>
<div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
<div class="id">DESCLASIFICADO</div>
<script>for(const el of document.querySelectorAll('.tx > *:not(img)')){let f=parseFloat(getComputedStyle(el).fontSize);while(el.scrollWidth>570&&f>12){f-=2;el.style.fontSize=f+'px';}}</script></body></html>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630}});
for(const c of CARDS){await p.setContent(html(c),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.evaluate(()=>{for(const el of document.querySelectorAll('.tx > *:not(img)')){let f=parseFloat(getComputedStyle(el).fontSize);while(el.scrollWidth>570&&f>12){f-=2;el.style.fontSize=f+'px';}}});await p.waitForTimeout(300);
await p.screenshot({path:`scripts/.og-out/og-${c[0]}.jpg`,type:'jpeg',quality:88});}
await b.close();console.log('ok');})();
