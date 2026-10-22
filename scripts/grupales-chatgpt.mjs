/**
 * Fotos grupales NUEVAS del plantel T4 generadas con ChatGPT (no collage): los 17 jugadores en una
 * misma escena, en poses facheras. Adjunta al mensaje (los archivos del proyecto no llegan al generador):
 *   1) planilla con las caras identificadas con LETRAS A..Q (busto de cada Frente4, grilla simétrica 6-5-6).
 *      Letras y no números: con números ChatGPT los confundía con los dorsales y los pintaba en las camisetas.
 *   2) dos planillas de cuerpo entero con las mismas letras: A–I y J–Q (kit completo de cada uno)
 *   3) escudo Clean dorado
 * y en el texto, el rasgo de cada número (el generador no ve los nombres de archivo).
 * Salida: fuentes/grupales-ia/grupal-ia-<escena>.png. Cada chat se borra después de bajar la imagen.
 * Uso: node scripts/grupales-chatgpt.mjs [escena ...] [--solo-referencias]   (escenas: estudio estadio tunel vestuario estudio-suelto estadio-suelto enlaces)
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
const LETRA = i => String.fromCharCode(65 + i);   // A, B, C…

const ESCENAS = {
  estudio: 'Estudio de campaña totalmente negro, un barrido de luz DORADA cálida desde arriba y luz de recorte en los bordes de cada jugador; piso negro satinado que refleja apenas los botines. Elegante y poderosa, como la foto oficial de presentación de plantel de un club grande.',
  estadio: 'En el césped del estadio de noche: los reflectores detrás del grupo recortan las siluetas a contraluz, tribunas oscuras y desenfocadas al fondo, una leve bruma natural en el aire, cámara un poco baja que los hace ver imponentes.',
  tunel: 'En la boca del túnel de salida a la cancha: hormigón en penumbra a los costados, la luz blanca y cálida del campo entrando por detrás del grupo, sensación de "salimos a jugar"; perspectiva profunda del túnel.',
  vestuario: 'En el vestuario del club: casilleros de madera oscura y metal, bancos, luz cálida puntual desde arriba; algunos jugadores sentados en el banco o apoyados en los casilleros, otros de pie, actitud de equipo unido y canchero.',
  // Versiones "sueltas" (2026-10-16): mismo estudio/estadio pero sin filas, grupos naturales y actitud.
  'estudio-suelto': 'Estudio de campaña totalmente negro con luz DORADA cálida desde arriba y recortes de luz en los bordes; piso negro satinado. NADA de filas: el plantel repartido en grupos sueltos a distintas profundidades y alturas, como una editorial de moda deportiva — unos de pie, otros apoyados en el hombro de un compañero, uno sentado en el piso, el capitán adelante sentado sobre la pelota. Actitud relajada, segura y canchera.',
  // Para topsecret.ar/enlaces (2026-10-21): "todo el club en un lugar" — vivos, redes, comunidad.
  enlaces: 'De noche en la sala de transmisión del club: detrás del grupo, una gran pared de pantallas encendidas que muestran imágenes DESENFOCADAS de partidos y destellos de luz dorada (las pantallas NO tienen texto, letras, interfaces ni logos de ninguna red social). Esa luz de las pantallas recorta las siluetas desde atrás; adelante, luz dorada cálida y suave. Algunos jugadores con el celular en la mano: uno mostrando la pantalla del celular a cámara (pantalla iluminada sin texto legible), otro mirándolo con media sonrisa; otros apoyados en una consola de transmisión oscura. Clima de equipo conectado, cercano y canchero.',
  // Vertical para el celular (Juan 2026-10-21: "que no aparezca nadie cortado"): la página la muestra entera.
  'enlaces-vertical': 'De noche en la sala de transmisión del club: al fondo, una gran pared de pantallas encendidas con imágenes DESENFOCADAS de partidos y destellos de luz dorada (las pantallas NO tienen texto, letras, interfaces ni logos de ninguna red social). El plantel está escalonado sobre unos escalones/tarimas oscuros frente a las pantallas, así todas las caras se ven. La luz de las pantallas recorta las siluetas desde atrás; adelante, luz dorada cálida y suave. Dos jugadores con el celular en la mano (uno mostrando la pantalla a cámara, iluminada y sin texto legible). Clima de equipo conectado, cercano y canchero.',
  'estadio-suelto': 'En el césped del estadio de noche, con los reflectores detrás a contraluz y una leve bruma: el plantel CAMINANDO hacia la cámara desde el centro de la cancha, en una V abierta con el capitán en la punta, todos a paso firme, algunos hablando entre ellos o con la mirada fija en cámara. Cámara baja con teleobjetivo, los de atrás un poco desenfocados por la distancia. Nada de filas ni de pose de foto oficial.',
};

// Ubicación obligatoria de cada letra por escena: sin esto ChatGPT a veces repetía a dos jugadores
// (19 personas) — pasó con las planillas de cuerpo entero. Cada letra una sola vez; total 17.
// A Ivan · B adri · C rivarola · D Alexis · E Cabers · F Elianja · G endiablado · H Huber · I Guiidow
// J nikileo · K pepolemmo · L Juan (capitán) · M RS32 · N Cipri · O Lil · P Lauta · Q NicoBJ
const PLANES = {
  estudio: [['Atrás, de pie, en el nivel más alto', 'A, D, C, E, F, B'], ['Al medio, de pie un paso más adelante, poses distintas', 'G, H, L, M, I'], ['Adelante, agachados o con una rodilla en el piso', 'J, K, N, O, P, Q']],
  estadio: [['Atrás, de pie', 'A, C, D, E, F, G, H, B'], ['Adelante, agachados o con una rodilla en el piso', 'I, J, K, L, M, N, O, P, Q']],
  tunel: [['Atrás, de pie contra la luz del túnel', 'A, C, G, D, E, H, B'], ['Al medio, de pie, el capitán al centro con la pelota', 'F, J, L, K, I'], ['Adelante, agachados', 'M, N, O, P, Q']],
  vestuario: [['Atrás, de pie o apoyados en los casilleros', 'A, B, C, D, E, F, G, H'], ['Adelante, sentados en el banco o agachados', 'I, J, K, L, M, N, O, P, Q']],
  'estudio-suelto': [['A la izquierda, un grupo de cinco a distintas alturas (dos de pie atrás, uno con el brazo sobre el hombro de otro, uno agachado)', 'A, C, D, G, H'], ['Al centro, el capitán L adelante sentado sobre la pelota; detrás de él, de pie y cerca, tres más', 'L, E, F, M'], ['A la derecha, otro grupo de cinco (uno sentado en el piso, uno de costado mirando a cámara, uno con el brazo sobre un compañero)', 'I, J, K, N, B'], ['En primer plano, cerca de cámara, agachados o con una rodilla en el piso', 'O, P, Q']],
  enlaces: [['Atrás, de pie frente a la pared de pantallas, a distintas alturas, alguno apoyado en la consola', 'A, C, D, E, G, H, B'], ['Al medio, de pie: el capitán L al centro con la pelota bajo el brazo, I y K con el celular en la mano', 'F, I, L, K, M'], ['Adelante, agachados, con una rodilla en el piso o sentados en el borde de la consola', 'J, N, O, P, Q']],
  'enlaces-vertical': [['Arriba de todo, en el escalón más alto frente a las pantallas, de pie', 'A, C, D, E, B'], ['Segundo escalón, de pie, poses distintas', 'G, H, F, M'], ['Tercer escalón, de pie: el capitán L al centro con la pelota bajo el brazo, I y K con el celular en la mano', 'I, L, K, N'], ['Adelante, en el piso, agachados o con una rodilla en el piso', 'J, O, P, Q']],
  'estadio-suelto': [['En la punta de la V, el más adelantado', 'L'], ['Primera línea detrás del capitán, a los costados', 'N, Q, P, J'], ['Segunda línea', 'F, K, M, I, O'], ['Más atrás, más lejos de cámara', 'A, C, D, E, G, H, B']],
};
const FORMATOS = {
  'enlaces-vertical': 'FORMATO: VERTICAL 2:3 (1024x1536), retrato. NADIE CORTADO: los 17 jugadores entran ENTEROS en el cuadro, de la cabeza a los botines, con margen libre en los cuatro bordes (ningún brazo, hombro, pie ni cabeza tocando o saliendo del borde de la imagen). El 20% superior de la imagen queda libre de jugadores (solo el fondo de pantallas, más oscuro) para poner encima el escudo y el título.',
};
const planTexto = escena => PLANES[escena].map(([donde, letras]) => `- ${donde} (de izquierda a derecha): ${letras}  → ${letras.split(',').length} jugadores`).join('\n');

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
      comps.push({ input: Buffer.from(`<svg width="${CW}" height="40" xmlns="http://www.w3.org/2000/svg"><text x="${CW / 2}" y="30" text-anchor="middle" font-family="Arial" font-weight="700" font-size="28" fill="#111">${LETRA(i)}</text></svg>`), left, top: top + 302 });
    }
  }
  const file = path.join(REF, 'caras-a-q.png');
  await sharp({ create: { width: W, height: GAP + 3 * (CH + GAP), channels: 3, background: '#9a9a9a' } }).composite(comps).png().toFile(file);
  return file;
}
// Planillas de cuerpo entero (pedido de Juan): kit completo, dorsal en el short, medias, mangas y contextura de cada uno.
// Dos hojas para que cada figura quede grande: A–I (5 + 4) y J–Q (4 + 4), filas centradas.
async function buildBodies(from, to, rows, name) {
  const FH = 760, FW = Math.round(FH * 1024 / 1536), GAP = 24, LH = 46;
  const maxN = Math.max(...rows), W = maxN * FW + (maxN + 1) * GAP;
  const comps = [];
  let i = from;
  for (const [r, n] of rows.entries()) {
    const x0 = (W - (n * FW + (n - 1) * GAP)) / 2;
    for (let c = 0; c < n && i <= to; c++, i++) {
      const left = Math.round(x0 + c * (FW + GAP)), top = GAP + r * (FH + LH + GAP);
      comps.push({ input: await sharp(path.join(FRENTES, `${players[i]}.png`)).resize(FW, FH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left, top });
      comps.push({ input: Buffer.from(`<svg width="${FW}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><text x="${FW / 2}" y="36" text-anchor="middle" font-family="Arial" font-weight="700" font-size="34" fill="#111">${LETRA(i)}</text></svg>`), left, top: top + FH });
    }
  }
  const file = path.join(REF, name);
  await sharp({ create: { width: W, height: GAP + rows.length * (FH + LH + GAP), channels: 3, background: '#9a9a9a' } }).composite(comps).png().toFile(file);
  return file;
}

function buildPrompt(escena, numeros) {
  const lista = players.map((k, i) => {
    const t = PLAYER_TRAITS[k] || {};
    const d = numeros[k] ?? t.dorsal;
    return `${LETRA(i)}. ${t.desc || k}${d != null ? ` — su dorsal es el ${d}` : ''}`;
  }).join('\n');
  return `${brandFormatBlock()}

═══ FOTO GRUPAL DEL PLANTEL — TEMPORADA 4 ═══
Generá UNA fotografía grupal NUEVA de los 17 jugadores del plantel de Top Secret FC juntos en la MISMA escena, con la misma luz y la misma cámara. No es un collage ni recortes pegados: es una sola foto real, coherente, como la foto oficial de presentación de un club grande.

${FORMATOS[escena] || 'FORMATO: horizontal 3:2 (1536x1024). Todos los jugadores entran completos en el cuadro, con un poco de aire arriba.'}

ESCENA: ${ESCENAS[escena]}

POSES: todos en poses FACHERAS y canchereras, distintas entre sí — brazos cruzados, señalando a cámara, mano en el hombro de un compañero, pelota bajo el brazo o pisándola, uno o dos agachados o con una rodilla en el piso adelante, mentón arriba, mirada desafiante, media sonrisa. NUNCA formados en filas "como militares": un grupo natural con profundidad (adelante, al medio y atrás), alturas y separaciones variadas, algunos apoyados entre sí.

UBICACIÓN OBLIGATORIA (las letras son las de las planillas; cada letra aparece UNA sola vez en toda la foto):
${planTexto(escena)}
Total: 17 personas. Antes de terminar, contá: si hay 18 o más, o alguien repetido, corregilo.

CANTIDAD: EXACTAMENTE 17 jugadores — ni uno más ni uno menos —, cada jugador de la planilla aparece UNA sola vez y TODOS con la cara bien visible (nadie tapado por otro).

REFERENCIAS ADJUNTAS (usalas siempre):
1) Planilla de caras identificadas con letras de la A a la Q (las letras son solo para identificarlos: NO van en la imagen). Respetá la cara, el tono de piel, el pelo, la barba y los accesorios (anteojos, vincha, máscara) de cada uno:
${lista}
2) y 3) Dos planillas de CUERPO ENTERO con las mismas letras (A a I y J a Q): así es cada jugador de pies a cabeza, con su kit tal cual. Copiá de ahí la contextura, las mangas y accesorios de cada uno (cada manga o accesorio pertenece solo a ese jugador), el short, las medias y los botines. Los 15 de campo llevan el kit NEGRO con detalles DORADOS; los 2 arqueros (A y B) el conjunto NARANJA con ondas amarillas, short y medias ROJAS y guantes.
4) Escudo del club (el espía dorado): va en el pecho de cada camiseta, igual al adjunto, sin deformarlo.

DORSALES — igual que en las planillas de cuerpo entero:
- La camiseta NO lleva ningún número en el frente (ni en el pecho ni en la panza). Adelante solo van el escudo y el swoosh.
- El dorsal de cada jugador va SOLO en el short, chico, en la pierna derecha, como en las planillas. Si algún jugador está de espaldas, también en la espalda de la camiseta.
- El número que manda es el de la lista de arriba ("su dorsal es el…"): si en alguna planilla se ve otro número, ignoralo y usá el de la lista.
- Cada número aparece únicamente en el jugador al que corresponde y una sola vez por persona; no repitas números ni los pongas en medias, piso, paredes ni accesorios.
Fuera de esos dorsales: sin ningún otro texto, letra, logo extra ni marca de agua.`;
}

// ── 2 · Generación ──────────────────────────────────────────
const pedidas = process.argv.slice(2).filter(a => ESCENAS[a]);
const escenas = pedidas.length ? pedidas : Object.keys(ESCENAS);
const sheet = await buildSheet();
const cuerpos1 = await buildBodies(0, 8, [5, 4], 'cuerpos-a-i.png'), cuerpos2 = await buildBodies(9, 16, [4, 4], 'cuerpos-j-q.png');
const crest = path.resolve('logos/rebrand/Clean logo Dorado.png');
const numeros = await fetchJerseyOverrides().catch(() => ({}));
console.log('Referencias listas:', sheet, cuerpos1, cuerpos2);
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
    const { filename } = await generateImage(page, { id }, 'foto', buildPrompt(escena, numeros), { freshChat: true, excludeSrcs: [], attachments: [sheet, cuerpos1, cuerpos2, crest] });
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
