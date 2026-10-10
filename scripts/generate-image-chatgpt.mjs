/**
 * Genera imágenes para la noticia diaria de Top Secret FC usando ChatGPT.
 * Usa el proyecto "TOP Secret FC" en ChatGPT y adjunta a cada mensaje las
 * referencias visuales desde el repo local (escudo Clean dorado y renders T4
 * de cada jugador, que ya llevan puesto el kit del día) — los archivos del proyecto no llegan al generador
 * de imágenes. Conecta al Chrome del usuario via CDP en localhost:9222.
 *
 * Uso:
 *   node scripts/generate-image-chatgpt.mjs                              # automático (9:15)
 *   node scripts/generate-image-chatgpt.mjs --review                    # loop de revisión interactiva
 *   node scripts/generate-image-chatgpt.mjs --review --feedback "texto" # revisión con dirección inicial
 *   node scripts/generate-image-chatgpt.mjs --force                     # regenerar sin loop
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createInterface } from 'readline';
import sharp from 'sharp';
import { pathToFileURL } from 'url';
import { loadEnv } from './lib/env.mjs';

const WORKER_BASE             = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
// Credenciales R2 desde .env / entorno (ver .env.example) — nunca escribirlas acá: el repo es público.
loadEnv();
const R2_ACCESS_KEY   = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_KEY   = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_ENDPOINT     = `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_BUCKET       = process.env.R2_BUCKET || 'top-secret-media';
function r2MediaUrl(relPath) {
  return `${WORKER_BASE}/media/${relPath.split('/').map(encodeURIComponent).join('/')}`;
}
const FIRESTORE_DRAFT        = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
const FIRESTORE_STYLE_HISTORY = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/image_style_history';
const FIRESTORE_KIT_HISTORY  = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/kit_color_history';
const FIRESTORE_PLANTEL      = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/plantel/activo';
const OUTPUT_DIR      = path.resolve('Renders/Daily News');
const DEBUG_DIR       = path.resolve('scripts'); // screenshots de debug fuera de Daily News (no se commitean)
const PROJECT_URL     = 'https://chatgpt.com/g/g-p-6a420887ce04819182396abfcbd40400/';
const MAX_ATTEMPTS    = 3;
// Timeout por acción de Playwright (click, evaluate, etc.). Antes era 0
// (infinito) y un click trabado colgaba la corrida para siempre.
const ACTION_TIMEOUT_MS = 2 * 60 * 1000;
// ChatGPT ignora los píxeles pedidos en texto y a veces devuelve el post en la
// misma proporción angosta de la story (bug 2026-07-20: las dos imágenes
// salieron 941x1672), o directamente APAISADO/horizontal (bug 2026-07-20 a
// 2026-07-23: posts saliendo 1402x1122, ratio 1.25 — ancho > alto). Esto es un
// chequeo MECÁNICO sobre los píxeles reales —no depende del criterio del
// evaluador visual— antes de aceptar cada pieza.
const POST_MIN_RATIO  = 0.68; // ancho/alto por debajo de esto = parece story, no post
const POST_MAX_RATIO  = 0.90; // ancho/alto por encima de esto = apaisado/horizontal, no post
const STORY_MAX_RATIO = 0.68; // ancho/alto por encima de esto = parece post, no story

async function imageRatio(filePath) {
  const meta = await sharp(filePath).metadata();
  return { width: meta.width, height: meta.height, ratio: meta.width / meta.height };
}

// Referencias visuales que se ADJUNTAN a cada mensaje de generación.
// Los archivos del proyecto de ChatGPT no llegan de forma confiable al
// generador de imágenes (por eso inventaba escudos) — los adjuntos sí.
// Temporada 4 (2026-10): escudo "Clean logo" (el espía solo) en dorado — es el que llevan las camisetas.
const CREST_PATH = path.resolve('logos/rebrand/Clean logo Dorado.png');
const CREST_WHITE_PATH = path.resolve('logos/rebrand/Clean logo.png');
// Póster viejo de kits T3 (con AIA) — ya no se usa en la generación diaria; queda exportado para scripts one-off viejos.
const KITS_PATH  = path.resolve('logos/T3 Kits.png');

// Kits T4: el render T4 de cada jugador YA tiene puesto el kit (Renders/T4-Frentes = titular,
// Renders/T4-Frentes-K2 = alternativa), así que la referencia del uniforme es el propio render —
// no hace falta recortar un póster de kits ni dejar que ChatGPT mezcle prendas. Los arqueros usan
// siempre su conjunto naranja (están en T4-Frentes, no tienen versión K2).
const T4_FRENTES_DIR    = path.resolve('Renders/T4-Frentes');
const T4_FRENTES_K2_DIR = path.resolve('Renders/T4-Frentes-K2');
const GOALKEEPERS = ['Ivan_Cabj_La12', 'adri_cai'];
const KIT_COLORS = [
  {
    id: 'titular', label: 'titular negro y dorado', dir: T4_FRENTES_DIR,
    desc: 'camiseta NEGRA con cuello en V y guarda de laureles dorados en el cuello y los puños, vivos dorados finos; escudo del club (espía con sombrero y anteojos, dorado) a la izquierda del pecho y swoosh de Nike dorado a la derecha; SIN sponsor en el pecho. Short negro con swoosh dorado y dorsal blanco. Medias negras con banda dorada ornamental.',
  },
  {
    id: 'alternativa', label: 'alternativo azul francia', dir: T4_FRENTES_K2_DIR,
    desc: 'camiseta AZUL FRANCIA con textura geométrica tono sobre tono, cuello polo y vivos amarillos a los costados; escudo del club dorado a la izquierda del pecho y swoosh de Nike amarillo; SIN sponsor en el pecho. Short azul. Medias blancas con banda azul.',
  },
];
const GK_KIT_DESC = 'conjunto de ARQUERO: camiseta NARANJA con estampado de ondas amarillas, escudo del club en BLANCO y swoosh de Nike blanco, short y medias ROJAS, guantes de arquero.';

// Render de un jugador con el kit del día (arqueros: siempre el suyo, naranja).
function renderForKit(player, kit) {
  const dirs = GOALKEEPERS.includes(player) ? [T4_FRENTES_DIR] : [kit.dir, T4_FRENTES_DIR];
  for (const d of dirs) for (const ext of ['png', 'jpg']) {
    const f = path.join(d, `${player}.${ext}`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

// Compatibilidad con scripts one-off viejos (T3). La generación diaria ya no recorta kits.
async function cropKitImage() { return null; }

// Prueba cada pestaña por CDP (Runtime.evaluate) y cierra las que no
// responden en 8 s. Si el Chrome no está, no hace nada (lo reporta el connect).
async function closeHungTabs() {
  let targets;
  try { targets = await (await fetch('http://localhost:9222/json/list')).json(); }
  catch { return; }
  for (const t of targets.filter(t => t.type === 'page' && t.webSocketDebuggerUrl)) {
    const ok = await new Promise(res => {
      let ws;
      const to = setTimeout(() => { try { ws.close(); } catch {} res(false); }, 8000);
      try { ws = new WebSocket(t.webSocketDebuggerUrl); } catch { clearTimeout(to); return res(true); }
      ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: '1' } }));
      ws.onmessage = () => { clearTimeout(to); ws.close(); res(true); };
      ws.onerror = () => { clearTimeout(to); res(true); };
    });
    if (!ok) {
      console.log(`  Pestaña colgada, se cierra: ${t.title || t.url}`);
      try { await fetch(`http://localhost:9222/json/close/${t.id}`); } catch {}
    }
  }
}

async function fetchKitHistory() {
  try {
    const res = await fetch(FIRESTORE_KIT_HISTORY);
    const doc = await res.json();
    if (doc.error) return [];
    const values = doc.fields?.entries?.arrayValue?.values || [];
    return values.map(v => ({
      kit:  v.mapValue.fields.kit.stringValue,
      date: v.mapValue.fields.date.stringValue,
    }));
  } catch { return []; }
}

// El script elige el kit (nunca ChatGPT) — rotación simple anti-repetición
// contra las últimas 2 corridas, igual criterio que pickStyle().
function pickKitColor(history) {
  const recentIds = new Set(history.slice(0, 2).map(h => h.kit));
  const available = KIT_COLORS.filter(k => !recentIds.has(k.id));
  const pool = available.length > 0 ? available : KIT_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function saveKitHistory(kitId, date, history) {
  const updated = [{ kit: kitId, date }, ...history].slice(0, 10);
  const values = updated.map(e => ({ mapValue: { fields: {
    kit:  { stringValue: e.kit },
    date: { stringValue: e.date },
  }}}));
  await fetch(FIRESTORE_KIT_HISTORY, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { entries: { arrayValue: { values } } } }),
  });
}

// El evaluador debe juzgar contra el ESTILO DEL DÍA, no contra una paleta fija:
// exigir siempre negro+dorado haría rechazar imágenes correctas de estilos claros
// (editorial revista, lluvia teal, estadio azul, etc.).
function buildEvalPrompt(style, draft, mentioned, kit) {
  const isSeleccion = /^selecc/i.test(draft.category || '');
  const identityBlock = mentioned.length > 0
    ? `
JUGADORES DE ESTA NOTICIA — identidad visual correcta (rasgos → nombre y dorsal):
${mentioned.map(playerIdentityLine).join('\n')}
- Si en la imagen aparece un nombre o dorsal de esta lista sobre un jugador cuyos rasgos NO coinciden (otro pelo, otra piel, sin la máscara/anteojos que corresponden), o un mismo jugador mezcla rasgos de dos de la lista = RECHAZADA
- Un jugador prominente con rasgos distintivos (afro, dreadlocks, máscara, pelo de color) que no corresponde a ninguno de la lista y lleva nombre o dorsal legible = RECHAZADA
`
    : '';
  return `Sos el Director Creativo de Top Secret FC, club de fútbol virtual argentino de élite.

Te adjunto DOS imágenes: la PRIMERA es la imagen a evaluar; la SEGUNDA es el escudo oficial del club (referencia — el espía con sombrero, anteojos y cuello de gabardina, sin marco, en dorado).

Evaluá si la PRIMERA imagen sirve para publicar la noticia de hoy en redes.

NOTICIA DE HOY: "${draft.title || ''}"
${identityBlock}
ESTILO VISUAL ELEGIDO PARA HOY: ${style.label}
- Paleta esperada del AMBIENTE (fondo y diseño): ${style.palette}
- Dirección de arte: ${style.prompt}

CRITERIOS (todos deben cumplirse):
- Si aparece el escudo del club, su DISEÑO es el de la segunda imagen adjunta: el espía con sombrero, anteojos y cuello de gabardina, sin marco. La versión BLANCA plana del MISMO diseño también es válida (es la del kit de arquero). Un escudo de diseño distinto (león, estrellas, otro ícono) = RECHAZADA sí o sí. PERO: que la luz ambiental de la escena tiña el escudo (dorado en luz cálida, azulado de noche) es fotografía normal y NO es motivo de rechazo
- El ambiente respeta la paleta del estilo de hoy (NO exijas negro/dorado si el estilo pide otra cosa)
- El uniforme del jugador se ve nítido, sin teñirse con la paleta del ambiente
${isSeleccion
  ? `- Esta noticia es de la Selección Argentina: la camiseta CELESTE Y BLANCA de la Selección es VÁLIDA para jugadores o elementos que representen a la Selección. Si aparece un jugador de Top Secret como jugador del club, su camiseta tiene que ser la del kit ${kit.label.toUpperCase()} de hoy (ningún otro color del club, ni azul/rojo/otro) = si no, RECHAZADA`
  : `- El kit de HOY es el ${kit.label.toUpperCase()} — ninguna otra camiseta del club (ni negra si hoy es blanco/amarillo, ni ningún otro color) es válida = RECHAZADA si el color no coincide`}
- El kit de Temporada 4 NO lleva sponsor en el pecho: cualquier sponsor o texto en el pecho (incluido el viejo "AIA") = RECHAZADA. El swoosh de Nike es correcto. También RECHAZADA: cualquier otra marca deportiva o el escudo/identidad de un club real (Chelsea, Tottenham, Real Madrid, Boca, etc.) en vez del escudo de Top Secret FC
- Dorsales: si se ve un número de camiseta, los dígitos están bien formados, en orientación correcta y NO espejados ni invertidos (un "01" donde debería decir "10", dígitos al revés como en un reflejo, números deformes) = RECHAZADA
- ESTÉTICA DEL CLUB (Temporada 4): foto de campaña deportiva limpia y premium, estilo lanzamiento de camisetas de un club grande — luz cuidada, negros profundos, un acento dorado. SIN texto, sin titulares, sin sellos, sin papeles/carpetas/expedientes ni collages. Si parece un póster genérico de IA (explosiones de partículas, humo o luces de colores, lens flares plásticos) = RECHAZADA
- La imagen comunica visualmente el tema de la noticia
- La imagen NO tiene texto (ni titular, ni rótulos, ni watermarks) — el título lo pone el sitio
- Sin franja/barra de marca en el borde inferior, sin watermarks
- Anatomía correcta (manos, proporciones, caras)

Respondé ÚNICAMENTE con uno de estos dos formatos (nada más):
APROBADA - [motivo breve]
RECHAZADA - [qué falla específicamente, en una línea accionable para el generador de imágenes]`;
}

// Estética Temporada 4 (rediseño 2026-09-28, regla de Juan 2026-09-29): fotos de campaña limpias,
// estilo lanzamiento de camisetas de un club grande — sin texto, sin sellos ni papeles de "expediente".
// El título y la marca los pone el sitio (share-cards.js), no la imagen. La rotación varía la ESCENA.
const IMAGE_STYLES = [
  { id: 'CAMPANA_ESTUDIO',
    label: 'Campaña — Estudio oscuro',
    palette: 'fondo negro profundo de estudio, luz rasante cálida, un único acento DORADO #C9A84C',
    prompt: 'Retrato de campaña en estudio: el/los jugador(es) sobre fondo negro limpio, luz lateral rasante que esculpe la cara y el kit, sombras profundas, postura firme mirando a cámara. Composición sobria y premium, mucho aire negro alrededor.' },
  { id: 'ESTADIO_NOCHE',
    label: 'Campaña — Estadio de noche',
    palette: 'noche azul profunda, reflectores blancos fríos, césped verde oscuro, acento DORADO en la luz de contra',
    prompt: 'Foto de campaña en el estadio de noche: el/los jugador(es) en el césped bajo los reflectores, contraluz que recorta la silueta, tribunas desenfocadas al fondo, atmósfera de noche grande.' },
  { id: 'TUNEL',
    label: 'Campaña — Túnel',
    palette: 'túnel de hormigón en penumbra, luz cálida al fondo, negros y grises con acento DORADO',
    prompt: 'Foto en el túnel de salida a la cancha: el/los jugador(es) caminando hacia la luz, perspectiva profunda del túnel, concentración previa al partido, luz cálida que entra desde la cancha.' },
  { id: 'RETRATO_EDITORIAL',
    label: 'Campaña — Retrato editorial',
    palette: 'gris carbón y negro, luz suave de ventana, piel natural, acento DORADO mínimo',
    prompt: 'Retrato editorial de revista deportiva: plano medio cercano del jugador, mirada a cámara o tres cuartos, luz suave y natural, fondo liso desenfocado, textura real de la tela del kit.' },
  { id: 'ACCION_PARTIDO',
    label: 'Campaña — Acción en cancha',
    palette: 'verde del césped, cielo nocturno, luces de estadio; contraste alto, acento DORADO',
    prompt: 'Foto de acción congelada en pleno partido: el jugador en movimiento (remate, carrera, festejo), teleobjetivo, fondo de estadio desenfocado, gotas de sudor y pasto levantado, nitidez total en el kit y la cara.' },
  { id: 'VESTUARIO',
    label: 'Campaña — Vestuario',
    palette: 'vestuario oscuro de madera y metal, luz cálida puntual, acento DORADO',
    prompt: 'Foto íntima en el vestuario: el/los jugador(es) sentados o de pie junto a los casilleros, camisetas colgadas, luz cálida puntual, momento de concentración o charla de equipo.' },
];

// Bloque de identidad visual constante — se inyecta en TODOS los prompts de generación.
function brandFormatBlock() {
  return `═══ ESTÉTICA DEL CLUB — TEMPORADA 4 (OBLIGATORIA SIEMPRE) ═══
Las imágenes de noticias de Top Secret FC son FOTOS DE CAMPAÑA: limpias, premium, con el nivel de una campaña de lanzamiento de camisetas de un club grande de Europa.
- Fotografía realista y cuidada: luz dirigida, negros profundos, piel y tela con textura real. Un solo color de acento: DORADO.
- SIN NINGÚN TEXTO en la imagen: nada de titulares, rótulos, sellos, watermarks ni tipografía. El título lo agrega el sitio después.
- PROHIBIDO el estilo viejo de "expediente": nada de papeles, carpetas, clips, sellos "TOP SECRET", barras de censura, polaroids ni collages.
- PROHIBIDO el look de póster de videojuego o de imagen de IA genérica: explosiones de partículas, humo de colores, lens flares plásticos, rayos de luz exagerados.
- Composición pensada para que el sitio pueda poner el título arriba o abajo: dejá aire libre (fondo limpio) en el tercio superior o inferior.`;
}

// ── CLI flags ─────────────────────────────────────────────────────────────────
// --review      : loop interactivo de revisión hasta aprobar las imágenes
// --force       : regenerar aunque el draft ya tenga imágenes (implícito en --review)
// --story-only  : omite el post (usa el existente), genera solo la story
// --feedback    : dirección inicial para la generación (texto entre comillas)
const _args         = process.argv.slice(2);
const FLAG_FORCE    = _args.includes('--force') || _args.includes('--review') || _args.includes('--story-only');
const FLAG_REVIEW   = _args.includes('--review');
const FLAG_STORY    = _args.includes('--story-only');
const _fbIdx        = _args.indexOf('--feedback');
const FLAG_FEEDBACK = _fbIdx >= 0 ? _args[_fbIdx + 1] : null;

// Jugadores con render disponible (Renders/T4-Frentes/ local, gitignored; en R2 como Renders/<gt>/Frente4.png).
// Basta con agregar el PNG ahí — se adjunta al mensaje de generación.
const T3_FRENTES_DIR = path.resolve('Renders/T3-Frentes');   // solo para scripts one-off viejos

// Jugadores con licencia/baja temporal: no se los usa como protagonistas de imágenes hasta nuevo aviso.
const PLAYERS_ON_LEAVE = [];

const PLAYERS_WITH_RENDERS = fs.readdirSync(T4_FRENTES_DIR)
  .filter(f => /\.(png|jpg)$/i.test(f))
  .map(f => f.replace(/\.(png|jpg)$/i, ''))
  .filter(p => !PLAYERS_ON_LEAVE.includes(p));

// Rasgos físicos de cada render T4 — el generador de imágenes de ChatGPT NO ve los nombres de
// archivo de los adjuntos, así que el mapeo cara→gamertag viaja como TEXTO en el prompt o mezcla
// identidades (pasó el 2026-07-16). Dorsales: los pisa Firestore (plantel/activo.numeros).
// Actualizar cuando cambie un look (ver Renders/<gt>/Frente4.png).
const PLAYER_TRAITS = {
  'Ivan_Cabj_La12':   { dorsal: 12, desc: 'ARQUERO: piel oscura, trenzas largas azul oscuro recogidas hacia atrás, barba corta canosa' },
  'adri_cai':         { dorsal: 32, desc: 'ARQUERO: piel clara, cabeza rapada, barba castaña corta' },
  'rivarola90':       { dorsal: 2,  desc: 'piel oscura, melena gris plateada hasta los hombros con vincha negra, chivita canosa' },
  'Alexisraies23':    { dorsal: 3,  desc: 'piel morena, dreadlocks negros hasta los hombros, barba negra, anteojos deportivos celestes espejados' },
  'Cabers14':         { dorsal: 5,  desc: 'rasgos del este asiático, piel clara, pelo negro corto y lacio, sin barba' },
  'Elianja20':        { dorsal: 24, desc: 'piel trigueña, pelo blanco/plateado muy rizado, anteojos deportivos rojos espejados, barba negra' },
  'endiabladorojo66': { dorsal: 66, desc: 'piel clara, pelo castaño ondulado largo atrás (mullet), barba de pocos días' },
  'Huber236':         { dorsal: 8,  desc: 'piel clara, pelo negro abundante peinado hacia arriba, barba negra completa y prolija' },
  'Guiidow':          { dorsal: 20, desc: 'piel trigueña, pelo rapado a los costados con cresta corta, chivita fina, cara descubierta' },
  'nikileo527':       { dorsal: 10, desc: 'piel clara, pelo castaño corto peinado, sin barba, cara joven' },
  'pepolemmo2710':    { dorsal: 15, desc: 'piel trigueña, vincha roja en la frente, anteojos deportivos naranja/rojos espejados, barba negra' },
  'Juan_Martinez4':   { dorsal: 6,  desc: 'piel clara, pelo rubio con raya al costado, barba castaña prolija, cinta de capitán en el brazo' },
  'RS32-DaniStone':   { dorsal: 13, desc: 'piel clara, pelo violeta/azul tipo mullet, sin barba' },
  'CipriMancini':     { dorsal: 14, desc: 'piel trigueña, pelo castaño con rulos por encima de los hombros, anteojos deportivos rojos, manga térmica azul con estampado rojo en el brazo derecho y manga azul en el izquierdo' },
  'Lil_Dekuroko':     { dorsal: 22, desc: 'piel morena, pelo corto rizado rojo/borgoña, máscara de calavera blanca cubriendo nariz y boca' },
  'Lautavester7':     { dorsal: 7,  desc: 'piel oscura, pelo muy corto teñido azul claro, barba negra tupida, anteojos deportivos rojos espejados' },
  'Juanchyroman08':   { dorsal: 18, desc: 'piel clara, gorra gris puesta al revés, pelo azul largo, dos franjas azules pintadas bajo los ojos, tatuaje en el brazo' },
  'kee_viin03':       { dorsal: 21, desc: 'piel oscura, afro grande y voluminoso rojo/rosa intenso, sin barba' },
  'NicoBJ_96':        { dorsal: 9,  desc: 'piel oscura, pelo corto rubio platinado, barba negra larga y tupida' },
};

// Dorsales vigentes desde Firestore (plantel/activo.numeros) — la misma fuente
// que usan convocatoria.html y plantilla.html, así que un cambio de número
// hecho ahí (picker de convocatoria) llega acá sin tocar código. Se completa
// una vez por corrida en main() vía fetchJerseyOverrides(); default {} si falla.
let JERSEY_OVERRIDES = {};

async function fetchJerseyOverrides() {
  try {
    const res = await fetch(FIRESTORE_PLANTEL);
    const doc = await res.json();
    if (doc.error) return {};
    const fields = doc.fields?.numeros?.mapValue?.fields || {};
    const overrides = {};
    for (const [name, v] of Object.entries(fields)) {
      const n = v.integerValue ?? v.stringValue ?? v.doubleValue;
      if (n != null) overrides[name] = Number(n);
    }
    return overrides;
  } catch { return {}; }
}

function playerIdentityLine(p) {
  const t = PLAYER_TRAITS[p];
  if (!t) return `- ${p}`;
  const dorsalNum = JERSEY_OVERRIDES[p] ?? t.dorsal;
  const dorsal = dorsalNum !== null && dorsalNum !== undefined
    ? `dorsal ${dorsalNum}, nombre en camiseta "${p.toUpperCase()}"`
    : 'dorsal NO confirmado — no le muestres número ni nombre en la espalda';
  return `- ${p} → ${t.desc} → ${dorsal}`;
}

async function fetchStyleHistory() {
  try {
    const res = await fetch(FIRESTORE_STYLE_HISTORY);
    const doc = await res.json();
    if (doc.error) return [];
    const values = doc.fields?.entries?.arrayValue?.values || [];
    return values.map(v => ({
      style: v.mapValue.fields.style.stringValue,
      date:  v.mapValue.fields.date.stringValue,
      gesto: v.mapValue.fields.gesto?.stringValue || null,
      toma:  v.mapValue.fields.toma?.stringValue || null,
    }));
  } catch { return []; }
}

// Afinidad tema→estilos: dentro de los no usados recientemente, se prefieren
// estilos coherentes con el tono de la noticia. Si ninguno está disponible,
// cae al pool completo (la rotación anti-repetición siempre manda).
const STYLE_AFFINITY = [
  { match: (d, t) => /victoria|triunfo|goleada|ganamos|campe[oó]n|ascenso/.test(t),
    styles: ['ESTADIO_NOCHE', 'ACCION_PARTIDO', 'VESTUARIO'] },
  { match: (d, t) => /derrota|perdimos|ca[ií]da|golpe/.test(t),
    styles: ['VESTUARIO', 'TUNEL', 'RETRATO_EDITORIAL'] },
  { match: (d, t) => /entrevista|mano a mano|nos cont[oó]/.test(t) || (d.category || '') === 'Entrevista',
    styles: ['RETRATO_EDITORIAL', 'CAMPANA_ESTUDIO', 'VESTUARIO'] },
  { match: (d, t) => /previa|esta noche|hoy juega|se juega hoy/.test(t),
    styles: ['TUNEL', 'ESTADIO_NOCHE'] },
  { match: (d, t) => (d.category || '') === 'Institución' || /kits?|indumentaria|camiseta|marca|aniversario/.test(t),
    styles: ['CAMPANA_ESTUDIO', 'RETRATO_EDITORIAL'] },
]

// La escena de la nota manda (pedido de Juan, 2026-10-09: "la imagen en coherencia con la noticia").
// Antes el estilo salía de la rotación y le ganaba al brief: un "festejo bajo los reflectores con el
// plantel" (08/10) terminó como retrato editorial quieto. Si el brief nombra un lugar, ese es el estilo;
// la rotación queda solo para briefs que no dicen dónde. Orden = prioridad (el primero que matchea).
const STYLE_FROM_BRIEF = [
  { re: /estudio/,                                             style: 'CAMPANA_ESTUDIO' },
  { re: /t[uú]nel/,                                            style: 'TUNEL' },
  { re: /vestuario|casilleros/,                                style: 'VESTUARIO' },
  { re: /(festej|celebr|gol|remate|corr|abraz|euforia|en juego|jugada|disput)/, style: 'ACCION_PARTIDO', also: /cancha|c[eé]sped|estadio|reflector|partido/ },
  { re: /cancha|c[eé]sped|estadio|reflector|tribuna/,          style: 'ESTADIO_NOCHE' },
  { re: /retrato|primer plano|plano cercano/,                  style: 'RETRATO_EDITORIAL' },
];

function styleFromBrief(draft = {}) {
  const brief = (typeof draft.imageBrief === 'string' ? draft.imageBrief : '').toLowerCase();
  if (brief.trim().length <= 10) return null;
  const hit = STYLE_FROM_BRIEF.find(r => r.re.test(brief) && (!r.also || r.also.test(brief)));
  return hit ? IMAGE_STYLES.find(s => s.id === hit.style) : null;
}

function pickStyle(history, draft = {}) {
  const fromBrief = styleFromBrief(draft);
  if (fromBrief) return fromBrief;
  const recentIds = new Set(history.slice(0, 3).map(h => h.style));
  const available = IMAGE_STYLES.filter(s => !recentIds.has(s.id));
  let pool = available.length > 0 ? available : IMAGE_STYLES;

  const text = ((draft.title || '') + ' ' + (draft.excerpt || '')).toLowerCase();
  const affinity = STYLE_AFFINITY.find(a => a.match(draft, text));
  if (affinity) {
    const preferred = pool.filter(s => affinity.styles.includes(s.id));
    if (preferred.length > 0) pool = preferred;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// `toma`: qué foto de prensa eligió la rutina para la nota (FESTEJO_GOL, PITAZO_FINAL, VESTUARIO_FESTEJO…,
// campo `toma` del draft). Se guarda acá para que la rutina no repita la misma toma en victorias seguidas.
async function saveStyleHistory(styleId, date, history, gestoId = null, toma = null) {
  const updated = [{ style: styleId, date, gesto: gestoId, toma }, ...history].slice(0, 10);
  const values = updated.map(e => ({ mapValue: { fields: {
    style: { stringValue: e.style },
    date:  { stringValue: e.date  },
    ...(e.gesto ? { gesto: { stringValue: e.gesto } } : {}),
    ...(e.toma  ? { toma:  { stringValue: e.toma  } } : {}),
  }}}));
  await fetch(FIRESTORE_STYLE_HISTORY, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { entries: { arrayValue: { values } } } }),
  });
}

async function fetchDraft() {
  const res = await fetch(FIRESTORE_DRAFT);
  const doc = await res.json();
  if (doc.error) throw new Error('No hay draft en Firestore: ' + doc.error.message);
  return JSON.parse(doc.fields.data.stringValue);
}

// Máximo de jugadores en escena: cada render extra es un adjunto más que
// procesar (generación más pesada/lenta) y una identidad más que ChatGPT
// puede mezclar.
const MAX_FEATURED_PLAYERS = 3;

// El body puede traer bloques ({h}, {quote}, {specs}, {pair}) además de strings HTML.
const bodyText = draft => (draft.body || []).map(b => typeof b === 'string' ? b : [b.h, b.quote, b.caption, ...(b.specs || []).flat()].filter(Boolean).join(' ')).join(' ');

function extractMentionedPlayers(draft) {
  const text = [draft.title, draft.excerpt, bodyText(draft)].join(' ');
  return PLAYERS_WITH_RENDERS
    .filter(p => text.includes(p))
    .sort((a, b) => text.indexOf(a) - text.indexOf(b));
}

// Rotación de protagonistas: entre los mencionados en la nota se priorizan los
// que hace más tiempo no aparecen en una imagen (historial en Firestore), para
// no mostrar siempre a los mismos. Empate → orden de aparición en la nota.
function selectFeaturedPlayers(allMentioned, featuredHistory, draft = {}) {
  // La foto tiene que ser coherente con la nota (pedido de Juan, 2026-10-06: el hat-trick de nikileo527
  // salió ilustrado con otros tres jugadores porque la rotación lo descartó). Si el imageBrief nombra
  // jugadores, ESOS son los protagonistas, en ese orden — sin rotación. Si el brief existe y no nombra a
  // nadie, la imagen es institucional (sin jugadores identificables).
  const brief = typeof draft.imageBrief === 'string' ? draft.imageBrief : '';
  if (brief.trim().length > 10) {
    return PLAYERS_WITH_RENDERS
      .filter(p => brief.includes(p))
      .sort((x, y) => brief.indexOf(x) - brief.indexOf(y))
      .slice(0, MAX_FEATURED_PLAYERS);
  }
  // Sin brief: el que nombra el título va primero; el resto rota (sin contar lo anotado hoy, que es la
  // propia nota del día registrando a sus protagonistas).
  const today = draft.date || '';
  const title = draft.title || '';
  const lastFeatured = new Map(); // player -> índice en el historial (0 = más reciente)
  featuredHistory.filter(e => e.date !== today).forEach((e, i) => {
    if (!lastFeatured.has(e.player)) lastFeatured.set(e.player, i);
  });
  const recency = p => lastFeatured.has(p) ? lastFeatured.get(p) : Infinity;
  const enTitulo = allMentioned.filter(p => title.includes(p));
  const resto = allMentioned.filter(p => !enTitulo.includes(p))
    .sort((a, b) => recency(b) - recency(a) || allMentioned.indexOf(a) - allMentioned.indexOf(b));
  return [...enTitulo, ...resto].slice(0, MAX_FEATURED_PLAYERS);
}

// Compañeros de fondo (pedido de Juan, 2026-10-08): si el brief pone al plantel/compañeros en la
// escena, ChatGPT inventaba jugadores genéricos que no son del club. Ahora esos compañeros son
// jugadores REALES con render adjunto (los que hace más que no salen; nunca arqueros, que irían de
// naranja en un festejo de campo). Si el brief no pide compañeros, en la escena no hay nadie más.
const MAX_TEAMMATES = 2;
function selectTeammates(featured, featuredHistory, draft = {}, mentionedInNote = []) {
  const brief = (typeof draft.imageBrief === 'string' ? draft.imageBrief : '').toLowerCase();
  if (!/plantel|compañer|companer|equipo|grupo|abraz|vestuario|todos/.test(brief)) return [];
  const lastFeatured = new Map();
  featuredHistory.forEach((e, i) => { if (!lastFeatured.has(e.player)) lastFeatured.set(e.player, i); });
  const recency = p => lastFeatured.has(p) ? lastFeatured.get(p) : Infinity;
  const slots = Math.min(MAX_TEAMMATES, MAX_FEATURED_PLAYERS + MAX_TEAMMATES - featured.length);
  // Primero los otros jugadores que nombra la nota; después, los que hace más que no salen.
  const pool = PLAYERS_WITH_RENDERS.filter(p => !featured.includes(p) && !GOALKEEPERS.includes(p));
  const inNote = pool.filter(p => mentionedInNote.includes(p));
  const rest = pool.filter(p => !inNote.includes(p))
    .sort((a, b) => recency(b) - recency(a) || Math.random() - 0.5);
  return [...inNote, ...rest].slice(0, slots);
}

// Gestos de festejo: el brief de la rutina pide "celebrando" casi todos los días de resultado y
// ChatGPT caía siempre en el mismo (de rodillas en el césped, brazos abiertos — 06/10 y 08/10).
// El script elige el gesto y rota contra los últimos usados (guardados en image_style_history).
const GESTOS_FESTEJO = [
  { id: 'GRITO_PUNOS',   desc: 'de pie, gritando de frente con los dos puños cerrados a la altura del pecho, venas marcadas' },
  { id: 'ESCUDO',        desc: 'de pie, agarrando y besando el escudo del pecho de la camiseta, ojos cerrados' },
  { id: 'DEDO_CIELO',    desc: 'trotando, señalando al cielo con un dedo y mirada hacia arriba, sonrisa contenida' },
  { id: 'SALTO',         desc: 'en el aire, saltando con un puño en alto, piernas recogidas' },
  { id: 'SENALA_DORSAL', desc: 'de espaldas a cámara, señalándose el nombre y el dorsal con los pulgares, girando la cara por sobre el hombro' },
  { id: 'SERENO',        desc: 'caminando tranquilo, sin festejo exagerado, mirada fría a cámara, sello de jugador que sabe lo que hizo' },
];
const GESTO_REPEAT_WINDOW = 3;
function pickGesto(history, draft = {}) {
  // Solo la escena decide (el título puede decir "victoria" y la foto ser del vestuario antes del partido).
  // Si la rutina eligió otra toma (pitazo final, vestuario, túnel…), no se le mete un gesto de gol.
  if (draft.toma && draft.toma !== 'FESTEJO_GOL') return null;
  const text = (draft.imageBrief || '').toLowerCase();
  if (!/festej|celebr|\bgol(es)?\b|euforia/.test(text)) return null;
  if (/derrota|ca[ií]da|sin festejo|cabizbaj|bronca|silencio/.test(text)) return null;
  // Si la nota ya dice cómo festeja, se respeta (la escena manda); se sortea solo si no lo dice.
  if (/pu[ñn]os?|brazos|besa|beso|se[ñn]al|salt|grit|abraz|rodilla|dedo/.test(text)) return null;
  const recent = new Set(history.filter(h => h.gesto).slice(0, GESTO_REPEAT_WINDOW).map(h => h.gesto));
  const pool = GESTOS_FESTEJO.filter(g => !recent.has(g.id));
  const from = pool.length ? pool : GESTOS_FESTEJO;
  return from[Math.floor(Math.random() * from.length)];
}

const FIRESTORE_FEATURED_HISTORY = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/featured_players_history';

async function fetchFeaturedHistory() {
  try {
    const res = await fetch(FIRESTORE_FEATURED_HISTORY);
    const doc = await res.json();
    if (doc.error) return [];
    const values = doc.fields?.entries?.arrayValue?.values || [];
    return values.map(v => ({
      player: v.mapValue.fields.player.stringValue,
      date:   v.mapValue.fields.date.stringValue,
    }));
  } catch { return []; }
}

async function saveFeaturedHistory(players, date, history) {
  const updated = [...players.map(p => ({ player: p, date })), ...history].slice(0, 40);
  const values = updated.map(e => ({ mapValue: { fields: {
    player: { stringValue: e.player },
    date:   { stringValue: e.date   },
  }}}));
  await fetch(FIRESTORE_FEATURED_HISTORY, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { entries: { arrayValue: { values } } } }),
  }).catch(() => {});
}

function buildScene(draft, mentionedPlayers) {
  // Si el agente que escribió el artículo dejó un brief visual explícito en el
  // draft (campo imageBrief), es más preciso que cualquier heurística de keywords.
  if (draft.imageBrief && typeof draft.imageBrief === 'string' && draft.imageBrief.trim().length > 10) {
    const players = mentionedPlayers.join(', ');
    return {
      scene: draft.imageBrief.trim(),
      action: players
        ? `${players} como protagonista(s) de la escena descrita, con sus renders del proyecto`
        : 'composición institucional según la escena descrita',
    };
  }

  const title    = draft.title || '';
  const full     = (title + ' ' + bodyText(draft).replace(/<[^>]+>/g, ' ')).toLowerCase();
  const category = draft.category || 'Análisis';
  const players  = mentionedPlayers.join(', ') || null;

  const is = (re) => re.test(full);

  // Entrevista — patrón "Jugador: 'frase'" en el título o palabras clave
  if (/^[^:]+:\s*["""«]/.test(title) || is(/entrevista|mano a mano|nos cont[oó]|en sus propias palabras/)) {
    return {
      scene: 'exclusive press interview or training ground media session, intimate and professional atmosphere',
      action: players
        ? `${players} in a confident interview pose — direct eye contact, relaxed, charismatic. Think post-match press conference or prestige sports editorial shoot`
        : 'footballer in an exclusive press interview, confident and relaxed, professional sports media setting',
    };
  }

  if (category === 'Resultado' && is(/victoria|triunfo|ganamos|goleada/)) {
    return {
      scene: 'dramatic victory celebration, stadium lights exploding, crowd energy, night match atmosphere',
      action: players
        ? `${players} celebrating a goal — arms raised, pure euphoria, explosive energy`
        : 'footballers celebrating in triumph, arms raised, intense stadium atmosphere',
    };
  }

  if (category === 'Resultado' && is(/derrota|perdimos|caída/)) {
    return {
      scene: 'post-defeat silence, stadium emptying, dramatic low golden light',
      action: players
        ? `${players} head down in disappointment, seated on pitch or bench, somber`
        : 'footballer seated head down on pitch after defeat, stadium lights fading',
    };
  }

  // Lesión solo domina si es el tema central (título o excerpt lo mencionan)
  const titleExcerpt = (title + ' ' + (draft.excerpt || '')).toLowerCase();
  if (/baja|lesion|lesionad|indefinid|reposo|contractura|distens|sobrecarga/.test(titleExcerpt)) {
    const injuredPlayer = players ? players.split(',')[0].trim() : null;
    const others = players && mentionedPlayers.length > 1
      ? mentionedPlayers.slice(1).join(', ')
      : null;
    return {
      scene: 'medical room or dugout, player receiving treatment, moody professional sports atmosphere',
      action: injuredPlayer
        ? `${injuredPlayer} sidelined with visible injury (bandaged leg, ice pack), seated on bench with a determined expression despite the setback${others ? `; ${others} standing nearby showing support` : ''}`
        : 'footballer sidelined with injury, medical tape, seated, determined despite setback',
    };
  }

  if (is(/candidato|incorporaci|refuerzo|reclutamiento|evaluac|ficha/)) {
    return {
      scene: 'professional football scouting scene, coaches with clipboards, floodlit training pitch',
      action: players
        ? `${players} in evaluation stance on pitch, coaches observing analytically in background, intense professional tryout atmosphere`
        : 'club directors and scouts evaluating candidates on a floodlit training pitch, professional scouting atmosphere',
    };
  }

  if (is(/selecci[oó]n|mundial|albiceleste|eliminatoria|copa am/)) {
    return {
      scene: 'Argentine national football pride, World Cup atmosphere, blue and white glory mixed with dark elite aesthetics',
      action: players
        ? `${players} in club uniform, Argentine flag as background element, pride and national passion`
        : 'Argentine football national pride, celestial blue and white colors blending with dark elite club aesthetic',
    };
  }

  if (is(/fixture|rival|pr[oó]ximo|juega|enfrenta|fecha/)) {
    return {
      scene: 'pre-match tunnel walk, dramatic stadium entry, anticipation and intensity before kickoff',
      action: players
        ? `${players} walking out of the tunnel in match-ready focus, stadium lights ahead, intense pre-game energy`
        : 'players emerging from tunnel, focused and determined, stadium roaring ahead',
    };
  }

  if (is(/estad[íi]stica|rendimiento|an[aá]lisis|posici[oó]n|tabla/)) {
    return {
      scene: 'tactical analysis editorial, data-driven sports media aesthetic, strategic intensity',
      action: players
        ? `${players} in sharp editorial portrait, dominant and focused, analytical sports magazine style`
        : 'football tactical elements as graphic background (pitch lines, formations), elite sports editorial composition',
    };
  }

  if (is(/mil seguidores|1000 seguidores|hito|aniversario|comunidad|logro institucional/)) {
    return {
      scene: 'milestone celebration, stadium bathed in golden light, confetti explosion, community triumph atmosphere — the feeling of a club reaching a landmark moment',
      action: players
        ? `${players} in triumphant celebration pose, arms raised, pure joy — milestone achievement energy`
        : 'Top Secret FC club crest as the hero element, surrounded by celebration light effects — confetti, golden light rays, stadium floodlights — milestone achievement composition',
    };
  }

  // Default: institutional / generic editorial
  return {
    scene: 'elite Argentine esports football club, prestige and professionalism, dark cinematic atmosphere',
    action: players
      ? `${players} in powerful editorial portrait pose, dominant club identity`
      : 'Top Secret FC club crest and uniform as hero visual, sleek dark editorial design',
  };
}

function buildPrompt(draft, mentionedPlayers, style, kit, correction = null, teammates = [], gesto = null) {
  const { scene, action } = buildScene(draft, mentionedPlayers);
  const isSeleccion = /^selecc/i.test(draft.category || '');
  const everyone = [...mentionedPlayers, ...teammates];

  const playerBlock = mentionedPlayers.length > 0
    ? `JUGADORES MENCIONADOS EN ESTA NOTICIA (son nuestros jugadores):
Sus renders van ADJUNTOS a este mensaje como referencia visual directa — no inventes su apariencia.
Acción: ${action}${gesto ? `
Gesto de festejo del protagonista (${mentionedPlayers[0]}): ${gesto.desc}. Usá ESTE gesto y no otro — PROHIBIDO el festejo de rodillas deslizándose en el césped con los brazos abiertos (ya se usó).` : ''}${teammates.length ? `
Compañeros en plano secundario (también nuestros jugadores, con render adjunto): ${teammates.join(', ')} — más atrás o al costado, acompañando la escena, sin robarle el foco al protagonista.` : ''}

⚠️ IDENTIDAD — LEÉ ESTO ANTES DE DIBUJAR NOMBRES O DORSALES: los adjuntos NO llevan el nombre del jugador, así que identificá cada render por sus RASGOS FÍSICOS según esta lista. Cada nombre y dorsal SOLO puede aparecer sobre el jugador cuyos rasgos coinciden — un nombre o número sobre otro jugador es un ERROR grave:
${everyone.map(playerIdentityLine).join('\n')}

Reglas de identidad:
- Si mostrás el nombre o el dorsal de un jugador, tienen que estar sobre el cuerpo cuyos rasgos coinciden con la lista (pelo, piel, barba, máscara, anteojos). NUNCA mezcles rasgos de dos jugadores en uno.
- ⚠️ EN LA IMAGEN SOLO APARECEN LOS JUGADORES DE ESTA LISTA (${everyone.length}). PROHIBIDO agregar cualquier otro jugador, compañero, rival o persona en el campo de juego, el túnel o el vestuario — ni de relleno, ni de espaldas, ni fuera de foco: cada persona inventada es alguien que NO es del club. Si el brief habla del "plantel" o de "compañeros" y no hay compañeros en la lista, la escena es solo del protagonista. El público de la tribuna puede verse, lejano y desenfocado.
- Si no estás seguro de qué jugador es, mostralo SIN nombre ni dorsal antes que etiquetarlo mal.`
    : `Sin jugadores específicos — composición institucional:
${action}
⚠️ Sin jugadores identificables: no inventes jugadores ni personas en primer plano (nadie que parezca ser del club sin serlo).`;

  return `Creá una FOTO DE CAMPAÑA para una noticia de Top Secret FC, un club argentino de fútbol virtual (esports). Todos los jugadores que se mencionan son NUESTROS PROPIOS JUGADORES — sus renders van adjuntos a este mensaje como referencia visual.

⚠️ CRÍTICO — RENDERS Y UNIFORME: cada render adjunto muestra a uno de nuestros jugadores reales CON EL KIT DE HOY YA PUESTO. Usalo para representarlo: misma cara, pelo, piel, accesorios Y el mismo uniforme (colores, escudo, swoosh, dorsal). No inventes ni cambies nada de eso. La paleta del día aplica SOLO al ambiente y la luz, nunca al kit.

═══ SPECS TÉCNICAS ═══
- Formato: POST de feed de Instagram — proporción 4:5, VERTICAL: el ancho es aproximadamente el 80% del alto (ej. 1086×1448 px). SIGUE SIENDO MÁS ALTO QUE ANCHO, solo menos extremo que una Story.
  ⚠️ PROHIBIDO el encuadre extra alto y angosto de pantalla completa de celular (proporción 9:16, tipo Story de Instagram/Reel) — ese formato es exclusivo de la versión Story, que se genera DESPUÉS a partir de esta imagen.
  ⚠️ PROHIBIDO TAMBIÉN el encuadre APAISADO/HORIZONTAL (ancho mayor que el alto, tipo panorámica o 16:9) — el post NUNCA es más ancho que alto. "Más ancho que la Story" significa menos angosto, no horizontal.
- Paleta del día (fondo y diseño gráfico, no el uniforme): ${style.palette}

${brandFormatBlock()}

═══ LA ESCENA (lo más importante) ═══
${scene}
⚠️ Esta escena sale de la noticia y MANDA: respetá el lugar, la acción, la emoción y cuántos jugadores aparecen. Tiene que ser una foto con VIDA — gente haciendo algo, expresiones reales, cuerpo en movimiento o en tensión — no una pose quieta de catálogo, salvo que la escena pida explícitamente un retrato.
${playerBlock}

═══ LUZ Y TRATAMIENTO ═══
Referencia de tratamiento fotográfico (${style.label}): ${style.prompt}
Tomá de acá la luz, la paleta y el acabado premium, siempre dentro de la ESTÉTICA DEL CLUB de arriba. Si algo de esta referencia choca con LA ESCENA (otro lugar, otra pose, otra cantidad de jugadores), gana LA ESCENA. La paleta define el AMBIENTE y la LUZ — el kit del jugador es el de su render, nunca teñido por la paleta.

═══ IMÁGENES ADJUNTAS A ESTE MENSAJE — REFERENCIAS OBLIGATORIAS ═══
⚠️ Los adjuntos son SOLO referencias visuales (escudo, kit y caras). NO son el layout: no hagas un catálogo, una grilla ni un mosaico de los adjuntos. La imagen a crear es la ESCENA de la noticia descrita arriba.

• "Clean logo Dorado.png" (adjunto) → el ÚNICO escudo de Top Secret FC: un espía con sombrero fedora, anteojos oscuros y cuello de gabardina levantado, SIN marco ni texto, en dorado. Es el que va bordado en el pecho de la camiseta. Reproducilo EXACTAMENTE: PROHIBIDO rediseñarlo, ponerle un marco circular, texto, estrellas, o reemplazarlo por un león u otro escudo.

• Renders de jugadores adjuntos → cada uno es la referencia obligatoria de la persona (cara, pelo, piel, accesorios, físico) Y de su uniforme de hoy. Identificá cuál es cuál por los rasgos de la lista de IDENTIDAD de arriba.
  Kit del día: ${kit.label}. Diseño canónico (este texto manda si el render no se ve claro):
  ${kit.desc}
  Los ARQUEROS usan siempre su conjunto propio: ${GK_KIT_DESC}
  ⚠️ El kit de Temporada 4 NO tiene sponsor en el pecho: no agregues "AIA" ni ningún otro texto o marca en la camiseta. El escudo del pecho es el espía dorado del adjunto (en blanco en el kit de arquero), nunca el de un club real (Chelsea, Tottenham, Real Madrid, Boca…).${isSeleccion ? `
  ⚠️ EXCEPCIÓN — NOTICIA DE LA SELECCIÓN ARGENTINA: la camiseta CELESTE Y BLANCA a bastones de la Selección es VÁLIDA para jugadores o elementos que representen a la Selección. El kit del club aplica solo si aparece un jugador de Top Secret representando al club.` : ''}
  No hay jugadores de relleno: todo el que lleve el kit del club tiene su render adjunto.

⚠️ DORSALES Y NOMBRES: usá EXACTAMENTE los dorsales y nombres de la lista de IDENTIDAD — mismos dígitos, en el mismo orden, sobre el jugador correcto. PROHIBIDO espejar o invertir dígitos (ej. "10" convertido en "01"), intercambiar números o nombres entre jugadores, e inventar dorsales que no estén en la lista.

⚠️ SIN TEXTO: la imagen no lleva titular, rótulos, sellos ni watermarks. No inventes logos de otros clubes ni elementos de marca que no estén en los adjuntos.

═══ CONTEXTO DE LA NOTA ═══
La imagen tiene que contar visualmente de qué trata la nota (título: "${draft.title}"), sin escribir nada en ella: que un hincha la vea y entienda el tema por la escena.${correction ? `

═══ CORRECCIÓN vs. VERSIÓN ANTERIOR ═══
La imagen generada anteriormente no cumplió con lo pedido. Tené en cuenta este feedback para la nueva versión:
"${correction}"
Este punto debe ser claramente diferente y mejor en la imagen nueva.` : ''}`;
}

// Frase corta nativa: es el mismo mensaje que manda la UI de ChatGPT al elegir
// "Historia 9:16" en el selector de "Relación de aspecto" de una imagen ya
// generada. Probado en vivo (2026-08-10): da proporción casi exacta (0.5628
// vs 0.5625 real) manteniendo fielmente la composición del post — mucho más
// confiable que la instrucción larga anterior (ver bug de formato post=story,
// 2026-07-20, en project_topsecret_tareas_imagenes memoria). El chequeo
// mecánico de proporción (STORY_MAX_RATIO) y el reintento con corrección
// siguen como red de seguridad por si alguna vez falla.
function buildResizePrompt() {
  return `Usa la relación de aspecto 9:16`;
}

async function waitForGeneratedImage(page, excludeSrcs = []) {
  console.log('  Esperando imagen (hasta 25 min)...');
  // La espera larga la maneja el loop de abajo con su propio deadline; cada
  // acción individual tiene que poder fallar (timeout 0 = colgarse para siempre).
  page.setDefaultTimeout(ACTION_TIMEOUT_MS);

  await page.screenshot({ path: path.join(DEBUG_DIR, 'debug-after-send.png'), fullPage: false });

  // Snapshot de las imágenes ya presentes (adjuntos recién enviados, imágenes
  // previas del chat): la generada siempre aparece DESPUÉS de este punto, así
  // que todo lo que exista ahora queda excluido, viva donde viva en el DOM.
  const preExisting = await page.evaluate(() => {
    return [...document.querySelectorAll('img')]
      .map(i => i.src || '')
      .filter(s => s.includes('oaiusercontent') || s.includes('files.openai') ||
                   s.includes('openai.com/files') || s.includes('estuary/content') ||
                   s.startsWith('blob:'));
  });
  excludeSrcs = [...excludeSrcs, ...preExisting];

  const TIMEOUT_MS  = 25 * 60 * 1000;
  const POLL_MS     = 4000;
  // Si la respuesta terminó (sin streaming) y no apareció imagen, no tiene
  // sentido seguir esperando el timeout completo — ChatGPT contestó texto
  // (límite de generación, rechazo, pregunta) en vez de generar.
  const DONE_GRACE_MS = 20 * 1000;
  const start       = Date.now();
  let   sawStreaming = false;
  let   doneSince    = 0;
  let   lastProgress = 0;

  while (Date.now() - start < TIMEOUT_MS) {
    const state = await page.evaluate((excludeSrcs) => {
      // Excluir imágenes del mensaje del USUARIO (los adjuntos que subimos
      // aparecen ahí y el detector los confundía con la imagen generada).
      // No se puede exigir contenedor "assistant": la imagen generada se
      // renderiza fuera de ese wrapper en el DOM actual de ChatGPT.
      const imgs = [...document.querySelectorAll('img')].reverse();
      let imgSrc = null;
      for (const img of imgs) {
        const src = img.src || '';
        if (excludeSrcs.includes(src)) continue;
        if (img.closest('[data-message-author-role="user"]')) continue;
        // DOM 2026-09: el adjunto ya no vive bajo author-role="user" — es un
        // blob: con alt "Archivo adjunto del usuario" que se monta después
        // del snapshot preExisting y se detectaba como imagen generada.
        if (/adjunto|attachment|uploaded/i.test(img.alt || '')) continue;
        if (img.closest('form')) continue;
        if (
          img.complete &&
          img.naturalWidth  > 300 &&
          img.naturalHeight > 300 &&
          (src.includes('oaiusercontent') ||
           src.includes('files.openai')  ||
           src.includes('openai.com/files') ||
           src.includes('estuary/content') ||
           src.startsWith('blob:'))
        ) {
          imgSrc = src;
          break;
        }
      }
      const streaming = !!document.querySelector(
        'button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="Detener"]'
      );
      const msgs = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
      const lastText = msgs[msgs.length - 1]?.textContent?.trim().slice(0, 300) || '';
      return { imgSrc, streaming, lastText };
    }, excludeSrcs);

    if (state.imgSrc) {
      console.log('\n  Imagen detectada.');
      return state.imgSrc;
    }

    if (state.streaming) {
      sawStreaming = true;
      doneSince    = 0;
    } else if (sawStreaming) {
      // La respuesta terminó sin imagen — dar una gracia corta por si la
      // imagen tarda unos segundos en montarse en el DOM, y cortar.
      if (!doneSince) doneSince = Date.now();
      if (Date.now() - doneSince > DONE_GRACE_MS) {
        await page.screenshot({ path: path.join(DEBUG_DIR, 'debug-timeout.png'), fullPage: true });
        throw new Error(`ChatGPT respondió sin generar imagen: "${state.lastText.slice(0, 180)}"`);
      }
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    if (process.stdout.isTTY) {
      process.stdout.write(`\r  Generando... ${elapsed}s`);
    } else if (elapsed - lastProgress >= 60) {
      // Sin TTY (log de Task Scheduler): una línea por minuto, no cada 4s
      console.log(`  Generando... ${elapsed}s`);
      lastProgress = elapsed;
    }
    await page.waitForTimeout(POLL_MS);
  }

  await page.screenshot({ path: path.join(DEBUG_DIR, 'debug-timeout.png'), fullPage: true });
  throw new Error('Timeout (25 min) esperando imagen. Screenshot en scripts/debug-timeout.png');
}

async function downloadImage(page, imgUrl, outputPath) {
  if (imgUrl.startsWith('blob:')) {
    const buffer = await page.evaluate(async (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            const arr = await blob.arrayBuffer();
            resolve(Array.from(new Uint8Array(arr)));
          }, 'image/png');
        };
        img.onerror = reject;
        img.src = url;
      });
    }, imgUrl);
    fs.writeFileSync(outputPath, Buffer.from(buffer));
  } else {
    const buffer = await page.evaluate(async (url) => {
      const r   = await fetch(url);
      const buf = await r.arrayBuffer();
      return Array.from(new Uint8Array(buf));
    }, imgUrl);
    fs.writeFileSync(outputPath, Buffer.from(buffer));
  }
  console.log('  Guardada:', outputPath);
}

// ── Limpieza de chats ─────────────────────────────────────────────────────────
// Cada generación crea un chat en ChatGPT. Después de descargar la imagen (o al
// descartar un intento) se elimina para no acumular conversaciones basura.
function currentChatId(page) {
  const m = page.url().match(/\/c\/([a-zA-Z0-9-]{10,})/);
  return m ? m[1] : null;
}

async function deleteChatById(page, convId) {
  if (!convId) return false;
  try {
    const ok = await page.evaluate(async (id) => {
      const sess  = await fetch('/api/auth/session').then(r => r.json()).catch(() => null);
      const token = sess?.accessToken;
      if (!token) return false;
      const res = await fetch('/backend-api/conversation/' + id, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body:    JSON.stringify({ is_visible: false }),
      });
      return res.ok;
    }, convId);
    console.log(ok
      ? `  Chat ${convId.slice(0, 8)}… eliminado de ChatGPT.`
      : '  Chat: no se pudo eliminar (no crítico).');
    return ok;
  } catch (e) {
    console.log('  Chat: error al eliminar (no crítico):', e.message.split('\n')[0]);
    return false;
  }
}

// El dropdown "Alta" del composer es el selector de INTELIGENCIA del modelo
// (Instantánea/Media/Alta), no calidad de imagen. "Alta" suma minutos de
// razonamiento antes de cada generación. Son menús Radix: solo responden a
// clicks reales de Playwright, no a element.click() desde JS.
async function ensureNormalQuality(page) {
  try {
    const trigger = page.locator('button').filter({ hasText: /^Alta$/ }).first();
    if (await trigger.count() === 0) return; // ya está en Media/Instantánea u otra UI

    await trigger.click({ timeout: 5000 });
    await page.waitForTimeout(800);

    const media = page.locator('[role="menuitemradio"]').filter({ hasText: /^Media$/ }).first();
    if (await media.count() > 0) {
      await media.click({ timeout: 5000 });
      console.log('  Inteligencia: Media (evita el razonamiento lento de Alta).');
      await page.waitForTimeout(400);
    } else {
      console.log('  Selector de inteligencia: opción Media no encontrada — sigue en Alta.');
      await page.keyboard.press('Escape');
    }
  } catch {
    try { await page.keyboard.press('Escape'); } catch { /* menú ya cerrado */ }
  }
}

// La página del proyecto a veces cae en un error boundary genérico de
// ChatGPT ("Volver a intentar", sin composer) al navegar en frío — visto
// 2026-09-09, reproducible en pestaña nueva y con caché/service worker
// limpios, con el gizmo intacto vía /backend-api/gizmos (falla del lado de
// ChatGPT, no de la sesión ni del proyecto). Reintenta con backoff antes de
// rendirse — más barato que quemar los 3 intentos externos del script en
// segundos y dejar el día sin imágenes.
async function gotoProjectComposer(page, maxTries = 5) {
  for (let i = 1; i <= maxTries; i++) {
    await page.goto(PROJECT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const ok = await page.evaluate(() => !!document.querySelector('div[contenteditable="true"], p[data-placeholder]'));
    if (ok) return;
    if (i < maxTries) {
      console.log(`  Página del proyecto no cargó el composer (intento ${i}/${maxTries}) — reintentando...`);
      await page.waitForTimeout(5000 * i);
    }
  }
  await page.screenshot({ path: path.join(DEBUG_DIR, 'debug-project-load.png'), fullPage: true }).catch(() => {});
  throw new Error('La página del proyecto de ChatGPT no cargó el composer tras varios intentos (posible falla del lado de ChatGPT). Screenshot en scripts/debug-project-load.png');
}

// Si la ventana de Chrome está minimizada (o la pestaña nunca se pintó), la
// página queda con viewport 0x0: Playwright nunca ve "visible" el composer y,
// con timeouts infinitos, el click esperaba para siempre — el proceso quedaba
// colgado horas y el reintento externo de run-daily-images.ps1 no corría
// (bug recurrente, diagnosticado 2026-10-07). Restaurar la ventana y traer la
// pestaña al frente antes de interactuar; si sigue sin tamaño, fallar rápido.
async function ensureWindowVisible(page) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId, bounds } = await cdp.send('Browser.getWindowForTarget');
    if (bounds.windowState === 'minimized' || bounds.windowState === 'fullscreen') {
      await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    }
    if (bounds.windowState !== 'maximized' && ((bounds.width || 0) < 1000 || (bounds.height || 0) < 700)) {
      await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: 1280, height: 900 } }).catch(() => {});
    }
    await cdp.detach().catch(() => {});
  } catch (e) {
    console.log(`  (No se pudo ajustar la ventana de Chrome: ${e.message})`);
  }
  await page.bringToFront().catch(() => {});
  await page.waitForTimeout(1500);
  const [w, h] = await page.evaluate(() => [innerWidth, innerHeight]);
  if (!w || !h) {
    throw new Error(`La pestaña de ChatGPT tiene tamaño ${w}x${h} (ventana de Chrome minimizada u oculta) — no se puede interactuar.`);
  }
}

async function sendPromptInProject(page, prompt, { freshChat = true, attachments = [] } = {}) {
  await ensureWindowVisible(page);
  if (freshChat) {
    await gotoProjectComposer(page);
  } else {
    // Si quedó una generación colgada del intento anterior, frenarla antes
    // de reenviar — el composer no acepta mensajes mientras hay streaming.
    const stopped = await page.evaluate(() => {
      const btn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="Detener"]');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (stopped) {
      console.log('  Generación anterior colgada — detenida antes de reintentar.');
      await page.waitForTimeout(2000);
    }
  }

  await ensureNormalQuality(page);

  const input = page.locator('div[contenteditable="true"], p[data-placeholder]').first();
  await input.waitFor({ state: 'visible', timeout: 20000 });

  // Adjuntar las referencias visuales AL MENSAJE: los archivos del proyecto
  // no llegan al generador de imágenes de forma confiable (inventaba escudos).
  if (attachments.length > 0) {
    const existing = attachments.filter(f => fs.existsSync(f));
    if (existing.length > 0) {
      // DOM 2026-10: el primer input[type=file] pasó a ser el de "Hacer una foto" (capture, un solo archivo)
      // y con 2+ adjuntos tiraba "Non-multiple file input can only accept single file". Se usa el que acepta
      // varios; si no hay, se suben de a uno por el que no es de cámara.
      const multiple = page.locator('input[type="file"][multiple]').first();
      if (await multiple.count()) await multiple.setInputFiles(existing);
      else {
        const simple = page.locator('input[type="file"]:not([capture])').first();
        for (const f of existing) { await simple.setInputFiles(f); await page.waitForTimeout(1500); }
      }
      console.log(`  Adjuntos: ${existing.map(f => path.basename(f)).join(', ')}`);
      await page.waitForTimeout(3000);
    }
  }

  await input.click();
  await page.waitForTimeout(500);

  // Clear any existing text
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(200);

  // Paste via clipboard — preserves \n as Shift+Enter in ChatGPT's contenteditable
  await page.evaluate(async (text) => { await navigator.clipboard.writeText(text); }, prompt);
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(1000);

  // Send with the button (never press Enter directly — it submits)
  const clickSend = async () => {
    const sendBtn = page.locator('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Enviar"]').first();
    if (await sendBtn.count() > 0) {
      if (attachments.length > 0) {
        // El botón queda deshabilitado hasta que terminan de subir los adjuntos
        await page.waitForFunction(() => {
          const b = document.querySelector('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Enviar"]');
          return b && !b.disabled;
        }, { timeout: 90000 }).catch(() => {});
      }
      await sendBtn.click({ timeout: 30000 });
    } else {
      await page.keyboard.press('Enter');
    }
  };

  await clickSend();

  // El click a veces no registra en la UI de ChatGPT: el texto y los adjuntos
  // quedan visibles en el composer sin enviarse, y el script espera igual los
  // 25 min completos sin que nada pase (ver memoria
  // feedback_chatgpt_stuck_send_button). Confirmar que el envío arrancó
  // (aparece el botón "stop" de streaming) o que el composer quedó vacío, y
  // reintentar el click si no.
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(2000);
    const sent = await page.evaluate(() => {
      const streaming = !!document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="Detener"]');
      const composer = document.querySelector('div[contenteditable="true"], p[data-placeholder]');
      const empty = composer ? (composer.textContent || '').trim().length === 0 : true;
      return streaming || empty;
    });
    if (sent) break;
    if (i < 2) {
      console.log('  Envío no confirmado — reintentando click de enviar...');
      await clickSend().catch(() => {});
    }
  }
}

async function generateImage(page, draft, format, prompt, { freshChat, excludeSrcs, attachments = [] }) {
  const now      = new Date();
  const dateStr  = draft.date || now.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  // Usar draft.id (único por artículo) en vez de solo la fecha — dos noticias
  // publicadas el mismo día pisaban el mismo archivo 2026-08-11_post.png,
  // así que la segunda corrida sobreescribía las imágenes de la primera
  // noticia ya publicada (bug real 2026-08-11). Los scripts one-off que
  // llaman generateImage con un draft sintético (solo {date}) siguen
  // funcionando igual, porque no tienen id y caen al fallback de fecha.
  const fileSlug   = (draft.id || dateStr).replace(/[^a-zA-Z0-9_-]/g, '-');
  const filename   = `${fileSlug}_${format}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`\nGenerando imagen ${format.toUpperCase()}...`);

  await sendPromptInProject(page, prompt, { freshChat, attachments });
  const imgUrl = await waitForGeneratedImage(page, excludeSrcs);
  await downloadImage(page, imgUrl, outputPath);

  return { filename, imgUrl };
}

// Escudo del club en cada imagen (pedido de Juan, 2026-10-06): versión Clean (el espía solo) para que no
// destaque demasiado, en la esquina más despejada, blanco sobre fondo oscuro o negro sobre claro, con una
// sombra suave para el contraste. Se estampa con sharp (no se le pide a ChatGPT: lo deforma).
const CREST_CLEAN = { white: path.resolve('logos/rebrand/Clean logo.png'), black: path.resolve('logos/rebrand/Clean logo Negro.png') };
// Copia sin escudo de cada imagen generada (gitignored): permite re-estampar o armar las
// versiones para redes (scripts/noticia-redes.mjs) sin arrastrar el escudo ya puesto.
const RAW_DIR = path.resolve('fuentes/daily-news-raw');

// Elige dónde poner el escudo: la esquina más pareja Y sin luces fuertes (una luz de
// estadio detrás de un escudo blanco lo borra — pasó en la historia del 2026-10-06).
// En formato historia (alto/ancho > 1.5) se respeta la zona que tapa la interfaz de
// Instagram (14% de arriba, 20% de abajo). opts.corners limita las esquinas candidatas
// (las placas con título usan solo las de arriba).
async function pickCrestSpot(src, W, H, opts = {}) {
  const w = Math.round(W * (opts.size || 0.085)), h = Math.round(w * 1932 / 1740), m = Math.round(W * 0.04);
  const story = H / W > 1.5;
  const top = story ? Math.round(H * 0.14) : m;
  const bottom = story ? H - Math.round(H * 0.20) - h : H - m - h;
  // Solo las cuatro esquinas reales: el escudo es una firma, corrido hacia adentro parece un error
  // (probado: terminaba al lado de un jugador del fondo). Si la esquina elegida tiene luces o
  // detalle, el halo oscuro que va detrás del escudo le da el contraste.
  const all = { tl: [[m, top, 0]], tr: [[W - m - w, top, 0]], bl: [[m, bottom, 0]], br: [[W - m - w, bottom, 0]] };
  const ids = opts.corners || Object.keys(all);
  // Se mide una zona un poco más grande que el escudo, para incluir el halo de luces cercanas.
  const pad = Math.round(w * 0.35);
  const { data: img, info } = await sharp(src).greyscale().raw().toBuffer({ resolveWithObject: true });
  // Saturación: los jugadores (camisetas de color) se separan del fondo oscuro del estadio.
  const { data: rgb } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let best = null;
  for (const id of ids) for (const [x, y, lejos] of all[id]) {
    const x0 = Math.max(1, x - pad), y0 = Math.max(1, y - pad);
    const x1 = Math.min(W - 2, x + w + pad), y1 = Math.min(H - 2, y + h + pad);
    let n = 0, sum = 0, bright = 0, edge = 0, sat = 0;
    for (let yy = y0; yy <= y1; yy += 2) for (let xx = x0; xx <= x1; xx += 2) {
      const i = yy * info.width + xx, v = img[i];
      n++; sum += v; if (v > 200) bright++;
      const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
      sat += Math.max(r, g, b) - Math.min(r, g, b);
      // Bordes (Laplaciano): manos, caras, carteles → el escudo se pierde o tapa algo.
      edge += Math.abs(4 * v - img[i - 1] - img[i + 1] - img[i - info.width] - img[i + info.width]);
    }
    const mean = sum / n, brightFrac = bright / n, edges = edge / n;
    // Más lejos de la esquina = un poco peor (el escudo tiene que seguir leyéndose como firma).
    const score = edges + 250 * brightFrac + 0.3 * (sat / n) + 4 * lejos;
    if (process.env.DEBUG_ESCUDO) console.log(`    ${id} ${x},${y} bordes ${edges.toFixed(1)} luces ${(brightFrac * 100).toFixed(0)}% sat ${(sat / n).toFixed(0)} → ${score.toFixed(1)}`);
    if (!best || score < best.score) best = { id, x, y, w, h, mean, edges, brightFrac, score };
  }
  return best;
}

async function stampCrest(file, opts = {}) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const raw = path.join(RAW_DIR, path.basename(file));
  // Siempre se estampa sobre la copia limpia: re-estampar no acumula escudos.
  if (!fs.existsSync(raw) || opts.fresh) fs.copyFileSync(file, raw);
  const { width: W, height: H } = await sharp(raw).metadata();
  const best = await pickCrestSpot(raw, W, H, opts);
  // Blanco salvo fondo realmente claro; con algo de brillo alrededor, la sombra le da el contraste.
  const color = best.mean > 160 && best.brightFrac > 0.3 ? 'black' : 'white';
  const { x, y, w, h } = best;
  const logo = await sharp(CREST_CLEAN[color]).resize(w, h).png().toBuffer();
  const sombra = await sharp(CREST_CLEAN[color === 'white' ? 'black' : 'white']).resize(w, h).blur(Math.max(2, w * 0.06))
    .ensureAlpha().linear([1, 1, 1, 0.6], [0, 0, 0, 0]).png().toBuffer();
  // Halo: mancha difusa (oscura bajo escudo blanco) que separa el escudo de luces o detalles.
  const R = Math.round(w * 1.1), hx = Math.round(x + w / 2 - R), hy = Math.round(y + h / 2 - R);
  const tono = color === 'white' ? '0,0,0' : '255,255,255';
  const halo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${2 * R}" height="${2 * R}"><defs><radialGradient id="g">` +
    `<stop offset="0" stop-color="rgb(${tono})" stop-opacity="${best.brightFrac > 0.03 || best.edges > 6 ? 0.55 : 0.3}"/>` +
    `<stop offset="1" stop-color="rgb(${tono})" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  const capas = [];
  if (hx >= 0 && hy >= 0 && hx + 2 * R <= W && hy + 2 * R <= H) capas.push({ input: halo, left: hx, top: hy });
  else capas.push({ input: await sharp(halo).png().toBuffer(), left: Math.max(0, hx), top: Math.max(0, hy), blend: 'over' });
  const buf = await sharp(raw).composite([
    ...capas,
    { input: sombra, left: x, top: y + Math.round(w * 0.02) },
    { input: logo, left: x, top: y },
  ]).png().toBuffer();
  fs.writeFileSync(file, buf);
  console.log(`  Escudo estampado en ${path.basename(file)}: esquina ${best.id}, ${color} (luces ${(best.brightFrac * 100).toFixed(0)}%)`);
  return { ...best, color };
}

function uploadImagesToR2(postFile, storyFile) {
  // Además de las publicadas (con escudo), las copias limpias en raw/: las usan las piezas
  // con título para redes (noticia-redes.js), que ponen el escudo junto al título.
  const items = [postFile, storyFile].filter(Boolean).flatMap(f => [
    { f, localPath: path.join(OUTPUT_DIR, f), rel: `Renders/Daily News/${f}` },
    { f: `raw/${f}`, localPath: path.join(RAW_DIR, f), rel: `Renders/Daily News/raw/${f}` },
  ]).filter(x => fs.existsSync(x.localPath));
  for (const { f, localPath, rel } of items) {
    const key = rel.split('/').map(encodeURIComponent).join('/');
    try {
      execSync(
        `curl -s -o NUL -w "%{http_code}" -X PUT --aws-sigv4 "aws:amz:auto:s3" --user "${R2_ACCESS_KEY}:${R2_SECRET_KEY}" -H "content-type: image/png" --data-binary @"${localPath}" "${R2_ENDPOINT}/${R2_BUCKET}/${key}"`,
        { stdio: 'pipe' }
      );
      console.log(`  R2: ${f} subida.`);
    } catch (e) {
      console.warn(`  R2 upload falló para ${f} (no crítico):`, e.message.split('\n')[0]);
    }
  }
}

async function updateDraft(draft, postFile, storyFile) {
  // Re-leer el draft antes de escribir: el usuario puede haber editado el texto
  // desde el browser mientras se generaban las imágenes — solo se tocan los
  // campos de imagen, nunca se pisa el contenido.
  let fresh = draft;
  try { fresh = await fetchDraft(); } catch (e) { /* si no se puede leer, usa la copia local */ }
  if (fresh.date !== draft.date || fresh.id !== draft.id) {
    console.log('\nEl draft cambió durante la generación (regen/descarte) — no se actualiza Firestore.');
    return;
  }
  const v = `?v=${Date.now().toString(36)}`;
  const updated = {
    ...fresh,
    // ?v=: /media se cachea como immutable por URL — sin versión, una imagen regenerada
    // con el mismo nombre seguiría saliendo vieja (también para Instagram al publicar).
    imagePost:  r2MediaUrl(`Renders/Daily News/${postFile}`) + v,
    imageStory: r2MediaUrl(`Renders/Daily News/${storyFile}`) + v,
    image:      r2MediaUrl(`Renders/Daily News/${postFile}`) + v,
    imagePostRaw:  r2MediaUrl(`Renders/Daily News/raw/${postFile}`) + v,
    imageStoryRaw: r2MediaUrl(`Renders/Daily News/raw/${storyFile}`) + v,
  };
  const payload = { fields: { data: { stringValue: JSON.stringify(updated) } } };
  await fetch(FIRESTORE_DRAFT, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  console.log('\nDraft actualizado en Firestore.');
}

// ── AI evaluation via ChatGPT Vision ─────────────────────────────────────────
async function waitForTextResponse(page) {
  const TIMEOUT_MS = 3 * 60 * 1000;
  const STABLE_MS  = 2500;
  const POLL_MS    = 1000;
  const start = Date.now();
  let lastText = '';
  let stableAt = 0;

  // Solo cuenta como respuesta un veredicto real. Mientras ChatGPT procesa
  // la imagen muestra estados como "Analizando imagen" que también aparecen
  // en textContent — tomarlos como veredicto causaba rechazos falsos.
  const hasVerdict = (t) => /(APROBADA|RECHAZADA)\s*[-–:]/i.test(t) || /^(APROBADA|RECHAZADA)\b/i.test(t.trim());

  while (Date.now() - start < TIMEOUT_MS) {
    const text = await page.evaluate(() => {
      const msgs = [...document.querySelectorAll('[data-message-author-role="assistant"]')];
      return msgs[msgs.length - 1]?.textContent?.trim() || '';
    });

    if (text && text !== lastText) {
      lastText = text;
      stableAt = Date.now();
    } else if (text && text === lastText && stableAt && (Date.now() - stableAt) > STABLE_MS) {
      if (hasVerdict(text)) {
        // Quedarse con la línea del veredicto (puede venir precedida de
        // texto de estado o razonamiento)
        const m = text.match(/(APROBADA|RECHAZADA)\s*[-–:]?\s*.*/i);
        return m ? m[0] : text;
      }
      // Texto estable pero sin veredicto (p.ej. "Analizando imagen"):
      // seguir esperando hasta que llegue la respuesta real.
      stableAt = Date.now();
    }

    await page.waitForTimeout(POLL_MS);
  }
  throw new Error('Timeout esperando veredicto APROBADA/RECHAZADA (3 min)');
}

async function evaluateImage(context, imagePath, evalPrompt, extraRefs = []) {
  console.log('\n  Evaluando imagen con ChatGPT Vision...');
  const page = await context.newPage();
  page.setDefaultTimeout(ACTION_TIMEOUT_MS);

  try {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Adjuntar la imagen a evaluar + el escudo oficial + referencias extra (p.ej.
    // fotos in-game del jugador, para comparar identidad contra la fuente real).
    const evalFiles = [imagePath, CREST_PATH, ...extraRefs].filter(f => fs.existsSync(f));
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(evalFiles);
      await page.waitForTimeout(2000);
    } else {
      const attachSelectors = [
        'button[aria-label*="ttach"]',
        'button[aria-label*="djuntar"]',
        'button[aria-label*="rchivo"]',
        'button[data-testid*="attach"]',
        'button[aria-label*="File"]',
        'label[for*="file"]',
      ].join(', ');
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 15000 }),
        page.locator(attachSelectors).first().click(),
      ]);
      await fileChooser.setFiles(evalFiles);
      await page.waitForTimeout(2000);
    }

    // Enviar prompt de evaluación
    const input = page.locator('div[contenteditable="true"], p[data-placeholder]').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.click();
    await page.evaluate(async (text) => { await navigator.clipboard.writeText(text); }, evalPrompt);
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(800);

    // Esperar a que terminen de subir los adjuntos (botón deshabilitado mientras)
    await page.waitForFunction(() => {
      const b = document.querySelector('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Enviar"]');
      return b && !b.disabled;
    }, { timeout: 60000 }).catch(() => {});
    const sendBtn = page.locator('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Enviar"]').first();
    await sendBtn.click({ timeout: 30000 });

    const response = await waitForTextResponse(page);
    console.log('  Resultado:', response.split('\n')[0].slice(0, 120));
    return response;
  } finally {
    await deleteChatById(page, currentChatId(page)).catch(() => {}); // chat de evaluación
    await page.close();
  }
}

// ── Review helpers ────────────────────────────────────────────────────────────
function openImages(...filenames) {
  for (const f of filenames) {
    const abs = path.join(OUTPUT_DIR, f);
    if (fs.existsSync(abs)) execSync(`start "" "${abs}"`, { cwd: path.resolve('.'), stdio: 'ignore' });
  }
}

async function askYesNo(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim().toLowerCase() === 's'); }));
}

async function askInput(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  JERSEY_OVERRIDES = await fetchJerseyOverrides();

  console.log('Leyendo draft...');
  const draft = await fetchDraft();
  console.log('Título:', draft.title);
  console.log('Fecha:', draft.date);

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  if (draft.date !== today) {
    console.log(`Draft es de ${draft.date}, no de hoy (${today}). Esperando nuevo draft del cron.`);
    return;
  }
  if (draft.imagePost && !FLAG_FORCE) {
    console.log('El draft ya tiene imágenes. Usá --force o --review para regenerar.');
    return;
  }

  // Evitar colisión de id con una nota YA PUBLICADA el mismo día (pasó el
  // 2026-08-14: dos notas con id 'auto-2026-08-14' se pisaron las imágenes
  // porque el nombre de archivo se arma con draft.id). El id lo pone la
  // rutina cloud y no siempre lo desambigua sola, así que la última línea
  // de defensa es acá: si el id ya está publicado, sufijarlo antes de
  // generar cualquier imagen.
  try {
    const publishedRes = await fetch(`${WORKER_BASE}/published-noticias`);
    const publishedData = await publishedRes.json();
    const publishedIds = new Set((publishedData.articles || []).map(a => a.id));
    if (publishedIds.has(draft.id)) {
      let n = 2;
      let candidate = `${draft.id}-${n}`;
      while (publishedIds.has(candidate)) { n++; candidate = `${draft.id}-${n}`; }
      console.log(`Id '${draft.id}' ya está publicado hoy — renombrando este draft a '${candidate}' para no pisar sus imágenes.`);
      draft.id = candidate;
      const payload = { fields: { data: { stringValue: JSON.stringify(draft) } } };
      await fetch(FIRESTORE_DRAFT, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    }
  } catch (e) {
    console.log('No se pudo chequear colisión de id contra published-noticias (siguiendo igual):', e.message);
  }

  const allMentioned    = [...new Set([...extractMentionedPlayers(draft), ...PLAYERS_WITH_RENDERS.filter(p => (draft.imageBrief || '').includes(p))])];
  const featuredHistory = await fetchFeaturedHistory();
  const mentioned       = selectFeaturedPlayers(allMentioned, featuredHistory, draft);
  const teammates       = mentioned.length ? selectTeammates(mentioned, featuredHistory, draft, allMentioned) : [];
  if (teammates.length) console.log('Compañeros de fondo (renders reales):', teammates.join(', '));
  if (mentioned.length > 0) {
    console.log('Jugadores mencionados con renders:', allMentioned.join(', '));
    console.log('Protagonistas de la imagen:', mentioned.join(', '), draft.imageBrief ? '(según la nota)' : '(rotación)');
  } else {
    console.log('Sin jugadores específicos — composición institucional.');
  }

  console.log('Conectando al Chrome abierto...');
  // Una pestaña colgada (ej. "Profile - Kick Streaming", 2026-10-09) hace que
  // connectOverCDP espere para siempre a que responda: se cerraba en timeout
  // y el día quedaba sin imagen. Se cierran antes las pestañas que no contestan.
  await closeHungTabs();
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 60000 });
  } catch(e) {
    console.error('No se pudo conectar al Chrome en localhost:9222: ' + String(e.message).split('\n')[0]);
    console.error('Si no está abierto: scripts/abrir-chrome-chatgpt.ps1');
    process.exit(1);
  }
  const context = browser.contexts()[0];

  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) {
    page = await context.newPage();
  }
  page.setDefaultTimeout(ACTION_TIMEOUT_MS);
  console.log('Conectado.');

  const dateStr      = draft.date || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const fileSlug     = (draft.id || dateStr).replace(/[^a-zA-Z0-9_-]/g, '-');
  const styleHistory = await fetchStyleHistory();
  const chosenStyle  = pickStyle(styleHistory, draft);
  const kitHistory   = await fetchKitHistory();
  const chosenKit    = pickKitColor(kitHistory);
  console.log(`Estilo del día: ${chosenStyle.label} (${chosenStyle.id})${styleFromBrief(draft) ? ' — según el lugar que pide la nota' : ' — rotación'}`);
  console.log(`Kit del día: ${chosenKit.label}`);
  const chosenGesto  = mentioned.length ? pickGesto(styleHistory, draft) : null;
  if (chosenGesto) console.log(`Gesto de festejo: ${chosenGesto.id}`);
  if (draft.imageBrief) console.log(`Brief visual del artículo: ${draft.imageBrief.slice(0, 100)}...`);

  let correction     = FLAG_FEEDBACK;
  let lastPostFile   = `${fileSlug}_post.png`;
  let lastPostImgUrl = null;

  try {
    if (FLAG_STORY) {
      const existingPost = path.join(OUTPUT_DIR, lastPostFile);
      if (!fs.existsSync(existingPost)) {
        throw new Error(`--story-only: no existe ${lastPostFile}. Generá el post primero.`);
      }
      console.log(`\nUsando post existente: ${lastPostFile}`);
    }

    // Un solo intento de contenido por imagen — sin verificación de calidad
    // por ChatGPT Vision ni reintento automático por formato (decisión del
    // usuario, 2026-09-09): buildPrompt() ya especifica todo lo necesario
    // (identidad, kit, proporción, título) en un único prompt, y la revisión
    // final la hace un humano en el preview de publicación, no ChatGPT. Los
    // reintentos que quedan en este loop son solo por fallas TÉCNICAS (red,
    // composer que no cargó), nunca por calidad del contenido. En modo
    // --review el humano sigue pudiendo pedir correcciones interactivas
    // como seguimiento del mismo chat (freshChat:false) — ese flujo no
    // cambió, porque ahí el que decide es la persona, no una evaluación
    // automática.
    let postChatOpen = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !FLAG_STORY; attempt++) {
      if (attempt > 1) console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);

      let postFile, postImgUrl;
      try {
        let sendOpts;
        if (postChatOpen) {
          // Seguimiento del mismo chat: pedido corto y puntual, sin repetir
          // todo el prompt ni reenviar adjuntos (ya están en el contexto).
          const followUp = correction
            ? `La imagen anterior no sirve todavía. Corregí ESTO puntualmente, sin cambiar el resto de la composición, la escena, el título ni el layout:\n"${correction}"`
            : `La imagen anterior no sirve. Generá una versión nueva, distinta, manteniendo la misma escena, título y layout.`;
          sendOpts = { freshChat: false, excludeSrcs: [lastPostImgUrl], attachments: [] };
          ({ filename: postFile, imgUrl: postImgUrl } = await generateImage(
            page, draft, 'post', followUp, sendOpts
          ));
        } else {
          const postPrompt = buildPrompt(draft, mentioned, chosenStyle, chosenKit, correction, teammates, chosenGesto);
          // Referencias visuales adjuntas al mensaje: escudo Clean dorado + renders T4 de los
          // jugadores mencionados con el kit del día (el render ya tiene puesto el uniforme).
          // Sin jugadores: se adjunta el render de Juan_Martinez4 solo como referencia del kit.
          const playerRefs = [...mentioned, ...teammates].map(p => renderForKit(p, chosenKit)).filter(Boolean);
          const kitRef = playerRefs.length ? [] : [renderForKit('Juan_Martinez4', chosenKit)].filter(Boolean);
          const refAttachments = [CREST_PATH, ...playerRefs, ...kitRef];
          ({ filename: postFile, imgUrl: postImgUrl } = await generateImage(
            page, draft, 'post', postPrompt, { freshChat: true, excludeSrcs: [], attachments: refAttachments }
          ));
          postChatOpen = true;
        }
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) throw genErr;
        await deleteChatById(page, currentChatId(page)); // chat del intento fallido
        await page.goto(PROJECT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000);
        postChatOpen = false;
        continue;
      }
      lastPostFile   = postFile;
      lastPostImgUrl = postImgUrl;

      // Chequeo mecánico de proporción — queda como diagnóstico en el log;
      // ya no dispara un reintento automático (ver nota arriba). Si sale
      // mal, se ve en el preview de publicación.
      const postDims = await imageRatio(path.join(OUTPUT_DIR, postFile));
      if (postDims.ratio < POST_MIN_RATIO || postDims.ratio > POST_MAX_RATIO) {
        console.log(`  ⚠ Formato del post ${postDims.width}x${postDims.height} (proporción ${postDims.ratio.toFixed(2)}) fuera del rango esperado — revisar en el preview de publicación.`);
      }

      if (FLAG_REVIEW) {
        // Revisión humana interactiva
        console.log(`\n  Post: Renders/Daily News/${postFile}`);
        openImages(postFile);
        const ok = await askYesNo('\n¿La imagen está bien? [s/N]: ');
        if (ok) break;
        correction = await askInput('¿Qué corregir para la próxima versión?: ');
        if (!correction) console.log('Sin feedback — pidiendo una nueva versión en el mismo chat.');
        if (attempt === MAX_ATTEMPTS) console.log('Máximo de intentos alcanzado — usando esta versión.');
      } else {
        break;
      }
    }

    // Story se genera a partir del post — un solo intento de contenido,
    // mismo criterio que el post: sin verificación de calidad ni reintento
    // por formato. Los reintentos que quedan son solo por fallas técnicas.
    let storyFile = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const storyPrompt = buildResizePrompt();
        let storyImgUrl;
        ({ filename: storyFile, imgUrl: storyImgUrl } = await generateImage(
          page, draft, 'story', storyPrompt, { freshChat: false, excludeSrcs: [lastPostImgUrl] }
        ));
      } catch (genErr) {
        console.log(`  Error generando story (intento ${attempt}/3): ${genErr.message.split('\n')[0]}`);
        if (attempt === 3) { storyFile = null; break; }
        await page.waitForTimeout(5000);
        continue;
      }

      const storyDims = await imageRatio(path.join(OUTPUT_DIR, storyFile));
      if (storyDims.ratio > STORY_MAX_RATIO) {
        console.log(`  ⚠ Formato de la story ${storyDims.width}x${storyDims.height} (proporción ${storyDims.ratio.toFixed(2)}) fuera del rango esperado — revisar en el preview de publicación.`);
      }
      break;
    }

    // Si la story no salió, usar el post como story: perder el formato vertical
    // es mucho mejor que perder el día entero (antes acá se abortaba todo y el
    // post aprobado nunca se publicaba).
    if (!storyFile) {
      storyFile = `${fileSlug}_story.png`;
      fs.copyFileSync(path.join(OUTPUT_DIR, lastPostFile), path.join(OUTPUT_DIR, storyFile));
      console.log('  Story falló en todos los intentos — usando el post como story.');
    }

    // Imágenes descargadas — el chat de generación ya no hace falta
    await deleteChatById(page, currentChatId(page));

    for (const f of [lastPostFile, storyFile]) {
      try { await stampCrest(path.join(OUTPUT_DIR, f), { fresh: true }); } catch (e) { console.warn('  No se pudo estampar el escudo en', f, e.message); }
    }
    await updateDraft(draft, lastPostFile, storyFile);
    await saveStyleHistory(chosenStyle.id, dateStr, styleHistory, chosenGesto?.id, typeof draft.toma === 'string' ? draft.toma : null);
    await saveKitHistory(chosenKit.id, dateStr, kitHistory);
    if (mentioned.length > 0) await saveFeaturedHistory([...mentioned, ...teammates], dateStr, featuredHistory);
    uploadImagesToR2(lastPostFile, storyFile);

    console.log('\n✓ Listo.');
    console.log('  Post: ', lastPostFile);
    console.log('  Story:', storyFile);
  } finally {
    await browser.close();
  }
}

// Solo corre el pipeline diario cuando se invoca directamente (node
// generate-image-chatgpt.mjs); permite importar las funciones de abajo
// desde un one-off (p.ej. scripts/fix-story-once.mjs) sin disparar main().
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  // Watchdog: post + story esperan como mucho 25 min cada una; si la corrida
  // entera pasa de 70 min algo quedó colgado. Salir con error para que
  // run-daily-images.ps1 haga su reintento en vez de esperar para siempre.
  setTimeout(() => {
    console.error('Error: watchdog — la corrida superó 70 min sin terminar, se aborta.');
    process.exit(1);
  }, 70 * 60 * 1000).unref();
  main().catch(e => { console.error('Error:', e.message); process.exit(1); });
}

export {
  IMAGE_STYLES,
  styleFromBrief,
  PROJECT_URL,
  MAX_ATTEMPTS,
  POST_MIN_RATIO,
  POST_MAX_RATIO,
  STORY_MAX_RATIO,
  CREST_PATH,
  CREST_WHITE_PATH,
  KITS_PATH,
  KIT_COLORS,
  GK_KIT_DESC,
  renderForKit,
  T4_FRENTES_DIR,
  cropKitImage,
  pickKitColor,
  fetchKitHistory,
  saveKitHistory,
  T3_FRENTES_DIR,
  PLAYERS_WITH_RENDERS,
  PLAYER_TRAITS,
  imageRatio,
  buildEvalPrompt,
  buildResizePrompt,
  buildPrompt,
  selectTeammates,
  pickGesto,
  buildScene,
  brandFormatBlock,
  playerIdentityLine,
  pickStyle,
  fetchStyleHistory,
  saveStyleHistory,
  extractMentionedPlayers,
  selectFeaturedPlayers,
  fetchFeaturedHistory,
  saveFeaturedHistory,
  generateImage,
  evaluateImage,
  stampCrest,
  pickCrestSpot,
  RAW_DIR,
  deleteChatById,
  currentChatId,
  uploadImagesToR2,
  fetchJerseyOverrides,
};
