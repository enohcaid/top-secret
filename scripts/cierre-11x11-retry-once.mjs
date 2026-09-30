/**
 * Retry puntual de cierre-11x11-once.mjs: el intento 1/3 salió muy bien
 * (layout, stats y jugadores correctos) pero el título salió con un typo
 * "CIERRE 111X11" (un 1 de más) en vez de "CIERRE 11X11". Este script hace
 * UN intento más con una corrección específica sobre ese error, reusando
 * el mismo prompt base. Guarda en un archivo separado para comparar antes
 * de pisar logos/Cierre 11x11 T3.png.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH,
  imageRatio, generateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const REF_IMAGE   = path.resolve('logos/Cierre VPN T3.png');
const LEAGUE_LOGO = path.resolve('logos/11x11 logo.png');
const COMPARE_PATH = path.resolve('logos/Cierre 11x11 T3 (intento3).png');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cierre-11x11-att-'));
async function prepareAttachment(srcPath) {
  const dest = path.join(TMP_DIR, path.basename(srcPath));
  await sharp(srcPath)
    .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, quality: 85 })
    .toFile(dest);
  return dest;
}

const PLAYERS = [
  { render: 'Renders/T3-Frentes/Lautavester7.png', name: 'LAUTAVESTER7', number: '7', category: 'MAX GOLEADOR', stat: '8 GOLES' },
  { render: 'Renders/T3-Frentes/Juanchyroman08.png', name: 'JUANCHYROMAN08', number: '18', category: 'MAX ASISTENTE', stat: '3 ASISTENCIAS' },
  { render: 'Renders/T3-Frentes/Cabers14.png', name: 'CABERS14', number: '5', category: 'MEJOR PROMEDIO', stat: '7.36 DE VALORACIÓN' },
  { render: 'Renders/T3-Frentes/Juan_Martinez4.png', name: 'JUAN_MARTINEZ4', number: '6', category: 'MÁS CONSISTENTE', stat: '7.36 DE PROMEDIO EN 18 PJ' },
  { render: 'Renders/T3-Frentes/fedeavv9.png', name: 'FEDEAVV9', number: '9', category: 'MÁS OFENSIVO', stat: '5G EN 14 PJ' },
];

function buildPrompt() {
  const rows = PLAYERS.map((p, i) =>
    `${i + 1}. "${p.name} - ${p.number}" / "${p.category}" / "${p.stat}"`
  ).join('\n');

  return `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Tenés que producir UNA placa de cierre de torneo para redes sociales.

═══ REFERENCIA DE ESTILO Y LAYOUT (OBLIGATORIO) ═══
Te adjunto una imagen llamada "Cierre VPN T3" que es la placa de cierre de OTRO torneo del mismo club (VPN), ya publicada. Es la referencia EXACTA de layout y estética que tenés que reproducir para esta nueva placa — copiá fielmente: el fondo oscuro de estadio de noche con partículas doradas flotando y luces de reflectores desenfocadas al fondo; el escudo circular metálico del club arriba a la izquierda; el título en tipografía metálica dorada 3D en mayúsculas, en bloque centrado arriba; el logo de la liga arriba a la derecha; las 5 líneas doradas horizontales finas que cruzan la imagen separando 5 franjas de texto a la izquierda; el texto en cada franja en mayúsculas, dorado, alineado a la izquierda, con tres líneas por jugador (nombre y dorsal en la línea de arriba en tamaño más grande, categoría debajo, dato/stat en la última línea); y los 5 jugadores en renders fotorrealistas reales apilados en composición de "escalera" diagonal, desde arriba-izquierda (más chico, más atrás, semioculto, correspondiente a la primera franja de texto) hacia abajo-derecha (más grande, en primer plano, de cuerpo casi completo, correspondiente a la última franja de texto), todos vestidos con la camiseta negra oficial del club T3 (ya la tienen puesta en sus renders adjuntos, no inventes otro uniforme).

Cambiá ÚNICAMENTE lo siguiente respecto de la referencia:

═══ TÍTULO ═══
"CIERRE 11X11" — mismo estilo tipográfico metálico dorado 3D que "CIERRE VPN" en la referencia, mismo tamaño y ubicación (arriba, centrado entre el escudo y el logo de liga).

═══ LOGO DE LIGA (arriba a la derecha) ═══
Te adjunto el logo oficial de la liga 11x11 (escudo azul metálico "1X1 CHALLENGERS ARGENTINA") — usalo tal cual aparece en el adjunto, en el lugar donde la referencia tiene el logo de VPN, mismo tamaño relativo.

═══ ESCUDO DEL CLUB (arriba a la izquierda) ═══
Te adjunto también el escudo oficial del club por separado (círculo metálico oscuro "TOP SECRET FOOTBALL CLUB" con la silueta del espía de sombrero y anteojos) — reproducilo fielmente tal cual aparece en el adjunto, igual que en la referencia, nunca inventes un escudo distinto.

═══ JUGADORES Y TEXTOS (de arriba/atrás a abajo/adelante, en este orden) ═══
Te adjunto 5 renders reales de jugadores del club (ya con su camiseta negra puesta) — usá su cara y apariencia física REAL tal cual aparecen en cada adjunto, nunca inventes otra persona. Asignalos en este orden exacto a la composición en escalera (jugador 1 = más arriba/atrás, jugador 5 = más abajo/adelante en primer plano), cada uno con su franja de texto correspondiente:

${rows}

Aclaración: el número después del guion en cada nombre (ej. "- 7") es el dorsal/número de camiseta del jugador, tal como en la referencia — NO es un dato estadístico, va en la misma línea que el nombre, en el mismo estilo tipográfico que usa la referencia para "LAUTAVESTER7 - 7".

═══ TEXTO — MUY IMPORTANTE ═══
Todo el texto debe quedar perfectamente legible, sin errores de tipeo, respetando EXACTAMENTE la ortografía y mayúsculas de cada gamertag y cada línea de stat tal como te las di arriba (los gamertags son nombres de usuario reales, copialos carácter por carácter, incluyendo guiones bajos).

═══ FORMATO ═══
Publicación de Instagram — proporción vertical 4:5, aproximadamente 1122x1402 px (igual que la referencia adjunta). Sin marcas de agua, sin texto adicional que no esté pedido acá.

CORRECCIÓN sobre DOS intentos anteriores con este mismo prompt: en ambos, la parte numérica del título salió con un dígito "1" de más ("CIERRE 111X11" en un intento, "CIERRE 11X111" en el otro). El título correcto es la palabra "CIERRE", un espacio, y luego EXACTAMENTE 5 (cinco) caracteres, ni uno más ni uno menos: el primero es el número 1, el segundo es el número 1, el tercero es la letra X, el cuarto es el número 1, el quinto es el número 1. Escrito de corrido eso da: "11X11" (cinco caracteres: 1-1-X-1-1). El título completo, de corrido: "CIERRE 11X11". Contá los caracteres antes de dar por terminada la imagen: después del espacio tiene que haber solamente cuatro números y una letra X en el medio, nunca cinco números. Todo lo demás de los intentos anteriores (layout, escudo, logo de liga, los 5 jugadores y sus franjas de texto/stats) estaba bien — mantené eso igual, corregí ÚNICAMENTE el texto del título.

Generá la imagen ahora.`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const srcFiles = [REF_IMAGE, LEAGUE_LOGO, CREST_PATH, ...PLAYERS.map(p => path.resolve(p.render))];
  const attachments = [];
  for (const f of srcFiles.filter(f => fs.existsSync(f))) {
    attachments.push(await prepareAttachment(f));
  }

  let finalFile = null;
  let finalDims = null;

  try {
    const prompt = buildPrompt();
    const { filename } = await generateImage(
      page, { date: 'cierre-11x11-r3' }, 'placa', prompt,
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
