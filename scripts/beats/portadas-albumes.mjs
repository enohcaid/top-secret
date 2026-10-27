#!/usr/bin/env node
// Portadas de los álbumes de topsecret.ar/music, generadas con ChatGPT (Juan, 2026-10-26: "portadas abstractas, sin
// ninguna referencia al fútbol"). Sin texto en la imagen: el título lo pone la página. Cuadradas, para usar también
// como tapa en plataformas.
//
//   node scripts/beats/portadas-albumes.mjs [the-shorts-1 the-shorts-2 thrive]           → genera con ChatGPT y firma
//   node scripts/beats/portadas-albumes.mjs --solo-firma [id…]                         → solo re-firma los originales
//
// Salida: fuentes/musica/portadas/<id>.png (original) → R2 musica/portadas/<id>.webp (1400 px, público).
// Cada chat se borra después de bajar la imagen. Requiere el Chrome con CDP (scripts/abrir-chrome-chatgpt.ps1).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';
import { generateImage, currentChatId, deleteChatById } from '../generate-image-chatgpt.mjs';

loadEnv();
const OUT = path.join(ROOT, 'fuentes/musica/portadas');
fs.mkdirSync(OUT, { recursive: true });

const COMUN = `Square album cover, exactly 1:1 aspect ratio (1024x1024). Purely ABSTRACT fine-art image: no people, no faces, no hands, no objects that tell a literal story, and absolutely nothing related to sport or football (no balls, fields, lines of a pitch, stadiums, jerseys, trophies, nets). NO text, NO letters, NO numbers, NO logos, NO watermark anywhere. Gallery-quality, photographic material texture (real paint, ink, glass, paper, light), rich detail, intentional composition with negative space, looks like the cover of a serious contemporary album.`;

const PORTADAS = {
  'the-shorts-1': `${COMUN}
Album "The Shorts — Volume 1": a collection of short songs, each one a brief, intense moment (the night before something big, the effort nobody sees, a scar). Visual idea: brief exposures of light — several narrow vertical strips of warm amber and gold light, like fragments of a long-exposure photograph cut and re-assembled out of order, on a deep near-black background with fine film grain. Some strips sharp, some motion-blurred; one strip slightly brighter than the rest. Warm palette: black, amber, burnt gold, a touch of ivory. Calm but charged.`,
  'the-shorts-2': `${COMUN}
Album "The Shorts — Volume 2", the companion of Volume 1 (same visual language: narrow fragments of long-exposure light re-assembled out of order on a near-black background with film grain) but colder and later in the night: the strips are deep ink blue, steel and a single thin line of pale silver; a few strips are slightly torn at the edges like paper, as if the moments had been handled many times. Mood: memory, distance, rain on a window at 3 a.m. without showing any of those things literally.`,
  thrive: `${COMUN}
Album "Thrive": songs about love, passion, surrender and sacrifice — loving something that does not always do us good, and growing anyway. Visual idea: a single bloom of deep crimson ink spreading in dark water, its edges turning into fine dark strands that wrap around it like thorns made of the same ink — beautiful and wounding at the same time; one small area where the red becomes warm, almost glowing, like something still alive inside. Palette: black, oxblood, crimson, a whisper of warm rose light. Macro photography feel, high detail, lots of negative space around the bloom, slightly off-center.`,
};

// Firma de la tapa (Juan, 2026-10-26): el logo del artista (Tacet Sin = el Clean logo de Top Secret, blanco y chico)
// abajo a la derecha, y el artista y el disco abajo a la izquierda, chicos y translúcidos para no tapar la imagen.
// Se estampa sobre el original sin texto (fuentes/musica/portadas/<id>.png) → R2 musica/portadas/<id>.webp.
// Al volver a publicar una tapa, subir el ?v= de su URL en scripts/beats/catalogo.mjs (R2 tiene caché de un año).
const TEXTOS = { 'the-shorts-1': ['The Shorts', 'Vol. 1'], 'the-shorts-2': ['The Shorts', 'Vol. 2'], thrive: ['Thrive', null] };
const ARTISTA = 'Tacet Sin';
// El texto se dibuja en el navegador (Barlow Condensed, la tipografía del sitio) y se recorta con fondo transparente
async function firma(id, alto) {
  const [disco, vol] = TEXTOS[id] || [id, null];
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 900, height: 200 }, deviceScaleFactor: 2 });
  await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700&display=swap" rel="stylesheet">
    <style>html,body{margin:0;background:transparent}#f{display:inline-block;padding:6px;font-family:'Barlow Condensed',sans-serif;color:#fff;text-transform:uppercase;line-height:1;text-shadow:0 1px 6px rgba(0,0,0,.55)}
    .a{font-weight:700;font-size:${alto * 0.42}px;letter-spacing:.32em}.d{font-weight:500;font-size:${alto * 0.34}px;letter-spacing:.24em;opacity:.8;margin-top:${alto * 0.14}px}</style></head>
    <body><div id="f"><div class="a">${ARTISTA}</div><div class="d">${disco}${vol ? ' · ' + vol : ''}</div></div></body></html>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const png = await p.locator('#f').screenshot({ omitBackground: true });
  await b.close();
  const m = await sharp(png).metadata();
  return sharp(png).resize({ height: Math.round(m.height / 2) })
    .composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * 0.82)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }]).png().toBuffer();
}
async function publicar(id) {
  const png = path.join(OUT, `${id}.png`), webp = path.join(OUT, `${id}.webp`), LADO = 1400;
  const m = await sharp(png).metadata(), lado = Math.min(m.width, m.height);
  const altoLogo = Math.round(LADO * 0.075), margen = Math.round(LADO * 0.045);
  const logo = await sharp(path.join(ROOT, 'logos/rebrand/Clean logo.png')).resize({ height: altoLogo })
    .composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * 0.88)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: 'dest-in' }]).png().toBuffer();
  const lm = await sharp(logo).metadata();
  const sombra = await sharp(logo).ensureAlpha().tint({ r: 0, g: 0, b: 0 }).blur(6).png().toBuffer();
  const texto = await firma(id, Math.round(altoLogo * 0.62)), tm = await sharp(texto).metadata();
  await sharp(png).extract({ left: Math.floor((m.width - lado) / 2), top: Math.floor((m.height - lado) / 2), width: lado, height: lado })
    .resize(LADO, LADO)
    .composite([{ input: sombra, left: LADO - margen - lm.width + 2, top: LADO - margen - lm.height + 3, blend: 'multiply' },
                { input: logo, left: LADO - margen - lm.width, top: LADO - margen - lm.height },
                { input: texto, left: margen - 6, top: LADO - margen - tm.height + 6 }])
    .webp({ quality: 88 }).toFile(webp);
  await putFile(webp, `musica/portadas/${id}.webp`);
  console.log(`OK ${id} → R2 musica/portadas/${id}.webp`);
}

const pedidas = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ids = pedidas.length ? pedidas : Object.keys(PORTADAS);
if (process.argv.includes('--solo-firma')) { for (const id of ids) await publicar(id); process.exit(0); }
const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(2 * 60 * 1000);

for (const id of ids) {
  console.log(`\n=== ${id} ===`);
  try {
    const { filename } = await generateImage(page, { id: `portada-${id}` }, 'cuadrada', PORTADAS[id], { freshChat: true, excludeSrcs: [], attachments: [] });
    fs.renameSync(path.join(ROOT, 'Renders/Daily News', filename), path.join(OUT, `${id}.png`));
    await publicar(id);
  } catch (e) {
    console.error(`FALLÓ ${id}:`, e.message);
  } finally {
    const conv = currentChatId(page);
    if (conv) await deleteChatById(page, conv).catch(e => console.warn('  no se pudo borrar el chat:', e.message));
  }
}
await page.close();
await browser.close().catch(() => {});
