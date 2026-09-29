/**
 * One-off: cambia el dorsal de un jugador en imágenes ya aprobadas (edición puntual con ChatGPT).
 * Guarda la versión nueva al lado como <archivo>.nuevo.png para revisar antes de reemplazar.
 * Uso: node scripts/fix-dorsal-once.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const WHO = 'el jugador de rulos castaños, anteojos deportivos rojos y mangas azules estampadas (CipriMancini)';
const FROM = '32', TO = '14';
const JOBS = [
  { file: 'Renders/CipriMancini/Frente4.png', transparent: true },
  { file: 'Renders/CipriMancini/Brazos4.png', transparent: true },
  { file: 'Renders/CipriMancini/Pose4.png', transparent: true },
  { file: 'Renders/CipriMancini/Unica4.png', transparent: true },
  { file: 'logos/duos/duo-mediocampo-k1.png' },
  { file: 'logos/nosotros/manada-k1.png' },
].filter(j => !process.env.ONLY || process.env.ONLY.split(',').some(o => j.file.includes(o)));

const prompt = j => `Editá la imagen adjunta con un cambio mínimo: en el short de ${WHO}, el número "${FROM}" tiene que pasar a ser "${TO}", con el mismo estilo tipográfico, color blanco, tamaño y posición. Si ese número aparece también en otro lugar de SU uniforme, cambialo igual. No toques a ningún otro jugador ni ningún otro detalle: misma cara, pose, encuadre, colores, iluminación y fondo.${j.transparent ? ' El fondo tiene que seguir siendo PNG transparente (canal alfa real), sin agregar fondo de color.' : ''} Mismo tamaño y proporción que la original.

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
      const { filename } = await generateImage(page, { date: 'dorsal-' + path.basename(j.file, '.png') }, 'fix', prompt(j), { freshChat: true, excludeSrcs: [], attachments: [path.resolve(j.file)] });
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
