#!/usr/bin/env node
// Portadas de los álbumes de topsecret.ar/music, generadas con ChatGPT (Juan, 2026-10-26: "portadas abstractas, sin
// ninguna referencia al fútbol"). Sin texto en la imagen: el título lo pone la página. Cuadradas, para usar también
// como tapa en plataformas.
//
//   node scripts/beats/portadas-albumes.mjs [the-shorts-1 the-shorts-2 thrive]
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

const pedidas = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ids = pedidas.length ? pedidas : Object.keys(PORTADAS);
const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(2 * 60 * 1000);

for (const id of ids) {
  console.log(`\n=== ${id} ===`);
  try {
    const { filename } = await generateImage(page, { id: `portada-${id}` }, 'cuadrada', PORTADAS[id], { freshChat: true, excludeSrcs: [], attachments: [] });
    const png = path.join(OUT, `${id}.png`);
    fs.renameSync(path.join(ROOT, 'Renders/Daily News', filename), png);
    const webp = path.join(OUT, `${id}.webp`);
    const m = await sharp(png).metadata();
    const lado = Math.min(m.width, m.height);         // por si no vino cuadrada: recorte centrado
    await sharp(png).extract({ left: Math.floor((m.width - lado) / 2), top: Math.floor((m.height - lado) / 2), width: lado, height: lado })
      .resize(1400, 1400).webp({ quality: 88 }).toFile(webp);
    await putFile(webp, `musica/portadas/${id}.webp`);
    console.log(`OK ${png} (${m.width}x${m.height}) → R2 musica/portadas/${id}.webp`);
  } catch (e) {
    console.error(`FALLÓ ${id}:`, e.message);
  } finally {
    const conv = currentChatId(page);
    if (conv) await deleteChatById(page, conv).catch(e => console.warn('  no se pudo borrar el chat:', e.message));
  }
}
await page.close();
await browser.close().catch(() => {});
