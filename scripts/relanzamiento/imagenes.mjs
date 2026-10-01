/**
 * Imágenes cinematográficas del relanzamiento "Expediente Top Secret: desclasificado".
 * El espía del escudo (sombrero, anteojos oscuros, gabardina) pasa del archivo de papel al archivo digital.
 * Guarda en fuentes/relanzamiento/<slug>.png (saltea lo existente). Env: ONLY=slug
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from '../generate-image-chatgpt.mjs';

const OUT = path.resolve('fuentes/relanzamiento'); fs.mkdirSync(OUT, { recursive: true });
const ESCUDO = path.resolve('logos/rebrand/Clean logo Dorado.png');
const ESPIA = `un hombre misterioso con el look EXACTO del personaje del escudo adjunto: sombrero fedora de ala ancha, anteojos oscuros, gabardina larga con el cuello levantado. Se lo ve SIEMPRE de espaldas o en silueta, nunca la cara.`;
const ESTILO = `Fotograma de película de espionaje de alta gama, iluminación cinematográfica, contraste fuerte, paleta negra y dorada (#0B0A07 / #C8A84B), grano de película fino, profundidad de campo. Sin texto legible inventado, sin marcas de agua, sin logos de otros clubes. FORMATO VERTICAL 1024x1536.`;

const JOBS = [
  { slug: 'archivo-papel', prompt: `Un archivo analógico viejo y polvoriento de noche: pasillo largo entre muebles metálicos de archivo, carpetas de papel amarillento apiladas, algunas con un sello rojo "TOP SECRET", una lámpara de escritorio verde encendida, polvo flotando en el haz de luz. Al fondo del pasillo hay una puerta entreabierta por la que entra una luz digital fría y dorada. En el centro del pasillo, ${ESPIA} Camina hacia esa puerta. ${ESTILO}` },
  { slug: 'sala-digital', prompt: `Una sala de inteligencia moderna, oscura y elegante: una pared enorme de pantallas con una interfaz digital negra y dorada (líneas, grillas, fichas de archivo digitales, un gran escudo con el espía del archivo adjunto en dorado en la pantalla central). Reflejos dorados en un piso negro brillante. En primer plano, ${ESPIA} Está parado de frente a las pantallas, mirándolas. ${ESTILO}` },
  { slug: 'estadio-final', prompt: `Un estadio de fútbol moderno de noche, vacío y en silencio, con niebla baja sobre el césped y reflectores encendidos. En la pantalla gigante del estadio brilla el escudo adjunto (espía con sombrero, anteojos y cuello de gabardina) en dorado sobre negro. En el círculo central de la cancha, ${ESPIA} Está parado mirando la pantalla gigante. Toma desde atrás y abajo, épica. ${ESTILO}` },
].filter(j => !process.env.ONLY || process.env.ONLY.split(',').includes(j.slug));

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
const out = [];
for (const j of JOBS) {
  const dest = path.join(OUT, j.slug + '.png');
  if (fs.existsSync(dest)) { out.push('= ' + j.slug); continue; }
  let ok = false;
  for (let a = 1; a <= 2 && !ok; a++) {
    try {
      const { filename } = await generateImage(page, { date: 'relanz-' + j.slug }, 'relanz', j.prompt + '\n\nGenerá la imagen ahora.', { freshChat: true, excludeSrcs: [], attachments: [ESCUDO] });
      fs.renameSync(path.join('Renders/Daily News', filename), dest); ok = true;
    } catch (e) { console.log('Error', j.slug, e.message.split('\n')[0]); }
    await deleteChatById(page, currentChatId(page)).catch(() => {});
  }
  out.push(`${ok ? 'OK' : 'FALTA'} ${j.slug}`);
}
await page.close();
console.log('\n===== RESUMEN =====\n' + out.join('\n'));
process.exit(0);
