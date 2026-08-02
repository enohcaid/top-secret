/**
 * One-off: le pide a ChatGPT que pula/estilice la grilla base del plantel
 * (plantel-grid-once.mjs) en una placa premium, preservando exactamente
 * cada jugador + nombre + dorsal (la correspondencia ya es 100% correcta
 * porque la arma codigo, no IA — este paso solo mejora el acabado visual).
 * Se puede borrar despues de correrlo.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const OUT_DIR = process.env.PLACAS_OUT_DIR || path.resolve('.placas-tmp');
const BASE_GRID = path.join(OUT_DIR, 'plantel-grid-base.png');
const CREST_REF = path.resolve('logos/TOP Secret White.png');

const prompt = `Adjunto una imagen de referencia: es el diseño final EXACTO de una placa de presentación del plantel de Top Secret FC (club de fútbol virtual), con 20 jugadores en una grilla, cada uno con su foto, su nombre y su número correctos.

Recreá esta misma placa pero con mejor terminación visual: tipografía más prolija y con más carácter (condensada, gruesa, mayúscula), mejor alineación y espaciado entre celdas, fondo más elaborado (mantené la base negra con el acento azul #4a9eff), y una jerarquía más clara entre el título y la grilla.

MUY IMPORTANTE — no cambies nada de contenido: los mismos 20 jugadores, en el mismo orden, con la misma cara, el mismo nombre y el mismo número que en la referencia. No agregues, quites ni reordenes jugadores. No inventes caras nuevas.

Formato: post de Instagram, 1086x1448px, proporción 4:5.`;

async function main() {
  if (!fs.existsSync(BASE_GRID)) throw new Error('No existe la grilla base: ' + BASE_GRID);

  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  try {
    const { filename } = await generateImage(
      page, { date: 'plantel-placa' }, 'sq', prompt,
      { freshChat: true, excludeSrcs: [], attachments: [BASE_GRID, CREST_REF] }
    );
    const src = path.join('Renders/Daily News', filename);
    const dest = path.join(OUT_DIR, 'plantel-placa-final.png');
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
    console.log('Guardada:', dest);
    await deleteChatById(page, currentChatId(page));
  } finally {
    await page.close().catch(() => {});
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
