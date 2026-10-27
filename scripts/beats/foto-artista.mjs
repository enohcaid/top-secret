#!/usr/bin/env node
// Foto de perfil del artista Tacet Sin (Juan, 2026-10-26: "el logo Clean en versión realista, una persona real, formato
// foto de perfil; para Spotify"). ChatGPT con el Clean logo adjunto como referencia; sin texto.
//
//   node scripts/beats/foto-artista.mjs [variante]
// Salida: fuentes/musica/artista/perfil[-variante].png → R2 musica/artista/perfil[-variante].jpg (3000x3000, lo que
// pide Spotify para la imagen de artista: cuadrada, mínimo 750 px). Requiere el Chrome con CDP (abrir-chrome-chatgpt.ps1).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';
import { generateImage, currentChatId, deleteChatById, closeHungTabs } from '../generate-image-chatgpt.mjs';

loadEnv();
const OUT = path.join(ROOT, 'fuentes/musica/artista');
fs.mkdirSync(OUT, { recursive: true });
const variante = process.argv[2] ? `-${process.argv[2]}` : '';

const PROMPT = `Square artist profile photo, exactly 1:1 (1024x1024), for a music streaming profile that will be cropped into a CIRCLE: keep the head and shoulders centered with comfortable margin, nothing important near the corners.

The attached image is the artist's logo: a spy silhouette — a fedora hat with a band, dark glasses, and a coat with a high upturned collar that hides the lower face. Turn that logo into a REAL PERSON, photographed: a hyper-realistic editorial portrait, as if shot on medium format film.

The artist is called "Tacet Sin" ("tacet" is the score marking that tells a musician to stay silent; "sin" as in temptation). Everything about the image says secret, silence and seduction:
- The person wears exactly the logo's elements: a dark fedora with a band, dark round sunglasses, and a long dark coat with the collar turned up covering the mouth and chin. Mostly the face stays hidden: you see the hat brim, the glasses and a sliver of the nose and cheekbone. Anonymous and magnetic.
- Low-key cinematic lighting: deep black background, one soft key light from the side, a thin warm rim light; a faint crimson tint in the shadows (the color of the album "Thrive") and a subtle warm gold glint on the glasses.
- Subtle haze/smoke in the air, fine film grain, shallow depth of field. Calm, still, confident pose, facing the camera or a three-quarter turn.
- Front view, symmetrical and iconic, so it reads as the logo at a glance even when small.
NO text, NO letters, NO logos printed anywhere, NO watermark. No sports references.`;

await closeHungTabs();   // una pestaña colgada (Kick, otra de ChatGPT) bloquea connectOverCDP
const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(2 * 60 * 1000);
try {
  const { filename } = await generateImage(page, { id: `tacet-sin-perfil${variante}` }, 'cuadrada', PROMPT,
    { freshChat: true, excludeSrcs: [], attachments: [path.join(ROOT, 'logos/rebrand/Clean logo Negro.png')] });
  const png = path.join(OUT, `perfil${variante}.png`);
  fs.renameSync(path.join(ROOT, 'Renders/Daily News', filename), png);
  const m = await sharp(png).metadata(), lado = Math.min(m.width, m.height);
  const jpg = path.join(OUT, `perfil${variante}.jpg`);
  await sharp(png).extract({ left: Math.floor((m.width - lado) / 2), top: Math.floor((m.height - lado) / 2), width: lado, height: lado })
    .resize(3000, 3000, { kernel: 'lanczos3' }).jpeg({ quality: 92 }).toFile(jpg);
  await putFile(jpg, `musica/artista/perfil${variante}.jpg`);
  console.log(`OK ${png} (${m.width}x${m.height}) → ${jpg} → R2 musica/artista/perfil${variante}.jpg`);
} finally {
  const conv = currentChatId(page);
  if (conv) await deleteChatById(page, conv).catch(e => console.warn('  no se pudo borrar el chat:', e.message));
  await page.close(); await browser.close().catch(() => {});
}
