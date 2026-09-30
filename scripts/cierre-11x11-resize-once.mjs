/**
 * One-off: la placa "Cierre 11x11 T3.png" (ya publicada) quedo en formato
 * angosto tipo story (941x1672, ratio 0.56) heredado de la referencia visual
 * "Cierre 11x11 T2.png" que se le pidio imitar. El estandar de "post" del
 * sitio es 4:5 (POST_MIN_RATIO 0.68 - POST_MAX_RATIO 0.90, ver
 * generate-image-chatgpt.mjs), como el resto de las imagenes de noticias.
 * Le paso la placa ya aprobada a ChatGPT y le pido SOLO que ajuste el
 * formato/encuadre a 4:5, sin cambiar diseno/texto/caras.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  imageRatio, generateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const SOURCE = path.resolve('logos/Cierre 11x11 T3.png');
const BACKUP = path.resolve('logos/Cierre 11x11 T3.story-backup.png');

function buildPrompt(correction = null) {
  return `Te adjunto una placa gráfica ya terminada y aprobada ("Cierre 11x11", club Top Secret FC) que quedó en formato angosto tipo Story (941x1672, proporción ancho/alto ≈0.56). Necesito EXACTAMENTE el mismo diseño —mismo título dorado, mismo escudo, mismo logo de liga, los mismos 5 jugadores en el mismo orden con el mismo texto en cada fila, mismo fondo— pero reencuadrado/ajustado a proporción 4:5 vertical (aprox. 1086x1448, ancho/alto ≈0.75), que es el formato de "post" que usamos en el sitio.

NO cambies ningún elemento de diseño, texto, cara ni color — es un ajuste de encuadre/formato únicamente, no una regeneración creativa. Si hace falta recortar algo de espacio vacío arriba/abajo o reacomodar levemente la composición para que entre en 4:5 sin cortar ninguna de las 5 filas ni el título, hacelo, pero manteniendo todo reconocible e idéntico en contenido.

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
      console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
      const prompt = buildPrompt(correction);

      let filename;
      try {
        ({ filename } = await generateImage(
          page, { date: 'cierre-11x11-resize' }, 'placa', prompt,
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
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(3)} (${dims.width}x${dims.height}) — sigue sin ser 4:5. Necesito proporción 4:5 vertical exacta (aprox 1086x1448, ancho/alto entre 0.68 y 0.90).`;
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
    console.log(`\n✗ SIN RESULTADO válido en formato 4:5 tras ${MAX_ATTEMPTS} intentos. No se tocó el archivo original.`);
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
