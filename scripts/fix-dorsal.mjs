#!/usr/bin/env node
/**
 * Cambia el dorsal de un jugador en imágenes ya aprobadas (edición puntual con ChatGPT vía CDP).
 * Guarda cada resultado al lado como <archivo>.nuevo.png para revisarlo antes de reemplazar.
 *
 *   node scripts/fix-dorsal.mjs --quien "el arquero pelado con barba (adri_cai)" --de 99 --a 32 \
 *        Renders/adri_cai/Frente4.png Renders/adri_cai/Unica4.png logos/duos/duo-arqueros.png
 *
 * Los archivos dentro de Renders/<jugador>/ se tratan como PNG transparentes.
 * Después: revisar, reemplazar, webp + subir a R2, subir RENDER_V (plantilla, convocatoria, index-home)
 * y, si cambió Unica4, regenerar la foto grupal con `node scripts/plantel-foto-t4.mjs`.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const WHO = opt('--quien'), FROM = opt('--de'), TO = opt('--a');
const FILES = argv;
if (!WHO || !FROM || !TO || !FILES.length) {
  console.error('Uso: node scripts/fix-dorsal.mjs --quien "<descripción (gamertag)>" --de <n> --a <n> <archivos...>');
  process.exit(1);
}

const prompt = f => {
  const transparent = /(^|[\\/])Renders[\\/]/.test(f);
  return `Editá la imagen adjunta con un cambio mínimo: en el short de ${WHO}, el número "${FROM}" tiene que pasar a ser "${TO}", con el mismo estilo tipográfico, color, tamaño y posición. Si ese número aparece también en otro lugar de SU uniforme, cambialo igual. No toques a ningún otro jugador ni ningún otro detalle: misma cara, pose, encuadre, colores, iluminación y fondo.${transparent ? ' El fondo tiene que seguir siendo PNG transparente (canal alfa real), sin agregar fondo de color.' : ''} Mismo tamaño y proporción que la original.

Generá la imagen ahora.`;
};

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
const out = [];
for (const file of FILES) {
  const dest = file.replace(/\.png$/i, '.nuevo.png');
  if (fs.existsSync(dest)) { out.push('= ' + dest); continue; }
  let ok = false;
  for (let a = 1; a <= 2 && !ok; a++) {
    console.log(`\n==== ${file} (intento ${a}) ====`);
    try {
      const { filename } = await generateImage(page, { date: 'dorsal-' + path.basename(path.dirname(file)) + '-' + path.basename(file, '.png') }, 'fix', prompt(file), { freshChat: true, excludeSrcs: [], attachments: [path.resolve(file)] });
      fs.renameSync(path.join('Renders/Daily News', filename), dest);
      ok = true;
    } catch (e) { console.log('  Error:', e.message.split('\n')[0]); }
    await deleteChatById(page, currentChatId(page)).catch(() => {});
  }
  out.push(`${ok ? 'OK' : 'FALTA'} ${file}`);
}
await page.close();
console.log('\n===== RESUMEN =====\n' + out.join('\n'));
process.exit(0);
