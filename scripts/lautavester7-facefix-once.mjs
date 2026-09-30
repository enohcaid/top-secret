/**
 * One-off: corregir la CARA del jugador de la fila 1 (Lautavester7) en
 * `logos/Cierre 11x11 T2-style.png` — la IA se desvió del rostro real al
 * generar la placa original (ver scripts/cierre-11x11-t2style-once.mjs) y el
 * usuario detectó que no coincide con su render real
 * (`Renders/T3-Frentes/Lautavester7.png`).
 *
 * El chat original ya se borró (política del pipeline: se borra cada chat
 * apenas se descarga o rechaza la imagen), así que no se puede editar de
 * forma incremental en el mismo hilo — hay que regenerar la placa COMPLETA
 * de nuevo (freshChat), reusando el mismo prompt que generó la versión ya
 * aprobada, pero reforzado con:
 *   1. Un crop de SOLO cabeza/cara de Lautavester7 (además del render de
 *      cuerpo completo) para eliminar ambigüedad de encuadre.
 *   2. La placa ya aprobada como referencia de "así tiene que quedar,
 *      cambiando solo la cara del jugador de arriba".
 *   3. Texto de énfasis MUY fuerte sobre fidelidad facial del jugador 1.
 *
 * Ya se intentó vía Gemini/banana (edición dirigida) y falló por cuota
 * agotada (RESOURCE_EXHAUSTED) — no reintentar esa vía.
 *
 * Antes de sobrescribir el destino se hace backup a
 * `logos/Cierre 11x11 T2-style.bak.png`. NO se commitea/pushea — el usuario
 * todavía no aprobó integrar nada al sitio.
 *
 * Gotcha ya descubierto en corridas anteriores: los adjuntos sin comprimir
 * superan la ventana de 90s de sendPromptInProject para que se habilite el
 * botón de enviar → el mensaje nunca se manda de verdad. Se recomprimen acá
 * también antes de adjuntar.
 *
 * Concurrencia: puede haber OTRO agente usando el mismo Chrome CDP en
 * localhost:9222 al mismo tiempo (corrigiendo la placa dorada
 * `logos/Cierre 11x11 T3.png`, un archivo totalmente distinto). Si al
 * conectar ya hay una pestaña de ChatGPT ocupada que no es nuestra, abrimos
 * una pestaña NUEVA en vez de interferir.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  MAX_ATTEMPTS, STORY_MAX_RATIO,
  CREST_PATH,
  imageRatio, generateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const LEAGUE_LOGO   = path.resolve('logos/11x11 logo.png');
const APPROVED_PLACA = path.resolve('logos/Cierre 11x11 T2-style.png');
const BACKUP_PATH   = path.resolve('logos/Cierre 11x11 T2-style.bak.png');
const DEST_PATH     = APPROVED_PLACA; // se sobrescribe al final

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lautavester7-facefix-att-'));

async function prepareAttachment(srcPath, opts = {}) {
  const dest = path.join(TMP_DIR, path.basename(srcPath));
  await sharp(srcPath)
    .resize({ width: opts.width || 900, height: opts.height || 900, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, quality: 85 })
    .toFile(dest);
  return dest;
}

// Crop de SOLO cabeza/cara de Lautavester7, a partir de su render de cuerpo
// completo (1024x1536) — coordenadas verificadas visualmente para encuadrar
// pelo + gafas + barba sin recortar de más.
const FACE_CROP_SRC = path.resolve('Renders/T3-Frentes/Lautavester7.png');
const FACE_CROP_TMP = path.join(TMP_DIR, 'Lautavester7-face-crop.png');

async function buildFaceCrop() {
  await sharp(FACE_CROP_SRC)
    .extract({ left: 300, top: 20, width: 450, height: 340 })
    .png()
    .toFile(FACE_CROP_TMP);
  return FACE_CROP_TMP;
}

const PLAYERS = [
  {
    render: 'Renders/T3-Frentes/Lautavester7.png',
    name: 'LAUTAVESTER7', number: '7',
    category: 'MAX GOLEADOR', stat: '8 GOLES',
  },
  {
    render: 'Renders/T3-Frentes/Juanchyroman08.png',
    name: 'JUANCHYROMAN08', number: '18',
    category: 'MAX ASISTENTE', stat: '3 ASISTENCIAS',
  },
  {
    render: 'Renders/T3-Frentes/Cabers14.png',
    name: 'CABERS14', number: '5',
    category: 'MEJOR PROMEDIO', stat: '7.36 DE VALORACIÓN',
  },
  {
    render: 'Renders/T3-Frentes/Juan_Martinez4.png',
    name: 'JUAN_MARTINEZ4', number: '6',
    category: 'MÁS CONSISTENTE', stat: '7.36 DE PROMEDIO EN 18 PJ',
  },
  {
    render: 'Renders/T3-Frentes/fedeavv9.png',
    name: 'FEDEAVV9', number: '9',
    category: 'MÁS OFENSIVO', stat: '5G EN 14 PJ',
  },
];

// Proporción real de la placa (ancho/alto): 941x1672 = 0.563 — formato STORY.
const REF_RATIO_TARGET = 0.563;

function buildPrompt() {
  const rows = PLAYERS.map((p, i) =>
    `${i + 1}. Dorsal "${p.number}" / Nombre "${p.name}" / Categoría "${p.category}" / Dato "${p.stat}"`
  ).join('\n');

  return `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Tenés que producir UNA placa de cierre de torneo para redes sociales. Esta placa YA EXISTE y fue aprobada por el club, con UN SOLO problema: la cara del jugador de la fila 1 (Lautavester7) no coincide con su render real. Tenés que regenerar la placa COMPLETA reproduciendo TODO igual, pero corrigiendo ÚNICAMENTE esa cara.

═══ REFERENCIA PRINCIPAL — LA PLACA YA APROBADA (OBLIGATORIO) ═══
Te adjunto la placa "Cierre 11x11 T2-style APROBADA" — es la versión ya aprobada por el club. Reproducila EXACTAMENTE igual en todo: mismo layout, mismo fondo azul marino oscuro con rayas/destellos diagonales celestes, mismo escudo del club arriba a la izquierda, mismo logo de liga arriba a la derecha, mismo título "CIERRE" en piedra plateada 3D + "11X11" en celeste tipo rayo/grafiti debajo, mismas 5 filas con número de camiseta gigante en piedra plateada a la izquierda + nombre al lado + categoría/stat en letra chica celeste/blanca debajo, mismos jugadores en foto grande superpuesta a la derecha de cada fila con resplandor celeste detrás, mismo kit negro actual T3 en los 5 jugadores, mismo formato vertical angosto tipo story (9:16, ~941x1672 px). NO cambies nada de esto — es una corrección puntual, no un rediseño.

═══ ÚNICO CAMBIO A HACER — CARA DEL JUGADOR 1 (LAUTAVESTER7), CRÍTICO ═══
En la placa aprobada que te adjunto, la fila 1 (dorsal "7", LAUTAVESTER7) tiene la CARA INCORRECTA — no es la cara real del jugador, la IA se desvió al generarla. Tenés que reemplazar SOLO esa cara por la cara REAL de Lautavester7, manteniendo la misma pose general de medio cuerpo, el mismo resplandor celeste de fondo y el mismo encuadre de la fila.

Te adjunto DOS referencias de la cara/apariencia real de Lautavester7, mirala con mucha atención:
- Su render de cuerpo completo con la camiseta negra actual puesta (mismo que usan las otras 4 filas para sus jugadores).
- Un RECORTE cerrado, solo de cabeza y cara, del mismo render — para que no haya ninguna ambigüedad de encuadre sobre cómo es su rostro real.

Rasgos EXACTOS que tenés que reproducir en la cara del jugador 1, sin inventar ni aproximar:
- Piel oscura (tono de piel afro), con barba tupida y prolija, oscura, que cubre mandíbula y mentón por completo (barba cerrada, no rala ni de varios días).
- Pelo corto, prolijo, con un mechón/textura clara o plateada visible en la parte de arriba de la cabeza (canas o mechón decolorado, notorio contra el resto del pelo oscuro).
- Gafas de sol ENVOLVENTES estilo "shield" (una sola lente curva de lado a lado, sin puente central visible), de marco blanco/plateado y lente espejada VERDE brillante — es un rasgo distintivo, no lo cambies por otro tipo de lentes ni otro color.
- Expresión seria/neutra, mirando al frente, mismo tipo de encuadre de medio cuerpo que ya tiene esa fila en la placa aprobada.

Es CRÍTICO que el resultado sea un match fiel y reconocible de la foto de referencia real — no una interpretación libre ni un jugador genérico. Si dudás entre parecerte más al estilo artístico de la placa o a la cara real adjunta, priorizá SIEMPRE la fidelidad a la cara real.

═══ EL RESTO DE LOS JUGADORES — NO TOCAR ═══
Las otras 4 filas (Juanchyroman08, Cabers14, Juan_Martinez4, fedeavv9) ya están bien en la placa aprobada — mantenelas exactamente iguales, con sus caras, poses y kits actuales tal como aparecen en la referencia principal. Por las dudas te adjunto también sus renders reales, usalos si necesitás redibujar algo de esas filas, pero el objetivo es que salgan igual que en la placa aprobada.

Para referencia completa, este es el contenido de las 5 filas (de arriba hacia abajo), ya reflejado en la placa aprobada:

${rows}

═══ TEXTO — MUY IMPORTANTE ═══
Todo el texto debe quedar perfectamente legible, sin errores de tipeo, respetando EXACTAMENTE la ortografía y mayúsculas de cada gamertag y cada línea de stat tal como aparecen en la placa aprobada y en la lista de arriba (los gamertags son nombres de usuario reales, copialos carácter por carácter, incluyendo guiones bajos y números). No degrades ni cambies el texto de las filas 2 a 5 al regenerar.

═══ FORMATO ═══
Story de Instagram — proporción vertical angosta, aproximadamente 941x1672 px (9:16), igual que la placa aprobada adjunta. Sin marcas de agua, sin texto adicional que no esté pedido acá.

Generá la imagen ahora.`;
}

async function getPage() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const chatgptPages = context.pages().filter(p => p.url().includes('chatgpt.com'));
  // Si ya hay una pestaña de ChatGPT abierta (posible otro agente corriendo en
  // paralelo sobre la placa dorada), no la tocamos: abrimos una nueva.
  let page;
  if (chatgptPages.length === 0) {
    page = await context.newPage();
  } else {
    page = await context.newPage();
  }
  page.setDefaultTimeout(0);
  return page;
}

async function main() {
  const page = await getPage();

  const faceCropSrc = await buildFaceCrop();

  const srcFiles = [
    APPROVED_PLACA, LEAGUE_LOGO, CREST_PATH,
    ...PLAYERS.map(p => path.resolve(p.render)),
  ];
  const missing = srcFiles.filter(f => !fs.existsSync(f));
  if (missing.length) {
    console.log('ADVERTENCIA — adjuntos faltantes (se continúa sin ellos):', missing);
  }

  const existingSrc = srcFiles.filter(f => fs.existsSync(f));
  const attachments = [];
  let totalBefore = 0, totalAfter = 0;
  for (const f of existingSrc) {
    // La placa aprobada es grande (~2.7MB) y ya viene en su proporción real
    // (941x1672) — comprimirla a 900x900 "inside" no la deforma, solo reduce
    // tamaño de archivo.
    const compressed = await prepareAttachment(f);
    totalBefore += fs.statSync(f).size;
    totalAfter  += fs.statSync(compressed).size;
    attachments.push(compressed);
  }
  // Crop de cara: no re-comprimir con resize agresivo, ya es chico (450x340).
  attachments.push(faceCropSrc);
  totalBefore += fs.statSync(FACE_CROP_SRC).size; // aproximado, no exacto pero informativo
  totalAfter  += fs.statSync(faceCropSrc).size;

  console.log(`  Adjuntos preparados: ${attachments.length} archivos, ~${(totalAfter / 1024 / 1024).toFixed(1)}MB total`);

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
          page, { date: 'lautavester7-facefix' }, 'placa', prompt,
          { freshChat: true, excludeSrcs: [], attachments }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) break;
        await deleteChatById(page, currentChatId(page));
        continue;
      }

      const dims = await imageRatio(path.join('Renders/Daily News', filename));
      console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(2)}, objetivo ~${REF_RATIO_TARGET})`);
      finalFile = filename;
      finalDims = dims;

      const wrongFormat = dims.ratio > STORY_MAX_RATIO || dims.ratio < 0.40;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito el formato STORY vertical angosto, aproximadamente 941x1672 px (9:16), igual que la placa aprobada adjunta — NO el formato post 4:5.`;
        console.log(`  ⚠ ${correction}`);
        await deleteChatById(page, currentChatId(page));
        continue;
      }
      break;
    }

    if (finalFile) {
      const src = path.join('Renders/Daily News', finalFile);
      // Backup del original antes de sobrescribir.
      if (fs.existsSync(APPROVED_PLACA)) {
        fs.copyFileSync(APPROVED_PLACA, BACKUP_PATH);
        console.log(`\nBackup guardado en: ${BACKUP_PATH}`);
      }
      fs.copyFileSync(src, DEST_PATH);
      fs.unlinkSync(src);
      console.log(`Sobrescrito: ${DEST_PATH}`);
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
    console.log(`Dimensiones: ${finalDims.width}x${finalDims.height} (proporción ${finalDims.ratio.toFixed(2)})`);
  } else {
    console.log('No se generó ningún archivo.');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
