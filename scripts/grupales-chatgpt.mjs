/**
 * Fotos grupales NUEVAS del plantel T4 generadas con ChatGPT (no collage): los 17 jugadores en una
 * misma escena, en poses facheras. Adjunta al mensaje (los archivos del proyecto no llegan al generador):
 *   1) planilla con las caras numeradas 1..17 (busto de cada Frente4, grilla simétrica 6-5-6)
 *   2) kit de campo + kit de arquero de cuerpo entero
 *   3) escudo Clean dorado
 * y en el texto, el rasgo de cada número (el generador no ve los nombres de archivo).
 * Salida: fuentes/grupales-ia/grupal-ia-<escena>.png. Cada chat se borra después de bajar la imagen.
 * Uso: node scripts/grupales-chatgpt.mjs [escena ...] [--solo-referencias]   (escenas: estudio estadio tunel vestuario)
 * Requiere el Chrome con CDP (scripts/abrir-chrome-chatgpt.ps1) logueado en ChatGPT.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { ROSTER_T4 } from '../roster.js';
import { PLAYER_TRAITS, brandFormatBlock, generateImage, currentChatId, deleteChatById, fetchJerseyOverrides } from './generate-image-chatgpt.mjs';

const OUT = path.resolve('fuentes/grupales-ia');
const REF = path.join(OUT, 'referencias');
fs.mkdirSync(REF, { recursive: true });
const FRENTES = path.resolve('Renders/T4-Frentes');
const GKS = ['Ivan_Cabj_La12', 'adri_cai'];

const ESCENAS = {
  estudio: 'Estudio de campaña totalmente negro, un barrido de luz DORADA cálida desde arriba y luz de recorte en los bordes de cada jugador; piso negro satinado que refleja apenas los botines. Elegante y poderosa, como la foto oficial de presentación de plantel de un club grande.',
  estadio: 'En el césped del estadio de noche: los reflectores detrás del grupo recortan las siluetas a contraluz, tribunas oscuras y desenfocadas al fondo, una leve bruma natural en el aire, cámara un poco baja que los hace ver imponentes.',
  tunel: 'En la boca del túnel de salida a la cancha: hormigón en penumbra a los costados, la luz blanca y cálida del campo entrando por detrás del grupo, sensación de "salimos a jugar"; perspectiva profunda del túnel.',
  vestuario: 'En el vestuario del club: casilleros de madera oscura y metal, bancos, luz cálida puntual desde arriba; algunos jugadores sentados en el banco o apoyados en los casilleros, otros de pie, actitud de equipo unido y canchero.',
};

// ── 1 · Referencias ─────────────────────────────────────────
const players = ROSTER_T4.map(p => p.key).filter(k => fs.existsSync(path.join(FRENTES, `${k}.png`)));
if (players.length !== ROSTER_T4.length) console.warn('Faltan renders en Renders/T4-Frentes para:', ROSTER_T4.map(p => p.key).filter(k => !players.includes(k)));

async function bust(key) {
  const src = path.join(FRENTES, `${key}.png`);
  const m = await sharp(src).metadata();
  const w = Math.round(m.width * 0.62), h = Math.round(m.height * 0.4);
  return sharp(src).extract({ left: Math.round((m.width - w) / 2), top: 0, width: w, height: h }).resize(300, 300, { fit: 'contain', background: '#7a7a7a' }).png().toBuffer();
}
async function buildSheet() {
  const rows = [6, 5, 6], CW = 300, CH = 344, GAP = 18, W = 6 * CW + 7 * GAP;
  const comps = [];
  let i = 0;
  for (const [r, n] of rows.entries()) {
    const x0 = (W - (n * CW + (n - 1) * GAP)) / 2;
    for (let c = 0; c < n && i < players.length; c++, i++) {
      const left = Math.round(x0 + c * (CW + GAP)), top = GAP + r * (CH + GAP);
      comps.push({ input: await bust(players[i]), left, top });
      comps.push({ input: Buffer.from(`<svg width="${CW}" height="40" xmlns="http://www.w3.org/2000/svg"><text x="${CW / 2}" y="30" text-anchor="middle" font-family="Arial" font-weight="700" font-size="28" fill="#111">${i + 1}</text></svg>`), left, top: top + 302 });
    }
  }
  const file = path.join(REF, 'caras-1-17.png');
  await sharp({ create: { width: W, height: GAP + 3 * (CH + GAP), channels: 3, background: '#9a9a9a' } }).composite(comps).png().toFile(file);
  return file;
}
async function buildKit() {
  const a = await sharp(path.join(FRENTES, 'NicoBJ_96.png')).resize({ height: 1100 }).toBuffer();
  const b = await sharp(path.join(FRENTES, 'Ivan_Cabj_La12.png')).resize({ height: 1100 }).toBuffer();
  const wa = (await sharp(a).metadata()).width, wb = (await sharp(b).metadata()).width;
  const file = path.join(REF, 'kits.png');
  await sharp({ create: { width: wa + wb + 120, height: 1160, channels: 3, background: '#9a9a9a' } })
    .composite([{ input: a, left: 40, top: 30 }, { input: b, left: wa + 80, top: 30 }]).png().toFile(file);
  return file;
}

function buildPrompt(escena, numeros) {
  const lista = players.map((k, i) => {
    const t = PLAYER_TRAITS[k] || {};
    const d = numeros[k] ?? t.dorsal;
    return `${i + 1}. ${t.desc || k}${d != null ? ` — dorsal ${d}` : ''}`;
  }).join('\n');
  return `${brandFormatBlock()}

═══ FOTO GRUPAL DEL PLANTEL — TEMPORADA 4 ═══
Generá UNA fotografía grupal NUEVA de los 17 jugadores del plantel de Top Secret FC juntos en la MISMA escena, con la misma luz y la misma cámara. No es un collage ni recortes pegados: es una sola foto real, coherente, como la foto oficial de presentación de un club grande.

FORMATO: horizontal 3:2 (1536x1024). Todos los jugadores entran completos en el cuadro, con un poco de aire arriba.

ESCENA: ${ESCENAS[escena]}

POSES: todos en poses FACHERAS y canchereras, distintas entre sí — brazos cruzados, señalando a cámara, mano en el hombro de un compañero, pelota bajo el brazo o pisándola, uno o dos agachados o con una rodilla en el piso adelante, mentón arriba, mirada desafiante, media sonrisa. NUNCA formados en filas "como militares": un grupo natural con profundidad (adelante, al medio y atrás), alturas y separaciones variadas, algunos apoyados entre sí.

CANTIDAD: EXACTAMENTE 17 jugadores — ni uno más ni uno menos —, cada jugador de la planilla aparece UNA sola vez y TODOS con la cara bien visible (nadie tapado por otro).

REFERENCIAS ADJUNTAS (usalas siempre):
1) Planilla de caras numeradas del 1 al 17. Respetá la cara, el tono de piel, el pelo, la barba y los accesorios (anteojos, vincha, máscara) de cada uno:
${lista}
2) Kits de cuerpo entero: los 15 jugadores de campo con el kit NEGRO con detalles DORADOS (camiseta, short y medias como en la referencia de la izquierda); los 2 arqueros (1 y 2 de la planilla) con el conjunto NARANJA con ondas amarillas, short y medias ROJAS y guantes, como en la referencia de la derecha.
3) Escudo del club (el espía dorado): va en el pecho de cada camiseta, igual al adjunto, sin deformarlo.

Lo único escrito permitido son los dorsales en camisetas y shorts. Sin ningún otro texto, logo extra ni marca de agua.`;
}

// ── 2 · Generación ──────────────────────────────────────────
const pedidas = process.argv.slice(2).filter(a => ESCENAS[a]);
const escenas = pedidas.length ? pedidas : Object.keys(ESCENAS);
const sheet = await buildSheet(), kit = await buildKit();
const crest = path.resolve('logos/rebrand/Clean logo Dorado.png');
const numeros = await fetchJerseyOverrides().catch(() => ({}));
console.log('Referencias listas:', sheet, kit);
if (process.argv.includes('--solo-referencias')) process.exit(0);

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
page.setDefaultTimeout(2 * 60 * 1000);
await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://chatgpt.com' }).catch(() => {});

for (const escena of escenas) {
  const id = `grupal-ia-${escena}`;
  console.log(`\n=== ${escena} ===`);
  try {
    const { filename } = await generateImage(page, { id }, 'foto', buildPrompt(escena, numeros), { freshChat: true, excludeSrcs: [], attachments: [sheet, kit, crest] });
    const from = path.resolve('Renders/Daily News', filename), to = path.join(OUT, `${id}.png`);
    fs.renameSync(from, to);
    const m = await sharp(to).metadata();
    console.log(`OK ${to} (${m.width}x${m.height})`);
  } catch (e) {
    console.error(`FALLÓ ${escena}:`, e.message);
  } finally {
    const conv = currentChatId(page);
    if (conv) await deleteChatById(page, conv).catch(e => console.warn('  no se pudo borrar el chat:', e.message));
  }
}
await page.close();
await browser.close().catch(() => {});
console.log('\nListo.');
