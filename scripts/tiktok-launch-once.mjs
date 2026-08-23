/**
 * One-off: portada para la noticia del lanzamiento del TikTok oficial de Top Secret FC.
 * Mismo estilo que "Resumen Semanal 1.png" (split diagonal negro/azul, escudo cromado
 * a la izquierda, texto grande tipo Bebas a la derecha). Se puede borrar después de correrlo.
 */
import { chromium } from 'playwright';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH,
  imageRatio, generateImage, evaluateImage,
} from './generate-image-chatgpt.mjs';

function buildPrompt(correction) {
  return `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro).

Necesito una placa/portada de anuncio para redes: el lanzamiento del TikTok oficial del club. Es una pieza de celebración institucional, mismo lenguaje visual que ya usa el club para anuncios grandes (ej. la portada "RESUMEN SEMANAL #1" del canal de YouTube).

═══ ESTILO (OBLIGATORIO — replicar esta estructura) ═══
- Fondo dividido en diagonal: mitad negro liso (arriba/izquierda) y mitad azul eléctrico #4a9eff con textura sutil de puntos/rombos (abajo/derecha), con un par de líneas de velocidad/brillo finas cruzando la diagonal.
- El escudo oficial del club (te lo adjunto, es el círculo cromado plateado con el espía de sombrero y anteojos — usalo EXACTO, sin redibujarlo ni reinventarlo) centrado a la izquierda, tamaño grande, con un leve resplandor azul alrededor del borde.
- A la derecha del escudo, tipografía condensada bold tipo "Bebas Neue", muy grande, en blanco con el número/palabra clave en azul eléctrico, con un ligero efecto de trazo/pincelada detrás (brush stroke), igual que en las portadas anteriores del club.
- Texto principal: "YA ESTAMOS EN TIKTOK" (puede partirse en 2-3 líneas, "YA ESTAMOS EN" en blanco y "TIKTOK" en azul eléctrico, más grande). Debajo, en una banderita/tira negra angosta: "TOP SECRET FC".
- NO incluyas el logo oficial de TikTok (la notita musical con los colores cian/fucsia) ni ningún isotipo de marca ajena — solo texto tipográfico. NO agregues teléfonos, redes sociales de otras plataformas, ni QR.
- Sin fotos de jugadores, sin cancha, sin balón. Es una pieza 100% gráfica/tipográfica, moderna y con impacto, coherente con la identidad "espía" del club (negro, plateado, azul eléctrico).

═══ FORMATO ═══
Publicación de Instagram — proporción 4:5, VERTICAL, aproximadamente 1086×1448 px.

${correction ? `═══ CORRECCIÓN SOBRE LA VERSIÓN ANTERIOR ═══\n${correction}\n\n` : ''}Generá la imagen ahora.`;
}

function buildEvalPrompt() {
  return `Sos el director de arte de Top Secret FC revisando la portada de anuncio del lanzamiento del TikTok oficial antes de publicarla.

CRITERIOS (todos deben cumplirse):
- Estilo split diagonal negro / azul eléctrico, coherente con las portadas anteriores del club (tipo "RESUMEN SEMANAL #1"), NO un diseño genérico distinto.
- El escudo del club aparece bien reproducido (círculo cromado plateado, espía con sombrero y anteojos), sin distorsión ni reinvención.
- El texto es legible y dice claramente algo como "YA ESTAMOS EN TIKTOK" (aceptable variación de layout/línea), sin errores de tipeo ni palabras cortadas.
- NO aparece el logo/isotipo oficial de TikTok (la notita musical) ni ningún otro isotipo de marca ajena.
- No hay fotos de jugadores, cancha ni balón — es una pieza tipográfica/gráfica.
- Proporción vertical 4:5 (aprox 1086x1448), no horizontal ni story angosta.

Respondé ÚNICAMENTE con uno de estos dos formatos (nada más):
APROBADA - [motivo breve]
RECHAZADA - [qué falla específicamente, en una línea accionable para el generador de imágenes]`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const attachments = [CREST_PATH, CREST_WHITE_PATH];

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
          page, { date: 'tiktok-launch' }, 'tiktok', prompt,
          { freshChat: attempt === 1, excludeSrcs: [], attachments }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) break;
        continue;
      }

      const dims = await imageRatio(path.join('Renders/Daily News', filename));
      console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(2)})`);
      const wrongFormat = dims.ratio < POST_MIN_RATIO || dims.ratio > POST_MAX_RATIO;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito proporción 4:5 vertical (aprox. 1086x1448).`;
        console.log(`  ⚠ ${correction}`);
        continue;
      }

      let evalResponse = null;
      try {
        evalResponse = await evaluateImage(context, path.resolve('Renders/Daily News', filename), buildEvalPrompt());
      } catch (evalErr) {
        console.log(`  Evaluación falló (${evalErr.message.split('\n')[0]}) — aceptando.`);
      }
      const approved = !evalResponse || /^aprobada/i.test(evalResponse.trim());
      finalFile = filename;
      finalDims = dims;
      if (approved || attempt === MAX_ATTEMPTS) {
        if (evalResponse && !approved) console.log('  Máximo de intentos alcanzado — usando última versión.');
        break;
      }
      correction = evalResponse.replace(/^rechazada\s*[-–]\s*/i, '').trim();
      console.log(`  Rechazada: "${correction}" — regenerando.`);
    }
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  if (finalFile) {
    console.log(`\n\nOK: ${path.join('Renders/Daily News', finalFile)}${finalDims ? ` (${finalDims.width}x${finalDims.height})` : ''}`);
  } else {
    console.log('\n\nSIN RESULTADO.');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
