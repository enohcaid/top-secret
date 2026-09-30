/**
 * One-off: placa "CIERRE VPUG" de fin de torneo, análoga a
 * `logos/Cierre 11x11 T3.png` (mismo layout/estilo, ya aprobada y en formato
 * 4:5 correcto) pero en paleta verde lima (liga VPUG) con el logo de la
 * liga VPUG y otros 5 jugadores/stats. Draft para aprobación del usuario —
 * NO se commitea/pushea nada, solo se genera el archivo en logos/.
 *
 * Mismo pipeline que cierre-11x11-once.mjs: conecta al Chrome CDP
 * persistente ya logueado, arma un único prompt (una sola imagen), pide
 * DIRECTAMENTE formato 4:5 (~1086x1448) desde el primer intento —
 * `Cierre 11x11 T3.png` salió mal la primera vez en formato story angosto
 * (941x1672) y hubo que corregirlo después; acá evitamos ese error de
 * entrada. Reintenta hasta MAX_ATTEMPTS si el formato sale mal, y borra el
 * chat de ChatGPT usado al terminar.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH,
  imageRatio, generateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const REF_IMAGE   = path.resolve('logos/Cierre 11x11 T3.png'); // ya 4:5, 1086x1448
const LEAGUE_LOGO = path.resolve('logos/VPUG logo.png');
const DEST_PATH   = path.resolve('logos/Cierre VPUG T3.png');

// Los adjuntos sin comprimir (referencia ~2.4MB + logo liga ~2MB + escudo +
// 5 renders de jugadores) superan los ~9MB que en la corrida de 11x11
// hicieron que la subida a ChatGPT excediera el timeout de 90s con el que
// el pipeline espera a que el botón de enviar se habilite
// (generate-image-chatgpt.mjs, sendPromptInProject) — el mensaje nunca se
// enviaba. Fix ya probado: recomprimir todos los adjuntos antes de mandarlos.
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cierre-vpug-att-'));

async function prepareAttachment(srcPath) {
  const dest = path.join(TMP_DIR, path.basename(srcPath));
  await sharp(srcPath)
    .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, quality: 85 })
    .toFile(dest);
  return dest;
}

// Formato objetivo: 4:5 vertical, igual que el estándar "post" del sitio
// (POST_MIN_RATIO 0.68 - POST_MAX_RATIO 0.90) y que la referencia adjunta
// (Cierre 11x11 T3.png = 1086x1448, ratio 0.75).
const TARGET_RATIO = 0.75;

const PLAYERS = [
  {
    render: 'Renders/T3-Frentes/Lautavester7.png',
    name: 'LAUTAVESTER7', number: '7',
    category: 'MAX GOLEADOR', stat: '16 GOLES',
  },
  {
    render: 'Renders/T3-Frentes/CipriMancini.png',
    name: 'CIPRIMANCINI', number: '32',
    category: 'MAX ASISTENTE', stat: '7 ASISTENCIAS',
  },
  {
    render: 'Renders/T3-Frentes/Cabers14.png',
    name: 'CABERS14', number: '5',
    category: 'MEJOR PROMEDIO', stat: '7.55 DE VALORACIÓN',
  },
  {
    render: 'Renders/T3-Frentes/Juan_Martinez4.png',
    name: 'JUAN_MARTINEZ4', number: '6',
    category: 'MÁS CONSISTENTE', stat: '15 PARTIDOS EN 17',
  },
  {
    render: 'Renders/T3-Frentes/fedeavv9.png',
    name: 'FEDEAVV9', number: '9',
    category: 'MÁS OFENSIVO', stat: '6G Y 4A EN 12 PJ',
  },
];

function buildPrompt() {
  const rows = PLAYERS.map((p, i) =>
    `${i + 1}. "${p.name} - ${p.number}" / "${p.category}" / "${p.stat}"`
  ).join('\n');

  return `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Tenés que producir UNA placa de cierre de torneo para redes sociales.

═══ REFERENCIA DE ESTILO Y LAYOUT (OBLIGATORIO) ═══
Te adjunto una imagen llamada "Cierre 11x11 T3" que es la placa de cierre de OTRO torneo del mismo club (11x11), ya publicada y APROBADA en formato final correcto. Es la referencia EXACTA de layout, composición y calidad que tenés que reproducir para esta nueva placa, cambiando solo la paleta de color y el contenido:

- Fondo oscuro tipo estadio/estudio con destellos y rayos diagonales de luz cruzando la imagen, y un patrón sutil de puntos/textura de fondo.
- Escudo circular metálico del club arriba a la izquierda (mismo escudo, te lo adjunto aparte — reproducilo fielmente, nunca inventes otro).
- Logo de la liga arriba a la derecha (te adjunto el de VPUG aparte, ver abajo).
- Título en dos bloques centrados arriba: "CIERRE" en tipografía de piedra/mármol plateado 3D en mayúsculas grandes (idéntica al tratamiento de "CIERRE" en la referencia), y debajo el nombre corto de la liga en un estilo de trazo tipo rayo/grafiti pintado a mano, grande, en el color de acento de la liga.
- 5 filas horizontales apiladas de arriba a abajo, cada una separada por una línea fina, cada una con: el número de camiseta GIGANTE en la misma tipografía de piedra/mármol plateado 3D a la izquierda; al lado el gamertag del jugador en mayúsculas grande y blanco; debajo la categoría en mayúsculas chica y el dato/stat debajo en el color de acento de la liga; y a la derecha de cada fila, superpuesta y sangrando fuera del borde derecho, una foto grande de cuerpo/torso del jugador real con un resplandor de luz de color de acento de la liga detrás.

Cambiá ÚNICAMENTE lo siguiente respecto de la referencia:

═══ PALETA DE COLOR — VERDE LIMA (liga VPUG) ═══
Reemplazá TODO el celeste de la referencia (destellos diagonales de fondo, el trazo tipo rayo del nombre de liga, el texto de categoría/stat, el resplandor detrás de cada jugador) por VERDE LIMA vibrante (el mismo verde que usa el club para VPUG — ver el escudo circular verde lima de la Temporada 2 de referencia adicional que te adjunto solo como muestra de tono de color, no de layout). El fondo sigue oscuro (negro/gris muy oscuro), el título "CIERRE" sigue en piedra plateada 3D (no cambia de color), los gamertags siguen en blanco. Los números de camiseta y el trazo grafiti del nombre de liga van en verde lima, igual que el resplandor detrás de cada jugador.

═══ LOGO DE LIGA (arriba a la derecha) ═══
Te adjunto el archivo oficial del logo de la liga VPUG: el wordmark "VPUG" en relieve blanco con textura metálica, con el subtítulo "VIRTUAL PRO URUGUAY GAMING" debajo, actualmente sobre un fondo gris de estudio con viñeta — extraé y reproducí fielmente el wordmark "VPUG" (con su relieve/textura tal cual aparece) integrado en el diseño de la placa, en la esquina superior derecha en el lugar donde la referencia tiene el logo de 11x11, SIN el fondo gris del archivo (integralo sobre el fondo oscuro de la placa, tamaño legible pero proporcional a como se ve el logo de liga en la referencia).

═══ ESCUDO DEL CLUB (arriba a la izquierda) ═══
Te adjunto el escudo oficial del club por separado (círculo metálico plateado/oscuro "TOP SECRET FOOTBALL CLUB" con la silueta del espía de sombrero y anteojos) — reproducilo fielmente tal cual aparece en el adjunto, igual que en la referencia, nunca inventes un escudo distinto.

═══ TÍTULO ═══
"CIERRE" en piedra plateada 3D (igual estilo/tamaño que la referencia) arriba, y debajo "VPUG" en el mismo estilo de trazo tipo rayo/grafiti que usa la referencia para "11X11", pero en VERDE LIMA en vez de celeste. Verificá letra por letra que el texto sea EXACTAMENTE "CIERRE" y "VPUG" — sin agregar ni repetir ninguna letra.

═══ JUGADORES Y TEXTOS (de arriba a abajo, en este orden exacto) ═══
Te adjunto 5 renders reales de jugadores del club, ya vestidos con la camiseta NEGRA oficial actual del club (kit T3) — usá su cara y apariencia física REAL tal cual aparecen en cada adjunto, nunca inventes otra persona ni otro uniforme. Asignalos en este orden exacto, cada uno a su fila correspondiente de arriba a abajo:

${rows}

Aclaración: el número después del guion en cada nombre (ej. "- 7") es el dorsal/número de camiseta real del jugador — va como el número gigante de piedra plateada de esa fila, tal como en la referencia. NO es un dato estadístico.

═══ FIDELIDAD FACIAL — MUY IMPORTANTE ═══
En una placa anterior de este mismo estilo, la cara del jugador de la fila 1 (Lautavester7) se desvió de su foto real durante la generación y hubo que corregirla en intentos extra. Para evitar que se repita: la cara de CADA uno de los 5 jugadores debe ser fiel a su foto de referencia adjunta, sin inventar rasgos que no estén en el render. Prestá especial atención a LAUTAVESTER7 (fila 1, el jugador con más riesgo de desviarse): piel oscura, barba completa cerrada, anteojos de sol tipo "shield" de una sola lente envolvente con lentes VERDES y marco blanco/plateado, pelo corto oscuro con un mechón claro/plateado arriba — reproducí estos rasgos exactos, no un jugador genérico con anteojos de sol.

═══ TEXTO — MUY IMPORTANTE ═══
Todo el texto debe quedar perfectamente legible, sin errores de tipeo, respetando EXACTAMENTE la ortografía y mayúsculas de cada gamertag y cada línea de stat tal como te las di arriba (los gamertags son nombres de usuario reales, copialos carácter por carácter, incluyendo guiones bajos).

═══ FORMATO — MUY IMPORTANTE ═══
Formato de "post" vertical 4:5, EXACTAMENTE aproximadamente 1086x1448 px — la misma proporción exacta que la imagen de referencia adjunta "Cierre 11x11 T3" (que ya está en el formato correcto). NO generes formato Story angosto (eso sería un error, aunque la referencia adicional vieja de Temporada 2 que te muestro solo para el tono de verde esté en formato angosto — ignorá su proporción, solo mirala para el color). Sin marcas de agua, sin texto adicional que no esté pedido acá.

Generá la imagen ahora en formato 4:5 (~1086x1448 px).`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const OLD_T2_REF = path.resolve('logos/Cierre VPUG T2.png'); // solo muestra de tono verde
  const srcFiles = [REF_IMAGE, OLD_T2_REF, LEAGUE_LOGO, CREST_PATH, ...PLAYERS.map(p => path.resolve(p.render))];
  const missing = srcFiles.filter(f => !fs.existsSync(f));
  if (missing.length) {
    console.log('ADVERTENCIA — adjuntos faltantes (se continúa sin ellos):', missing);
  }

  const existingSrc = srcFiles.filter(f => fs.existsSync(f));
  const attachments = [];
  let totalBefore = 0, totalAfter = 0;
  for (const f of existingSrc) {
    const compressed = await prepareAttachment(f);
    totalBefore += fs.statSync(f).size;
    totalAfter  += fs.statSync(compressed).size;
    attachments.push(compressed);
  }
  console.log(`  Adjuntos recomprimidos: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfter / 1024 / 1024).toFixed(1)}MB`);

  let finalFile = null;
  let finalDims = null;
  let attemptsUsed = 0;
  let correction = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attemptsUsed = attempt;
      console.log(`\n\n========== Intento ${attempt}/${MAX_ATTEMPTS} ==========`);
      const prompt = buildPrompt() + (correction ? `\n\nCORRECCIÓN sobre la versión anterior: ${correction}` : '');

      let filename;
      try {
        ({ filename } = await generateImage(
          page, { date: 'cierre-vpug' }, 'placa', prompt,
          { freshChat: true, excludeSrcs: [], attachments }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) break;
        await deleteChatById(page, currentChatId(page));
        continue;
      }

      const dims = await imageRatio(path.join('Renders/Daily News', filename));
      console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(3)}, objetivo ~${TARGET_RATIO})`);
      finalFile = filename;
      finalDims = dims;

      const wrongFormat = dims.ratio < POST_MIN_RATIO || dims.ratio > POST_MAX_RATIO;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(3)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito proporción vertical 4:5 EXACTA, aproximadamente 1086x1448 px, igual que la placa de referencia "Cierre 11x11 T3" adjunta. No generes formato Story angosto.`;
        console.log(`  ⚠ ${correction}`);
        await deleteChatById(page, currentChatId(page));
        continue;
      }
      break;
    }

    if (finalFile) {
      const src = path.join('Renders/Daily News', finalFile);
      fs.copyFileSync(src, DEST_PATH);
      fs.unlinkSync(src);
      console.log(`\nMovida a: ${DEST_PATH}`);
    } else {
      console.log('\nSIN RESULTADO.');
    }

    await deleteChatById(page, currentChatId(page));
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}

  console.log('\n\n===== RESUMEN =====');
  console.log(`Intentos usados: ${attemptsUsed}/${MAX_ATTEMPTS}`);
  if (finalFile) {
    console.log(`Archivo final: ${DEST_PATH}`);
    console.log(`Dimensiones: ${finalDims.width}x${finalDims.height} (proporción ${finalDims.ratio.toFixed(3)})`);
  } else {
    console.log('No se generó ningún archivo.');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
