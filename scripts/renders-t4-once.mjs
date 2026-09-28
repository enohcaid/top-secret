/**
 * One-off: set de renders de plantel T4 (Frente4, Brazos4, Pose4) con el Kit 1
 * de T4 (negro con detalles dorados, escudo "Clean logo" dorado del rebrand),
 * para todo el plantel de convocatoria. Mismo metodo que renders-nuevos-once.mjs
 * (T3): Frente4 se arma desde referencias; Brazos4/Pose4 salen del Frente4 propio.
 *
 * Fuentes en Documents/TOP SECRET/Fotos/T4 (capturas in-game + lamina del kit).
 * Guarda en Renders/<gamertag>/<Pose>.png y copia Frente4 a Renders/T4-Frentes/.
 * Saltea lo que ya existe, asi que se puede relanzar para retomar.
 *
 * Env: PLAYER_ONLY=a,b  POSES_ONLY=Frente4,...  FORCE=1 (regenerar aunque exista)
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const SRC_DIR = 'C:/Users/User/Documents/TOP SECRET/Fotos/T4';
// Caras tapadas: con la lámina original ChatGPT copiaba la cara del modelo del
// video en vez la del jugador (pasó con Lautavester7).
const KIT_SHEET = path.join(SRC_DIR, 'KIT1-T4-referencia-sin-cara.png');
const CREST_GOLD = path.resolve('logos/rebrand/Clean logo Dorado.png');
// Kit de arquero: único dato del juego es la carta de adri_cai. Una vez aprobado
// su Frente4, ese render pasa a ser la referencia del kit para el resto de los arqueros.
const CREST_WHITE = path.join(SRC_DIR, 'escudo-clean-blanco.png');
const GK_KIT_REF = [path.resolve('Renders/adri_cai/Frente4.png'), path.join(SRC_DIR, 'adri_cai - carta.png')];
const T4_FRENTES_DIR = path.resolve('Renders/T4-Frentes');

// idRefs: null = usar su Frente3 de T3 (misma cara/look, cambia solo el kit).
const t4 = (k, withBody) => [`${k} - carta.png`, ...(withBody ? [`${k} - cuerpo.png`] : [])].map(f => path.join(SRC_DIR, f));
const PLAYERS = [
  { key: 'adri_cai',         num: 99, gk: true, idRefs: t4('adri_cai', true) },
  { key: 'Juan_Martinez4',   num: 6  },
  { key: 'Ivan_Cabj_La12',   num: 12, gk: true },
  { key: 'rivarola90',       num: 2  },
  { key: 'Alexisraies23',    num: 3  },
  { key: 'Cabers14',         num: 5  },
  { key: 'Huber236',         num: 8  },
  { key: 'Guiidow',          num: 20 },
  { key: 'Lil_Dekuroko',     num: 22 },
  { key: 'Juanchyroman08',   num: 18 },
  { key: 'kee_viin03',       num: 21 },
  { key: 'RS32-DaniStone',   num: 13, idRefs: t4('RS32-DaniStone') },
  { key: 'Lautavester7',     num: 7,  idRefs: t4('Lautavester7'), renewed: true,
    lookNote: 'Misma persona que en su Frente3 (piel oscura, barba tupida, pelo corto oscuro). Lo nuevo según la carta: anteojos deportivos envolventes ROJOS (ya no verdes).' },
  { key: 'CipriMancini',     num: 32, idRefs: t4('CipriMancini'), renewed: true,
    lookNote: 'Misma cara que en su Frente3, pero con el look nuevo de la carta: pelo castaño con rulos por encima de los hombros (ya NO el afro azul), anteojos deportivos ROJOS, manga térmica azul con estampado rojo en el brazo derecho y manga/guante azul en el izquierdo.' },
  { key: 'Elianja20',        num: 24, idRefs: t4('Elianja20', true) },
  { key: 'endiabladorojo66', num: 66, idRefs: t4('endiabladorojo66', true) },
  { key: 'nikileo527',       num: 10, idRefs: t4('nikileo527', true) },
  { key: 'pepolemmo2710',    num: 15, idRefs: t4('pepolemmo2710', true) },
  { key: 'NicoBJ_96',        num: 9,  idRefs: t4('NicoBJ_96', true) },
];

const POSES = {
  Frente4: 'De pie, mirando de frente a cámara, brazos totalmente extendidos hacia abajo pegados al cuerpo, postura relajada y erguida, expresión seria y profesional.',
  Brazos4: 'De pie, mirando de frente a cámara, brazos cruzados sobre el pecho, postura firme y segura, expresión seria.',
  Pose4:   'De pie, mirando de frente a cámara, brazos abiertos hacia los costados a la altura de los hombros con las palmas hacia arriba en gesto de bienvenida, postura relajada.',
};

const FORMAT_BLOCK = `Cuerpo entero de pies a cabeza, con margen de aire arriba y abajo, cámara frontal, encuadre de estudio tipo ficha de videojuego (tarjeta de jugador), formato vertical 1024x1536. Fondo PNG con canal alfa real, completamente transparente — cero viñeta, resplandor, aura de color o degradado. Iluminación de estudio limpia y uniforme. Nada de texto, títulos, marcos ni marcas de agua.`;

function gkKitBlock(player) {
  const fromRender = player.key !== 'adri_cai';
  return `KIT DE ARQUERO TEMPORADA 4 — ${fromRender
    ? 'copialo EXACTO del render aprobado de otro arquero del plantel ("Frente4.png" adjunto): mismo diseño, colores, escudo y ubicación de cada elemento. Ese render es solo referencia del kit: la cara NO es la de este jugador.'
    : 'copialo de la carta in-game adjunta (el jugador lleva puesto el kit de arquero nuevo).'}
   - Camiseta NARANJA con estampado de ondas/zigzag AMARILLO en todo el cuerpo y las mangas, cuello redondo rojo-anaranjado.
   - Swoosh de Nike BLANCO en el pecho (lado derecho del jugador).
   - ESCUDO: en el pecho (lado izquierdo del jugador) va el escudo del club "escudo-clean-blanco.png" adjunto (espía con sombrero, anteojos y cuello de gabardina) en BLANCO liso, NO el león del juego. Sin deformarlo.
   - SIN sponsor en el pecho ni parches de liga.
   - Short ROJO con el mismo escudo blanco chico en una pierna y dorsal número ${player.num} en BLANCO en la otra.
   - Medias ROJAS.
   - Guantes de arquero puestos (los del propio jugador en sus fotos), botines y accesorios del propio jugador.`;
}

function kitBlock(player) {
  if (player.gk) return gkKitBlock(player);
  const dorsal = player.num != null
    ? `Dorsal número ${player.num} en BLANCO en la parte delantera del short (pierna izquierda del jugador, arriba del swoosh), mismo estilo tipográfico que el "6" de la lámina.`
    : 'SIN número en el short.';
  return `KIT TEMPORADA 4 — copialo de la lámina "KIT1-T4-referencia.png" adjunta (capturas del juego):
   - Camiseta NEGRA con cuello en V y ribete dorado con patrón ornamental en el cuello, vivos dorados finos a los costados, franja dorada con patrón en la manga.
   - Swoosh de Nike DORADO en el pecho (lado derecho del jugador).
   - ESCUDO: en el pecho (lado izquierdo del jugador) y abajo en la pierna derecha del short va el escudo del club "Clean logo Dorado.png" adjunto (espía con sombrero, anteojos y cuello de gabardina, dorado metalizado), NO el león que se ve en la lámina — el león es del juego y hay que reemplazarlo. Sin deformar el escudo.
   - SIN sponsor en el pecho (nada de "AIA" ni ningún otro texto).
   - Short NEGRO con swoosh dorado y vivo dorado. ${dorsal}
   - Medias NEGRAS con banda dorada ornamental a media pierna y swoosh dorado.
   - Largo de mangas, mangas térmicas, guantes, cintas, botines y accesorios: los del propio jugador en sus fotos.`;
}

function buildFrentePrompt(player) {
  const idSource = player.renewed
    ? `Te adjunto su render de la temporada pasada ("Frente3.png", ignorá ese uniforme viejo con "AIA") y la carta in-game NUEVA con su look actual. ${player.lookNote} Copiá exactamente esa cara, tono de piel y contextura.`
    : player.idRefs
    ? 'Te adjunto capturas in-game del jugador (carta del club y, si está, su avatar de cuerpo entero con ropa casual). Son la fuente de verdad de su apariencia: copiá exactamente cara, peinado/tocado, vello facial, tatuajes, accesorios (anteojos, máscaras, bandanas, mangas, guantes), tono de piel y contextura. La ropa casual NO va: solo la usás para ver el cuerpo.'
    : `Te adjunto el render oficial de la temporada pasada de este jugador ("Frente3.png"). Es la fuente de verdad de su apariencia: copiá exactamente cara, peinado, vello facial, tatuajes, accesorios, tono de piel y contextura. IGNORÁ su uniforme (el negro con "AIA" blanco): ese kit ya no se usa.`;
  return `Sos el diseñador de renders oficiales de Top Secret FC, club argentino de fútbol virtual (EA Sports FC Clubs Pro). Necesito el render de plantel de la Temporada 4 del jugador ${player.key}: un cutout de cuerpo entero para su ficha.

═══ JUGADOR ═══
${idSource}

${player.gk ? '' : 'IMPORTANTE: la lámina del kit muestra a un modelo genérico del juego con la cara tapada — NO es el jugador. La cara sale SOLO de las fotos del jugador.\n'}
═══ UNIFORME ═══
${kitBlock(player)}

═══ POSE ═══
${POSES.Frente4}

═══ FORMATO ═══
${FORMAT_BLOCK}

Generá la imagen ahora.`;
}

function buildFollowupPrompt(poseName) {
  return `Te adjunto el render aprobado de este jugador. Hacé exactamente al mismo jugador, con el mismo kit idéntico (mismo escudo, swoosh, dorsal, medias y accesorios), en esta pose: ${POSES[poseName]}

${FORMAT_BLOCK}

Generá la imagen ahora.`;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = await context.newPage();
  page.setDefaultTimeout(0);
  fs.mkdirSync(T4_FRENTES_DIR, { recursive: true });

  const only = process.env.PLAYER_ONLY?.split(',');
  const poses = process.env.POSES_ONLY ? process.env.POSES_ONLY.split(',') : Object.keys(POSES);
  const results = [];

  try {
    for (const player of PLAYERS.filter(p => !only || only.includes(p.key))) {
      const destDir = path.resolve('Renders', player.key);
      fs.mkdirSync(destDir, { recursive: true });
      const ownFrente = path.join(destDir, 'Frente4.png');

      for (const poseName of poses) {
        const shotId = `${player.key}_${poseName}`;
        const dest = path.join(destDir, `${poseName}.png`);
        if (fs.existsSync(dest) && process.env.FORCE !== '1') {
          console.log(`= ${shotId} ya existe, se saltea.`);
          results.push({ id: shotId, file: dest, skipped: true });
          continue;
        }
        console.log(`\n========== ${shotId} ==========`);

        let attachments, prompt;
        if (poseName === 'Frente4') {
          const prev = path.join(destDir, 'Frente3.png');
          const idRefs = player.renewed ? [prev, ...player.idRefs] : (player.idRefs || [prev]);
          const kitRefs = !player.gk ? [KIT_SHEET, CREST_GOLD]
            : player.key === 'adri_cai' ? [CREST_WHITE]
            : [GK_KIT_REF[0], CREST_WHITE];
          attachments = [...kitRefs, ...idRefs].filter(f => fs.existsSync(f));
          prompt = buildFrentePrompt(player);
        } else {
          if (!fs.existsSync(ownFrente)) {
            console.log('  Sin Frente4 — se saltea.');
            results.push({ id: shotId, file: null });
            continue;
          }
          attachments = [ownFrente];
          prompt = buildFollowupPrompt(poseName);
        }

        let done = false;
        for (let attempt = 1; attempt <= 2 && !done; attempt++) {
          try {
            const { filename } = await generateImage(
              page, { date: `t4-${shotId}` }, poseName.toLowerCase(), prompt,
              { freshChat: true, excludeSrcs: [], attachments }
            );
            fs.renameSync(path.join('Renders/Daily News', filename), dest);
            if (poseName === 'Frente4') fs.copyFileSync(dest, path.join(T4_FRENTES_DIR, `${player.key}.png`));
            console.log(`  OK -> ${dest}`);
            results.push({ id: shotId, file: dest });
            done = true;
          } catch (e) {
            console.log(`  Error (intento ${attempt}/2): ${e.message.split('\n')[0]}`);
          }
          await deleteChatById(page, currentChatId(page)).catch(() => {});
        }
        if (!done) results.push({ id: shotId, file: null });
      }
    }
  } finally {
    // Nunca browser.close(): es el Chrome persistente del pipeline.
    await page.close().catch(() => {});
  }

  console.log('\n===== RESUMEN =====');
  results.forEach(r => console.log(`${r.file ? 'OK' : 'FALTA'} ${r.id}${r.skipped ? ' (ya estaba)' : ''}`));
}

main().then(() => process.exit(0)).catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
