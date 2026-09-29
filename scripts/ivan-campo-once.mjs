/**
 * One-off: render de Ivan_Cabj_La12 con el KIT TITULAR DE JUGADOR (negro/dorado, dorsal 12) y su look
 * actual, para la cancha de convocatoria cuando juega fuera del arco (PLAYERS[].campo en convocatoria.html).
 * Los viejos *4-kit-campo.png tienen la skin anterior. Guarda Renders/Ivan_Cabj_La12/Frente4-campo.png.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const dest = path.resolve('Renders/Ivan_Cabj_La12/Frente4-campo.png');
if (fs.existsSync(dest)) { console.log('ya estaba'); process.exit(0); }

const PROMPT = `Te adjunto dos renders oficiales de Top Secret FC:
1) "Ivan_Cabj_La12 - Frente4.png": el jugador Ivan_Cabj_La12 con el kit de ARQUERO naranja. De acá sale TODA su apariencia: cara, piel oscura, trenzas largas azul oscuro recogidas, barba corta canosa, sin anteojos, contextura.
2) "Juan_Martinez4 - Frente4.png": un compañero con el KIT TITULAR DE JUGADOR. De acá sale SOLO el uniforme (su cara no va).

Necesito el mismo render de Ivan_Cabj_La12 —misma persona, misma pose de frente con los brazos extendidos, mismo encuadre y tamaño que su Frente4— pero vestido con el KIT TITULAR DE JUGADOR del render 2, copiado exacto: camiseta NEGRA con cuello en V y ribete dorado de laureles en cuello y puños, vivos dorados a los costados, swoosh dorado, escudo dorado del club (espía con sombrero) en el pecho; short negro con el escudo dorado en una pierna y en la otra el swoosh dorado con el dorsal "12" en BLANCO justo arriba; medias negras con banda dorada. SIN guantes de arquero (manos libres o con guantes térmicos negros finos). Sin sponsor ni texto extra.

Cuerpo entero, vertical 1024x1536. Fondo PNG con canal alfa real, completamente transparente, sin viñeta. Iluminación de estudio limpia. Sin texto ni marcas de agua.

Generá la imagen ahora.`;

// Copias con nombre claro para que el prompt pueda referirse a cada adjunto.
const tmp = path.resolve('scripts/.ivan-refs'); fs.mkdirSync(tmp, { recursive: true });
const a = path.join(tmp, 'Ivan_Cabj_La12 - Frente4.png'), b = path.join(tmp, 'Juan_Martinez4 - Frente4.png');
fs.copyFileSync('Renders/Ivan_Cabj_La12/Frente4.png', a);
fs.copyFileSync('Renders/Juan_Martinez4/Frente4.png', b);

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
let ok = false;
for (let i = 1; i <= 2 && !ok; i++) {
  try {
    const { filename } = await generateImage(page, { date: 'ivan-campo' }, 'frente4campo', PROMPT, { freshChat: true, excludeSrcs: [], attachments: [a, b] });
    fs.renameSync(path.join('Renders/Daily News', filename), dest);
    ok = true;
  } catch (e) { console.log('Error:', e.message.split('\n')[0]); }
  await deleteChatById(page, currentChatId(page)).catch(() => {});
}
await page.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(ok ? 'OK Frente4-campo' : 'FALTA Frente4-campo');
process.exit(0);
