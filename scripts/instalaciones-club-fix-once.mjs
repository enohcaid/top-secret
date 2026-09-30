/**
 * One-off: reemplaza la foto 10_sala-trofeos de Renders/Instalaciones del
 * club/ por una del palco VIP del estadio. Mismo pipeline que
 * instalaciones-club-once.mjs, sin loop de evaluacion por IA.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH,
  imageRatio, generateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const OUT_DIR = path.resolve('Renders/Instalaciones del club');

const SHOT = {
  id: '10_palco-vip',
  scene: 'Palco VIP del estadio de Top Secret FC, sala acristalada con vista panorámica al campo de juego a través de un gran ventanal, sillones de cuero negro y mesas bajas, el escudo del club en relieve en la pared lateral, iluminación cálida y elegante, ambiente exclusivo tipo suite corporativa de estadio europeo de élite, sin ninguna persona en cuadro.',
};

function buildPrompt(shot) {
  return `Sos el fotógrafo institucional oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Estás haciendo un reportaje fotográfico de las instalaciones del club — el estadio y sus espacios internos — con la calidad de una producción real de un club top mundial (pensá en los tours virtuales/fotográficos oficiales de estadios europeos grandes: arquitectura, interiores, césped).

IMPORTANTE: Es una foto puramente ARQUITECTÓNICA / DE INTERIOR — NO debe aparecer ninguna persona, ni jugador, ni hincha, ni staff en la imagen. Solo el espacio, vacío.

Te adjunto el escudo oficial del club (el espía con sombrero, versión oscura y versión clara) — usalo como referencia para cualquier señalética, grabado o logo que aparezca de forma natural en la escena, reproduciéndolo fielmente tal cual aparece en el adjunto, nunca inventes un escudo distinto.

═══ ESCENA ═══
${shot.scene}

═══ ESTILO FOTOGRÁFICO (OBLIGATORIO) ═══
Fotografía arquitectónica/editorial de altísima calidad, luz natural o de estudio profesional (nunca luces de colores artificiales ni efectos de videojuego), composición cinematográfica, profundidad de campo controlada, grano de película sutil tipo revista deportiva premium. Sin texto superpuesto, sin titulares, sin marcos ni sellos gráficos añadidos — es una FOTO PURA, no una pieza de diseño gráfico.

═══ FORMATO ═══
Publicación de Instagram — proporción 4:5, VERTICAL (más alto que ancho), aproximadamente 1080×1350 px. Encuadre claramente vertical pero no extremo como una Story (9:16).

Generá la imagen ahora.`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const refAttachments = [CREST_PATH, CREST_WHITE_PATH].filter(f => fs.existsSync(f));

  try {
    console.log(`\n========== ${SHOT.id} ==========`);
    let correction = null;
    let finalFile = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
      const prompt = buildPrompt(SHOT) + (correction ? `\n\nCORRECCIÓN sobre la versión anterior: ${correction}` : '');

      let filename;
      try {
        ({ filename } = await generateImage(
          page, { date: 'instalaciones-fix' }, SHOT.id, prompt,
          { freshChat: true, excludeSrcs: [], attachments: refAttachments }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) break;
        await deleteChatById(page, currentChatId(page));
        continue;
      }

      const dims = await imageRatio(path.join('Renders/Daily News', filename));
      console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(2)})`);
      finalFile = filename;
      const wrongFormat = dims.ratio < POST_MIN_RATIO || dims.ratio > POST_MAX_RATIO;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito proporción 4:5 vertical (aprox. 1080x1350).`;
        console.log(`  ⚠ ${correction}`);
        await deleteChatById(page, currentChatId(page));
        continue;
      }
      break;
    }

    if (finalFile) {
      const src = path.join('Renders/Daily News', finalFile);
      const oldFile = path.join(OUT_DIR, '10_sala-trofeos.png');
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      const dest = path.join(OUT_DIR, `${SHOT.id}.png`);
      fs.renameSync(src, dest);
      console.log(`  Movida a: ${dest}`);
      console.log(`  Borrada: ${oldFile}`);
    } else {
      console.log('  SIN RESULTADO.');
    }

    await deleteChatById(page, currentChatId(page));
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
