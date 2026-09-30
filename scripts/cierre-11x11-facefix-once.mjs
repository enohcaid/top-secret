/**
 * One-off: corrección de la placa "CIERRE 11X11" (logos/Cierre 11x11 T3.png)
 * ya aprobada por el usuario en general, pero con un problema puntual: la
 * cara del jugador de arriba de todo (Lautavester7) no coincide con su
 * render/foto real (Renders/T3-Frentes/Lautavester7.png) — la IA se desvió
 * del rostro real al generarla.
 *
 * El chat original donde se generó la placa ya se borró (política del
 * pipeline: se borra cada chat al terminar), así que no se puede hacer una
 * edición incremental sobre el mismo hilo. Este script regenera la placa
 * COMPLETA de nuevo (freshChat) reusando el mismo prompt base que
 * cierre-11x11-once.mjs (mismo layout/estilo/jugadores/stats), pero:
 *   1. Agrega énfasis MUY fuerte en la fidelidad facial del jugador 1.
 *   2. Adjunta, además del render de cuerpo completo, un RECORTE de solo la
 *      cabeza/cara de ese mismo render (hecho con sharp), para que ChatGPT
 *      tenga una referencia sin ambigüedad de encuadre.
 *   3. Adjunta también la placa ya aprobada (Cierre 11x11 T3.png) como
 *      referencia de "así tiene que quedar, cambiando solo la cara del
 *      jugador de arriba".
 *
 * Guarda en un archivo de comparación separado — logos/Cierre 11x11 T3
 * (facefix intento N).png — para inspección manual antes de decidir si se
 * pisa el archivo final. NO hace commit/push, NO toca noticias-data.js ni
 * top-secret-worker.js. Nunca browser.close() (Chrome persistente
 * compartido), solo page.close().
 *
 * Uso: node scripts/cierre-11x11-facefix-once.mjs [intento] ["corrección extra"]
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

const REF_IMAGE      = path.resolve('logos/Cierre VPN T3.png');
const LEAGUE_LOGO     = path.resolve('logos/11x11 logo.png');
const APPROVED_PLACA  = path.resolve('logos/Cierre 11x11 T3.png');
const LAUTA_RENDER    = path.resolve('Renders/T3-Frentes/Lautavester7.png');

const attemptArg = parseInt(process.argv[2], 10) || 1;
const extraCorrection = process.argv[3] || null;
const COMPARE_PATH = path.resolve(`logos/Cierre 11x11 T3 (facefix intento ${attemptArg}).png`);

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cierre-11x11-facefix-'));

async function prepareAttachment(srcPath) {
  const dest = path.join(TMP_DIR, path.basename(srcPath));
  await sharp(srcPath)
    .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, quality: 85 })
    .toFile(dest);
  return dest;
}

// Recorte de SOLO cabeza/cara de Lautavester7, tomado del mismo render de
// cuerpo completo (1024x1536), medido a mano sobre ese archivo.
async function prepareFaceCrop() {
  const dest = path.join(TMP_DIR, 'Lautavester7-cara.png');
  await sharp(LAUTA_RENDER)
    .extract({ left: 350, top: 0, width: 340, height: 360 })
    .resize({ width: 900 })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  return dest;
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

function buildPrompt() {
  const rows = PLAYERS.map((p, i) =>
    `${i + 1}. "${p.name} - ${p.number}" / "${p.category}" / "${p.stat}"`
  ).join('\n');

  return `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Tenés que REGENERAR una placa de cierre de torneo para redes sociales que ya existe, corrigiendo ÚNICAMENTE la cara de un jugador.

═══ REFERENCIA DE ESTILO Y LAYOUT (OBLIGATORIO) ═══
Te adjunto dos referencias:
1. Una imagen llamada "Cierre VPN T3": la placa de cierre de OTRO torneo del mismo club (VPN), ya publicada, que define el estilo general (fondo, tipografía, líneas doradas, etc.).
2. Una imagen llamada "Cierre 11x11 T3": la VERSIÓN YA APROBADA de ESTA MISMA placa (11x11), con el layout, textos, jugadores 2 a 5 y composición general ya correctos y aprobados por el club. Tu trabajo es reproducir esta segunda imagen CASI EXACTAMENTE IGUAL, cambiando ÚNICAMENTE la cara del jugador que está arriba de todo (el primero, más chico, más atrás, con anteojos de sol verdes) — el resto de la placa (fondo, título, escudos, logo de liga, líneas doradas, textos de las 5 franjas, y los jugadores 2, 3, 4 y 5) debe quedar IGUAL a como está en "Cierre 11x11 T3".

Descripción general del estilo (para que lo reproduzcas fielmente si hace falta): fondo oscuro de estadio de noche con partículas doradas flotando y luces de reflectores desenfocadas al fondo; el escudo circular metálico del club arriba a la izquierda; el título "CIERRE 11X11" en tipografía metálica dorada 3D en mayúsculas, en bloque centrado arriba; el logo de la liga 11x11 arriba a la derecha; 5 líneas doradas horizontales finas que cruzan la imagen separando 5 franjas de texto a la izquierda; el texto en cada franja en mayúsculas, dorado, alineado a la izquierda, con tres líneas por jugador (nombre y dorsal en la línea de arriba, categoría debajo, dato/stat en la última línea); y los 5 jugadores en renders fotorrealistas reales apilados en composición de "escalera" diagonal, todos vestidos con la camiseta negra oficial del club T3.

═══ CORRECCIÓN CRÍTICA — CARA DEL JUGADOR 1 (LAUTAVESTER7) ═══
Este es el ÚNICO problema a resolver. En la placa ya aprobada, la cara del jugador de arriba de todo (jugador 1, "LAUTAVESTER7 - 7") NO coincide con su render/foto real — la IA se desvió del rostro real. Es CRÍTICO que en esta nueva versión la cara de ese jugador sea un match FIEL y RECONOCIBLE de la foto de referencia real que te adjunto por separado (el render de cuerpo completo de Lautavester7, y además un RECORTE de acercamiento de SOLO su cabeza/cara, tomado del mismo render, para que no haya ambigüedad de encuadre). Prestá atención en particular a:
- El mismo tono de piel oscuro.
- La misma forma de barba: tupida, cerrada, cubriendo mandíbula y mentón por completo, recortada prolija.
- Los mismos anteojos de sol verdes envolventes (tipo "shield", una sola lente curva de espejo verde, armazón blanco/plateado fino) — la forma exacta del armazón importa, no un modelo genérico de anteojos de sol.
- El mismo pelo corto, tipo fade, con un mechón/textura clara o plateada/grisácea arriba (canas o mechas claras), NO un pelo liso ni un peinado distinto.
- Los mismos rasgos faciales generales: forma de cara, nariz, cejas.

No inventes otra persona ni otra combinación de rasgos para este jugador — usá la foto de referencia como fuente de verdad absoluta para su rostro, tal como ya se hizo correctamente con los otros 4 jugadores en la placa aprobada.

═══ TÍTULO ═══
"CIERRE 11X11" — EXACTAMENTE esos caracteres tras el espacio: 1-1-X-1-1 (cinco caracteres, cuatro números y una letra X en el medio). Igual que en la placa ya aprobada.

═══ LOGO DE LIGA Y ESCUDO DEL CLUB ═══
Reproducilos tal cual aparecen en los adjuntos y en la placa ya aprobada, sin inventar variantes.

═══ JUGADORES Y TEXTOS (de arriba/atrás a abajo/adelante, en este orden) ═══
${rows}

Aclaración: el número después del guion en cada nombre (ej. "- 7") es el dorsal/número de camiseta del jugador — NO es un dato estadístico, va en la misma línea que el nombre.

═══ TEXTO — MUY IMPORTANTE ═══
Todo el texto debe quedar perfectamente legible, sin errores de tipeo, respetando EXACTAMENTE la ortografía y mayúsculas de cada gamertag y cada línea de stat tal como te las di arriba. Verificá especialmente que las franjas de texto de los jugadores 2 a 5 (Juanchyroman08, Cabers14, Juan_Martinez4, Fedeavv9) queden tan legibles y correctas como en la placa ya aprobada — no deben degradarse por esta regeneración.

═══ FORMATO ═══
Publicación de Instagram — proporción vertical 4:5, aproximadamente 1122x1402 px (igual que las referencias adjuntas). Sin marcas de agua, sin texto adicional que no esté pedido acá.${extraCorrection ? `\n\nCORRECCIÓN ADICIONAL sobre un intento previo de esta misma corrección: ${extraCorrection}` : ''}

Generá la imagen ahora.`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const srcFiles = [
    REF_IMAGE, APPROVED_PLACA, LEAGUE_LOGO, CREST_PATH,
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
    const compressed = await prepareAttachment(f);
    totalBefore += fs.statSync(f).size;
    totalAfter  += fs.statSync(compressed).size;
    attachments.push(compressed);
  }
  const faceCrop = await prepareFaceCrop();
  attachments.push(faceCrop);
  totalAfter += fs.statSync(faceCrop).size;
  console.log(`  Adjuntos: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfter / 1024 / 1024).toFixed(1)}MB (${attachments.length} archivos, incluye recorte de cara)`);

  let finalFile = null;
  let finalDims = null;

  try {
    console.log(`\n\n========== Intento facefix ${attemptArg} ==========`);
    const prompt = buildPrompt();

    const { filename } = await generateImage(
      page, { date: `cierre-11x11-facefix-${attemptArg}` }, 'placa', prompt,
      { freshChat: true, excludeSrcs: [], attachments }
    );

    const dims = await imageRatio(path.join('Renders/Daily News', filename));
    console.log(`  ${dims.width}x${dims.height} (proporción ${dims.ratio.toFixed(2)})`);
    finalFile = filename;
    finalDims = dims;

    const src = path.join('Renders/Daily News', finalFile);
    fs.copyFileSync(src, COMPARE_PATH);
    fs.unlinkSync(src);
    console.log(`\nGuardada para comparar: ${COMPARE_PATH}`);

    await deleteChatById(page, currentChatId(page));
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}

  console.log('\n\n===== RESUMEN =====');
  if (finalFile) {
    console.log(`Archivo: ${COMPARE_PATH}`);
    console.log(`Dimensiones: ${finalDims.width}x${finalDims.height} (proporción ${finalDims.ratio.toFixed(2)})`);
  } else {
    console.log('No se generó ningún archivo.');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
