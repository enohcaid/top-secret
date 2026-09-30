/**
 * One-off: sesion de fotos profesional del plantel T3 para mostrar la
 * identidad del club (indumentaria en varias de sus categorias + jugadores
 * y sus rasgos distintivos). Formato Instagram post (4:5), guardado en
 * Renders/Sesion T3/. Reusa el pipeline de generacion/evaluacion de
 * generate-image-chatgpt.mjs pero con un prompt de FOTOGRAFIA EDITORIAL,
 * no el formato "Expediente" de las noticias diarias.
 *
 * Se puede borrar despues de correrlo (es fija a esta sesion puntual).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, POST_MIN_RATIO, POST_MAX_RATIO,
  CREST_PATH, CREST_WHITE_PATH, T3_FRENTES_DIR,
  imageRatio, generateImage, evaluateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const OUT_DIR = path.resolve('Renders/Sesión T3');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const LOOKBOOK_PATH = path.resolve('logos/Indumentaria TOP Secret T3.png');

// Rasgos fisicos (copiados de PLAYER_TRAITS en generate-image-chatgpt.mjs,
// solo los jugadores de esta sesion) — necesarios en el prompt en texto,
// ChatGPT no ve los nombres de archivo de los adjuntos.
const TRAITS = {
  'Juan_Martinez4':  'piel clara, pelo rubio con raya al costado, barba castaña prolija, cinta de capitán en el brazo',
  'rivarola90':      'piel oscura, melena gris plateada hasta los hombros con vincha negra, chivita canosa',
  'Lautavester7':    'piel oscura, pelo muy corto con tinte azul claro, barba negra tupida, visor deportivo verde espejado',
  'CipriMancini':    'piel trigueña, AFRO AZUL gigante y esponjoso, anteojos deportivos oscuros, cuello y brazos tatuados, manga blanca en el brazo derecho',
  'BlackPanther-CG': 'piel morena, pelo muy corto rosa/magenta, máscara de calavera blanca cubriendo nariz y boca, brazos completamente tatuados',
  'Ivan_Cabj_La12':  'ARQUERO: piel clara, pelo negro corto, barba corta, anteojos deportivos azules, brazos tatuados en tinta azul, guantes de arquero con puño amarillo',
  'Guiidow':         'piel trigueña, pelo oscuro rapado a los costados con cresta corta, chivita fina, cara descubierta sin anteojos ni máscara',
  'Ramiro4588':      'piel morena, pelo negro corto tipo afro bajo, chivita, anteojos deportivos con lente dorada espejada',
  'RS32-DaniStone':  'piel clara, pelo revuelto turquesa/verde agua, máscara celeste cubriendo nariz y boca, anteojos, una manga azul en el brazo derecho',
  'Huber236':        'piel clara, pelo negro abundante peinado hacia arriba, barba negra completa y prolija',
  'fedeavv9':        'piel trigueña, pelo corto rubio platinado, muy tatuado en cuello, brazos y piernas, venda blanca en la muñeca izquierda',
};

// Cada shot: jugador(es), prenda (seccion del lookbook adjunto), escena/pose,
// y un id/slug para el archivo final.
const SHOTS = [
  {
    id: '01_juan-martinez4_home-kit',
    players: ['Juan_Martinez4'],
    garment: 'HOME KIT (sección 1, uniforme de juego negro con detalles en oro) — camiseta, short y medias',
    scene: 'Retrato de liderazgo del capitán, de pie en el túnel del estadio con la cinta de capitán visible, luz lateral dramática tipo campaña de Nike/Adidas, mirada fija a cámara, actitud serena y segura.',
  },
  {
    id: '02_rivarola90_away-kit',
    players: ['rivarola90'],
    garment: 'AWAY KIT (sección 1, uniforme de juego blanco con detalles en azul marino) — camiseta, short y medias',
    scene: 'En pleno entrenamiento en el campo de juego, postura defensiva agachada, césped muy verde, luz de mañana clara, foto de acción congelada tipo editorial deportivo.',
  },
  {
    id: '03_lautavester7_third-kit',
    players: ['Lautavester7'],
    garment: 'THIRD KIT (sección 1, uniforme de juego amarillo con detalles en negro) — camiseta, short y medias',
    scene: 'Celebración explosiva de gol, corriendo con los brazos abiertos, luz dorada de atardecer en el estadio, grada desenfocada de fondo, energía y euforia pura.',
  },
  {
    id: '04_ciprimancini_training',
    players: ['CipriMancini'],
    garment: 'REMERA DE ENTRENAMIENTO negra (sección 2, entrenamiento)',
    scene: 'Control de balón en pleno entrenamiento, cuerpo en movimiento, gotas de sudor visibles, luz dura de mediodía, fondo de cancha de entrenamiento con conos desenfocados.',
  },
  {
    id: '05_blackpanther-cg_polo-presentacion',
    players: ['BlackPanther-CG'],
    garment: 'POLO de presentación negro con el escudo bordado (sección 3, presentación/viaje)',
    scene: 'Caminando hacia la entrada del estadio antes de un partido, paso firme y seguro, luz suave de atardecer, fachada del estadio desenfocada de fondo, actitud confiada de profesional.',
  },
  {
    id: '06_ivan-cabj-la12_formal',
    players: ['Ivan_Cabj_La12'],
    garment: 'TRAJE OFICIAL negro con camisa (sección 4, formal/institucional)',
    scene: 'Retrato institucional en estudio, fondo neutro oscuro con el escudo del club sutil de fondo, iluminación de estudio profesional en tres puntos, pose formal seria y elegante, típica foto de portada de club de elite.',
  },
  {
    id: '07_guiidow_hoodie-casual',
    players: ['Guiidow'],
    garment: 'HOODIE NEGRO con el logo del club al pecho (sección 5, casual/lifestyle)',
    scene: 'Foto de estilo urbano/lifestyle, apoyado contra una pared con textura de concreto, luz natural suave de calle, actitud relajada fuera de la cancha, estética de campaña de moda deportiva.',
  },
  {
    id: '08_ramiro4588_puffer-invierno',
    players: ['Ramiro4588'],
    garment: 'HUFFER JACKET / campera de invierno negra (sección 6, abrigo/invierno)',
    scene: 'Entrenamiento matutino de invierno con neblina liviana en el campo, aliento visible en el aire frío, luz fría y suave del amanecer, atmósfera cinematográfica.',
  },
  {
    id: '09_rs32-danistone_tracksuit',
    players: ['RS32-DaniStone'],
    garment: 'TRACKSUIT RETRO negro con blanco (sección 8, fanwear/streetwear)',
    scene: 'Foto lifestyle en una cancha urbana de cemento, apoyado con actitud relajada, luz dura de atardecer, sombras largas, estética de campaña retro deportiva.',
  },
  {
    id: '10_huber236-fedeavv9_duo',
    players: ['Huber236', 'fedeavv9'],
    garment: 'Huber236 con HOME KIT (negro) y fedeavv9 con AWAY KIT (blanco) (sección 1, uniformes de juego)',
    scene: 'Los dos caminando juntos hacia la cancha, hombro con hombro, riendo o conversando de forma natural y espontánea, luz cálida de atardecer, compañerismo genuino, foto documental de vestuario/salida al campo.',
  },
];

function buildPrompt(shot) {
  const playerLines = shot.players
    .map(p => `- ${p}: ${TRAITS[p]}`)
    .join('\n');

  return `Sos el fotógrafo oficial de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro) de élite. Estás haciendo la sesión de fotos institucional de la Temporada 3 para mostrar la identidad del club: la indumentaria oficial y los jugadores del plantel, con la calidad de una producción real de un club top mundial (pensá en las campañas fotográficas reales de clubes europeos grandes — Nike, Adidas, sesiones editoriales de prensa deportiva).

═══ JUGADOR(ES) DE ESTA FOTO — IDENTIDAD OBLIGATORIA ═══
Te adjunto el/los render(s) de referencia de cada jugador — usalos como referencia visual directa de cara, peinado y contextura, son NUESTROS jugadores reales, nunca inventes su apariencia:
${playerLines}

═══ INDUMENTARIA ═══
Te adjunto el catálogo completo de indumentaria oficial del club ("Colección Completa de Indumentaria Top Secret FC"). Para esta foto usá específicamente: ${shot.garment}.
Reproducí fielmente el diseño, corte y colores de esa prenda TAL CUAL aparece en el catálogo adjunto, incluyendo el logo swoosh de Nike (proveedor técnico oficial) y el sponsor "AIA" en el pecho — son parte de la identidad visual real de la indumentaria del club, no los quites ni los reemplaces.

═══ ESCENA ═══
${shot.scene}

═══ ESTILO FOTOGRÁFICO (OBLIGATORIO) ═══
Fotografía deportiva editorial de altísima calidad, luz natural o de estudio profesional (nunca luces de colores artificiales ni efectos de videojuego), composición cinematográfica, profundidad de campo con el jugador nítido y el fondo con leve desenfoque, grano de película sutil tipo revista deportiva premium. Sin texto superpuesto, sin titulares, sin marcos ni sellos gráficos — es una FOTO PURA, no una pieza de diseño gráfico. El escudo del club (el espía con sombrero) puede aparecer en la ropa de forma natural, pero no como elemento gráfico añadido encima de la foto.

═══ FORMATO ═══
Publicación de Instagram — proporción 4:5, VERTICAL (más alto que ancho), aproximadamente 1080×1350 px. Encuadre claramente vertical pero no extremo como una Story (9:16).

Generá la imagen ahora.`;
}

function buildEvalPrompt(shot) {
  const playerNames = shot.players.join(' y ');
  return `Sos el director de fotografía de Top Secret FC revisando una foto de la sesión institucional de la Temporada 3.

Evaluá si esta foto sirve para publicar como parte de la sesión oficial del club.

CRITERIOS (todos deben cumplirse):
- Es una FOTOGRAFÍA limpia, sin texto superpuesto, sin titulares, sin sellos ni marcos gráficos de diseño — si tiene cualquier elemento de "pieza gráfica" (texto, stamps, marcos) en vez de ser una foto pura = RECHAZADA
- El jugador (${playerNames}) es reconocible y consistente con el render de referencia adjunto (misma cara, mismo peinado, mismos rasgos distintivos)
- La prenda (${shot.garment}) se ve fiel al catálogo: colores, diseño, swoosh de Nike y sponsor "AIA" correctos
- Si aparece el escudo del club, es el diseño correcto: circular, con el espía de sombrero y anteojos
- Calidad fotográfica profesional: buena luz, buena composición, anatomía correcta (manos, proporciones, caras), sin artefactos raros de IA

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

  const results = [];

  try {
    for (let i = 0; i < SHOTS.length; i++) {
      const shot = SHOTS[i];
      console.log(`\n\n========== SHOT ${i + 1}/${SHOTS.length}: ${shot.id} ==========`);

      const refAttachments = [
        CREST_PATH, CREST_WHITE_PATH, LOOKBOOK_PATH,
        ...shot.players.map(p => path.join(T3_FRENTES_DIR, `${p}.png`)),
      ].filter(f => fs.existsSync(f));

      let correction = null;
      let finalFile = null;
      let finalDims = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
        const prompt = buildPrompt(shot) + (correction ? `\n\nCORRECCIÓN sobre la versión anterior: ${correction}` : '');

        let filename;
        try {
          ({ filename } = await generateImage(
            page, { date: `sesionT3-${i + 1}` }, shot.id, prompt,
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
        const wrongFormat = dims.ratio < POST_MIN_RATIO || dims.ratio > POST_MAX_RATIO;
        if (wrongFormat && attempt < MAX_ATTEMPTS) {
          correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto. Necesito proporción 4:5 vertical (aprox. 1080x1350), ni panorámica ni extra angosta tipo Story.`;
          console.log(`  ⚠ ${correction}`);
          await deleteChatById(page, currentChatId(page));
          continue;
        }

        let evalResponse = null;
        try {
          evalResponse = await evaluateImage(context, path.resolve('Renders/Daily News', filename), buildEvalPrompt(shot));
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
        await deleteChatById(page, currentChatId(page));
      }

      if (finalFile) {
        const src = path.join('Renders/Daily News', finalFile);
        const destName = `${shot.id}.png`;
        const dest = path.join(OUT_DIR, destName);
        fs.renameSync(src, dest);
        console.log(`  Movida a: ${dest}`);
        results.push({ id: shot.id, file: destName, dims: finalDims });
      } else {
        console.log('  SIN RESULTADO para este shot.');
        results.push({ id: shot.id, file: null });
      }

      await deleteChatById(page, currentChatId(page));
    }
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  console.log('\n\n===== RESUMEN =====');
  results.forEach(r => console.log(`${r.file ? '✓' : '✗'} ${r.id}${r.dims ? ` (${r.dims.width}x${r.dims.height})` : ''}`));
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
