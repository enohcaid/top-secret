#!/usr/bin/env node
// Versiones para redes de la noticia del día: la foto de campaña + un título corto encima.
// En el sitio la foto va limpia (el título ya está al lado); acá se le suma el título
// solo donde la publicación no lleva un link con vista previa:
//   - <id>-ig.jpg        1080×1350  post de Instagram (feed): título abajo
//   - <id>-historia.jpg  1080×1920  historia de Instagram/Facebook: título + "link en la bio",
//                                   todo dentro de la zona que no tapa la interfaz de la app
// Facebook y X publican el link de la nota: su vista previa ya trae título → foto limpia.
//
//   node scripts/noticia-redes.mjs                 # borrador actual (Firestore news/draft)
//   node scripts/noticia-redes.mjs --id <id>       # noticia ya publicada
//   node scripts/noticia-redes.mjs --titulo "…"    # pisa el título de la imagen
//
// Título: draft.tituloImagen (lo escribe la rutina, 3–6 palabras); si no hay, la primera
// parte del título de la nota (antes de ':'). Los gamertags se escriben tal cual, en dorado.
// Salida: fuentes/redes/noticias/.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { RAW_DIR, PLAYER_TRAITS } from './generate-image-chatgpt.mjs';

const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const FS_DRAFT = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
const OUT_DIR = path.resolve('fuentes/redes/noticias');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

async function cargarNoticia(id) {
  if (id) {
    const { articles } = await (await fetch(`${WORKER}/published-noticias`)).json();
    const n = articles.find(a => a.id === id);
    if (n) return n;
  }
  const doc = await (await fetch(FS_DRAFT)).json();
  const d = JSON.parse(doc.fields?.data?.stringValue || 'null');
  if (!d || (id && d.id !== id)) throw new Error(`No encontré la noticia ${id || '(borrador)'}`);
  return d;
}

export function tituloCorto(n) {
  if (n.tituloImagen) return n.tituloImagen.trim();
  const t = n.title.split(/[:—|]/)[0].trim();
  const pal = t.split(/\s+/);
  return pal.length <= 7 ? t : pal.slice(0, 6).join(' ');
}

// Mayúsculas para el título, pero los gamertags tal cual (regla del club) y en dorado.
function tituloHtml(t) {
  const gts = Object.keys(PLAYER_TRAITS).sort((a, b) => b.length - a.length);
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const re = new RegExp(`(${gts.map(g => g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return t.split(re).map(part => {
    const gt = gts.find(g => g.toLowerCase() === part.toLowerCase());
    return gt ? `<span class="gt">${esc(gt)}</span>` : esc(part.toUpperCase());
  }).join('');
}

function fechaCorta(n) {
  const [y, m, d] = (n.date || '').split('-');
  return d ? `${d}.${m}` : '';
}

// Foto de base: la copia sin escudo si está; si no, la publicada (que ya trae el escudo
// en una esquina, y entonces el bloque del título no suma otro).
async function fotoBase(url) {
  const nombre = decodeURIComponent(url.split('/').pop().split('?')[0]);
  const raw = path.join(RAW_DIR, nombre);
  if (fs.existsSync(raw)) return { file: raw, conEscudo: false };
  const local = path.resolve('Renders/Daily News', nombre);
  if (fs.existsSync(local)) return { file: local, conEscudo: true };
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const tmp = path.join(OUT_DIR, `_base-${nombre}`);
  fs.writeFileSync(tmp, buf);
  return { file: tmp, conEscudo: true };
}

function html({ W, H, foto, titulo, kicker, historia, escudo }) {
  // Historia: el bloque de texto termina por encima del 20% inferior (barra de respuesta de IG).
  const bottom = historia ? Math.round(H * 0.20) + 40 : 84;
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#0a0a0a;font-family:'Barlow Condensed',sans-serif;color:#f4f1ea}
.foto{position:absolute;inset:0;background:url('${foto}') center/cover no-repeat}
.scrim{position:absolute;left:0;right:0;bottom:0;height:${historia ? 62 : 58}%;background:linear-gradient(to top,rgba(5,5,5,.94) 0%,rgba(5,5,5,.78) ${historia ? 42 : 34}%,rgba(5,5,5,0) 100%)}
.txt{position:absolute;left:68px;right:68px;bottom:${bottom}px}
.escudo{display:block;height:${historia ? 84 : 76}px;margin-bottom:26px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))}
.barra{width:72px;height:6px;background:#c9a84c;margin-bottom:22px}
.kicker{font-weight:800;font-size:30px;letter-spacing:8px;color:#c9a84c;margin-bottom:14px}
h1{font-weight:900;font-size:${historia ? 124 : 112}px;line-height:.9;letter-spacing:.5px;text-wrap:balance}
h1 .gt{color:#c9a84c}
.pie{margin-top:30px;font-weight:600;font-size:30px;letter-spacing:6px;color:rgba(244,241,234,.8)}
</style></head><body>
<div class="foto"></div><div class="scrim"></div>
<div class="txt">${escudo ? `<img class="escudo" src="${escudo}">` : ''}<div class="barra"></div><div class="kicker">${kicker}</div><h1>${titulo}</h1>
${historia ? '<div class="pie">NOTA COMPLETA · LINK EN LA BIO</div>' : ''}</div>
</body></html>`;
}

export async function generarPiezas(n, { titulo } = {}) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const t = tituloHtml(titulo || tituloCorto(n));
  const kicker = [n.category, fechaCorta(n)].filter(Boolean).join(' · ').toUpperCase();
  const piezas = [
    { tipo: 'ig', W: 1080, H: 1350, src: n.imagePost || n.image, historia: false },
    { tipo: 'historia', W: 1080, H: 1920, src: n.imageStory || n.imagePost || n.image, historia: true },
  ];
  // El escudo va dentro del bloque del título (firma de la pieza): no compite con la foto.
  const escudo = 'data:image/png;base64,' + (await sharp(path.resolve('logos/rebrand/Clean logo.png')).resize({ height: 200 }).png().toBuffer()).toString('base64');
  const browser = await chromium.launch();
  const out = {};
  try {
    for (const p of piezas) {
      const base = await fotoBase(p.src);
      const foto = 'data:image/jpeg;base64,' + (await sharp(base.file).resize(p.W, p.H, { fit: 'cover', position: 'attention' }).jpeg({ quality: 92 }).toBuffer()).toString('base64');
      const page = await browser.newPage({ viewport: { width: p.W, height: p.H } });
      await page.setContent(html({ ...p, foto, titulo: t, kicker, escudo: base.conEscudo ? null : escudo }), { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const png = path.join(OUT_DIR, `${n.id}-${p.tipo}.png`);
      await page.screenshot({ path: png });
      await page.close();
      const jpg = png.replace(/\.png$/, '.jpg');
      await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toFile(jpg);
      fs.unlinkSync(png);
      if (base.file.includes('_base-')) fs.unlinkSync(base.file);
      out[p.tipo] = jpg;
      console.log(`  ${p.tipo}: ${path.relative(process.cwd(), jpg)}`);
    }
  } finally {
    await browser.close();
  }
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('noticia-redes.mjs')) {
  const n = await cargarNoticia(arg('--id'));
  console.log(`Noticia: ${n.id} — título de imagen: "${arg('--titulo') || tituloCorto(n)}"`);
  await generarPiezas(n, { titulo: arg('--titulo') });
}
