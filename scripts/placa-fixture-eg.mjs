// Placa del fixture de Espacio Gamer (T4) para la noticia y redes.
// Datos: Firestore calendario/estado.custom (league '11x11' desde T4_CUTOFF) — lo que ve el sitio.
// Escudos: E11_T4_BADGES de calendario.html (los reales de espaciogamer.cl).
// Renderiza HTML con Playwright (fuentes de Google) y guarda PNG + WebP en logos/.
//   node scripts/placa-fixture-eg.mjs            → logos/Fixture Espacio Gamer T4.{png,webp}
//   node scripts/placa-fixture-eg.mjs --subir    → además sube el .webp a R2
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const SUBIR = process.argv.includes('--subir');
const OUT = path.resolve('logos/Fixture Espacio Gamer T4');
const DOC = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado';
const T4_CUTOFF = '2026-09-28';

const val = x => x == null ? x : 'stringValue' in x ? x.stringValue : 'booleanValue' in x ? x.booleanValue
  : 'integerValue' in x ? +x.integerValue : 'mapValue' in x ? Object.fromEntries(Object.entries(x.mapValue.fields || {}).map(([k, v]) => [k, val(v)])) : null;
const doc = await (await fetch(DOC)).json();
const partidos = (doc.fields?.custom?.arrayValue?.values || []).map(val)
  .filter(m => m.league === '11x11' && m.date > T4_CUTOFF && /^Fecha \d+/.test(m.instancia || ''))
  .sort((a, b) => parseInt(a.instancia.slice(6)) - parseInt(b.instancia.slice(6)));
if (!partidos.length) throw new Error('No hay partidos de Espacio Gamer en calendario/estado.custom');

const cal = fs.readFileSync('calendario.html', 'utf8');
const bloque = cal.match(/const E11_T4_BADGES = \{([\s\S]*?)\};/)[1];
const BADGES = Object.fromEntries([...bloque.matchAll(/'([^']+)':\s*'(https?:[^']+)'/g)].map(m => [m[1], m[2]]));

// Escudos embebidos (data URI) para que el screenshot no dependa de la carga remota.
async function dataUri(src, { sinFondo = false } = {}) {
  let buf = /^https?:/.test(src) ? Buffer.from(await (await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0' } })).arrayBuffer()) : fs.readFileSync(src);
  if (sinFondo) buf = await quitarFondoClaro(buf);
  const png = await sharp(buf).trim({ threshold: 1 }).resize(220, 220, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return 'data:image/png;base64,' + png.toString('base64');
}

// Escudos subidos a EG con fondo blanco (o casi): se vacía el fondo claro que toca el borde (relleno desde
// los bordes), así el blanco de adentro del escudo queda. El borde de transición se suaviza con alfa parcial.
async function quitarFondoClaro(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Pasa por lo transparente: varios vienen con margen transparente y el recuadro blanco adentro.
  const claro = i => data[i + 3] < 20 || Math.min(data[i], data[i + 1], data[i + 2]) > 220;
  const visto = new Uint8Array(w * h), pila = [];
  for (let x = 0; x < w; x++) pila.push(x, x + (h - 1) * w);
  for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
  while (pila.length) {
    const p = pila.pop();
    if (visto[p] || !claro(p * 4)) continue;
    visto[p] = 1; data[p * 4 + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) pila.push(p - 1); if (x < w - 1) pila.push(p + 1);
    if (y > 0) pila.push(p - w); if (y < h - 1) pila.push(p + w);
  }
  // Halo: píxeles opacos pegados al fondo borrado y todavía claritos → alfa según cuán claros son.
  for (let p = 0; p < w * h; p++) {
    if (visto[p]) continue;
    const x = p % w, y = (p / w) | 0;
    const vecino = (x > 0 && visto[p - 1]) || (x < w - 1 && visto[p + 1]) || (y > 0 && visto[p - w]) || (y < h - 1 && visto[p + w]);
    if (!vecino) continue;
    const m = Math.min(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
    if (m > 170) data[p * 4 + 3] = Math.round(data[p * 4 + 3] * (255 - m) / 85);
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}
// Fondo blanco/claro que se borra (los nombres son los de EG).
const FONDO_CLARO = new Set(['Suda eSports', 'MONOTRIBUTISTAS', 'IACC Reserva']);
for (const p of partidos) {
  if (!BADGES[p.rival]) throw new Error(`Sin escudo para ${p.rival} en E11_T4_BADGES`);
  p.badge = await dataUri(BADGES[p.rival], { sinFondo: FONDO_CLARO.has(p.rival) });
}
const crest = await dataUri('logos/rebrand/badge-dorado.webp');
const egLogo = await dataUri('logos/Espacio Gamer logo.png');

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fechaTxt = d => { const [y, m, dd] = d.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, dd)); return `${DIAS[dt.getUTCDay()]} ${dd} ${MESES[m - 1]}`; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const fila = p => `
  <div class="row">
    <div class="j">F${p.instancia.slice(6)}</div>
    <img class="b" src="${p.badge}">
    <div class="info">
      <div class="rv">${esc(p.rival)}</div>
      <div class="dt">${fechaTxt(p.date)}</div>
      <div class="foot"><span class="tag ${p.isHome ? 'l' : 'v'}">${p.isHome ? 'LOCAL' : 'VISITA'}</span><span class="hr">${p.time}</span></div>
    </div>
  </div>`;
// Grilla simétrica: dos columnas iguales; si la cantidad es impar, la última fecha va centrada abajo.
const mitad = Math.floor(partidos.length / 2);
const col1 = partidos.slice(0, mitad), col2 = partidos.slice(mitad, mitad * 2), sola = partidos.slice(mitad * 2);
const primera = partidos[0].date, ultima = partidos.at(-1).date;
const rango = `${+primera.slice(8)}/${+primera.slice(5, 7)} — ${+ultima.slice(8)}/${+ultima.slice(5, 7)}`;

const W = 1080, H = 1620;
// PW = ancho del lienzo: 1080 para la placa 2:3; 1296 para la versión 4:5 (misma placa centrada, fondo completo).
const html = PW => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#0B0A07; --card:#13110B; --line:rgba(200,168,75,.28); --gold:#C8A84B; --ink:#F2EEE0; --mute:#9C9682; --win:#3ecf8e; --away:#4a9eff; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { width:${PW}px; height:${H}px; background:var(--bg); color:var(--ink); font-family:'Barlow Condensed',sans-serif; overflow:hidden; position:relative; }
  body::before { content:''; position:absolute; inset:0; background:
      radial-gradient(900px 520px at 50% -8%, rgba(200,168,75,.16), transparent 70%),
      radial-gradient(600px 400px at 100% 100%, rgba(200,168,75,.07), transparent 70%); }
  .frame { position:relative; width:${W}px; height:${H}px; margin:0 auto; }
  .wrap { position:relative; padding:56px 52px 0; }
  header { display:grid; grid-template-columns:150px 1fr 150px; align-items:center; gap:18px; }
  header img { width:150px; height:150px; object-fit:contain; }
  .tt { text-align:center; }
  .tt h1 { font-family:'Bebas Neue'; font-size:112px; line-height:.9; letter-spacing:2px; }
  .tt .sub { margin-top:12px; font-weight:600; font-size:27px; letter-spacing:7px; color:var(--gold); text-transform:uppercase; }
  .meta { display:flex; justify-content:center; gap:34px; margin-top:26px; font-size:24px; font-weight:600; letter-spacing:3px; text-transform:uppercase; color:var(--mute); }
  .meta b { color:var(--ink); font-weight:700; }
  .rule { height:2px; margin:28px 0 30px; background:linear-gradient(90deg, transparent, var(--gold), transparent); }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:0 22px; }
  .col { display:flex; flex-direction:column; gap:12px; }
  .sola { width:calc(50% - 11px); margin:12px auto 0; }
  .row { display:grid; grid-template-columns:70px 82px 1fr; align-items:center; gap:14px; height:105px; padding:0 18px 0 12px;
         background:var(--card); border:1px solid var(--line); border-radius:10px; }
  .j { font-family:'Bebas Neue'; font-size:40px; color:var(--gold); text-align:center; border-right:1px solid var(--line); line-height:1; padding:6px 0; }
  .b { width:78px; height:78px; object-fit:contain; }
  .info { min-width:0; }
  .rv { font-size:29px; font-weight:700; line-height:1.05; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .dt { font-size:22px; color:var(--mute); font-weight:500; margin-top:2px; }
  .foot { display:flex; justify-content:space-between; align-items:center; margin-top:5px; }
  .tag { font-size:17px; font-weight:700; letter-spacing:2px; padding:1px 10px; border-radius:4px; }
  .tag.l { color:var(--win); border:1px solid rgba(62,207,142,.5); background:rgba(62,207,142,.08); }
  .tag.v { color:var(--away); border:1px solid rgba(74,158,255,.5); background:rgba(74,158,255,.08); }
  .hr { font-family:'Bebas Neue'; font-size:31px; letter-spacing:1px; }
  footer { position:absolute; left:52px; right:52px; bottom:40px; display:flex; justify-content:space-between; font-size:22px; letter-spacing:3px; color:var(--mute); font-weight:600; text-transform:uppercase; }
  footer span:last-child { color:var(--gold); }
</style></head><body><div class="frame"><div class="wrap">
  <header>
    <img src="${crest}">
    <div class="tt"><h1>TOP SECRET FC</h1><div class="sub">Fixture · Temporada 4</div></div>
    <img src="${egLogo}">
  </header>
  <div class="meta"><span><b>Espacio Gamer</b></span><span>${partidos.length} fechas</span><span>${rango}</span><span>Mar y Jue</span></div>
  <div class="rule"></div>
  <div class="grid"><div class="col">${col1.map(fila).join('')}</div><div class="col">${col2.map(fila).join('')}</div></div>
  ${sola.length ? `<div class="sola">${sola.map(fila).join('')}</div>` : ''}
</div>
<footer><span>topsecret.ar</span><span>Top Secret FC · 2026</span></footer>
</div></body></html>`;

const browser = await chromium.launch();
async function render(PW, file) {
  const page = await browser.newPage({ viewport: { width: PW, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html(PW), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await page.close();
}
await render(W, OUT + '.png');
await render(Math.round(H * 4 / 5), OUT + ' 4x5.png');
await browser.close();
await sharp(OUT + '.png').webp({ quality: 88 }).toFile(OUT + '.webp');
// Versión 4:5 en JPEG para redes (carrusel de Instagram: misma proporción que el post y solo JPEG).
await sharp(OUT + ' 4x5.png').resize(1080, 1350).jpeg({ quality: 92 }).toFile(OUT + ' 4x5.jpg');
fs.unlinkSync(OUT + ' 4x5.png');
console.log('Placa:', OUT + '.png', '+ .webp + 4x5.jpg');

if (SUBIR) {
  const { execFileSync } = await import('node:child_process');
  for (const ext of ['.png', '.webp', ' 4x5.jpg'])
    execFileSync('node', ['scripts/r2.mjs', 'put', OUT + ext, 'logos/Fixture Espacio Gamer T4' + ext], { stdio: 'inherit' });
}
