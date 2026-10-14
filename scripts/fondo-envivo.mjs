#!/usr/bin/env node
// Foto de fondo para la placa "EN VIVO" (placa-envivo.mjs): una imagen vertical 9:16 a pantalla completa,
// generada en ChatGPT (proyecto "TOP Secret FC", Chrome CDP en :9222) con el mismo mecanismo del pipeline
// diario: renders T4 de 3 jugadores del plantel (rotan por día) + el escudo como referencias adjuntas.
// Sin texto en la imagen y con la mitad de abajo despejada y oscura: ahí van las letras de la placa.
//
//   node scripts/fondo-envivo.mjs [--fecha YYYY-MM-DD] [--jugadores gt1,gt2,gt3]
//
// Guarda fuentes/placas/fondos-envivo/envivo-<fecha>.png y la sube a R2 (_fuentes/placas/fondos-envivo/);
// placa-envivo.mjs usa la más reciente de esa carpeta.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { chromium } from 'playwright';
import { generateImage, deleteChatById, currentChatId, PLAYERS_WITH_RENDERS, PLAYER_TRAITS, T4_FRENTES_DIR, CREST_PATH } from './generate-image-chatgpt.mjs';

const arg = n => { const k = process.argv.indexOf(n); return k > 0 ? process.argv[k + 1] : null; };
const FECHA = arg('--fecha') || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
const DIR = path.resolve('fuentes/placas/fondos-envivo');
fs.mkdirSync(DIR, { recursive: true });

// Jugadores de campo con render T4 (los arqueros van con otro kit), rotando por día
const campo = PLAYERS_WITH_RENDERS.filter(g => PLAYER_TRAITS[g] && !/ARQUERO/.test(PLAYER_TRAITS[g].desc)).sort();
const dia = Math.floor(Date.parse(FECHA) / 864e5);
const jugadores = arg('--jugadores') ? arg('--jugadores').split(',') : [0, 1, 2].map(k => campo[(dia * 3 + k) % campo.length]);
const refs = jugadores.map(g => {
  const f = ['png', 'jpg'].map(e => path.join(T4_FRENTES_DIR, `${g}.${e}`)).find(fs.existsSync);
  if (!f) throw new Error(`Sin render T4 para ${g}`);
  return f;
});
console.log(`Fondo EN VIVO ${FECHA}: ${jugadores.join(', ')}`);

const PROMPT = `Sos fotógrafo de campañas deportivas. Necesito la foto de fondo de la historia de Instagram que anuncia que Top Secret FC (club argentino de EA Sports FC Clubs Pro) está transmitiendo EN VIVO su partido de esta noche.

JUGADORES: los 3 de los renders adjuntos, en este orden:
${jugadores.map((g, i) => `${i + 1}. ${PLAYER_TRAITS[g].desc} (dorsal ${PLAYER_TRAITS[g].dorsal})`).join('\n')}
Copiá exactamente sus caras, pelo, barba, tono de piel, contextura y accesorios.

UNIFORME: exactamente el kit de los renders — camiseta negra con ribetes dorados ornamentales en cuello y mangas, vivos dorados a los costados, swoosh de Nike dorado y el escudo dorado del club (el espía con sombrero, imagen adjunta) en el pecho, short negro. No cambies nada del kit ni del escudo.

ESCENA: noche de partido grande. Los tres salen del túnel al campo de un estadio iluminado por reflectores, caminando hacia cámara con actitud decidida, el del medio un paso adelante. Detrás, las tribunas llenas y desenfocadas, humo leve y luces de estadio que generan contraluz dorado y algún destello frío. Sensación de transmisión en vivo: cinematográfica, intensa, de gala.

COMPOSICIÓN (muy importante): formato VERTICAL 9:16 (1024x1536). Los jugadores ocupan la mitad SUPERIOR y el centro de la imagen, cortados a la altura de los muslos. El tercio inferior tiene que quedar oscuro y limpio (césped y sombra) porque ahí va texto encima. Nada importante en los bordes.

PROHIBIDO: cualquier texto, letras, números sueltos, marcadores, logos de TV, marcas de agua, carteles legibles o el escudo repetido en el fondo.

Fotorrealista, grano fino, iluminación de estadio de alta gama. Generá la imagen ahora.`;

const browser = await chromium.connectOverCDP('http://localhost:9222');
const page = await browser.contexts()[0].newPage();
page.setDefaultTimeout(0);
let ok = false;
try {
  const { filename } = await generateImage(page, { date: `envivo-${FECHA}` }, 'fondo', PROMPT, { freshChat: true, excludeSrcs: [], attachments: [...refs, CREST_PATH] });
  const destino = path.join(DIR, `envivo-${FECHA}.png`);
  fs.copyFileSync(path.resolve('Renders/Daily News', filename), destino);
  fs.unlinkSync(path.resolve('Renders/Daily News', filename));   // no es una noticia: que no quede en Daily News
  console.log('OK', destino);
  try {
    execFileSync('node', ['scripts/r2.mjs', 'put', destino, `_fuentes/placas/fondos-envivo/envivo-${FECHA}.png`], { stdio: 'inherit' });
  } catch (e) { console.warn('No se pudo subir a R2:', e.message); }
  ok = true;
} catch (e) {
  console.log('ERROR', e.message.split('\n')[0]);
}
await deleteChatById(page, currentChatId(page)).catch(() => {});
await page.close();
process.exit(ok ? 0 : 1);
