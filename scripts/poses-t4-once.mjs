/**
 * One-off: una pose única por jugador (Renders/<gamertag>/Unica4.png) para el perfil
 * de plantilla.html. Parte del Frente4 aprobado de cada uno (misma cara y kit).
 * Saltea las existentes. Env: ONLY=a,b
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const POSES = {
  'Ivan_Cabj_La12':   'agachado en posición de atajar, piernas flexionadas, guantes abiertos hacia adelante, mirada concentrada al frente',
  'adri_cai':         'de pie con la pelota bajo un brazo, señalando al frente con la otra mano abierta, dando indicaciones a la defensa',
  'rivarola90':       'con un pie apoyado sobre la pelota, brazos cruzados, mentón levantado, mirada desafiante',
  'Alexisraies23':    'ajustándose los anteojos con una mano, la otra mano en la cintura, mirada seria a cámara',
  'Cabers14':         'golpeándose el escudo del pecho con el puño cerrado, gesto de pertenencia',
  'Elianja20':        'festejando con los dos puños en alto y la boca abierta en un grito',
  'endiabladorojo66': 'con una rodilla apoyada en el suelo, antebrazo sobre la otra rodilla, mirada fija a cámara',
  'Huber236':         'en plena carrera, zancada larga de perfil tres cuartos, como proyectándose por la banda',
  'Guiidow':          'manos en la cintura, cabeza girada hacia un costado mirando a lo lejos',
  'nikileo527':       'haciendo jueguito con la pelota sobre el muslo, equilibrio sobre una pierna',
  'pepolemmo2710':    'saltando en el aire con un puño en alto, festejo explosivo',
  'Juan_Martinez4':   'con brazalete de capitán en el brazo, aplaudiendo con fuerza mientras arenga al equipo, boca abierta',
  'RS32-DaniStone':   'señalándose los ojos con dos dedos y luego a cámara, gesto de "te estoy mirando"',
  'CipriMancini':     'de frente, conduciendo la pelota con el pie derecho apenas adelantado sobre el balón, torso levemente inclinado, mirada al frente; ambas piernas anatómicamente correctas y rectas',
  'Lil_Dekuroko':     'con el dedo índice sobre la máscara a la altura de la boca, gesto de silencio "shh"',
  'Lautavester7':     'festejo de goleador: deslizándose de rodillas con los brazos abiertos y el pecho inflado',
  'Juanchyroman08':   'ajustándose el pañuelo de la cabeza con las dos manos, mirando hacia arriba',
  'kee_viin03':       'pateando la pelota de volea, suspendido en el aire, pierna extendida',
  'NicoBJ_96':        'con los brazos extendidos y las palmas hacia abajo pidiendo calma, festejo de goleador frío',
};

const prompt = (pose) => `Te adjunto el render oficial aprobado de este jugador de Top Secret FC. Hacé EXACTAMENTE al mismo jugador (misma cara, pelo, barba, tono de piel, contextura, tatuajes y accesorios) con el MISMO kit idéntico del render (mismos colores, escudo, swoosh, dorsal, medias y botines), en esta pose única y dinámica: ${pose}.

Cuerpo entero de pies a cabeza con margen de aire arriba y abajo, formato vertical 1024x1536. Fondo PNG con canal alfa real, completamente transparente — cero viñeta, resplandor o sombra de color alrededor. Iluminación de estudio cinematográfica cálida. Nada de texto, marcos ni marcas de agua.

Generá la imagen ahora.`;

const only = process.env.ONLY?.split(',');
const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
const results = [];
for (const [key, pose] of Object.entries(POSES).filter(([k]) => !only || only.includes(k))) {
  const dest = path.resolve('Renders', key, 'Unica4.png');
  if (fs.existsSync(dest)) { results.push(`= ${key} (ya estaba)`); continue; }
  let ok = false;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    console.log(`\n==== ${key} (intento ${attempt}) ====`);
    try {
      const { filename } = await generateImage(page, { date: `unica-${key}` }, 'unica', prompt(pose), { freshChat: true, excludeSrcs: [], attachments: [path.resolve('Renders', key, 'Frente4.png')] });
      fs.renameSync(path.join('Renders/Daily News', filename), dest);
      ok = true;
    } catch (e) { console.log('  Error:', e.message.split('\n')[0]); }
    await deleteChatById(page, currentChatId(page)).catch(() => {});
  }
  results.push(`${ok ? 'OK' : 'FALTA'} ${key}`);
  console.log(results[results.length - 1]);
}
await page.close();
console.log('\n===== RESUMEN =====\n' + results.join('\n'));
process.exit(0);
