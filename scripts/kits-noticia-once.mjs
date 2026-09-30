/**
 * One-off: portada de la noticia de presentación de los kits T4 (estilo lanzamiento Chelsea/Nike).
 * Guarda en logos/noticias/kits-t4-portada.png. Saltea si existe.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';
import { FOTOS_DIR } from './lib/env.mjs';

const OUT = path.resolve('logos/noticias');
fs.mkdirSync(OUT, { recursive: true });
const dest = path.join(OUT, 'kits-t4-portada.png');
if (fs.existsSync(dest)) { console.log('ya estaba'); process.exit(0); }

const PROMPT = `Foto de campaña de lanzamiento de camisetas de Top Secret FC (club argentino de EA Sports FC Clubs Pro), estilo campaña de Nike Football para la presentación de kits de un club grande.

TRES jugadores de los renders adjuntos, de pie uno al lado del otro, mirando a cámara con actitud seria y segura, levemente escalonados en profundidad. Copiá exactamente sus caras, pelo, barba, tono de piel y accesorios:
- A la IZQUIERDA, con el kit ALTERNATIVO: el jugador de piel oscura, barba tupida y anteojos deportivos rojos (Lautavester7), vistiendo camiseta AZUL FRANCIA con cuello polo, textura geométrica tono sobre tono, vivos y swoosh de Nike AMARILLOS, escudo del club DORADO en el pecho, short azul, medias blancas. La textura es un patrón geométrico abstracto: SIN la palabra "CHELSEA", SIN león, sin ningún texto escondido en la tela.
- Al CENTRO, un paso adelante, con el kit TITULAR: el jugador de rulos castaños, anteojos rojos y mangas azules estampadas (CipriMancini), camiseta NEGRA con ribetes dorados de laureles en cuello y puños, swoosh de Nike dorado, escudo DORADO del club (espía con sombrero), short negro con el número 14.
- A la DERECHA, con el kit de ARQUERO: el arquero de piel oscura, trenzas azules y barba canosa (Ivan_Cabj_La12), camiseta naranja con ondas amarillas, short y medias rojas, escudo BLANCO del club, guantes de arquero puestos.

El escudo del club en las tres camisetas es SIEMPRE el espía con sombrero, anteojos y cuello de gabardina del archivo adjunto — nunca un león.

ESCENA: estudio con fondo NEGRO profundo, un haz de luz dorada cálida desde arriba y humo tenue a la altura de las piernas. Encuadre horizontal de las rodillas para arriba. Fotorrealista, iluminación cinematográfica de alta gama, grano fino. Sin texto, sin marcas de agua.

FORMATO: horizontal 1536x1024.

Generá la imagen ahora.`;

const refs = [
  'Renders/Lautavester7/Frente4.png', 'Renders/CipriMancini/Frente4.png', 'Renders/Ivan_Cabj_La12/Frente4.png',
  path.join(FOTOS_DIR, 'T4', 'KIT2-T4-referencia-sin-cara.png'), 'logos/rebrand/Clean logo Dorado.png',
].map(f => path.resolve(f)).filter(f => fs.existsSync(f));

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
let ok = false;
for (let a = 1; a <= 2 && !ok; a++) {
  try {
    const { filename } = await generateImage(page, { date: 'kits-t4-portada' }, 'news', PROMPT, { freshChat: true, excludeSrcs: [], attachments: refs });
    fs.renameSync(path.join('Renders/Daily News', filename), dest);
    ok = true;
  } catch (e) { console.log('Error:', e.message.split('\n')[0]); }
  await deleteChatById(page, currentChatId(page)).catch(() => {});
}
await page.close();
console.log(ok ? 'OK portada' : 'FALTA portada');
process.exit(0);
