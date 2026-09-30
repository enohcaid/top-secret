/**
 * One-off: agrega el dorsal en el short a las imágenes del kit alternativo (azul)
 * y a la portada de la noticia de kits (edición puntual con ChatGPT).
 * Guarda <archivo>.nuevo.png al lado para revisar antes de reemplazar. Env: ONLY=parte1,parte2
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const JOBS = [
  { file: 'logos/duos/duo-capitanes-k2.png', who: [
    ['el jugador de la IZQUIERDA (pelo castaño claro, barba)', '6'],
    ['el jugador de la DERECHA (piel oscura, anteojos rojos)', '7']] },
  { file: 'logos/duos/duo-laterales-k2.png', who: [
    ['el jugador SENTADO sobre la pelota (pelo corto castaño, sin barba)', '10'],
    ['el jugador DE PIE (vincha, anteojos de colores)', '15']] },
  { file: 'logos/duos/duo-defensa-k2.png', who: [
    ['el jugador de la IZQUIERDA (pelo plateado, anteojos rojos)', '24'],
    ['el jugador de la DERECHA (mullet castaño rizado)', '66']] },
  { file: 'logos/duos/duo-rivarola-huber-k2.png', who: [
    ['el jugador de la IZQUIERDA (pelo largo gris con vincha negra)', '2'],
    ['el jugador de la DERECHA (pelo oscuro peinado hacia arriba)', '8']] },
  { file: 'logos/duos/solo-juanchyroman-k2.png', who: [['el jugador', '18']] },
  { file: 'logos/noticias/kits-t4-portada.png', who: [
    ['el jugador de la IZQUIERDA, con el kit AZUL (barba tupida, anteojos rojos)', '7'],
    ['el ARQUERO de la DERECHA, con el short ROJO (trenzas azules, barba canosa)', '12']],
    note: 'El jugador del centro ya tiene su 14: no lo toques.' },
].filter(j => !process.env.ONLY || process.env.ONLY.split(',').some(o => j.file.includes(o)));

const prompt = j => `Editá la imagen adjunta con un cambio mínimo: agregá el número de dorsal en el SHORT de cada jugador, como lo lleva el kit titular del club — número BLANCO, tipografía deportiva recta y limpia (estilo Nike de camiseta de fútbol), en la parte delantera de la pierna del short donde está el swoosh de Nike, justo ARRIBA del swoosh, tamaño mediano bien legible.
${j.who.map(([w, n]) => `- ${w}: número "${n}".`).join('\n')}
${j.note || ''}
No toques nada más: mismas caras, pelo, poses, encuadre, colores, texturas, escudos, iluminación y fondo. No agregues ningún otro texto. Mismo tamaño y proporción que la original.

Generá la imagen ahora.`;

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
const out = [];
for (const j of JOBS) {
  const dest = j.file.replace(/\.png$/, '.nuevo.png');
  if (fs.existsSync(dest)) { out.push('= ' + dest); continue; }
  let ok = false;
  for (let a = 1; a <= 2 && !ok; a++) {
    console.log(`\n==== ${j.file} (intento ${a}) ====`);
    try {
      const { filename } = await generateImage(page, { date: 'numeros-' + path.basename(j.file, '.png') }, 'fix', prompt(j), { freshChat: true, excludeSrcs: [], attachments: [path.resolve(j.file)] });
      fs.renameSync(path.join('Renders/Daily News', filename), dest);
      ok = true;
    } catch (e) { console.log('  Error:', e.message.split('\n')[0]); }
    await deleteChatById(page, currentChatId(page)).catch(() => {});
  }
  out.push(`${ok ? 'OK' : 'FALTA'} ${j.file}`);
}
await page.close();
console.log('\n===== RESUMEN =====\n' + out.join('\n'));
process.exit(0);
