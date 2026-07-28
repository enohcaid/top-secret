/**
 * One-off: genera el set de renders de plantel (Frente3, Brazos3, Pose3) para
 * los 4 jugadores recien promovidos desde reclutamiento (CAT_FEL,
 * Juanchyroman08, Lil_Dekuroko, Mauriii-_1891), a partir de sus capturas
 * in-game (EA FC Highlighter) en Documents/TOP SECRET/Fotos/T3. Reusa el
 * pipeline de generacion/evaluacion de generate-image-chatgpt.mjs.
 *
 * Guarda cada pose en Renders/<gamertag>/<Pose>.png y copia Frente3 a
 * Renders/T3-Frentes/<gamertag>.png (igual que el resto del plantel T3).
 *
 * Se puede borrar despues de correrlo (es fijo a esta tanda puntual).
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import {
  MAX_ATTEMPTS, CREST_WHITE_PATH,
  generateImage, evaluateImage, deleteChatById, currentChatId,
} from './generate-image-chatgpt.mjs';

const SRC_DIR = 'C:/Users/User/Documents/TOP SECRET/Fotos/T3';
const T3_FRENTES_DIR = path.resolve('Renders/T3-Frentes');

// Renders YA APROBADOS de otros jugadores, usados como referencia visual
// DIRECTA del kit (mucho mas confiable que el catalogo de indumentaria: el
// primer intento con el catalogo salio con Nike/AIA dorados, escudo
// deformado y un fondo con viñeta/resplandor en vez de transparente limpio).
const KIT_REF_FRENTE  = path.resolve('Renders/Eli_No-SKILL/Frente3.png');
const KIT_REF_FRENTE2 = path.resolve('Renders/Ramiro4588/Frente3.png');
const KIT_REF_BRAZOS  = path.resolve('Renders/Guiidow/Brazos3.png');
const KIT_REF_POSE    = path.resolve('Renders/rivarola90/Pose3.png');
const KIT_REF_BY_POSE = { Frente3: KIT_REF_FRENTE, Brazos3: KIT_REF_BRAZOS, Pose3: KIT_REF_POSE };

const POSES = {
  Frente3: 'De pie, mirando de frente a cámara, brazos totalmente extendidos hacia abajo pegados al cuerpo, postura relajada y erguida, expresión seria y profesional.',
  Brazos3: 'De pie, mirando de frente a cámara, brazos cruzados sobre el pecho, postura firme y segura, expresión seria.',
  Pose3:   'De pie, mirando de frente a cámara, brazos abiertos hacia los costados a la altura de los hombros con las palmas hacia arriba en gesto de bienvenida, postura relajada.',
};

const PLAYERS = [
  {
    key: 'CAT_FEL', num: 55,
    photos: ['CAT_FEL (2).jpeg', 'CAT_FEL (3).jpeg'],
    traits: 'piel clara, corte mohicano/cresta rubio con los laterales rapados, barba candado azul (mismo tono azul parejo en toda la barba), anteojos de sol violeta/azulados envolventes tipo deportivos, tatuajes a cuadros naranja y blanco cubriendo ambos antebrazos',
  },
  {
    key: 'Juanchyroman08', num: 18,
    photos: ['Juanchyroman08 (2).jpeg', 'Juanchyroman08 (5).jpeg'],
    traits: 'piel clara, joven, sin barba, ojos claros, bandana/pañuelo blanco con estampado abstracto colorido (manchas celestes, amarillas y rosas) atado en la nuca con las puntas colgando por detrás de la cabeza, pintura facial geométrica azul-amarilla-rosa bajo cada ojo, tatuaje tribal naranja y negro en la pierna derecha',
    pose3: 'Hacé a este mismo jugador ajustándose la bandana con una mano detrás de la nuca, mirando de frente, postura relajada.',
  },
  {
    key: 'Lil_Dekuroko', num: 22,
    photos: ['Lil_Dekuroko 1.jpeg', 'Lil_Dekuroko.jpeg'],
    traits: 'piel trigueña, bandana/pañuelo rojo con estampado tie-dye cubriendo todo el pelo, máscara tipo calavera blanca con líneas rojas cubriendo nariz y boca hasta el mentón',
    pose3: 'Hacé a este mismo jugador con una mano tocándose la máscara junto al mentón y la otra mano en la cintura, mirando de frente.',
  },
  {
    key: 'Mauriii-_1891', num: 30,
    photos: ['Mauriii-_1891.jpeg'],
    traits: 'piel morena, pelo ondulado largo hasta los hombros rubio platinado grisáceo, muñequera blanca en la muñeca derecha, contextura atlética',
    pose3: 'Hacé a este mismo jugador con las manos entrelazadas detrás de la nuca y los codos hacia afuera, mirando de frente, expresión relajada.',
  },
];

function buildPrompt(player, poseName) {
  return `Sos el diseñador de renders oficiales de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro). Necesito el render de plantel oficial de un jugador para la web del club: un cutout de cuerpo entero, para la ficha del jugador.

═══ JUGADOR — COPIAR TAL CUAL DE LAS FOTOS ADJUNTAS ═══
Te adjunto foto(s) in-game de referencia del jugador real (capturas de EA FC Highlighter). Son la fuente de verdad de su apariencia: copiá exactamente cara, peinado/tocado, vello facial, tatuajes, accesorios (anteojos, máscaras, bandanas, pañuelos), tono de piel y contextura física. No inventes ni cambies nada de lo que ves en esas fotos — no hace falta que te lo describa en texto, mirá la foto.

═══ LO ÚNICO QUE CAMBIA RESPECTO A LA FOTO IN-GAME ═══
1. Uniforme: te adjunto un render YA APROBADO de otro jugador del plantel, en la MISMA pose que necesito ahora. Copiá ese kit EXACTO, pixel por pixel en todo lo que no sea el jugador ni el dorsal:
   - Camiseta y short NEGROS lisos (sin ningún detalle dorado).
   - "AIA" en el pecho y swoosh de Nike en BLANCO (nunca dorado, nunca negro).
   - Escudo circular del club en BLANCO ("Top Secret white.png" adjunto), mismo tamaño y ubicación que en la referencia, sin deformar ni traducir el texto.
   - Mismos parches de manga que en la referencia, en el mismo lugar.
   - Dorsal número ${player.num} en el short, mismo estilo tipográfico blanco que en la referencia.
2. Pose: ${POSES[poseName]}
3. Fondo: PNG con canal alfa real, completamente transparente — cero viñeta, resplandor, aura de color o degradado alrededor del jugador. Tan limpio como el de la referencia adjunta.

═══ ESTILO DEL RENDER ═══
Cuerpo entero de pies a cabeza, con margen de aire arriba y abajo, cámara frontal, encuadre de estudio tipo ficha de videojuego (FIFA Ultimate Team / tarjeta de jugador), formato vertical aproximadamente 1024x1536. Iluminación de estudio limpia y uniforme, sin sombras duras proyectadas, sin efectos de videojuego. Nada de texto, títulos, marcos, marcas de agua ni sellos.

Generá la imagen ahora.`;
}

// Brazos3/Pose3 ya tienen identidad + kit resueltos en el Frente3 aprobado de
// cada jugador — no hace falta reconstruir nada desde fotos in-game, alcanza
// con un prompt de una línea pidiendo el mismo jugador en otra pose.
const POSE_FOLLOWUP_PROMPTS = {
  Brazos3: 'Hacé a este mismo jugador cruzado de brazos.',
  Pose3:   'Hacé a este mismo jugador con los brazos abiertos a los costados, palmas hacia arriba.',
};

function buildPoseEvalPrompt(player, poseName) {
  return `Sos el director de arte de Top Secret FC revisando un render de plantel recién generado.

Evaluá si este render sirve para publicar en la ficha del jugador ${player.key}. Te adjunto también su Frente3 ya aprobado — compará contra ESA imagen (mismo jugador, mismo kit exacto), no contra una descripción de texto.

CRITERIOS (todos deben cumplirse):
- Es el mismo jugador y el mismo kit exacto (camiseta/short negro, "AIA" y swoosh de Nike en BLANCO, escudo circular blanco, parches de manga, dorsal "${player.num}") que la referencia adjunta — nada de eso puede cambiar.
- La pose es la pedida: ${poseName === 'Pose3' && player.pose3 ? player.pose3 : POSES[poseName]}
- El fondo es TRANSPARENTE y tan limpio como el de la referencia — CERO viñeta, resplandor, aura de color o degradado.
- Sin texto, títulos, marcos ni marcas de agua.
- Anatomía correcta (manos, proporciones, cara), sin artefactos raros de IA.

Respondé ÚNICAMENTE con uno de estos dos formatos (nada más):
APROBADA - [motivo breve]
RECHAZADA - [qué falla específicamente, en una línea accionable para pedir una EDICIÓN puntual sobre la misma imagen — no una regeneración completa]`;
}

function buildCorrectionPrompt(correction) {
  return `Corregí específicamente esto de la imagen que acabás de generar en este chat: ${correction}

No la rehagas de cero: es una edición puntual sobre esa misma imagen. Mantené todo lo demás exactamente igual — mismo jugador, mismo encuadre y pose, mismo kit, mismo fondo transparente.`;
}

function buildEvalPrompt(player, poseName) {
  return `Sos el director de arte de Top Secret FC revisando un render de plantel recién generado.

Evaluá si este render sirve para publicar en la ficha del jugador ${player.key}. Te adjunto también sus fotos in-game de referencia (EA FC Highlighter) — compará la identidad del jugador contra ESAS fotos, no contra una descripción de texto.

CRITERIOS (todos deben cumplirse):
- El jugador es el mismo de las fotos in-game adjuntas: misma cara, mismo peinado/tocado, mismos accesorios y tatuajes.
- El kit (camiseta, short, medias, logos, escudo, parches) es IDÉNTICO en diseño y color al render de referencia de otro jugador adjunto — "AIA" y el swoosh de Nike en BLANCO (si están en dorado, negro o cualquier otro color = RECHAZADA). Escudo circular BLANCO (línea blanca, como en "Top Secret white.png"), sin deformar — si el escudo salió oscuro, metálico o dorado = RECHAZADA. Dorsal "${player.num}" visible en el short.
- El fondo es TRANSPARENTE y tan limpio como el de la referencia — CERO viñeta, resplandor, aura de color o degradado alrededor del jugador. Si tiene cualquier brillo o fondo de color = RECHAZADA.
- La pose es la pedida: ${POSES[poseName]}
- Sin texto, títulos, marcos ni marcas de agua.
- Anatomía correcta (manos, proporciones, cara), sin artefactos raros de IA.

Respondé ÚNICAMENTE con uno de estos dos formatos (nada más):
APROBADA - [motivo breve]
RECHAZADA - [qué falla específicamente, en una línea accionable para pedir una EDICIÓN puntual sobre la misma imagen — no una regeneración completa]`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  const results = [];

  const playersToRun = process.env.PLAYER_ONLY
    ? PLAYERS.filter(p => process.env.PLAYER_ONLY.split(',').includes(p.key))
    : PLAYERS;
  const SKIP_EVAL = process.env.SKIP_EVAL === '1';

  try {
    for (const player of playersToRun) {
      const destDir = path.resolve('Renders', player.key);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

      const refPhotos = player.photos
        .map(f => path.join(SRC_DIR, f))
        .filter(f => fs.existsSync(f));

      const posesToRun = process.env.POSES_ONLY ? process.env.POSES_ONLY.split(',') : Object.keys(POSES);
      for (const poseName of posesToRun) {
        const shotId = `${player.key}_${poseName}`;
        console.log(`\n\n========== ${shotId} ==========`);

        const isFollowupPose = poseName !== 'Frente3';
        const ownFrenteRef = path.join(destDir, 'Frente3.png');
        const refAttachments = isFollowupPose
          ? [ownFrenteRef].filter(f => fs.existsSync(f))
          : [CREST_WHITE_PATH, KIT_REF_BY_POSE[poseName], KIT_REF_FRENTE2, ...refPhotos].filter(f => fs.existsSync(f));

        if (isFollowupPose && refAttachments.length === 0) {
          console.log(`  SIN Frente3.png aprobado en ${destDir} — no se puede generar ${poseName}, se salta.`);
          results.push({ id: shotId, file: null });
          continue;
        }

        let correction = null;
        let finalFile = null;
        let chatOpen = false;
        const seenSrcs = [];

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);
          const startFresh = !chatOpen;
          // Un rechazo NO reinicia el chat: le pedimos una edición puntual sobre
          // la imagen que ya generó, para que corrija lo puntual en vez de
          // regenerar a ciegas con el mismo prompt largo y esperar que algo
          // cambie de casualidad.
          const initialPrompt = isFollowupPose
            ? (poseName === 'Pose3' && player.pose3 ? player.pose3 : POSE_FOLLOWUP_PROMPTS[poseName])
            : buildPrompt(player, poseName);
          const prompt = correction ? buildCorrectionPrompt(correction) : initialPrompt;

          let filename, imgUrl;
          try {
            ({ filename, imgUrl } = await generateImage(
              page, { date: `render-${shotId}` }, poseName.toLowerCase(), prompt,
              { freshChat: startFresh, excludeSrcs: seenSrcs, attachments: startFresh ? refAttachments : [] }
            ));
            chatOpen = true;
          } catch (genErr) {
            console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
            if (attempt === MAX_ATTEMPTS) break;
            await deleteChatById(page, currentChatId(page));
            chatOpen = false;
            continue;
          }
          seenSrcs.push(imgUrl);
          finalFile = filename;

          // Sin evaluación automática por pedido explícito: se genera una vez
          // y la revisión la hace el usuario a mano.
          if (SKIP_EVAL) {
            console.log('  Evaluación automática desactivada (SKIP_EVAL) — guardando tal cual.');
            break;
          }

          let evalResponse = null;
          try {
            evalResponse = isFollowupPose
              ? await evaluateImage(
                  context, path.resolve('Renders/Daily News', filename), buildPoseEvalPrompt(player, poseName), [ownFrenteRef]
                )
              : await evaluateImage(
                  context, path.resolve('Renders/Daily News', filename), buildEvalPrompt(player, poseName), refPhotos
                );
          } catch (evalErr) {
            console.log(`  Evaluación falló (${evalErr.message.split('\n')[0]}) — aceptando.`);
          }
          const approved = !evalResponse || /^aprobada/i.test(evalResponse.trim());
          if (approved || attempt === MAX_ATTEMPTS) {
            if (evalResponse && !approved) console.log('  Máximo de intentos alcanzado — usando última versión.');
            break;
          }
          correction = evalResponse.replace(/^rechazada\s*[-–]\s*/i, '').trim();
          console.log(`  Rechazada: "${correction}" — pidiendo corrección en el mismo chat.`);
        }

        if (finalFile) {
          const src = path.join('Renders/Daily News', finalFile);
          const dest = path.join(destDir, `${poseName}.png`);
          fs.renameSync(src, dest);
          console.log(`  Movida a: ${dest}`);
          if (poseName === 'Frente3') {
            fs.copyFileSync(dest, path.join(T3_FRENTES_DIR, `${player.key}.png`));
            console.log(`  Copiada referencia a: ${T3_FRENTES_DIR}/${player.key}.png`);
          }
          results.push({ id: shotId, file: dest });
        } else {
          console.log('  SIN RESULTADO para este shot.');
          results.push({ id: shotId, file: null });
        }

        await deleteChatById(page, currentChatId(page));
      }
    }
  } finally {
    // NUNCA browser.close(): es el Chrome persistente del pipeline diario.
    await page.close().catch(() => {});
  }

  console.log('\n\n===== RESUMEN =====');
  results.forEach(r => console.log(`${r.file ? '✓' : '✗'} ${r.id}${r.file ? ` (${r.file})` : ''}`));
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
