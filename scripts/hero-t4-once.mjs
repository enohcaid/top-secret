/**
 * One-off: imagen hero de la portada T4 — dos jugadores espalda con espalda con el
 * Kit 1 de T4 (referencia de encuadre: modelo de moda con dos personas de buzo negro).
 * Guarda en Renders/Daily News/hero-t4_hero.png (luego se optimiza a logos/hero-t4.webp).
 */
import { chromium } from 'playwright';
import path from 'path';
import { generateImage, deleteChatById, currentChatId } from './generate-image-chatgpt.mjs';

const REFS = [
  path.resolve('Renders/Juan_Martinez4/Frente4.png'),
  path.resolve('Renders/Lautavester7/Frente4.png'),
];

const PROMPT = `Sos fotógrafo de campañas de moda deportiva. Necesito la foto principal de la web de Top Secret FC (club argentino de EA Sports FC Clubs Pro) para la presentación de la Temporada 4.

JUGADORES: los dos de los renders adjuntos — el primero (Juan_Martinez4, pelo castaño claro, barba) y el segundo (Lautavester7, piel oscura, barba tupida, anteojos deportivos rojos). Copiá exactamente sus caras, pelo, barba, tono de piel, contextura y accesorios.

UNIFORME: exactamente el kit de los renders adjuntos — camiseta negra con ribetes dorados ornamentales en cuello y mangas, vivos dorados a los costados, swoosh de Nike dorado y escudo dorado del club (espía con sombrero) en el pecho, short negro. Sin sponsor. No cambies nada del kit.

ESCENA: estilo editorial de campaña de moda. Los dos de pie espalda con espalda, levemente girados, uno con la cabeza apenas levantada mirando hacia arriba y el otro mirando al costado, actitud segura y serena. Encuadre vertical de la cintura/muslos hacia arriba, cámara levemente contrapicada. Fondo de estudio liso NEGRO / gris muy oscuro (#0B0A07) con una luz lateral cálida suave que recorta las siluetas — el fondo tiene que fundirse con una web de fondo negro, sin objetos, sin texto, sin logos extra, sin marcas de agua.

FORMATO: vertical 1024x1536, fotorrealista, iluminación de estudio de alta gama, grano fino.

Generá la imagen ahora.`;

const browser = await chromium.connectOverCDP('http://localhost:9222');
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
try {
  const { filename } = await generateImage(page, { date: 'hero-t4' }, 'hero', PROMPT, { freshChat: true, excludeSrcs: [], attachments: REFS });
  console.log('OK', filename);
} catch (e) {
  console.log('ERROR', e.message.split('\n')[0]);
}
await deleteChatById(page, currentChatId(page)).catch(() => {});
await page.close();
process.exit(0);
