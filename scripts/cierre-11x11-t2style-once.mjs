/**
 * One-off: SEGUNDA VARIANTE de la placa "CIERRE 11X11" de fin de torneo,
 * esta vez imitando el estilo visual de `logos/Cierre 11x11 T2.png` (fondo
 * azul marino con destellos diagonales celestes, título "CIERRE" en piedra
 * plateada 3D + "11X11" en letras celestes tipo rayo/grafiti, números de
 * camiseta gigantes) en vez del estilo dorado de `logos/Cierre VPN T3.png`
 * ya usado en `cierre-11x11-once.mjs` / `logos/Cierre 11x11 T3.png`.
 *
 * Mismo contenido (5 jugadores + stats) que la variante dorada, para que el
 * usuario compare cuál estilo prefiere. NO reemplaza el archivo existente —
 * genera `logos/Cierre 11x11 T2-style.png` aparte. NO se commitea/pushea.
 *
 * Gotcha ya descubierto en la corrida anterior (ver cierre-11x11-once.mjs):
 * los adjuntos sin comprimir (~9MB) superan la ventana de 90s de
 * sendPromptInProject para que se habilite el botón de enviar → el mensaje
 * nunca se manda de verdad. Se recomprimen acá también antes de adjuntar.
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

const REF_IMAGE   = path.resolve('logos/Cierre 11x11 T2.png');
const LEAGUE_LOGO = path.resolve('logos/11x11 logo.png');
const DEST_PATH   = path.resolve('logos/Cierre 11x11 T2-style.png');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cierre-11x11-t2style-att-'));

async function prepareAttachment(srcPath) {
  const dest = path.join(TMP_DIR, path.basename(srcPath));
  await sharp(srcPath)
    .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, quality: 85 })
    .toFile(dest);
  return dest;
}

// Proporción real de la placa de referencia T2 (ancho/alto): 941x1672 = 0.563
// — mucho más angosta/alta que la variante dorada (que es "post" 4:5, 0.80).
// Esto cae en rango STORY (por debajo de STORY_MAX_RATIO=0.68), no POST.
const REF_RATIO_TARGET = 0.563;

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
    `${i + 1}. Dorsal "${p.number}" / Nombre "${p.name}" / Categoría "${p.category}" / Dato "${p.stat}"`
  ).join('\n');

  return `Sos el diseñador gráfico oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Tenés que producir UNA placa de cierre de torneo para redes sociales — es una SEGUNDA VARIANTE de estilo de una placa que ya existe, para que el club compare y elija.

═══ REFERENCIA DE ESTILO Y LAYOUT (OBLIGATORIO) ═══
Te adjunto una imagen llamada "Cierre 11x11 T2" que es una placa anterior del mismo club, ya publicada en una temporada previa. Es la referencia EXACTA de layout y estética que tenés que reproducir para esta nueva placa — copiá fielmente:
- Fondo azul marino muy oscuro, casi negro, con rayas/destellos diagonales celestes tenues cruzando la imagen y textura de partículas sutil.
- Escudo circular del club arriba a la izquierda (círculo blanco/negro).
- Logo de la liga arriba a la derecha (escudo).
- Título en dos partes centrado arriba, entre ambos escudos: una palabra en tipografía plateada/blanca en relieve 3D tipo piedra tallada, mayúsculas gruesas; debajo, en letras celestes brillantes con textura tipo rayo/grafiti dinámico y ligero efecto de trazo pintado.
- 5 filas apiladas verticalmente, cada una con: el número de camiseta del jugador en tipografía blanca/plateada GIGANTE (mismo estilo 3D en relieve que el título) a la izquierda, el nombre al lado en mayúsculas en un estilo similar pero más chico, y a la derecha de cada fila el jugador en foto/render grande superpuesto (semi-cuerpo, mirando hacia el frente o en pose natural), con un resplandor/aura celeste difuminado detrás de cada jugador que se funde con el fondo. Las filas van intercaladas alternando ligeramente la posición del jugador (a veces más arriba, a veces más abajo) tal como en la referencia, dando sensación dinámica, no una grilla rígida.
- Formato vertical MUY angosto y alto tipo story de Instagram (9:16 aproximado), igual que la referencia adjunta — NO el formato post 4:5.

Cambiá ÚNICAMENTE lo siguiente respecto de la referencia:

═══ TÍTULO ═══
La referencia dice "DESTACADOS" arriba y "11X11" abajo. Para esta placa nueva, cambiá la palabra de arriba a "CIERRE" — mismo tratamiento tipográfico plateado 3D en piedra tallada, mismo tamaño y ubicación. Dejá "11X11" abajo igual, en el mismo estilo celeste tipo rayo/grafiti.

═══ LOGO DE LIGA (arriba a la derecha) ═══
Te adjunto el logo OFICIAL ACTUAL de la liga 11x11 (escudo azul metálico "1X1 CHALLENGERS ARGENTINA") — usalo tal cual aparece en el adjunto. Es una versión más nueva del mismo torneo que la que aparece en la placa de referencia T2 (esa es una versión vieja) — usá el logo actual que te adjunto, no el que se ve en la referencia.

═══ ESCUDO DEL CLUB (arriba a la izquierda) ═══
Te adjunto también el escudo oficial del club por separado (círculo blanco/negro "TOP SECRET FOOTBALL CLUB" con la silueta del espía de sombrero y anteojos) — reproducilo fielmente tal cual aparece en el adjunto, igual que en la referencia, nunca inventes un escudo distinto.

═══ KIT DE LOS JUGADORES — DIFERENCIA CLAVE, MUY IMPORTANTE ═══
En la imagen de referencia T2 los jugadores visten el kit VIEJO de esa temporada (camiseta azul marino con detalles dorados). NO reproduzcas ese kit. Los 5 jugadores de ESTA placa nueva deben aparecer vistiendo el kit ACTUAL de Top Secret T3: camiseta NEGRA oficial, tal como aparece puesta en cada uno de sus renders reales que te adjunto abajo. Tomá de la referencia T2 únicamente el layout, la tipografía, los colores de fondo (azul marino + celeste) y el tratamiento del título/números — pero la ropa de los jugadores sale de sus renders reales adjuntos, nunca de la referencia.

═══ JUGADORES Y TEXTOS (5 filas, en este orden de arriba hacia abajo) ═══
Te adjunto 5 renders reales de jugadores del club (ya con su camiseta negra actual puesta) — usá su cara y apariencia física REAL tal cual aparecen en cada adjunto, nunca inventes otra persona. Asignalos en este orden exacto, cada uno con su fila correspondiente:

${rows}

Aclaración: el número de dorsal (ej. "7") es el número de camiseta real del jugador — va gigante a la izquierda de la fila, en el mismo estilo tipográfico que usa la referencia para los números "21", "32", "7", "9", "30". El nombre va al lado, en mayúsculas.

═══ CATEGORÍA Y STAT — AGREGADO NUEVO RESPECTO DE LA REFERENCIA ═══
La placa de referencia T2 NO tiene texto de categoría/stat debajo del nombre — mostrá igual, en ESTA placa nueva, debajo del nombre de cada jugador, en una tipografía más chica y legible (sans-serif limpia, blanca o celeste clara, sin el efecto 3D pesado del número/nombre — algo más fino, en la línea del tratamiento de texto secundario que usa la variante dorada de esta misma placa, pero adaptado a celeste/blanco): primero la categoría, después el dato/stat, cada uno en su propia línea chica, alineados debajo del nombre.

═══ TEXTO — MUY IMPORTANTE ═══
Todo el texto debe quedar perfectamente legible, sin errores de tipeo, respetando EXACTAMENTE la ortografía y mayúsculas de cada gamertag y cada línea de stat tal como te las di arriba (los gamertags son nombres de usuario reales, copialos carácter por carácter, incluyendo guiones bajos y números).

═══ FORMATO ═══
Story de Instagram — proporción vertical angosta, aproximadamente 941x1672 px (9:16), igual que la placa de referencia adjunta. Sin marcas de agua, sin texto adicional que no esté pedido acá.

Generá la imagen ahora.`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const srcFiles = [REF_IMAGE, LEAGUE_LOGO, CREST_PATH, ...PLAYERS.map(p => path.resolve(p.render))];
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
          page, { date: 'cierre-11x11-t2style' }, 'placa', prompt,
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

      // Formato story esperado: bien angosto/alto, por debajo de STORY_MAX_RATIO.
      // Tolerancia amplia alrededor del target real de la referencia (0.563).
      const wrongFormat = dims.ratio > STORY_MAX_RATIO || dims.ratio < 0.40;
      if (wrongFormat && attempt < MAX_ATTEMPTS) {
        correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito el formato STORY vertical angosto, aproximadamente 941x1672 px (9:16), igual que la placa de referencia T2 adjunta — NO el formato post 4:5.`;
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
    console.log(`Dimensiones: ${finalDims.width}x${finalDims.height} (proporción ${finalDims.ratio.toFixed(2)})`);
  } else {
    console.log('No se generó ningún archivo.');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
