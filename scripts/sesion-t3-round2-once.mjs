/**
 * One-off: segunda tanda de la sesion de fotos T3 (ver sesion-t3-once.mjs),
 * para los jugadores del plantel que quedaron sin foto en la primera ronda.
 * Mismo pipeline, mismo estilo editorial, misma carpeta de salida.
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

const TRAITS = {
  'Alexisraies23':  'piel morena, dreadlocks negros hasta los hombros, barba negra, anteojos deportivos celestes, venda blanca en la mano izquierda',
  'Cabers14':       'piel muy oscura, dreadlocks negros largos y sueltos, máscara de calavera blanca cubriendo nariz y boca, mangas largas negras',
  'CAT_FEL':        'piel clara, laterales de la cabeza rapados con mohawk corto rubio arriba, barba teñida de azul, anteojos de sol azules, mangas de compresión a cuadros rojo y blanco en ambos antebrazos, tatuajes en los brazos',
  'Eli_No-SKILL':   'piel oscura, pelo corto blanco/plateado, máscara celeste cubriendo nariz y boca, guantes de arquero blancos, mangas largas',
  'Lil_Dekuroko':   'piel morena, pelo corto rizado teñido rojo/borgoña, máscara de calavera blanca cubriendo nariz y boca, tatuaje en el antebrazo derecho',
  'Full_boxxing_':  'piel oscura, pelo corto rizado teñido rubio ceniza, anteojos de sol azules espejados envolventes, barba candado prolija, guantes blancos',
  'Juanchyroman08': 'piel clara, pelo largo azul asomando bajo una gorra gris puesta al revés, dos franjas azules pintadas bajo los ojos, tatuaje tribal azul en el brazo izquierdo, tatuaje en la pantorrilla derecha',
  'kee_viin03':     'piel oscura, afro grande y voluminoso teñido de rojo/rosa intenso, sin barba, contextura atlética',
  'lTemp30148':     'piel oscura, pelo negro afro corto, máscara amarilla tipo antifaz cubriendo los ojos, sin barba visible',
};

const SHOTS = [
  {
    id: '11_alexisraies23_musculosa',
    players: ['Alexisraies23'],
    garment: 'MUSCULOSA de entrenamiento negra (sección 2, entrenamiento)',
    scene: 'Sesión de trabajo físico en el gimnasio del club, levantando pesas, músculos marcados por el esfuerzo, luz dura cenital tipo gimnasio profesional, sudor visible, actitud de concentración total.',
  },
  {
    id: '12_cabers14_campera-urbana',
    players: ['Cabers14'],
    garment: 'CAMPERA URBANA negra con capucha (sección casual/lifestyle)',
    scene: 'Caminando de noche por una calle de ciudad, luces de neón y carteles desenfocados de fondo, manos en los bolsillos, actitud fría y reservada, estética de campaña de moda urbana nocturna.',
  },
  {
    id: '13_cat_fel_saco-sport',
    players: ['CAT_FEL'],
    garment: 'SACO SPORT negro con camisa (sección 4, formal/institucional)',
    scene: 'Sentado en una conferencia de prensa institucional del club, micrófonos desenfocados en primer plano, fondo con el escudo del club repetido tipo backdrop, luz de estudio profesional, postura erguida y seria.',
  },
  {
    id: '14_eli_no-skill_rompeviento',
    players: ['Eli_No-SKILL'],
    garment: 'ROMPEVIENTO LIVIANO negro con capucha (sección 2, entrenamiento)',
    scene: 'Entrenamiento bajo llovizna en la cancha, gotas de lluvia visibles en el aire y en la ropa, césped mojado reflejando la luz gris del cielo nublado, expresión de foco absoluto, estética de foto deportiva dramática.',
  },
  {
    id: '15_lil_dekuroko_hoodie-blanco',
    players: ['Lil_Dekuroko'],
    garment: 'HOODIE BLANCO con el logo del club al pecho (sección casual/lifestyle)',
    scene: 'Retrato urbano nocturno bajo un cartel de luces de neón azules y rosas, capucha puesta, mirada directa a cámara, fondo de ciudad desenfocado, alto contraste, estética de campaña de moda streetwear.',
  },
  {
    id: '16_full_boxxing_bomber-jacket',
    players: ['Full_boxxing_'],
    garment: 'BOMBER JACKET negra (sección casual/lifestyle)',
    scene: 'En el vestuario del club después del entrenamiento, sentado relajado en el banco junto a los lockers, sonrisa leve, luz cálida artificial de vestuario, ambiente relajado y auténtico, foto documental de club.',
  },
  {
    id: '17_juanchyroman08_conjunto-premium',
    players: ['Juanchyroman08'],
    garment: 'CONJUNTO PREMIUM (buzo con cierre + pantalón de viaje, negro) (sección 3, presentación/viaje)',
    scene: 'Llegando al aeropuerto con un bolso deportivo al hombro, caminando con paso decidido por la terminal, luz natural de ventanales grandes de fondo desenfocado, actitud de profesional viajando a un partido, estética editorial deportiva.',
  },
  {
    id: '18_kee_viin03_parka',
    players: ['kee_viin03'],
    garment: 'PARKA negra con capucha de piel (sección 6, abrigo/invierno)',
    scene: 'Entrenamiento matutino de pleno invierno con nieve leve cayendo, aliento visible, luz fría azulada del amanecer, atmósfera cinematográfica intensa, mirada firme hacia el horizonte del campo.',
  },
  {
    id: '19_ltemp30148_oversized-tee',
    players: ['lTemp30148'],
    garment: 'OVERSIZED TEE blanca con el escudo del club (sección 8, fanwear/streetwear)',
    scene: 'Foto lifestyle sentado en las gradas vacías del estadio, gorra puesta, postura relajada y desenfadada, luz suave de atardecer entrando por el lateral, estética de campaña de moda deportiva casual.',
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
Reproducí fielmente el diseño, corte y colores de esa prenda TAL CUAL aparece en el catálogo adjunto, incluyendo el logo swoosh de Nike (proveedor técnico oficial) y el sponsor "AIA" en el pecho cuando la prenda lo tenga — son parte de la identidad visual real de la indumentaria del club, no los quites ni los reemplaces.

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
- La prenda (${shot.garment}) se ve fiel al catálogo: colores, diseño y detalles correctos
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
            page, { date: `sesionT3r2-${i + 1}` }, shot.id, prompt,
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
