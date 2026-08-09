/**
 * One-off: banner de canal de YouTube para Top Secret FC (fútbol virtual,
 * EA Sports FC Clubs Pro). Reusa el pipeline de generación/evaluación de
 * generate-image-chatgpt.mjs con un prompt propio de identidad de canal.
 *
 * YouTube renderiza el banner completo a 2560x1440 pero solo el área
 * centrada de 1546x423 se ve garantizada en todos los dispositivos (TV,
 * desktop, tablet, mobile recortan distinto) — el prompt exige que el
 * escudo y el texto vivan dentro de esa franja central, con los bordes
 * como fondo/ambientación decorativa que puede perderse sin problema.
 *
 * Se puede borrar después de correrlo (es fija a esta pieza puntual).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  MAX_ATTEMPTS, CREST_PATH, KITS_PATH,
  imageRatio, generateImage, evaluateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const OUT_FILE = path.resolve('logos/YouTube Banner TOP Secret FC.png');
const BANNER_W = 2560;
const BANNER_H = 1440;
// Rango amplio: cualquier resultado claramente panorámico sirve, el ajuste
// fino al tamaño exacto de YouTube lo hace sharp al final.
const MIN_RATIO = 1.4;
const MAX_RATIO = 2.4;

const PROMPT = `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Necesito el banner de cabecera para el canal de YouTube nuevo del club, donde se van a subir compilaciones de goles y otro contenido de video del equipo.

═══ IDENTIDAD VISUAL — OBLIGATORIA ═══
Te adjunto el escudo oficial del club (versión metálica plateada sobre fondo oscuro, el espía con sombrero y anteojos) — reproducilo EXACTAMENTE como aparece en la referencia, no lo rediseñes ni cambies sus proporciones ni sus detalles.
También te adjunto una pieza gráfica reciente del club (kits de la nueva temporada) como referencia del LENGUAJE VISUAL de marca: fondo negro profundo, rayos/destellos diagonales en azul eléctrico cruzando la composición, tipografía condensada en mayúsculas muy bold en blanco con acentos en azul, líneas finas horizontales como separadores. Usá ese mismo lenguaje visual para el banner, pero NO copies el texto ni el layout de esa referencia — es solo para el estilo (colores, tipografía, textura), el contenido del banner es distinto (ver abajo).

═══ CONTENIDO DEL BANNER ═══
- Escudo del club, prominente, del lado izquierdo o centrado.
- Texto principal: "TOP SECRET FC" en tipografía condensada bold mayúscula blanca (puede tener alguna letra o acento en azul eléctrico).
- Texto secundario, más chico, debajo: "FÚTBOL VIRTUAL · EA SPORTS FC" — identifica el contenido del canal sin ser el foco visual.
- Nada más de texto. Sin nombres de jugadores, sin marcadores, sin sponsors, sin fechas.
- Fondo: negro profundo con los rayos/destellos diagonales azules de la referencia, quizás alguna silueta sutil de estadio o cancha muy desenfocada de fondo, sin competir con el texto ni el escudo.

═══ FORMATO Y SEGURIDAD DE ENCUADRE — CRÍTICO ═══
Es un banner de canal de YouTube, formato panorámico horizontal ancho tipo 16:9 extendido (mucho más ancho que alto, aproximadamente 2560x1440 px o esa proporción).
YouTube recorta este banner de forma distinta en cada dispositivo (TV, computadora, tablet, celular) — SOLO se garantiza visible una franja horizontal centrada, angosta, de aproximadamente el 60% del ancho total y el 30% de la altura total, exactamente en el CENTRO de la imagen. TODO el contenido importante (escudo completo, todo el texto) tiene que estar dentro de esa franja central angosta. Los bordes izquierdo, derecho, superior e inferior son zona de sangrado — pueden tener fondo/decoración (los rayos azules, alguna silueta) pero NUNCA texto ni partes del escudo que se puedan cortar.

Generá la imagen ahora.`;

const EVAL_PROMPT = `Sos el director de arte de Top Secret FC revisando el banner nuevo del canal de YouTube del club.

CRITERIOS (todos deben cumplirse):
- El escudo reproduce fielmente la referencia adjunta (el espía con sombrero y anteojos, versión metálica/plateada) — no es un escudo inventado ni distorsionado.
- El texto dice exactamente "TOP SECRET FC" (sin errores de tipeo, sin letras de más o de menos) y hay un texto secundario menor tipo "FÚTBOL VIRTUAL · EA SPORTS FC" o similar — sin nombres de jugadores, sponsors, marcadores ni fechas inventadas.
- Formato panorámico ancho (mucho más ancho que alto, tipo banner de YouTube), NO cuadrado ni vertical.
- El escudo y TODO el texto están claramente dentro de una franja central angosta (el ~60% del ancho y ~30% del alto, centrada) — si el escudo o el texto quedan pegados a los bordes izquierdo/derecho/superior/inferior donde se recortarían en un dispositivo distinto = RECHAZADA.
- Estética prolija: fondo negro con acentos azules, tipografía bold condensada legible, sin artefactos raros de IA, sin marcas de agua.

Respondé ÚNICAMENTE con uno de estos dos formatos (nada más):
APROBADA - [motivo breve]
RECHAZADA - [qué falla específicamente, en una línea accionable para el generador de imágenes]`;

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const refAttachments = [CREST_PATH, KITS_PATH].filter(f => fs.existsSync(f));

  let correction = null;
  let finalFile = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
      const prompt = PROMPT + (correction ? `\n\nCORRECCIÓN sobre la versión anterior: ${correction}` : '');

      let filename;
      try {
        ({ filename } = await generateImage(
          page, { date: 'yt-banner' }, 'banner', prompt,
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
      const wrongFormat = dims.ratio < MIN_RATIO || dims.ratio > MAX_RATIO;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — necesito un banner mucho más panorámico/horizontal (proporción cercana a 16:9 extendido, ej. 2560x1440), no ese formato.`;
        console.log(`  ⚠ ${correction}`);
        await deleteChatById(page, currentChatId(page));
        continue;
      }

      let evalResponse = null;
      try {
        evalResponse = await evaluateImage(context, path.resolve('Renders/Daily News', filename), EVAL_PROMPT);
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
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  if (!finalFile) {
    console.log('\nSIN RESULTADO — no se generó ninguna imagen válida.');
    return;
  }

  const src = path.join('Renders/Daily News', finalFile);
  await sharp(src)
    .resize(BANNER_W, BANNER_H, { fit: 'cover', position: 'centre' })
    .png()
    .toFile(OUT_FILE);
  fs.unlinkSync(src);

  console.log(`\n✓ Banner final: ${OUT_FILE} (${BANNER_W}x${BANNER_H})`);
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
