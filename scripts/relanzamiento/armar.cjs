// Reel del relanzamiento "Expediente Top Secret: desclasificado" (1080x1920, ~45 s, sin audio).
//   node scripts/relanzamiento/armar.cjs
// Insumos en fuentes/relanzamiento/: clip-archivo/sala/estadio.mp4 (Canva), esc-*.mp4 (escenas.cjs),
// y fuentes/nueva-era/kits.mp4 + goles.mp4. Ver README.md. Sin fichajes no anunciados.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const FF = require('ffmpeg-static');
const ROOT = path.resolve(__dirname, '..', '..');
const R = path.join(ROOT, 'fuentes', 'relanzamiento'); const T = path.join(R, 'tmp'); fs.mkdirSync(T, { recursive: true });
const NE = path.join(ROOT, 'fuentes', 'nueva-era');
const M = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;500;800;900&family=Bebas+Neue&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet"><style>*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:Barlow,sans-serif;color:#F2EEE0;background:transparent;position:relative}
.c{position:absolute;left:0;right:0;text-align:center}.h{font-weight:900;letter-spacing:-.045em;line-height:.92}
.mono{font-family:'JetBrains Mono';font-weight:700;letter-spacing:.26em;color:#C8A84B}
.sb{position:absolute;left:0;right:0;bottom:0;height:760px;background:linear-gradient(0deg,rgba(7,6,5,.95) 30%,rgba(7,6,5,0))}
.st{position:absolute;left:0;right:0;top:0;height:620px;background:linear-gradient(180deg,rgba(7,6,5,.92) 35%,rgba(7,6,5,0))}</style>`;
const pg = (body, bg) => `<!doctype html><html><head><meta charset="utf-8">${HEAD}</head><body style="${bg ? 'background:' + bg : ''}">${body}</body></html>`;
const BG = 'radial-gradient(circle at 50% 42%,#2a2111 0%,#0B0A07 62%)';
const OV = {
  o_archivo: pg(`<div class="sb"></div><div class="c mono" style="bottom:420px;font-size:28px">MARZO 2026</div><div class="c h" style="bottom:200px;font-size:120px">Todo empezó<br>en un archivo.</div>`),
  o_sala: pg(`<div class="sb"></div><div class="c mono" style="bottom:420px;font-size:28px">SEPTIEMBRE 2026</div><div class="c h" style="bottom:200px;font-size:120px">El archivo<br>se informatizó.</div>`),
  t_esencia: pg(`<div class="c" style="top:460px"><img src="${M}logos/rebrand/badge-metal.webp" style="height:660px;filter:drop-shadow(0 30px 80px rgba(0,0,0,.6))"></div>
    <div class="c h" style="top:1250px;font-size:100px">Misma esencia.</div><div class="c h" style="top:1360px;font-size:100px;color:#C8A84B">Otra presencia.</div>`, BG),
  o_kits: pg(`<div class="sb"></div><div class="c mono" style="bottom:420px;font-size:28px">TEMPORADA 4</div><div class="c h" style="bottom:200px;font-size:120px">Tres camisetas.<br>Un espía.</div>`),
  o_vestuario: pg(`<div class="st"></div><div class="c mono" style="top:150px;font-size:28px">EXPEDIENTE ABIERTO</div><div class="c h" style="top:220px;font-size:110px">Listos para salir.</div>`),
  t_goles: pg(`<div class="c mono" style="top:170px;font-size:30px">AHORA EN</div><div class="c h" style="top:230px;font-size:140px">EA FC 27</div>
    <div style="position:absolute;left:60px;top:470px;font-weight:800;font-size:40px"><span style="font-family:'Bebas Neue';color:#C8A84B;font-size:56px">6</span> Juan_Martinez4 <span style="font-weight:500;color:rgba(242,238,224,.6)">· vs Olimpo</span></div>
    <div style="position:absolute;left:60px;top:1160px;font-weight:800;font-size:40px"><span style="font-family:'Bebas Neue';color:#C8A84B;font-size:56px">8</span> Huber236 <span style="font-weight:500;color:rgba(242,238,224,.6)">· vs Olimpo</span></div>`, BG),
  o_goles: pg(`<div class="st"></div><div class="c mono" style="top:150px;font-size:28px">AHORA EN</div><div class="c h" style="top:220px;font-size:130px">EA FC 27</div>`),
  o_estadio: pg(`<div class="sb" style="height:900px"></div><div class="c mono" style="bottom:640px;font-size:30px">EXPEDIENTE DESCLASIFICADO</div>
    <div class="c h" style="bottom:400px;font-size:132px">La nueva era<br>empieza ahora.</div>
    <div class="c" style="bottom:170px;font-family:'JetBrains Mono';font-size:30px;line-height:1.7;color:rgba(242,238,224,.85)">@fctopsecret · twitch.tv/topsecretfc</div>`),
  t_fin: pg(`<div class="c" style="top:620px"><img src="${M}logos/rebrand/clean-dorado.webp" style="height:420px;filter:drop-shadow(0 30px 80px rgba(200,168,75,.3))"></div>
    <div class="c h" style="top:1120px;font-size:150px">TOP SECRET</div><div class="c mono" style="top:1290px;font-size:30px">FOOTBALL CLUB</div>`, BG),
};

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const [k, h] of Object.entries(OV)) { await p.setContent(h, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250); await p.screenshot({ path: path.join(T, k + '.png'), omitBackground: k.startsWith('o_') }); }
  await b.close();

  const X = 0.35, inputs = [], f = [], durs = [], L = []; let n = 0, s = 0;
  const add = a => { inputs.push(...a); return n++; };
  const push = (d, chain) => { const lab = 's' + (s++); durs.push(d); L.push(lab); f.push(`${chain},trim=duration=${d},setpts=PTS-STARTPTS,fps=30,format=yuv420p,setsar=1[${lab}]`); };
  const vid = (file, ss, d, ov, fill = true) => {
    const v = add(['-ss', String(ss), '-t', String(d + X), '-i', file]);
    let c = fill ? `[${v}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920` : `[${v}:v]split[a${v}][b${v}];[a${v}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.25[bg${v}];[b${v}]scale=1080:-2[fg${v}];[bg${v}][fg${v}]overlay=(W-w)/2:(H-h)/2`;
    if (ov) { const o = add(['-loop', '1', '-t', String(d + X), '-i', path.join(T, ov + '.png')]); c += `[m${v}];[m${v}][${o}:v]overlay=0:0`; }
    return c;
  };
  const still = (img, d, z = 0.0007, ov) => { const i = add(['-loop', '1', '-t', String(d + X), '-i', img]);
    let c = `[${i}:v]scale=1188:2112:force_original_aspect_ratio=increase,crop=1188:2112,zoompan=z='min(zoom+${z},1.12)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`;
    if (ov) { const o = add(['-loop', '1', '-t', String(d + X), '-i', path.join(T, ov + '.png')]); c += `[z${i}];[z${i}][${o}:v]overlay=0:0`; }
    return c; };

  push(3.4, vid(path.join(R, 'esc-acceso.mp4'), 0.1, 3.4));                          // 1 acceso al archivo
  push(4.6, vid(path.join(R, 'clip-archivo.mp4'), 0.2, 4.6, 'o_archivo'));            // 2 el espía en el archivo de papel
  push(3.9, vid(path.join(R, 'esc-papel.mp4'), 0.3, 3.9));                            // 3 las noticias viejas en papel
  push(2.2, vid(path.join(R, 'esc-digital.mp4'), 0.1, 2.2));                          // 4 digitalización
  push(2.5, vid(path.join(R, 'clip-sala.mp4'), 0.0, 2.5, 'o_sala'));                  // 5 la sala digital
  push(4.6, vid(path.join(R, 'esc-numeros.mp4'), 0.1, 4.6));                          // 6 160 / 75 / 303 / 3
  push(3.0, vid(path.join(R, 'esc-leyenda.mp4'), 0.1, 3.0));                          // 7 Lautavester7, 100 goles
  push(3.0, still(path.join(T, 't_esencia.png'), 3.0, 0.0008));                        // 8 identidad
  { // 9 camisetas T4: paneo de izquierda a derecha para que se vean las tres
    const d = 4.2, v = add(['-ss', '0.2', '-t', String(d + X), '-i', path.join(NE, 'kits.mp4')]); const o = add(['-loop', '1', '-t', String(d + X), '-i', path.join(T, 'o_kits.png')]);
    push(d, `[${v}:v]scale=-2:1920,crop=1080:1920:x='(iw-1080)*min(1,t/${d})':y=0[kp];[kp][${o}:v]overlay=0:0`);
  }
  push(3.2, still(path.join(ROOT, 'logos', 'nosotros', 'vestuario-kits.png'), 3.2, 0.0009, 'o_vestuario')); // 10 vestuario
  { // 11 dos goles reales (FC27), recortados hacia la jugada y apilados
    const d = 4.2, bg = add(['-loop', '1', '-t', String(d + X), '-i', path.join(T, 't_goles.png')]);
    const g1 = add(['-ss', '13.0', '-t', String(d + X), '-i', path.join(NE, 'goles.mp4')]); const g2 = add(['-ss', '37.6', '-t', String(d + X), '-i', path.join(NE, 'goles.mp4')]);
    push(d, `[${g1}:v]crop=729:410:x='400+70*min(1,t/${d})':y=190,scale=1080:608[ga];[${g2}:v]crop=729:410:x='350-290*min(1,t/${d})':y=190,scale=1080:608[gb];[${bg}:v]scale=1080:1920,setsar=1[gbg];[gbg][ga]overlay=0:540[g1o];[g1o][gb]overlay=0:1230`);
  }
  push(5.0, vid(path.join(R, 'clip-estadio.mp4'), 0.0, 5.0, 'o_estadio'));            // 12 estadio: la nueva era
  push(2.6, still(path.join(T, 't_fin.png'), 2.6, 0.0006));                            // 13 cierre

  let prev = L[0], t = durs[0];
  for (let k = 1; k < L.length; k++) {
    const out = k === L.length - 1 ? 'vo' : 'x' + k;
    const tr = [4].includes(k) ? 'pixelize' : k === 3 ? 'fadeblack' : 'fade';
    f.push(`[${prev}][${L[k]}]xfade=transition=${tr}:duration=${X}:offset=${(t - X).toFixed(3)}[${out}]`); t += durs[k] - X; prev = out;
  }
  f.push(`[vo]fade=t=in:st=0:d=0.4,fade=t=out:st=${(t - 0.6).toFixed(2)}:d=0.6[vf]`);
  const out = path.join(R, 'relanzamiento-t4.mp4');
  execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', f.join(';'), '-map', '[vf]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('ok', out, t.toFixed(1) + ' s');
})();
