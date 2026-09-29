/**
 * One-off: duplas de jugadores para el hero rotativo de la portada y los
 * encabezados de las páginas interiores (estilo campaña editorial, fondo negro).
 * Guarda en logos/duos/<slug>.png (fuente) — luego se optimizan a .webp y se suben a R2.
 * Saltea las que ya existen. Env: ONLY=slug1,slug2
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const SRC = 'C:/Users/User/Documents/TOP SECRET/Fotos/T4';
const OUT = path.resolve('logos/duos');
const R = k => path.resolve(`Renders/${k}/Frente4.png`);

const KIT1 = `el kit de los renders adjuntos — camiseta NEGRA con ribetes dorados ornamentales en cuello y mangas, vivos dorados a los costados, swoosh de Nike dorado y escudo dorado del club (espía con sombrero) en el pecho, short negro, medias negras con banda dorada.`;
const KIT2 = `el KIT SECUNDARIO de la lámina "KIT2-T4-referencia-sin-cara.png" adjunta (NO el negro de los renders): camiseta AZUL FRANCIA con cuello polo, textura tono sobre tono, vivos amarillos finos en hombros y costados, swoosh de Nike AMARILLO; short azul francia con vivo amarillo; medias BLANCAS con banda azul ornamental. En el pecho y en el short va el escudo del club DORADO de la lámina (espía con sombrero, anteojos y cuello de gabardina) — NO el león del juego. Sin sponsor. La textura tono sobre tono es un patrón geométrico abstracto: SIN la palabra "CHELSEA", SIN león, SIN ningún texto ni escudo de otro club escondido en la tela. Los renders adjuntos son SOLO para las caras y accesorios: su kit negro no va.`;
const KIT_GK = `el kit de ARQUERO de los renders adjuntos — camiseta naranja con ondas amarillas, short y medias rojas, swoosh de Nike blanco y escudo BLANCO del club en el pecho. Guantes de arquero puestos.`;

const DUOS = [
  { slug: 'duo-mediocampo-k1', players: ['CipriMancini', 'RS32-DaniStone'], kit: KIT1,
    who: 'CipriMancini (rulos castaños, anteojos deportivos rojos, mangas azules estampadas) y RS32-DaniStone (pelo violeta con rulos, sin barba)',
    scene: 'Hombro con hombro, girados tres cuartos hacia cámara, uno con la pelota bajo el brazo, mirada fija y seria a cámara.' },
  { slug: 'duo-defensa-k1', players: ['Alexisraies23', 'Cabers14'], kit: KIT1,
    who: 'Alexisraies23 (rastas largas, anteojos celestes) y Cabers14 (rasgos del este asiático, piel clara, pelo negro corto y lacio, sin barba, sin máscara)',
    scene: 'Espalda con espalda, brazos cruzados, uno mirando al frente y el otro al costado, actitud de muralla defensiva.' },
  { slug: 'duo-arqueros', players: ['Ivan_Cabj_La12', 'adri_cai'], kit: KIT_GK,
    who: 'Ivan_Cabj_La12 (piel oscura, trenzas largas azul oscuro recogidas, barba corta canosa, sin anteojos) y adri_cai (pelado, barba)',
    scene: 'Uno de pie sosteniendo una pelota con ambas manos a la altura del pecho, el otro a su lado levemente detrás, ajustándose un guante. Los dos con su número visible en el short (12 y 99).' },
  { slug: 'duo-ataque-k1', players: ['NicoBJ_96', 'kee_viin03'], kit: KIT1,
    who: 'NicoBJ_96 (piel oscura, barba larga tupida, pelo corto rubio platinado) y kee_viin03 (afro rojo/fucsia voluminoso)',
    scene: 'Uno con el puño en alto en festejo contenido y el otro señalándose el escudo del pecho, los dos mirando hacia arriba.' },
  { slug: 'duo-defensa-k2', players: ['Elianja20', 'endiabladorojo66'], kit: KIT2,
    who: 'Elianja20 (pelo plateado, anteojos deportivos rojos, barba) y endiabladorojo66 (mullet rizado castaño, barba corta)',
    scene: 'Espalda con espalda, uno con la cabeza levemente levantada mirando hacia arriba y el otro mirando al costado, actitud serena.' },
  { slug: 'duo-laterales-k2', players: ['nikileo527', 'pepolemmo2710'], kit: KIT2,
    who: 'nikileo527 (pelo corto castaño, sin barba, joven) y pepolemmo2710 (vincha, anteojos deportivos de colores, barba, guantes azules)',
    scene: 'Uno sentado de costado sobre una pelota y el otro de pie apoyando la mano en su hombro, los dos mirando a cámara.' },
  { slug: 'duo-capitanes-k2', players: ['Juan_Martinez4', 'Lautavester7'], kit: KIT2,
    who: 'Juan_Martinez4 (pelo castaño claro, barba) y Lautavester7 (piel oscura, barba tupida, pelo con tinte azulado, anteojos deportivos rojos)',
    scene: 'Caminando hacia cámara uno al lado del otro, paso firme, mirada al frente, como entrando a la cancha.' },
  { slug: 'duo-rivarola-huber-k2', players: ['rivarola90', 'Huber236'], kit: KIT2,
    who: 'rivarola90 (piel oscura, pelo largo gris plateado hasta los hombros con vincha negra, barba corta) y Huber236 (pelo oscuro peinado hacia arriba, barba prolija, cejas marcadas)',
    scene: 'Hombro con hombro, girados tres cuartos hacia cámara, uno con los brazos cruzados y el otro con las manos en la cintura, mirada seria a cámara.' },
  { slug: 'duo-guiidow-lil-k1', players: ['Guiidow', 'Lil_Dekuroko'], kit: KIT1,
    who: 'Guiidow (cresta/mohicano corto oscuro con los costados rapados, piel trigueña, perilla) y Lil_Dekuroko (pelo corto rizado rojo oscuro, máscara de calavera blanca con líneas rojas cubriendo nariz y boca, cuello térmico negro)',
    scene: 'Espalda con espalda, uno mirando hacia arriba con la barbilla levantada y el otro mirando fijo a cámara, brazos cruzados.' },
  { slug: 'solo-juanchyroman-k2', players: ['Juanchyroman08'], kit: KIT2,
    who: 'Juanchyroman08 (joven, pelo largo azulado por detrás, gorra/pañuelo gris estampado hacia atrás, pintura facial azul bajo los ojos, manga tatuada en un brazo)',
    scene: 'Un solo jugador, de pie, girado tres cuartos, con una pelota apoyada en la cadera y la otra mano ajustándose el pañuelo, mirada desafiante a cámara.' },
];

function prompt(d) {
  return `Sos fotógrafo de campañas de moda deportiva. Necesito una foto de campaña de Top Secret FC (club argentino de EA Sports FC Clubs Pro) para la web de la Temporada 4.

JUGADORES: ${d.who}. Te adjunto el render oficial de cada jugador: copiá exactamente sus caras, pelo, barba, tono de piel, contextura y accesorios.

UNIFORME: ${d.kit} No cambies nada del kit.

ESCENA: estilo editorial de campaña de moda. ${d.scene} Encuadre vertical de los muslos hacia arriba, cámara levemente contrapicada. Fondo de estudio liso NEGRO / gris muy oscuro (#0B0A07) con una luz lateral cálida suave que recorta las siluetas — el fondo tiene que fundirse con una web de fondo negro. Sin texto, sin logos extra, sin marcas de agua.

FORMATO: vertical 1024x1536, fotorrealista, iluminación de estudio de alta gama, grano fino.

Generá la imagen ahora.`;
}

fs.mkdirSync(OUT, { recursive: true });
const only = process.env.ONLY?.split(',');
const browser = await chromium.connectOverCDP('http://localhost:9222');
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
const results = [];
for (const d of DUOS.filter(x => !only || only.includes(x.slug))) {
  const dest = path.join(OUT, `${d.slug}.png`);
  if (fs.existsSync(dest)) { results.push(`= ${d.slug} (ya estaba)`); continue; }
  const attachments = [...d.players.map(R), ...(d.kit === KIT2 ? [path.join(SRC, 'KIT2-T4-referencia-sin-cara.png')] : [])].filter(f => fs.existsSync(f));
  let ok = false;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    console.log(`\n==== ${d.slug} (intento ${attempt}) ====`);
    try {
      const { filename } = await generateImage(page, { date: d.slug }, 'duo', prompt(d), { freshChat: true, excludeSrcs: [], attachments });
      fs.renameSync(path.join('Renders/Daily News', filename), dest);
      ok = true;
    } catch (e) { console.log('  Error:', e.message.split('\n')[0]); }
    await deleteChatById(page, currentChatId(page)).catch(() => {});
  }
  results.push(`${ok ? 'OK' : 'FALTA'} ${d.slug}`);
}
await page.close();
console.log('\n===== RESUMEN =====\n' + results.join('\n'));
process.exit(0);
