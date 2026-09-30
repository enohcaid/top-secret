/**
 * One-off: modelo de frente de cada jugador de campo con el KIT 2 (alternativo azul) de T4.
 * Parte del Frente4 aprobado (cara, cuerpo y accesorios correctos) y cambia SOLO el uniforme,
 * con la lámina del kit 2 y el escudo dorado como referencia. Estos modelos son después la
 * referencia única del kit azul para cualquier foto grupal/editorial.
 *
 * Guarda Renders/<gamertag>/Frente4-k2.png (+ copia en Renders/T4-Frentes-K2/). Saltea lo existente.
 * Env: PLAYER_ONLY=a,b  FORCE=1
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';
import { FOTOS_DIR } from './lib/env.mjs';

const SRC_DIR = path.join(FOTOS_DIR, 'T4');
const KIT_SHEET = path.join(SRC_DIR, 'KIT2-T4-referencia-sin-cara.png');
const CREST_GOLD = path.resolve('logos/rebrand/Clean logo Dorado.png');
const OUT_DIR = path.resolve('Renders/T4-Frentes-K2');

// Dorsales: roster.js (ROSTER_T4) + Firestore plantel/activo.numeros al 2026-09-29.
const PLAYERS = [
  ['rivarola90', 2], ['Alexisraies23', 3], ['Cabers14', 5], ['Elianja20', 24], ['endiabladorojo66', 66],
  ['Huber236', 8], ['Guiidow', 20], ['nikileo527', 10], ['pepolemmo2710', 15], ['Juan_Martinez4', 6],
  ['RS32-DaniStone', 13], ['CipriMancini', 14], ['Lil_Dekuroko', 22], ['Lautavester7', 7],
  ['Juanchyroman08', 18], ['kee_viin03', 21], ['NicoBJ_96', 9],
];

const prompt = (key, num) => `Sos el diseñador de renders oficiales de Top Secret FC (club argentino de EA Sports FC Clubs Pro). Te adjunto el render aprobado de ${key} ("Frente4.png") con el kit titular negro. Necesito EXACTAMENTE el mismo render —misma persona, misma cara, pelo, barba, tono de piel, tatuajes, contextura, anteojos, mangas térmicas, guantes, cintas, botines, misma pose de frente con los brazos extendidos, mismo encuadre y tamaño— pero con el KIT ALTERNATIVO de la Temporada 4 en lugar del negro.

═══ KIT ALTERNATIVO (copialo de la lámina "KIT2-T4-referencia-sin-cara.png" adjunta) ═══
- Camiseta AZUL FRANCIA (#1E4FD8 aprox.) con CUELLO POLO azul, textura geométrica tono sobre tono muy sutil, vivos AMARILLOS finos en los hombros y bajando por los costados.
- Swoosh de Nike AMARILLO en el pecho (lado derecho del jugador).
- ESCUDO en el pecho (lado izquierdo del jugador): el "Clean logo Dorado.png" adjunto (espía con sombrero, anteojos y cuello de gabardina) en DORADO. Nunca el león del juego. Sin deformarlo.
- SIN sponsor, SIN la palabra "CHELSEA", SIN león, SIN ningún texto escondido en la textura.
- Short AZUL FRANCIA con vivo AMARILLO curvo al costado; en la pierna derecha del jugador el mismo escudo dorado chico; en la pierna izquierda del jugador el swoosh AMARILLO y, justo ARRIBA del swoosh, el dorsal "${num}" en BLANCO, tipografía deportiva recta, bien legible.
- Medias BLANCAS con banda AZUL ornamental a media pierna y swoosh azul abajo.
- El largo de manga y las mangas térmicas/guantes que el jugador tiene en su Frente4 se mantienen iguales.

═══ FORMATO ═══
Cuerpo entero de pies a cabeza, cámara frontal, vertical 1024x1536, igual encuadre que el Frente4 adjunto. Fondo PNG con canal alfa real, completamente transparente, sin viñeta ni degradado. Iluminación de estudio limpia. Sin texto ni marcas de agua.

Generá la imagen ahora.`;

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
fs.mkdirSync(OUT_DIR, { recursive: true });
const only = process.env.PLAYER_ONLY?.split(',');
const out = [];
for (const [key, num] of PLAYERS.filter(([k]) => !only || only.includes(k))) {
  const dest = path.resolve('Renders', key, 'Frente4-k2.png');
  if (fs.existsSync(dest) && process.env.FORCE !== '1') { out.push('= ' + key); continue; }
  const attachments = [path.resolve('Renders', key, 'Frente4.png'), KIT_SHEET, CREST_GOLD].filter(f => fs.existsSync(f));
  let ok = false;
  for (let a = 1; a <= 2 && !ok; a++) {
    console.log(`\n==== ${key} (intento ${a}) ====`);
    try {
      const { filename } = await generateImage(page, { date: `t4k2-${key}` }, 'frente4k2', prompt(key, num), { freshChat: true, excludeSrcs: [], attachments });
      fs.renameSync(path.join('Renders/Daily News', filename), dest);
      fs.copyFileSync(dest, path.join(OUT_DIR, `${key}.png`));
      ok = true;
    } catch (e) { console.log('  Error:', e.message.split('\n')[0]); }
    await deleteChatById(page, currentChatId(page)).catch(() => {});
  }
  out.push(`${ok ? 'OK' : 'FALTA'} ${key}`);
}
await page.close();
console.log('\n===== RESUMEN =====\n' + out.join('\n'));
process.exit(0);
