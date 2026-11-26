#!/usr/bin/env node
// Portada nueva para una noticia MANUAL (noticias-data.js), generada con ChatGPT como las de la noticia diaria:
// mismas reglas de estética (brandFormatBlock), renders T4 de los jugadores con el kit pedido y escudo estampado con sharp.
//   node scripts/portada-noticia.mjs --id <id> --jugadores a,b --escena "<descripción>" [--kit titular|alternativa]
// Salida: fuentes/portadas/<id>.png (con escudo) + fuentes/daily-news-raw/<id>.png (limpia, para las piezas de redes)
// y en R2: logos/noticias/<id>-portada.webp (sitio) y logos/noticias/<id>-portada-raw.jpg (limpia).
// Requiere el Chrome con CDP (scripts/abrir-chrome-chatgpt.ps1) logueado en ChatGPT.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { putFile } from './lib/r2.mjs';
import { KIT_COLORS, GK_KIT_DESC, renderForKit, brandFormatBlock, playerIdentityLine, fetchJerseyOverrides,
  generateImage, stampCrest, currentChatId, deleteChatById, closeHungTabs, RAW_DIR } from './generate-image-chatgpt.mjs';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const id = arg('--id'), escena = arg('--escena');
const jugadores = (arg('--jugadores') || '').split(',').map(s => s.trim()).filter(Boolean);
const kit = KIT_COLORS.find(k => k.id === (arg('--kit') || 'titular'));
if (!id || !escena || !jugadores.length || !kit) {
  console.error('Uso: node scripts/portada-noticia.mjs --id <id> --jugadores a,b --escena "<texto>" [--kit titular|alternativa]');
  process.exit(1);
}
const GKS = ['Ivan_Cabj_La12', 'adri_cai'];
const refs = jugadores.map(j => renderForKit(j, kit));
if (refs.some(r => !r)) { console.error('Sin render T4 para:', jugadores.filter((j, i) => !refs[i]).join(', ')); process.exit(1); }
const crest = path.resolve('logos/rebrand/Clean logo Dorado.png');
await fetchJerseyOverrides();

const prompt = `${brandFormatBlock()}

═══ ESCENA ═══
${escena}

JUGADORES (uno por cada render adjunto, en el mismo orden; respetá cara, piel, pelo, barba y accesorios de cada uno):
${jugadores.map(playerIdentityLine).join('\n')}

KIT: ${jugadores.some(j => !GKS.includes(j)) ? `los jugadores de campo llevan el ${kit.label}: ${kit.desc}` : ''}
${jugadores.some(j => GKS.includes(j)) ? `El arquero lleva su ${GK_KIT_DESC}` : ''}
El escudo del club (el espía, adjunto) va en el pecho de cada camiseta, igual al adjunto, sin deformarlo.
La camiseta NO lleva número en el frente; el dorsal va en el short y, si alguien está de espaldas, en la espalda.

- Formato: POST de feed de Instagram — proporción 4:5, VERTICAL: el ancho es aproximadamente el 80% del alto (ej. 1086×1448 px).
- Fuera de los dorsales: sin ningún texto, letra, logo extra ni marca de agua.`;

await closeHungTabs();
const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(2 * 60 * 1000);
await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://chatgpt.com' }).catch(() => {});
let out;
try {
  const { filename } = await generateImage(page, { id: `portada-${id}` }, 'post', prompt, { freshChat: true, excludeSrcs: [], attachments: [...refs, crest] });
  fs.mkdirSync('fuentes/portadas', { recursive: true });
  out = path.resolve('fuentes/portadas', `${id}.png`);
  fs.renameSync(path.resolve('Renders/Daily News', filename), out);
} finally {
  const conv = currentChatId(page);
  if (conv) await deleteChatById(page, conv).catch(e => console.warn('  no se pudo borrar el chat:', e.message));
  await page.close().catch(() => {});
  await browser.close().catch(() => {});
}
await stampCrest(out, { fresh: true });
const raw = path.join(RAW_DIR, path.basename(out));
const webp = out.replace(/\.png$/, '.webp'), rawJpg = out.replace(/\.png$/, '-raw.jpg');
await sharp(out).resize({ width: 1080 }).webp({ quality: 82 }).toFile(webp);
await sharp(raw).resize({ width: 1080 }).jpeg({ quality: 90 }).toFile(rawJpg);
await putFile(webp, `logos/noticias/${id}-portada.webp`);
await putFile(rawJpg, `logos/noticias/${id}-portada-raw.jpg`);
console.log(`OK ${out}\n   R2: logos/noticias/${id}-portada.webp + -portada-raw.jpg`);
