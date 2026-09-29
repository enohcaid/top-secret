/**
 * One-off: puerta de caja fuerte para el acceso a plan-de-juego.html.
 * El dial central lo dibuja la página (para poder animarlo), así que la puerta va sin dial.
 * Guarda en logos/plan/boveda.png. Saltea si existe.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const OUT = path.resolve('logos/plan');
fs.mkdirSync(OUT, { recursive: true });
const dest = path.join(OUT, 'boveda.png');
if (fs.existsSync(dest)) { console.log('ya estaba'); process.exit(0); }

const PROMPT = `Diseño de producto para la web de Top Secret FC (club de fútbol virtual). Necesito la PUERTA de una caja fuerte / bóveda de banco vista exactamente de frente, centrada, circular, ocupando casi todo el cuadro.

- Acero oscuro color grafito con textura cepillada, aro exterior grueso con terminación DORADA envejecida (#C8A84B) y una corona de 12 pernos/remaches dorados alrededor.
- Anillos concéntricos mecanizados entre el aro y el centro, con detalles de ingeniería (engranajes finos grabados, marcas de graduación sutiles).
- En el CENTRO: un hueco circular LISO de metal oscuro, vacío, SIN dial, SIN perilla, SIN manija, SIN números (ahí se va a superponer un dial animado por código). El hueco ocupa aproximadamente el 38% del diámetro de la puerta.
- En el aro superior, grabado sutil del escudo del club adjunto (espía con sombrero, anteojos y cuello de gabardina), en dorado, pequeño. Sin deformarlo. Sin ningún otro texto ni logo.
- Iluminación de estudio dramática desde arriba, reflejos metálicos realistas.
- Fondo NEGRO puro (#000000) alrededor de la puerta, sin piso ni pared.

Formato cuadrado 1024x1024, fotorrealista, render 3D de alta gama.

Generá la imagen ahora.`;

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
let ok = false;
for (let a = 1; a <= 2 && !ok; a++) {
  try {
    const { filename } = await generateImage(page, { date: 'boveda' }, 'plan', PROMPT, { freshChat: true, excludeSrcs: [], attachments: [path.resolve('logos/rebrand/Clean logo Dorado.png')] });
    fs.renameSync(path.join('Renders/Daily News', filename), dest);
    ok = true;
  } catch (e) { console.log('Error:', e.message.split('\n')[0]); }
  await deleteChatById(page, currentChatId(page)).catch(() => {});
}
await page.close();
console.log(ok ? 'OK boveda' : 'FALTA boveda');
process.exit(0);
