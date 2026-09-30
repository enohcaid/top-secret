/**
 * One-off: la placa "Cierre VPUG T3.png" (ya generada, sin publicar) quedo
 * bien salvo la fila 4 (Juan_Martinez4, "MAS CONSISTENTE") que solo mostraba
 * "15 PARTIDOS EN 17" sin su promedio de valoracion (7.51), a diferencia de
 * la placa hermana de 11x11 donde esa misma categoria SI incluye el promedio
 * ("7.36 DE PROMEDIO EN 18 PJ"). Correccion puntual de esa unica fila.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  imageRatio, generateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const SOURCE = path.resolve('logos/Cierre VPUG T3.png');
const BACKUP = path.resolve('logos/Cierre VPUG T3.pre-jmfix.png');

function buildPrompt(correction = null) {
  return `Te adjunto una placa gráfica ya terminada y aprobada en su mayoría ("Cierre VPUG", club Top Secret FC, 5 filas de jugadores). Necesito EXACTAMENTE el mismo diseño, mismo título, mismo fondo, mismas 5 caras/fotos, mismos números de camiseta — pero con UN SOLO cambio de texto: en la fila 4 (JUAN_MARTINEZ4 - 6, categoría "MÁS CONSISTENTE"), el texto de la estadística actualmente dice "15 PARTIDOS EN 17" y tiene que decir en su lugar "7.51 DE PROMEDIO EN 15 PJ" (mismo estilo tipográfico y color verde que el resto de las líneas de stat).

NO cambies absolutamente nada más: ni el título, ni el fondo, ni los 5 jugadores/caras, ni los números de camiseta, ni las otras 4 filas de texto (Lautavester7, CipriMancini, Cabers14, fedeavv9 quedan idénticas), ni el formato (necesito que el resultado siga siendo proporción 4:5 vertical, ~1086x1448). Es una corrección quirúrgica de una sola línea de texto, no una regeneración creativa.

Generá la imagen ahora en formato 4:5 (1086x1448 aprox).${correction ? `\n\nCORRECCIÓN sobre el intento anterior: ${correction}` : ''}`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  fs.copyFileSync(SOURCE, BACKUP);
  console.log(`Backup guardado en ${BACKUP}`);

  let correction = null;
  let finalFile = null;
  let finalDims = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\n========== Intento ${attempt}/${MAX_ATTEMPTS} ==========`);
      const prompt = buildPrompt(correction);

      let filename;
      try {
        ({ filename } = await generateImage(
          page, { date: 'cierre-vpug-jmfix' }, 'placa', prompt,
          { freshChat: true, excludeSrcs: [], attachments: [SOURCE] }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) break;
        await deleteChatById(page, currentChatId(page));
        continue;
      }

      const dims = await imageRatio(path.join('Renders/Daily News', filename));
      console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(3)})`);
      finalFile = filename;
      finalDims = dims;
      const wrongFormat = dims.ratio < POST_MIN_RATIO || dims.ratio > POST_MAX_RATIO;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(3)} (${dims.width}x${dims.height}) — sigue sin ser 4:5. Necesito proporción 4:5 vertical exacta (aprox 1086x1448, ancho/alto entre 0.68 y 0.90). Recordá: SOLO cambiar el texto de la fila 4 a "7.51 DE PROMEDIO EN 15 PJ", todo lo demás igual.`;
        console.log(`  ⚠ ${correction}`);
        await deleteChatById(page, currentChatId(page));
        continue;
      }
      break;
    }
  } finally {
    await page.close().catch(() => {});
  }

  if (finalFile && finalDims && finalDims.ratio >= POST_MIN_RATIO && finalDims.ratio <= POST_MAX_RATIO) {
    const src = path.join('Renders/Daily News', finalFile);
    fs.copyFileSync(src, SOURCE);
    console.log(`\n✓ OK — ${SOURCE} actualizado a ${finalDims.width}x${finalDims.height} (ratio ${finalDims.ratio.toFixed(3)})`);
  } else {
    console.log(`\n✗ SIN RESULTADO válido tras ${MAX_ATTEMPTS} intentos. No se tocó el archivo original.`);
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
