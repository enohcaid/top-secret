/**
 * One-off: comunicado oficial en formato imagen por el terremoto en Colombia
 * (10/08/2026). Estilo deliberadamente sobrio — nada que ver con las placas
 * de fixture (sin textura dorada, sin tipografía stencil, sin decoración).
 * Se puede borrar después de correrlo.
 */
import { chromium } from 'playwright';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH,
  imageRatio, generateImage, evaluateImage,
} from './generate-image-chatgpt.mjs';

const TEXTO = `COMUNICADO OFICIAL

Ante el terremoto de magnitud 7,4 que golpeó a Colombia este 10 de agosto, dejando numerosas víctimas fatales y heridos en Cali, Pereira, Manizales, Quibdó y otras regiones del país, desde Top Secret FC queremos expresar nuestras condolencias a las familias de las víctimas y todo nuestro apoyo al pueblo colombiano en este momento tan doloroso.

Como parte de la comunidad del fútbol virtual, nos sentimos cerca de cada jugador, club y aficionado colombiano. Un abrazo especial para Lil_Dekuroko, nuestro compañero colombiano en el plantel, y para su familia y sus seres queridos en este momento tan difícil.

Deseamos una pronta recuperación a los heridos y fuerza a quienes hoy atraviesan esta tragedia.

Nuestro pensamiento está con Colombia.

Top Secret FC
10 de agosto de 2026`;

function buildPrompt(correction) {
  return `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro).

Necesito un COMUNICADO OFICIAL en formato imagen para redes, por el terremoto que golpeó a Colombia el 10 de agosto de 2026. Es una pieza de duelo/condolencias, NO una pieza promocional — el estilo debe ser extremadamente sobrio y respetuoso.

═══ ESTILO (OBLIGATORIO) ═══
- Fondo negro liso, o a lo sumo un degradé muy sutil a gris muy oscuro. Nada de texturas doradas desgastadas, nada de tipografía grande tipo stencil/graffiti, nada de elementos decorativos, nada de patrones ni marcos ornamentados.
- Escudo del club (te lo adjunto en dos versiones, usá la que mejor contraste tenga sobre fondo negro) centrado en la parte superior, tamaño moderado, sin efectos ni brillos.
- Debajo del escudo, una línea divisoria fina, simple, blanca o gris clara.
- El texto en tipografía limpia e institucional (serif o sans-serif sobria, tipo comunicado de prensa real de un club de fútbol profesional), color blanco o gris muy claro, buena legibilidad y espaciado entre líneas. El título "COMUNICADO OFICIAL" un poco más grande arriba del cuerpo del texto. La firma "Top Secret FC" y la fecha al final, más chicas.
- NO incluyas: imágenes de destrucción, escombros, mapas, banderas, emojis, colores vivos, brillos, ni ningún elemento gráfico adicional al escudo y el texto. Es una pieza de condolencias, seria y contenida.

═══ TEXTO EXACTO — usar tal cual, sin parafrasear, sin agregar ni quitar nada ═══
${TEXTO}

═══ FORMATO ═══
Publicación de Instagram — proporción 4:5, VERTICAL, aproximadamente 1086×1448 px.

${correction ? `═══ CORRECCIÓN SOBRE LA VERSIÓN ANTERIOR ═══\n${correction}\n\n` : ''}Generá la imagen ahora.`;
}

function buildEvalPrompt() {
  return `Sos el director de arte de Top Secret FC revisando el comunicado oficial por el terremoto en Colombia antes de publicarlo.

CRITERIOS (todos deben cumplirse):
- Diseño SOBRIO: fondo negro o gris muy oscuro liso, SIN texturas doradas, SIN tipografía tipo stencil/graffiti, SIN marcos decorativos, SIN colores vivos, SIN emojis, SIN imágenes de destrucción/escombros/mapas/banderas.
- El escudo del club aparece centrado arriba, correcto (el espía con sombrero), sin distorsión.
- El texto está COMPLETO y coincide exactamente con este contenido (revisá que no falte ninguna oración ni esté parafraseado):
"""
${TEXTO}
"""
- Texto legible, sin errores de superposición ni cortes.
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
          page, { date: 'comunicado-colombia' }, 'comunicado', prompt,
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
