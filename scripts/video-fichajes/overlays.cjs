const { chromium } = require('playwright');
const M='https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const P=require('./jugadores.json');
const FONTS=`<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">`;
const base=`*{margin:0;box-sizing:border-box}body{width:1080px;height:1920px;overflow:hidden;font-family:Barlow,sans-serif;color:#F2EEE0}
.mono{font-family:'JetBrains Mono',monospace}.gold{color:#C8A84B}
.c{position:absolute;width:46px;height:46px;border-color:rgba(200,168,75,.6);border-style:solid;border-width:0}
.tl{top:40px;left:40px;border-top-width:3px;border-left-width:3px}.tr{top:40px;right:40px;border-top-width:3px;border-right-width:3px}
.bl{bottom:40px;left:40px;border-bottom-width:3px;border-left-width:3px}.br{bottom:40px;right:40px;border-bottom-width:3px;border-right-width:3px}`;
const corners=`<div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>`;
const player=([k,n,pos],i)=>`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${base}
body{background:transparent}
.shade{position:absolute;left:0;right:0;bottom:0;height:760px;background:linear-gradient(0deg,rgba(7,6,5,.96) 0%,rgba(7,6,5,.8) 42%,rgba(7,6,5,0) 100%)}
.top{position:absolute;top:92px;left:84px;right:84px;display:flex;align-items:center;justify-content:space-between}
.path{font-size:26px;color:rgba(242,238,224,.75);display:flex;gap:14px;align-items:center}
.path i{width:12px;height:12px;border-radius:50%;background:#3ECF8E;box-shadow:0 0 12px #3ECF8E}
.logo{height:92px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.6))}
.tx{position:absolute;left:84px;right:84px;bottom:150px}
.k{font-size:30px;font-weight:700;letter-spacing:.2em}
h1{font-weight:900;font-size:128px;line-height:.92;letter-spacing:-.045em;margin:18px 0 22px;white-space:nowrap}
.meta{display:flex;align-items:center;gap:26px;font-size:40px;font-weight:300}
.num{font-weight:900;font-size:64px;color:#C8A84B;letter-spacing:-.03em}
.bar{width:2px;height:48px;background:rgba(242,238,224,.3)}
.cnt{position:absolute;right:84px;bottom:150px;font-size:26px;color:rgba(242,238,224,.55)}
</style></head><body><div class="shade"></div>${corners}
<div class="top"><div class="path mono"><i></i>TSFC://fichajes</div><img class="logo" src="${M}logos/rebrand/clean-dorado.webp"></div>
<div class="tx"><div class="k mono gold">NUEVO FICHAJE</div><h1>${k}</h1><div class="meta"><span class="num">#${n}</span><span class="bar"></span><span>${pos}</span></div></div>
<div class="cnt mono">${String(i+1).padStart(2,'0')}/${String(P.length).padStart(2,'0')}</div>
<script>const h=document.querySelector('h1');let f=128;while(h.scrollWidth>912&&f>60){f-=4;h.style.fontSize=f+'px'}</script></body></html>`;
const card=(inner)=>`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${base}
body{background:radial-gradient(circle at 50% 42%,#2a2111 0%,#0B0A07 62%);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.path{font-size:26px;color:rgba(242,238,224,.6);display:flex;gap:14px;align-items:center;position:absolute;top:92px;left:84px}
.path i{width:12px;height:12px;border-radius:50%;background:#3ECF8E;box-shadow:0 0 12px #3ECF8E}
</style></head><body>${corners}<div class="path mono"><i></i>TSFC://fichajes</div>${inner}</body></html>`;
const intro=card(`<img src="${M}logos/rebrand/clean-dorado.webp" style="height:230px;margin-bottom:70px;filter:drop-shadow(0 20px 50px rgba(0,0,0,.6))">
<div class="mono gold" style="font-size:32px;font-weight:700;letter-spacing:.22em">EXPEDIENTE DESCLASIFICADO</div>
<div style="font-weight:900;font-size:150px;line-height:.88;letter-spacing:-.05em;margin:30px 0 26px">Nuevos<br>fichajes</div>
<div style="font-weight:300;font-size:52px">Temporada 4</div>`);
const outro=card(`<img src="${M}logos/rebrand/badge-metal.webp" style="height:420px;margin-bottom:70px;filter:drop-shadow(0 20px 50px rgba(0,0,0,.6))">
<div style="font-weight:900;font-size:120px;line-height:.9;letter-spacing:-.05em">Bienvenidos</div>
<div class="mono gold" style="font-size:30px;font-weight:700;letter-spacing:.2em;margin-top:34px">TOP SECRET FC · T4</div>`);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
const shot=async(html,out,transp)=>{await p.setContent(html,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);await p.screenshot({path:out,omitBackground:!!transp});};
for(let i=0;i<P.length;i++) await shot(player(P[i],i),`fuentes/video-fichajes/ov-${P[i][0]}.png`,true);
await shot(intro,'fuentes/video-fichajes/intro.png');await shot(outro,'fuentes/video-fichajes/outro.png');
await b.close();console.log('ok');})();
