#!/usr/bin/env node
// Miniaturas de los lyric videos de Tacet Sin (Juan, 2026-11-05): una imagen abstracta por tema, generada con ChatGPT en la
// línea de la portada del volumen, con el nombre de la canción encima. La imagen va sin texto: el título se estampa acá con
// la tipografía del álbum, porque la IA deforma las letras. Nada de fútbol, igual que las portadas.
//
//   node scripts/beats/miniaturas-youtube.mjs [slug…]        → genera las que falten y arma las miniaturas
//   node scripts/beats/miniaturas-youtube.mjs --solo-texto [slug…]  → rehace solo el título sobre las imágenes ya generadas
//
// Salida: fuentes/musica/youtube/miniaturas/<slug>.png (imagen limpia) y vol-N/NN-slug-mini.jpg (1280x720, la que se sube).
// Requiere el Chrome con CDP (scripts/abrir-chrome-chatgpt.ps1). Cada chat se borra después de bajar la imagen.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { generateImage, currentChatId, deleteChatById } from '../generate-image-chatgpt.mjs';

loadEnv();
const OUT = path.join(ROOT, 'fuentes/musica/youtube');
const DIR = path.join(OUT, 'miniaturas'); fs.mkdirSync(DIR, { recursive: true });
const W = 1280, H = 720;

const COMUN = `Wide landscape image, 16:9, for a music video thumbnail. Purely ABSTRACT fine-art image in the same visual language as the attached album cover: narrow vertical strips of long-exposure light, cut and re-assembled out of order, on a near-black background with fine film grain, real photographic material texture. Keep the attached cover's palette and mood but make a NEW composition with a different arrangement of strips: do not copy the cover. Keep the lower-left third of the image darker and calm, because a title will be placed there later. No people, no faces, no hands, no figures or silhouettes, no recognizable objects, nothing related to sport. NO text, NO letters, NO numbers, NO logos, NO watermark anywhere.`;
const PALETA = { 1: 'Warm palette: black, amber, burnt gold, a touch of ivory.', 2: 'Cold palette: deep ink blue, steel, a thin line of pale silver; some strips slightly torn at the edges like paper.' };
// Un motivo por tema: la idea de la canción traducida a luz y materia, sin contar nada literal
const MOTIVOS = {
  'the-night-before': 'Sleeplessness before dawn: most strips nearly dark, and on the far right the first thin line of light starting to rise, as if morning were about to break.',
  'cold-hands': 'Cold becoming heat: strips on the left frosted and pale with crystalline texture, gradually turning to glowing ember toward the right.',
  'i-owe-you': 'A debt being repaid: two strips leaning toward each other across the image, one lending its light to the other, with a thin bright thread joining them.',
  'the-scar-remains': 'A wound that stays: one strip split by a jagged bright seam running top to bottom, its edges rough and healed over, the others dim around it.',
  'five-minutes': 'The last seconds: strips getting thinner and more tightly packed toward the right, accelerating like a countdown, with heavy motion blur.',
  'iron-sharpens-iron': 'Friction: two dense strips of dark metal texture pressing against each other in the center, sparks of molten light flying from where they meet.',
  'barefoot': 'Simple joy: rough sun-warmed texture like worn concrete in loose, uneven strips, playful spacing, soft golden daylight spilling through.',
  'empty-seat': 'Absence: a regular row of strips with one gap left completely empty near the center, a faint outline of light where something should be.',
  'silent-room': 'Heavy silence: very still, very dark, strips barely lit and perfectly vertical, one single strip faintly beginning to glow low down.',
  'waiting-my-turn': 'Waiting: many dim strips standing in line, and one set apart at the edge holding back an intense contained glow, like a fuse about to catch.',
  'no-sound-came-out': 'A scream with no sound: a burst of light expanding from the center through the strips like a shockwave, completely frozen and motionless.',
  'after-everyone-left': 'Alone after the lights go out: almost the whole image dark, a single narrow strip still lit far off to the right, with a long soft reflection under it.',
  'coming-back': 'Recovery: fractured dull strips at the left gradually joining, regaining their color and sharpness toward the right, until they are whole and bright.',
  'ten-steps': 'A narrowing path: ten strips of decreasing width and height converging toward a single bright point, everything else falling away into black.',
  'first-time': 'First exposure: over-exposed, a little dizzy, strips blown out with bright flares and soft focus at the edges, one strip starting to settle into sharpness.',
  'so-close': 'Almost: two strips of light nearly touching at the center, separated by the thinnest dark gap, with an echoing ghost of the same gap repeating beside it.',
  'rain': 'Rain: strips run through with long diagonal streaks and streaming water on glass, drops catching the pale silver light.',
  'mud': 'Dark earth: thick, heavy, wet strips of textured dark matter dragging downward, with a stubborn line of light pushing up through them.',
  'mirror': 'A reflection that changes: the strips are mirrored around a central vertical axis, but the reflected side is distorted and brighter, no longer matching.',
  'shadow': 'Light and shadow: one dominant bright strip, and beside it a long dark strip with a slowly emerging edge of light, stepping out from behind it.',
  'splinters': 'Shattered and rebuilt: strips broken into sharp shards along their length, reassembled with visible bright cracks, stronger where they were broken.',
  'before-the-sun': 'Before sunrise: deep ink-blue strips with a faint cold horizon glow low across all of them, the very last moment of night.',
  'scar': 'Healing: a torn paper strip with a long raw edge, mended by a thin line of pale silver light running through the tear.',
};
const SHORTS_VOL1 = 12;
const temas = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/letras.json'), 'utf8')).map((t, i) => ({ slug: t.slug, titulo: t.titulo, volumen: i < SHORTS_VOL1 ? 1 : 2, pista: i < SHORTS_VOL1 ? i + 1 : i - SHORTS_VOL1 + 1 }));

// El título, grande y legible aun chico, abajo a la izquierda, sobre un velo oscuro; el logo a la derecha
async function armar(t, browser) {
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const largo = t.titulo.length, tam = largo <= 10 ? 150 : largo <= 16 ? 124 : 100;
  await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700&display=swap" rel="stylesheet">
    <style>html,body{margin:0;background:transparent}#t{position:absolute;left:52px;right:150px;bottom:44px;font-family:'Barlow Condensed',sans-serif;color:#fff;text-transform:uppercase;text-shadow:0 2px 22px rgba(0,0,0,.7)}
    .c{font-weight:700;font-size:${tam}px;line-height:.92;letter-spacing:.005em}.a{font-weight:500;font-size:30px;letter-spacing:.3em;opacity:.86;margin-top:16px}</style></head>
    <body><div id="t"><div class="c">${t.titulo}</div><div class="a">Tacet Sin</div></div></body></html>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const texto = await p.screenshot({ omitBackground: true });
  await p.close();
  const velo = await sharp(Buffer.from(`<svg width="${W}" height="${H}"><defs><linearGradient id="a" x1="0" y1="1" x2="0.55" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".86"/><stop offset=".55" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#a)"/></svg>`)).png().toBuffer();
  const logo = await sharp(path.join(ROOT, 'logos/rebrand/Clean logo.png')).resize({ height: 62 }).png().toBuffer();
  const lm = await sharp(logo).metadata();
  const salida = path.join(OUT, `vol-${t.volumen}`, `${String(t.pista).padStart(2, '0')}-${t.slug}-mini.jpg`);
  await sharp(path.join(DIR, t.slug + '.png')).resize(W, H, { fit: 'cover', position: 'centre' })
    .composite([{ input: velo }, { input: texto }, { input: logo, left: W - lm.width - 44, top: H - lm.height - 40 }])
    .jpeg({ quality: 90, mozjpeg: true }).toFile(salida);
  console.log('miniatura', path.relative(ROOT, salida), `${(fs.statSync(salida).size / 1024).toFixed(0)} KB`);
}

const argv = process.argv.slice(2), soloTexto = argv.includes('--solo-texto'), pedidos = argv.filter(a => !a.startsWith('--'));
const elegidos = temas().filter(t => !pedidos.length || pedidos.includes(t.slug));
if (!soloTexto) {
  const b = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
  const page = await b.contexts()[0].newPage();
  page.setDefaultTimeout(2 * 60 * 1000);
  for (const t of elegidos) {
    const final = path.join(DIR, t.slug + '.png');
    if (fs.existsSync(final)) continue;
    if (!MOTIVOS[t.slug]) throw new Error('sin motivo: ' + t.slug);
    console.log(`\n=== ${t.titulo} ===`);
    try {
      const cover = path.join(ROOT, 'fuentes/musica/portadas', `the-shorts-${t.volumen}.png`);
      const prompt = `${COMUN}\n${PALETA[t.volumen]}\nIdea for this image: ${MOTIVOS[t.slug]}`;
      const { filename } = await generateImage(page, { id: `mini-${t.slug}` }, 'yt', prompt, { freshChat: true, excludeSrcs: [], attachments: [cover], excludeSizes: [[1254, 1254]] });
      fs.renameSync(path.join(ROOT, 'Renders/Daily News', filename), final);
    } catch (e) { console.error(`FALLÓ ${t.slug}:`, e.message.split('\n')[0]); }
    finally { const conv = currentChatId(page); if (conv) await deleteChatById(page, conv).catch(e => console.warn('  no se pudo borrar el chat:', e.message.split('\n')[0])); }
  }
  await page.close(); await b.close().catch(() => {});
}
const br = await chromium.launch();
for (const t of elegidos) if (fs.existsSync(path.join(DIR, t.slug + '.png'))) await armar(t, br);
await br.close();
process.exit(0);
