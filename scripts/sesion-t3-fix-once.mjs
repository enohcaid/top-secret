/**
 * One-off: corrige 9 fotos de la sesion T3 (ver sesion-t3-once.mjs y
 * sesion-t3-round2-once.mjs):
 *  - 4 salieron rotas (ChatGPT devolvio el escudo de referencia tal cual,
 *    no una foto nueva): Alexisraies23, Eli_No-SKILL, Lil_Dekuroko,
 *    Juanchyroman08.
 *  - 5 salieron sin el swoosh de Nike visible en la prenda: Ivan_Cabj_La12
 *    (traje), Guiidow (hoodie), Ramiro4588 (puffer), RS32-DaniStone
 *    (tracksuit), lTemp30148 (oversized tee).
 * Mismos ids de archivo que las versiones originales -> sobreescribe en
 * Renders/Sesión T3/.
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
const LOOKBOOK_PATH = path.resolve('logos/Indumentaria TOP Secret T3.png');

const TRAITS = {
  'Alexisraies23':   'piel morena, dreadlocks negros hasta los hombros, barba negra, anteojos deportivos celestes, venda blanca en la mano izquierda',
  'Eli_No-SKILL':    'piel oscura, pelo corto blanco/plateado, máscara celeste cubriendo nariz y boca, guantes de arquero blancos, mangas largas',
  'Lil_Dekuroko':    'piel morena, pelo corto rizado teñido rojo/borgoña, máscara de calavera blanca cubriendo nariz y boca, tatuaje en el antebrazo derecho',
  'Juanchyroman08':  'piel clara, pelo largo azul asomando bajo una gorra gris puesta al revés, dos franjas azules pintadas bajo los ojos, tatuaje tribal azul en el brazo izquierdo, tatuaje en la pantorrilla derecha',
  'Ivan_Cabj_La12':  'ARQUERO: piel clara, pelo negro corto, barba corta, anteojos deportivos azules, brazos tatuados en tinta azul, guantes de arquero con puño amarillo',
  'Guiidow':         'piel trigueña, pelo oscuro rapado a los costados con cresta corta, chivita fina, cara descubierta sin anteojos ni máscara',
  'Ramiro4588':      'piel morena, pelo negro corto tipo afro bajo, chivita, anteojos deportivos con lente dorada espejada',
  'RS32-DaniStone':  'piel clara, pelo revuelto turquesa/verde agua, máscara celeste cubriendo nariz y boca, anteojos, una manga azul en el brazo derecho',
  'lTemp30148':      'piel oscura, pelo negro afro corto, máscara amarilla tipo antifaz cubriendo los ojos, sin barba visible',
};

const SHOTS = [
  // ── rotas: ChatGPT devolvió el escudo de referencia, no una foto nueva ──
  {
    id: '11_alexisraies23_musculosa',
    players: ['Alexisraies23'],
    garment: 'MUSCULOSA de entrenamiento negra (sección 2, entrenamiento)',
    scene: 'Sesión de trabajo físico en el gimnasio del club, levantando pesas, músculos marcados por el esfuerzo, luz dura cenital tipo gimnasio profesional, sudor visible, actitud de concentración total.',
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
    id: '17_juanchyroman08_conjunto-premium',
    players: ['Juanchyroman08'],
    garment: 'CONJUNTO PREMIUM (buzo con cierre + pantalón de viaje, negro) (sección 3, presentación/viaje)',
    scene: 'Llegando al aeropuerto con un bolso deportivo al hombro, caminando con paso decidido por la terminal, luz natural de ventanales grandes de fondo desenfocado, actitud de profesional viajando a un partido, estética editorial deportiva.',
  },
  // ── sin swoosh de Nike visible en la prenda ──
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

IMPORTANTE: Tenés que GENERAR UNA FOTOGRAFÍA COMPLETAMENTE NUEVA. Las imágenes que te adjunto (el escudo del club, el catálogo de indumentaria, el render del jugador) son SOLO referencia visual — nunca devuelvas ninguna de ellas tal cual, ni el escudo solo, ni un recorte del catálogo, como si fuera la foto final. El resultado tiene que ser una escena fotográfica real con el jugador de cuerpo visible en la ropa indicada.

═══ JUGADOR(ES) DE ESTA FOTO — IDENTIDAD OBLIGATORIA ═══
Te adjunto el/los render(s) de referencia de cada jugador — usalos como referencia visual directa de cara, peinado y contextura, son NUESTROS jugadores reales, nunca inventes su apariencia:
${playerLines}

═══ INDUMENTARIA ═══
Te adjunto el catálogo completo de indumentaria oficial del club ("Colección Completa de Indumentaria Top Secret FC"). Para esta foto usá específicamente: ${shot.garment}.
Reproducí fielmente el diseño, corte y colores de esa prenda TAL CUAL aparece en el catálogo adjunto. El swoosh de Nike (proveedor técnico oficial del club) tiene que verse CLARAMENTE VISIBLE en la prenda — en el pecho, la manga o el costado, igual que en indumentaria deportiva Nike real — no lo omitas bajo ningún concepto. Si la prenda además lleva el sponsor "AIA" en el pecho (como los uniformes de juego), incluilo también.

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
- Es una FOTOGRAFÍA nueva, real, con el jugador de cuerpo visible en la escena — si en cambio es una de las imágenes de referencia devuelta sin cambios (el escudo del club solo, un recorte del catálogo de indumentaria, el render de referencia tal cual) = RECHAZADA
- Es una foto limpia, sin texto superpuesto, sin titulares, sin sellos ni marcos gráficos de diseño — si tiene cualquier elemento de "pieza gráfica" en vez de ser una foto pura = RECHAZADA
- El jugador (${playerNames}) es reconocible y consistente con el render de referencia adjunto (misma cara, mismo peinado, mismos rasgos distintivos)
- La prenda (${shot.garment}) se ve fiel al catálogo: colores y diseño correctos, Y EL SWOOSH DE NIKE ES CLARAMENTE VISIBLE en algún lugar de la prenda (pecho, manga o costado) — si no se ve el swoosh en ningún lugar de la ropa = RECHAZADA
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
      console.log(`\n\n========== FIX ${i + 1}/${SHOTS.length}: ${shot.id} ==========`);

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
            page, { date: `sesionT3fix-${i + 1}` }, shot.id, prompt,
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
        if (wrongFormat) {
          correction = `La imagen anterior salió en proporción ${dims.ratio.toFixed(2)} (${dims.width}x${dims.height}) — formato incorrecto, o parece ser una de las imágenes de referencia devuelta tal cual. Necesito una FOTO NUEVA en proporción 4:5 vertical (aprox. 1080x1350), ni panorámica ni extra angosta, ni cuadrada como un logo.`;
          console.log(`  ⚠ ${correction}`);
          if (attempt < MAX_ATTEMPTS) {
            await deleteChatById(page, currentChatId(page));
            continue;
          }
        }

        let evalResponse = null;
        try {
          evalResponse = await evaluateImage(context, path.resolve('Renders/Daily News', filename), buildEvalPrompt(shot));
        } catch (evalErr) {
          console.log(`  Evaluación falló (${evalErr.message.split('\n')[0]}) — aceptando.`);
        }
        const approved = !wrongFormat && (!evalResponse || /^aprobada/i.test(evalResponse.trim()));
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
