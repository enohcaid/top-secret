#!/usr/bin/env node
// Genera con ChatGPT (Chrome CDP, mismo método que renders-t4-once.mjs) la pose de presentación de cada
// jugador: un gesto distinto por jugador, mirando a cámara, a partir de su Frente4 aprobado (misma cara,
// mismo kit). Guarda Renders/<gt>/Gesto4.png (cutout de cuerpo entero, fondo transparente).
//
//   node scripts/video-plantel/poses.mjs [gamertag ...]     (sin argumentos: todo ROSTER_T4)
//   FORCE=1 → regenera aunque exista
//
// Para cambiar el gesto de alguien, editar GESTOS y correr con su gamertag y FORCE=1.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { generateImage, deleteChatById, currentChatId } from '../generate-image-chatgpt.mjs';
import { ROSTER_T4 } from '../../roster.js';

// Todas distintas (pedido de Juan). Las marcadas T3 retoman la pose que ese jugador tuvo en su Pose3 de la
// temporada 3, que Juan aprobó; el resto son nuevas en el mismo espíritu ("pose fachera").
export const GESTOS = {
  Ivan_Cabj_La12:   'choca los dos puños con los guantes de arquero puestos frente al pecho, hombros hacia adelante, actitud de arquero listo.',
  adri_cai:         'se golpea el pecho con el puño derecho justo sobre el escudo, mentón alto, el otro brazo suelto al costado.',
  rivarola90:       'manos entrelazadas detrás de la nuca con los codos bien abiertos, cadera apenas de costado, relajado y canchero.',
  Alexisraies23:    'flexiona los dos brazos mostrando los bíceps, como un fisicoculturista (T3).',
  Cabers14:         'gesto de silencio: dedo índice vertical sobre los labios, la otra mano en la cintura, cabeza apenas inclinada.',
  endiabladorojo66: 'se lleva la mano derecha detrás de la oreja ahuecándola ("no los escucho"), el otro brazo abierto hacia el costado.',
  Elianja20:        'con los dedos índice y mayor en V se señala sus propios ojos y con la otra mano señala a la cámara ("te estoy mirando").',
  Huber236:         'manos en la cintura (brazos en jarra), pecho inflado, mentón levemente levantado, actitud desafiante (T3).',
  Guiidow:          'se toca la sien con el dedo índice (gesto de "cabeza"), media sonrisa canchera, el otro brazo relajado.',
  nikileo527:       'señala con el dedo índice el escudo de su pecho y con la otra mano agarra la camiseta junto al escudo.',
  pepolemmo2710:    'se acomoda los anteojos con una mano en el marco, la otra mano en la cintura, pose de modelo.',
  Juan_Martinez4:   'se acomoda con la mano izquierda la cinta de capitán en el brazo derecho, mirada firme (T3, es el capitán).',
  'RS32-DaniStone': 'se tapa la boca con la mano derecha, la mirada intensa por encima de la mano, la otra mano en la cintura (T3).',
  CipriMancini:     'flexiona un brazo mostrando el bíceps y con el índice de la otra mano se señala el músculo (T3).',
  Lil_Dekuroko:     'una mano en el mentón en pose pensativa y la otra en la cintura (T3).',
  Lautavester7:     'levanta el puño cerrado bien alto por encima de la cabeza, brazo estirado, el otro brazo firme al costado (T3).',
  Juanchyroman08:   'una mano detrás de la nuca como acomodándose el pelo, el otro brazo relajado, peso en una pierna (T3).',
  kee_viin03:       'de ESPALDAS a la cámara mostrando el nombre "KEE_VIIN03" y el dorsal 21 en la espalda de la camiseta, gira la cabeza para mirar a la cámara por encima del hombro y se señala el nombre con los dos pulgares (T3).',
  NicoBJ_96:        'señala directo a la cámara con el dedo índice de la mano derecha, brazo extendido hacia adelante, el otro en la cintura.',
};

const FORMAT_BLOCK = 'Cuerpo entero de pies a cabeza, con margen de aire arriba y abajo, cámara frontal, encuadre de estudio tipo ficha de videojuego (tarjeta de jugador), formato vertical 1024x1536. Fondo PNG con canal alfa real, completamente transparente — cero viñeta, resplandor, aura de color o degradado. Iluminación de estudio limpia y uniforme. Nada de texto, títulos, marcos ni marcas de agua.';

// Arqueros que también juegan de campo (campo:true en PLAYERS de convocatoria.html): CAMPO=1 genera
// Renders/<gt>/Gesto4-campo.png desde su Frente4-campo.png (kit titular de jugador), con el gesto de GESTOS_CAMPO.
export const GESTOS_CAMPO = {
  Ivan_Cabj_La12: 'choca los dos puños cerrados frente al pecho (sin guantes), hombros hacia adelante, actitud de guerrero listo.',
};
const CAMPO = process.env.CAMPO === '1';
const gesto = gt => (CAMPO ? GESTOS_CAMPO[gt] : GESTOS[gt]) || '';

const prompt = gt => `Te adjunto el render aprobado de este jugador. Hacé exactamente al mismo jugador (misma cara, peinado, vello facial, tatuajes, accesorios, tono de piel y contextura), con el mismo kit idéntico (mismo escudo, swoosh, dorsal, medias, guantes y botines), de pie y MIRANDO A LA CÁMARA, en una pose fachera, con actitud y onda de jugador estrella (nada rígido ni de maniquí: peso en una pierna, hombros sueltos, expresión con personalidad). La pose: ${gesto(gt).replace(/\s*\(T3[^)]*\)/, '')}
Las manos y los dedos tienen que verse anatómicamente correctos (cinco dedos). El escudo del pecho no se deforma.

${FORMAT_BLOCK}

Generá la imagen ahora.`;

if ((process.argv[1] || '').endsWith('poses.mjs')) {
  const pedidos = process.argv.slice(2);
  const lista = ROSTER_T4.map(p => p.key).filter(k => !pedidos.length || pedidos.includes(k));
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.contexts()[0].newPage();
  page.setDefaultTimeout(0);
  const res = [];
  try {
    for (const gt of lista) {
      const dir = path.resolve('Renders', gt), suf = CAMPO ? '-campo' : '';
      const dest = path.join(dir, `Gesto4${suf}.png`), frente = path.join(dir, `Frente4${suf}.png`);
      if (fs.existsSync(dest) && process.env.FORCE !== '1') { res.push(`= ${gt} (ya estaba)`); continue; }
      if (!gesto(gt) || !fs.existsSync(frente)) { res.push(`FALTA ${gt} (sin gesto o sin Frente4${suf})`); continue; }
      console.log(`\n========== ${gt} ==========`);
      let ok = false;
      for (let intento = 1; intento <= 2 && !ok; intento++) {
        try {
          const { filename } = await generateImage(page, { date: `gesto4-${gt}` }, 'gesto4', prompt(gt), { freshChat: true, excludeSrcs: [], attachments: [frente] });
          fs.renameSync(path.join('Renders/Daily News', filename), dest);
          ok = true;
        } catch (e) { console.log(`  Error (intento ${intento}/2): ${e.message.split('\n')[0]}`); }
        await deleteChatById(page, currentChatId(page)).catch(() => {});
      }
      res.push(`${ok ? 'OK' : 'FALTA'} ${gt}`);
    }
  } finally { await page.close().catch(() => {}); }   // nunca browser.close(): es el Chrome del pipeline
  console.log('\n===== RESUMEN =====\n' + res.join('\n'));
  process.exit(0);
}
