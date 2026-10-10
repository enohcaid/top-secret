// Imágenes nuevas para las piezas de redes, generadas con ChatGPT (mismo Chrome CDP y proyecto que la noticia
// diaria). Reusa del generador diario: la identidad de cada jugador (rasgos + dorsal, con su render adjunto), el kit,
// el escudo y la estética T4. Cada escena es UNA imagen; después se anima con Canva (lib/clip.mjs).
//
//   const f = await generarImagen({ id: 'cabeza-fria-1', escena: '…', jugadores: ['Guiidow'], vertical: true, carpeta })
//   → ruta del PNG (si ya existe, no la regenera: los pasos caros se cachean)
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { asegurarChrome } from './chrome.mjs';
import {
  generateImage, buildResizePrompt, brandFormatBlock, playerIdentityLine, renderForKit, KIT_COLORS, GK_KIT_DESC,
  CREST_PATH, deleteChatById, currentChatId, fetchJerseyOverrides,
} from '../../generate-image-chatgpt.mjs';

let sesion = null;
async function pagina() {
  if (sesion) return sesion.page;
  await asegurarChrome();
  const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 60000 });
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('chatgpt.com')) || await ctx.newPage();
  page.setDefaultTimeout(120000);
  sesion = { browser, page };
  return page;
}
export async function cerrar() { if (sesion) { await sesion.browser.close().catch(() => {}); sesion = null; } }

function prompt({ escena, jugadores, vertical, kit }) {
  const ids = jugadores.map(playerIdentityLine).join('\n');
  return `Creá una FOTOGRAFÍA CINEMATOGRÁFICA para una pieza de redes de Top Secret FC, club argentino de fútbol virtual. ${jugadores.length ? 'Los jugadores son NUESTROS jugadores: sus renders van adjuntos, con el kit de hoy puesto.' : 'Sin jugadores identificables.'}

═══ LA ESCENA (manda) ═══
${escena}

═══ FORMATO ═══
${vertical ? 'VERTICAL 9:16 (pantalla completa de celular, tipo Reel/Story), más alto que ancho. Dejá aire arriba y abajo: ahí va texto animado después.' : 'Vertical 4:5.'}
Calidad de cine: luz dirigida, profundidad de campo, textura real de piel y tela, grano fino de película. Nada de look de videojuego ni de póster de IA genérico.

${brandFormatBlock()}

${jugadores.length ? `═══ IDENTIDAD (cada nombre/dorsal solo sobre el jugador cuyos rasgos coinciden) ═══
${ids}
- En la imagen aparecen SOLO estos jugadores (más público lejano y desenfocado si la escena lo pide). No inventes otros jugadores.
- Kit: ${kit.desc} Arqueros: ${GK_KIT_DESC}
- El escudo del pecho es el espía dorado del adjunto "Clean logo Dorado.png", nunca otro.` : ''}

SIN TEXTO en la imagen (ni títulos, ni marcadores, ni rótulos, ni watermarks).`;
}

export async function generarImagen({ id, escena, jugadores = [], vertical = true, carpeta, kitId = 'titular' }) {
  const destino = path.join(carpeta, `${id}.png`);
  if (fs.existsSync(destino)) return destino;
  fs.mkdirSync(carpeta, { recursive: true });
  await fetchJerseyOverrides().catch(() => {});
  const kit = KIT_COLORS.find(k => k.id === kitId) || KIT_COLORS[0];
  const adjuntos = [CREST_PATH, ...jugadores.map(j => renderForKit(j, kit)).filter(Boolean)];
  const page = await pagina();
  const draft = { id: `social-${id}`, date: new Date().toISOString().slice(0, 10) };
  let r = await generateImage(page, draft, 'social', prompt({ escena, jugadores, vertical, kit }), { freshChat: true, excludeSrcs: [], attachments: adjuntos });
  let archivo = path.resolve('Renders/Daily News', r.filename);
  // Proporción: si pedimos vertical y no vino 9:16, se le pide el reencuadre nativo en el mismo chat.
  const m = await sharp(archivo).metadata();
  if (vertical && m.width / m.height > 0.62) {
    r = await generateImage(page, draft, 'social', buildResizePrompt(), { freshChat: false, excludeSrcs: [r.imgUrl] });
    archivo = path.resolve('Renders/Daily News', r.filename);
  }
  await deleteChatById(page, currentChatId(page));
  fs.renameSync(archivo, destino);
  return destino;
}
