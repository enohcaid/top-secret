/**
 * One-off: le pide a ChatGPT que arme la foto grupal del plantel T3 (20
 * jugadores) parados/sentados en la cancha con la tribuna de fondo, en 2
 * versiones (uniforme / traje formal), usando las 4 placas de 5 jugadores
 * como referencia de identidad+kit (cada jugador ya tiene su gamertag
 * escrito debajo en la placa) y la foto formal ya aprobada como referencia
 * de traje. Formato 2:1 (~1774x887) para reemplazar logos/Facha 0-3.webp.
 *
 * v2: en vez de solo "usá estos 20 jugadores", se define una posicion
 * EXACTA para cada uno (fila de atras parada / fila de adelante sentada en
 * un banco, orden izquierda a derecha con nombre) para reducir duplicados.
 * Se puede borrar despues de correrlo.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const OUT_DIR = process.env.PLACAS_OUT_DIR || path.resolve('.placas-tmp');
const GROUPS = [
  path.join(OUT_DIR, 'grupo1-arco-defensa.png'),
  path.join(OUT_DIR, 'grupo2-lateral-medio.png'),
  path.join(OUT_DIR, 'grupo3-medio-delantero.png'),
  path.join(OUT_DIR, 'grupo4-delanteros.png'),
];
const CREST_REF  = path.resolve('logos/TOP Secret White.png');
const FORMAL_REF = path.resolve('Renders/Sesión T3/06_ivan-cabj-la12_formal.png');

const BACK_ROW = [
  'IVAN_CABJ_LA12', 'RIVAROLA90', 'ALEXISRAIES23', 'CABERS14', 'CAT_FEL',
  'HUBER236', 'JUAN_MARTINEZ4', 'RS32-DANISTONE', 'CIPRIMANCINI', 'GUIIDOW',
];
const FRONT_ROW = [
  'ELI_NO-SKILL', 'LIL_DEKUROKO', 'MAURIII-_1891', 'BLACKPANTHER-CG', 'LAUTAVESTER7',
  'YZYTX0', 'RAMIRO4588', 'FEDEAVV9', 'JUANCHYROMAN08', 'KEE_VIIN03',
];

const INTRO = `Te adjunto 4 imágenes de referencia. Cada una muestra a 5 jugadores del plantel de Top Secret FC (club argentino de fútbol virtual, EA Sports FC Clubs Pro), con su gamertag escrito debajo de cada uno — son 20 jugadores en total, exactamente los que necesito en la foto, ni uno más ni uno menos. Usá esas 4 imágenes como fuente de verdad de la cara, el peinado y el dorsal de cada jugador — no inventes jugadores nuevos ni repitas a ninguno. También adjunto el escudo oficial del club en blanco.`;

const POSICIONES = `
UBICACIÓN EXACTA DE CADA JUGADOR — foto de equipo clásica, en dos filas:

Fila de ATRÁS, parados, de IZQUIERDA a DERECHA:
${BACK_ROW.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Fila de ADELANTE, sentados en un banco largo (banco de madera/estadio, corrido de punta a punta), de IZQUIERDA a DERECHA:
${FRONT_ROW.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Respetá ese orden exacto, izquierda a derecha, en cada fila. Un jugador por lugar, ningún jugador repetido, ningún lugar vacío.`;

const ESCENA = `Foto grupal real de plantel de fútbol profesional, en la cancha (césped), con las tribunas del estadio de fondo. En las tribunas tienen que verse los colores del club (negro y azul) y el escudo del club grande y visible en algún sector de la tribuna. Luz de estadio, foto de equipo profesional, nítida. Corrección puntual: el jugador CABERS14 tiene que llevar el dorsal 5 (no el 4 que aparece en su foto de referencia). Formato panorámico horizontal, proporción 2:1 (aproximadamente 1774x887 píxeles).
${POSICIONES}`;

const promptKit = `${INTRO}

${ESCENA}

Cada jugador viste EXACTAMENTE el mismo uniforme negro y el mismo dorsal que aparece en su foto de referencia — no cambies el diseño del kit, con medias y botines de fútbol.

La fila de ATRÁS tiene que estar parada directamente sobre el césped, pisando el pasto justo detrás del banco (NO sobre ningún escalón, tarima o desnivel) — lo suficientemente cerca del banco como para que la fila de adelante (sentada) les tape la cintura hacia abajo, así no se ve el short ni el dorsal de la fila de atrás.`;

const promptFormal = `${INTRO} También te adjunto una foto de referencia del traje formal oficial del club (traje y camisa negros, corbata negra, zapatos de vestir negros, guantes de cuero negros, escudo bordado en el bolsillo del saco) — usá SOLO las 4 primeras imágenes para la cara e identidad de cada jugador (ignorá el uniforme deportivo que llevan puesto ahí), y esta última imagen para saber cómo es el traje formal que todos deben vestir.

${ESCENA}

Todos los jugadores visten el mismo traje formal negro del club (igual al de la foto de referencia del traje): saco, camisa, corbata y ZAPATOS DE VESTIR NEGROS (no zapatillas ni botines de fútbol).`;

async function run(page, label, prompt, attachments, outName) {
  console.log(`\n\n========== ${label} ==========`);
  const { filename } = await generateImage(
    page, { date: `plantel-foto-${label}-v2` }, 'sq', prompt,
    { freshChat: true, excludeSrcs: [], attachments }
  );
  const src = path.join('Renders/Daily News', filename);
  const dest = path.join(OUT_DIR, outName);
  fs.copyFileSync(src, dest);
  fs.unlinkSync(src);
  console.log('Guardada:', dest);
  await deleteChatById(page, currentChatId(page));
}

async function main() {
  for (const g of GROUPS) {
    if (!fs.existsSync(g)) throw new Error('Falta la placa de referencia: ' + g);
  }

  const only = process.env.VERSION_ONLY;
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(0);

  try {
    if (!only || only === 'uniforme') {
      await run(page, 'uniforme', promptKit, [...GROUPS, CREST_REF], 'foto-grupal-uniforme.png');
    }
    if (!only || only === 'formal') {
      await run(page, 'formal', promptFormal, [...GROUPS, FORMAL_REF, CREST_REF], 'foto-grupal-formal.png');
    }
  } finally {
    await page.close().catch(() => {});
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
