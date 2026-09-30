/**
 * One-off: rehace las fotos editoriales del kit alternativo (azul) usando como ÚNICA
 * referencia del kit los modelos Renders/<gamertag>/Frente4-k2.png (renders-t4-k2-once.mjs).
 * Antes el kit salía de la lámina del juego y cada foto lo interpretaba distinto
 * (sin dorsal, escudo movido, mangas, etc.).
 * Guarda <archivo>-v3.png. Saltea lo existente. Env: ONLY=slug1,slug2
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const K2 = k => path.resolve(`Renders/${k}/Frente4-k2.png`);
const F4 = k => path.resolve(`Renders/${k}/Frente4.png`);
const CREST = path.resolve('logos/rebrand/Clean logo Dorado.png');

const KIT = `el KIT ALTERNATIVO AZUL exactamente como lo llevan puesto en sus renders adjuntos ("Frente4-k2"): camiseta azul francia con cuello polo, vivos amarillos, swoosh amarillo y escudo dorado del club (espía con sombrero) en el pecho; short azul con el escudo dorado en una pierna y, en la otra, el swoosh amarillo con el DORSAL BLANCO de cada uno justo arriba; medias blancas con banda azul. Copiá el kit tal cual de los renders, incluido el número de cada jugador, sin agregar textos, sponsors ni leones.`;

const STYLE = `Estilo editorial de campaña de moda deportiva. Fondo de estudio liso NEGRO / gris muy oscuro (#0B0A07) con una luz lateral cálida suave que recorta las siluetas — el fondo tiene que fundirse con una web de fondo negro. Sin texto, sin logos extra, sin marcas de agua.`;

const JOBS = [
  { slug: 'logos/duos/duo-capitanes-k2', players: ['Juan_Martinez4', 'Lautavester7'],
    who: 'Juan_Martinez4 (dorsal 6) y Lautavester7 (dorsal 7)',
    scene: 'Caminando hacia cámara uno al lado del otro, paso firme, mirada al frente, como entrando a la cancha. Encuadre vertical de los muslos hacia arriba, cámara levemente contrapicada.' },
  { slug: 'logos/duos/duo-laterales-k2', players: ['nikileo527', 'pepolemmo2710'],
    who: 'nikileo527 (dorsal 10) y pepolemmo2710 (dorsal 15)',
    scene: 'nikileo527 sentado de costado sobre una pelota y pepolemmo2710 de pie apoyándole la mano en el hombro, los dos mirando a cámara. Encuadre vertical de cuerpo casi entero, cámara levemente contrapicada.' },
  { slug: 'logos/duos/duo-defensa-k2', players: ['Elianja20', 'endiabladorojo66'],
    who: 'Elianja20 (dorsal 24) y endiabladorojo66 (dorsal 66)',
    scene: 'Espalda con espalda, uno con los brazos cruzados y la cabeza levemente levantada, el otro mirando al costado, actitud serena. Encuadre vertical de los muslos hacia arriba, cámara levemente contrapicada.' },
  { slug: 'logos/duos/duo-rivarola-huber-k2', players: ['rivarola90', 'Huber236'],
    who: 'rivarola90 (dorsal 2) y Huber236 (dorsal 8)',
    scene: 'Hombro con hombro, girados tres cuartos hacia cámara, uno con los brazos cruzados y el otro con las manos en la cintura, mirada seria a cámara. Encuadre vertical de los muslos hacia arriba, cámara levemente contrapicada.' },
  { slug: 'logos/duos/solo-juanchyroman-k2', players: ['Juanchyroman08'],
    who: 'Juanchyroman08 (dorsal 18)',
    scene: 'Un solo jugador, de pie, girado tres cuartos, con una pelota apoyada en la cadera y la otra mano ajustándose el pañuelo, mirada desafiante a cámara. Encuadre vertical de los muslos hacia arriba, cámara levemente contrapicada.' },
  { slug: 'logos/nosotros/detalle-k2', players: ['Juan_Martinez4'], detail: true },
  { slug: 'logos/noticias/kits-t4-portada', portada: true },
].filter(j => !process.env.ONLY || process.env.ONLY.split(',').some(o => j.slug.includes(o)));

function prompt(j) {
  if (j.detail) return `Foto de producto en primer plano del KIT ALTERNATIVO AZUL de Top Secret FC, exactamente como está en el render adjunto: pecho y hombros de un jugador (sin mostrar la cara, cortado a la altura de la boca), cuello polo, textura geométrica tono sobre tono muy sutil, vivos amarillos en los hombros, swoosh amarillo y escudo DORADO del club (el del archivo "Clean logo Dorado.png": espía con sombrero, anteojos y cuello de gabardina) bordado en el pecho. Sin la palabra "CHELSEA", sin león, sin ningún texto en la tela. Luz cálida lateral dramática, fondo oscuro. Formato horizontal 1536x1024, fotorrealista.

Generá la imagen ahora.`;
  if (j.portada) return `Foto de campaña de lanzamiento de camisetas de Top Secret FC (club argentino de EA Sports FC Clubs Pro), estilo campaña de Nike Football.

TRES jugadores de pie uno al lado del otro, mirando a cámara con actitud seria y segura, levemente escalonados en profundidad. Copiá cada uno EXACTAMENTE de su render adjunto (cara, pelo, barba, piel, accesorios Y uniforme tal cual está en su render):
- IZQUIERDA: Lautavester7 con el KIT ALTERNATIVO AZUL de su render "Frente4-k2" (dorsal 7 blanco en el short).
- CENTRO, un paso adelante: CipriMancini con el KIT TITULAR NEGRO de su render (dorsal 14 en el short).
- DERECHA: Ivan_Cabj_La12 con el KIT DE ARQUERO naranja de su render (dorsal 12 en el short rojo, guantes puestos).

ESCENA: estudio con fondo NEGRO profundo, un haz de luz dorada cálida desde arriba y humo tenue a la altura de las piernas. Encuadre horizontal de las rodillas para arriba (que se lean los dorsales de los shorts). Fotorrealista, iluminación cinematográfica, grano fino. Sin texto, sin marcas de agua, sin leones ni la palabra "CHELSEA".

FORMATO: horizontal 1536x1024.

Generá la imagen ahora.`;
  return `Sos fotógrafo de campañas de moda deportiva. Necesito una foto de campaña de Top Secret FC (club argentino de EA Sports FC Clubs Pro) para la web de la Temporada 4.

JUGADORES: ${j.who}. Te adjunto el render oficial de cada uno con el kit alternativo: copiá exactamente sus caras, pelo, barba, tono de piel, contextura y accesorios.

UNIFORME: ${KIT}

ESCENA: ${j.scene} ${STYLE}

FORMATO: vertical 1024x1536.

Generá la imagen ahora.`;
}

function attachments(j) {
  if (j.detail) return [K2(j.players[0]), CREST];
  if (j.portada) return [K2('Lautavester7'), F4('CipriMancini'), F4('Ivan_Cabj_La12')];
  return j.players.map(K2);
}

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
const out = [];
for (const j of JOBS) {
  const dest = path.resolve(j.slug + '-v3.png');
  if (fs.existsSync(dest)) { out.push('= ' + j.slug); continue; }
  const att = attachments(j);
  const missing = att.filter(f => !fs.existsSync(f));
  if (missing.length) { out.push(`FALTA ${j.slug} (sin ${missing.map(f => path.basename(path.dirname(f))).join(', ')})`); continue; }
  let ok = false;
  for (let a = 1; a <= 2 && !ok; a++) {
    console.log(`\n==== ${j.slug} (intento ${a}) ====`);
    try {
      const { filename } = await generateImage(page, { date: 'k2v3-' + path.basename(j.slug) }, 'k2v3', prompt(j), { freshChat: true, excludeSrcs: [], attachments: att });
      fs.renameSync(path.join('Renders/Daily News', filename), dest);
      ok = true;
    } catch (e) { console.log('  Error:', e.message.split('\n')[0]); }
    await deleteChatById(page, currentChatId(page)).catch(() => {});
  }
  out.push(`${ok ? 'OK' : 'FALTA'} ${j.slug}`);
}
await page.close();
console.log('\n===== RESUMEN =====\n' + out.join('\n'));
process.exit(0);
