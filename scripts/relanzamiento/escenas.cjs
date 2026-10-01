// Escenas animadas propias del relanzamiento, renderizadas cuadro a cuadro (HTML + Web Animations,
// capturadas con Playwright a 30 fps, 1080x1920) → fuentes/relanzamiento/esc-<nombre>.mp4
//   node scripts/relanzamiento/escenas.cjs [nombre…]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const FF = require('ffmpeg-static');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'fuentes', 'relanzamiento'); fs.mkdirSync(OUT, { recursive: true });
const M = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const FPS = 30;
const b64 = f => 'data:image/' + (f.endsWith('.png') ? 'png' : 'webp') + ';base64,' + fs.readFileSync(f).toString('base64');
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;800;900&family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1080px;height:1920px;overflow:hidden;background:#0B0A07;color:#F2EEE0;font-family:Barlow,sans-serif;position:relative}
.mono{font-family:'JetBrains Mono'}.gold{color:#C8A84B}.abs{position:absolute}
.scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 2px,transparent 2px 5px);pointer-events:none;z-index:50}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 40%,rgba(0,0,0,.75));pointer-events:none;z-index:49}</style>`;

// Cada escena: { dur (s), html } — el html define animaciones con el.animate(...) dentro de window.setup().
const NOTICIAS = ['2026-07-23', '2026-07-31', 'auto-2026-08-14-entrevista', 'auto-2026-08-18', 'auto-2026-08-23', 'auto-2026-08-28', 'auto-2026-09-02', 'auto-2026-09-07']
  .map(n => path.join(ROOT, 'Renders', 'Daily News', n + '_post.webp')).filter(f => fs.existsSync(f));

const ESCENAS = {
  // 1. Acceso al archivo: texto que se tipea
  acceso: { dur: 3.6, html: `${HEAD}<div class="scan"></div><div class="vig"></div>
    <div class="abs mono" id="t" style="left:110px;top:760px;font-size:42px;line-height:1.7;white-space:pre"></div>
    <div class="abs" id="c" style="left:110px;top:760px;width:24px;height:52px;background:#C8A84B"></div>
    <script>window.setup=()=>{const L=['> ARCHIVO TSFC','> NIVEL: CLASIFICADO','> VERIFICANDO ACCESO...','> ACCESO CONCEDIDO'];
      const full=L.join('\\n');const t=document.getElementById('t'),c=document.getElementById('c');
      window.frame=(s)=>{const n=Math.min(full.length,Math.floor(s*30));const txt=full.slice(0,n);t.innerHTML=txt.replace('ACCESO CONCEDIDO','<span class="gold">ACCESO CONCEDIDO</span>');
        const lines=txt.split('\\n');const last=lines[lines.length-1];c.style.top=(760+(lines.length-1)*71.4+8)+'px';c.style.left=(110+last.length*25.3)+'px';c.style.opacity=(Math.floor(s*3)%2)?1:0.15;};}</script>` },

  // 2. El archivo en papel: fichas de noticias viejas que caen sobre la mesa
  papel: { dur: 4.2, html: `${HEAD}<div class="abs" style="inset:0;background:radial-gradient(circle at 50% 45%,#3a2c17,#120d07 70%)"></div>
    <div class="abs" style="inset:0;opacity:.35;background:repeating-linear-gradient(90deg,rgba(0,0,0,.25) 0 3px,transparent 3px 40px)"></div>
    ${NOTICIAS.map((f, i) => `<img class="abs card" data-i="${i}" src="${b64(f)}" style="width:760px;left:160px;top:${420 + (i % 3) * 30}px;box-shadow:0 30px 60px rgba(0,0,0,.6);opacity:0">`).join('')}
    <div class="abs mono gold" style="left:0;right:0;top:220px;text-align:center;font-size:30px;letter-spacing:.3em">ARCHIVO · 2026</div>
    <div class="abs" style="left:0;right:0;bottom:200px;text-align:center;font-weight:900;font-size:120px;letter-spacing:-.04em">En papel.</div>
    <div class="vig"></div>
    <script>window.setup=()=>{const cs=[...document.querySelectorAll('.card')];window.frame=(s)=>{cs.forEach((c,i)=>{const t0=0.15+i*0.42,k=Math.max(0,Math.min(1,(s-t0)/0.35));
      const e=1-Math.pow(1-k,3);const rot=((i*37)%17-8);c.style.opacity=k>0?1:0;c.style.transform='translate('+((1-e)*((i%2)?700:-700))+'px,'+((1-e)*-200)+'px) rotate('+(rot+(1-e)*20)+'deg) scale('+(1.15-0.15*e)+')';});};}</script>` },

  // 3. Digitalización: la ficha se pixela y se convierte en grilla digital
  digital: { dur: 2.4, html: `${HEAD}<canvas id="cv" width="1080" height="1920" class="abs" style="inset:0"></canvas><img id="src" src="${b64(NOTICIAS[NOTICIAS.length - 1])}" style="display:none">
    <div class="abs mono gold" id="lbl" style="left:0;right:0;top:1500px;text-align:center;font-size:34px;letter-spacing:.3em;opacity:0">DIGITALIZANDO ARCHIVO</div><div class="scan"></div>
    <script>window.setup=()=>{const cv=document.getElementById('cv'),x=cv.getContext('2d'),im=document.getElementById('src'),lbl=document.getElementById('lbl');
      window.frame=(s)=>{x.fillStyle='#0B0A07';x.fillRect(0,0,1080,1920);const k=Math.min(1,s/1.6);const W=760,H=W*im.naturalHeight/im.naturalWidth,X=160,Y=(1920-H)/2-80;
        const px=Math.max(1,Math.round(2+k*k*70));x.imageSmoothingEnabled=false;const tw=Math.max(1,Math.round(W/px)),th=Math.max(1,Math.round(H/px));
        const t=document.createElement('canvas');t.width=tw;t.height=th;const tx=t.getContext('2d');tx.drawImage(im,0,0,tw,th);
        x.globalAlpha=1-Math.max(0,(k-0.7)/0.3)*0.85;x.drawImage(t,X,Y,W,H);x.globalAlpha=1;
        x.strokeStyle='rgba(200,168,75,'+(0.15+k*0.6)+')';x.lineWidth=1;for(let i=0;i<=W;i+=px*2){x.beginPath();x.moveTo(X+i,Y);x.lineTo(X+i,Y+H);x.stroke();}for(let j=0;j<=H;j+=px*2){x.beginPath();x.moveTo(X,Y+j);x.lineTo(X+W,Y+j);x.stroke();}
        if(s>0.3&&s<2.0){for(let g=0;g<6;g++){const gy=(Math.sin(s*40+g*7)*0.5+0.5)*1920;x.fillStyle='rgba(200,168,75,.25)';x.fillRect(0,gy,1080,3+g%3*4);}}
        lbl.style.opacity=Math.min(1,s*2);lbl.textContent='DIGITALIZANDO ARCHIVO '+Math.min(100,Math.round(k*100))+'%';};}</script>` },

  // 4. Números del club (datos reales de seed_matches.js al 2026-10-01)
  numeros: { dur: 4.8, html: `${HEAD}<div class="scan"></div><div class="abs" style="inset:0;background:radial-gradient(circle at 50% 40%,#211a0c,#0B0A07 65%)"></div>
    <div class="abs mono" style="left:90px;top:300px;font-size:26px;color:rgba(242,238,224,.6)">TSFC://archivo/historial</div>
    ${[['PARTIDOS', 160], ['VICTORIAS', 75], ['GOLES', 303], ['LIGAS', 3]].map(([k, v], i) => `<div class="abs row" data-v="${v}" style="left:90px;right:90px;top:${470 + i * 300}px;border-top:2px solid rgba(200,168,75,.35);opacity:0">
      <div class="mono gold" style="font-size:28px;letter-spacing:.3em;margin-top:22px">${k}</div><div class="num" style="font-family:'Bebas Neue';font-size:200px;line-height:.95">0</div></div>`).join('')}
    <div class="vig"></div>
    <script>window.setup=()=>{const r=[...document.querySelectorAll('.row')];window.frame=(s)=>{r.forEach((e,i)=>{const t0=0.2+i*0.55,k=Math.max(0,Math.min(1,(s-t0)/1.1));const ee=1-Math.pow(1-k,3);
      e.style.opacity=Math.min(1,(s-t0)*4);e.style.transform='translateX('+((1-Math.min(1,(s-t0)*3))*-60)+'px)';e.querySelector('.num').textContent=Math.round(+e.dataset.v*ee);});};}</script>` },

  // 5. Leyenda: Lautavester7, 100 goles
  leyenda: { dur: 3.2, html: `${HEAD}<div class="abs" style="inset:0;background:radial-gradient(circle at 50% 35%,#2a2111,#0B0A07 65%)"></div>
    <img id="p" class="abs" src="${b64(path.join(ROOT, 'Renders', 'Lautavester7', 'Brazos4.png'))}" style="left:50%;top:230px;height:2000px;transform:translateX(-50%)">
    <div class="abs" style="left:0;right:0;bottom:0;height:760px;background:linear-gradient(0deg,#0B0A07 45%,rgba(11,10,7,0))"></div>
    <div class="abs mono gold" style="left:0;right:0;top:170px;text-align:center;font-size:28px;letter-spacing:.3em">ARCHIVO · MÁXIMO GOLEADOR</div>
    <div class="abs" id="n" style="left:0;right:0;bottom:430px;text-align:center;font-family:'Bebas Neue';font-size:300px;line-height:.85;color:#C8A84B">0</div>
    <div class="abs" style="left:0;right:0;bottom:330px;text-align:center;font-weight:900;font-size:70px;letter-spacing:-.02em">GOLES</div>
    <div class="abs" style="left:0;right:0;bottom:220px;text-align:center;font-weight:800;font-size:56px">Lautavester7</div><div class="scan"></div>
    <script>window.setup=()=>{const n=document.getElementById('n'),p=document.getElementById('p');window.frame=(s)=>{const k=Math.min(1,s/1.6);n.textContent=Math.round(100*(1-Math.pow(1-k,3)));p.style.transform='translateX(-50%) scale('+(1.06-s*0.02)+')';};}</script>` },
};

(async () => {
  const pedir = process.argv.slice(2); const lista = Object.keys(ESCENAS).filter(k => !pedir.length || pedir.includes(k));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const k of lista) {
    const { dur, html } = ESCENAS[k]; const dir = path.join(OUT, 'frames-' + k); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
    await p.evaluate(() => window.setup());
    const N = Math.round(dur * FPS);
    for (let i = 0; i < N; i++) { await p.evaluate(s => window.frame(s), i / FPS); await p.screenshot({ path: path.join(dir, String(i).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 92 }); }
    execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg'), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', path.join(OUT, `esc-${k}.mp4`)]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log('ok', k, N, 'cuadros');
  }
  await b.close();
})();
