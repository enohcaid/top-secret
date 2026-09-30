/**
 * One-off: imágenes editoriales para nosotros.html (estilo nota de lanzamiento de kit):
 * foto grupal cinematográfica + primeros planos de cada equipación.
 * Guarda en logos/nosotros/<slug>.png. Saltea las existentes. Env: ONLY=slug1,slug2
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';
import { FOTOS_DIR } from './lib/env.mjs';

const SRC = path.join(FOTOS_DIR, 'T4');
const OUT = path.resolve('logos/nosotros');
const R = k => path.resolve(`Renders/${k}/Frente4.png`);
const STYLE = 'Fotografía editorial de campaña de lanzamiento de camiseta (estilo Nike Football), fotorrealista, iluminación cinematográfica cálida sobre fondo muy oscuro, grano fino. Sin texto, sin marcas de agua, sin logos extra.';
const KIT1 = 'camiseta NEGRA con ribete dorado ornamental (patrón de laureles) en el cuello en V y en los puños de las mangas, vivos dorados a los costados, swoosh de Nike DORADO, escudo del club DORADO (espía con sombrero, anteojos y cuello de gabardina) en el pecho, sin sponsor';
const KIT2 = 'camiseta AZUL FRANCIA con cuello polo, textura tono sobre tono, vivos amarillos finos, swoosh de Nike AMARILLO, escudo del club DORADO (espía con sombrero, anteojos y cuello de gabardina) en el pecho, sin sponsor, medias blancas con banda azul ornamental';

const IMGS = [
  { slug: 'manada-k1', size: 'horizontal 1536x1024',
    refs: ['Juan_Martinez4', 'Lautavester7', 'CipriMancini', 'Cabers14', 'NicoBJ_96'].map(R),
    text: `Los cinco jugadores de los renders adjuntos (copiá exactamente sus caras, pelo, barba, tono de piel y accesorios) caminando juntos hacia cámara saliendo de un túnel oscuro de estadio, como una manada que emerge de la oscuridad, con humo tenue y contraluz dorado desde atrás. Todos con el kit de los renders: ${KIT1}, short negro. Encuadre de cuerpo casi entero, cámara a la altura de la cintura.` },
  { slug: 'detalle-k1', size: 'horizontal 1536x1024',
    refs: [R('Juan_Martinez4'), path.resolve('logos/rebrand/Clean logo Dorado.png')],
    text: `Primer plano macro del pecho y el cuello de la camiseta titular: ${KIT1}. Se ve la textura de la tela, el ribete dorado de laureles del cuello en V y el escudo dorado del club (el del archivo adjunto "Clean logo Dorado", sin deformarlo) cosido en el pecho. Profundidad de campo corta, luz rasante que resalta los relieves.` },
  { slug: 'detalle-k2', size: 'horizontal 1536x1024',
    refs: [path.join(SRC, 'KIT2-T4-referencia-sin-cara.png'), path.resolve('logos/rebrand/Clean logo Dorado.png')],
    text: `Primer plano macro del cuello polo y el pecho de la camiseta alternativa: ${KIT2}. Tomá el diseño de la lámina adjunta (el león del juego NO va: va el escudo dorado del club del archivo "Clean logo Dorado", sin deformarlo). Se ve la textura tono sobre tono del azul, el vivo amarillo del hombro y el escudo. Profundidad de campo corta.` },
  { slug: 'detalle-gk', size: 'horizontal 1536x1024',
    refs: [path.join(SRC, 'escudo-clean-blanco.png')],
    text: `Primer plano de las manos de un arquero con guantes de arquero sosteniendo una pelota de fútbol contra el pecho, con la camiseta de arquero: naranja con ondas/zigzag amarillas y rojizas en todo el cuerpo, cuello redondo rojo, swoosh de Nike blanco y el escudo del club en BLANCO LISO visible en el pecho. El escudo tiene que ser EXACTAMENTE el del archivo "escudo-clean-blanco.png" adjunto: un sombrero de ala, anteojos rectos y un cuello de gabardina levantado, formas geométricas planas — SIN cara, SIN nariz, SIN boca, SIN corbata, sin agregar ni quitar nada. Sin cara del jugador visible (cortado a la altura del mentón).` },
  { slug: 'vestuario-kits', size: 'horizontal 1536x1024',
    refs: [R('Juan_Martinez4'), path.join(SRC, 'KIT2-T4-referencia-sin-cara.png'), path.resolve('Renders/adri_cai/Frente4.png'), path.resolve('logos/rebrand/Clean logo Dorado.png')],
    text: `Vestuario de fútbol elegante y oscuro, con tres camisetas colgadas en perchas en los cubículos de madera oscura, iluminadas por spots cálidos: a la izquierda la titular (${KIT1}), al centro la alternativa (${KIT2}) y a la derecha la de arquero (naranja con ondas amarillas, escudo blanco). Cada una con el escudo del club (espía con sombrero) — nunca el león del juego. La textura tono sobre tono de la camiseta azul es un patrón geométrico abstracto: SIN la palabra "CHELSEA", SIN león, SIN ningún texto ni escudo de otro club escondido en la tela. Vista frontal centrada, simétrica.` },
];

fs.mkdirSync(OUT, { recursive: true });
const only = process.env.ONLY?.split(',');
const browser = await chromium.connectOverCDP('http://localhost:9222');
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
const results = [];
for (const im of IMGS.filter(x => !only || only.includes(x.slug))) {
  const dest = path.join(OUT, `${im.slug}.png`);
  if (fs.existsSync(dest)) { results.push(`= ${im.slug} (ya estaba)`); continue; }
  const prompt = `Sos fotógrafo de campañas deportivas para Top Secret FC, club argentino de EA Sports FC Clubs Pro.\n\n${im.text}\n\nESTILO: ${STYLE}\n\nFORMATO: ${im.size}.\n\nGenerá la imagen ahora.`;
  let ok = false;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    console.log(`\n==== ${im.slug} (intento ${attempt}) ====`);
    try {
      const { filename } = await generateImage(page, { date: im.slug }, 'nos', prompt, { freshChat: true, excludeSrcs: [], attachments: im.refs.filter(f => fs.existsSync(f)) });
      fs.renameSync(path.join('Renders/Daily News', filename), dest);
      ok = true;
    } catch (e) { console.log('  Error:', e.message.split('\n')[0]); }
    await deleteChatById(page, currentChatId(page)).catch(() => {});
  }
  results.push(`${ok ? 'OK' : 'FALTA'} ${im.slug}`);
}
await page.close();
console.log('\n===== RESUMEN =====\n' + results.join('\n'));
process.exit(0);
