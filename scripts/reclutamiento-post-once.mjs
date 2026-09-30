/**
 * One-off: imagen de Instagram (post 4:5) convocando jugadores en cualquier
 * posición para cerrar el plantel T3. Reusa el pipeline de generación/
 * evaluación de generate-image-chatgpt.mjs con el estilo EXPEDIENTE_COMUNICADO
 * (pieza tipográfica del sistema visual del club) y sin jugador protagonista
 * (composición institucional).
 *
 * Se puede borrar después de correrlo (es fija a esta pieza puntual).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH, KITS_PATH, IMAGE_STYLES,
  imageRatio, buildPrompt, buildEvalPrompt,
  generateImage, evaluateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const OUT_DIR = path.resolve('Renders/Reclutamiento');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

const draft = {
  date: today,
  category: 'Institución',
  title: 'SE BUSCAN REFUERZOS: TODAS LAS POSICIONES ABIERTAS',
  excerpt: 'Top Secret FC abre la búsqueda de jugadores en cualquier posición para cerrar el plantel de cara a la temporada oficial.',
  imageBrief: 'Silueta de un jugador genérico a contraluz, de espaldas, parado solo en el círculo central de la cancha bajo las luces del estadio de noche — sin rostro definido, sin nombre ni dorsal visibles, representando la convocatoria abierta a nuevo talento de cualquier posición. El escudo del club presente de forma prominente pero discreta en la composición. Clima institucional, serio y profesional, de convocatoria oficial.',
};

const style = IMAGE_STYLES.find(s => s.id === 'EXPEDIENTE_COMUNICADO');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const attachments = [CREST_PATH, CREST_WHITE_PATH, KITS_PATH].filter(f => fs.existsSync(f));

  let correction = null;
  let finalFile = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
      const prompt = buildPrompt(draft, [], style, correction);

      let filename;
      try {
        ({ filename } = await generateImage(
          page, draft, 'post', prompt,
          { freshChat: true, excludeSrcs: [], attachments }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) break;
        await deleteChatById(page, currentChatId(page));
        continue;
      }

      const dims = await imageRatio(path.join('Renders/Daily News', filename));
      console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(2)})`);
      const wrongFormat = dims.ratio < POST_MIN_RATIO || dims.ratio > POST_MAX_RATIO;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito proporción 4:5 vertical (post de Instagram, aprox. 1080x1350), ni story extra angosta ni horizontal.`;
        console.log(`  ⚠ ${correction}`);
        await deleteChatById(page, currentChatId(page));
        continue;
      }

      let evalResponse = null;
      try {
        evalResponse = await evaluateImage(context, path.resolve('Renders/Daily News', filename), buildEvalPrompt(style, draft, []));
      } catch (evalErr) {
        console.log(`  Evaluación falló (${evalErr.message.split('\n')[0]}) — aceptando.`);
      }
      const approved = !evalResponse || /^aprobada/i.test(evalResponse.trim());
      finalFile = filename;
      if (approved || attempt === MAX_ATTEMPTS) {
        if (evalResponse && !approved) console.log('  Máximo de intentos alcanzado — usando última versión.');
        break;
      }
      correction = evalResponse.replace(/^rechazada\s*[-–]\s*/i, '').trim();
      console.log(`  Rechazada: "${correction}" — regenerando.`);
      await deleteChatById(page, currentChatId(page));
    }
  } finally {
    await deleteChatById(page, currentChatId(page)).catch(() => {});
    await page.close().catch(() => {});
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
  }

  if (finalFile) {
    const dest = path.join(OUT_DIR, `reclutamiento-${today}_post.png`);
    fs.renameSync(path.join('Renders/Daily News', finalFile), dest);
    console.log(`\nListo: ${dest}`);
  } else {
    console.log('\nSIN RESULTADO.');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
