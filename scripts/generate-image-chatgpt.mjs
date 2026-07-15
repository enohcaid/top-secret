/**
 * Genera imágenes para la noticia diaria de Top Secret FC usando ChatGPT.
 * Usa el proyecto "TOP Secret FC" en ChatGPT y adjunta a cada mensaje las
 * referencias visuales desde el repo local (escudo, indumentaria y renders
 * de Renders/T3-Frentes/) — los archivos del proyecto no llegan al generador
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
import path from 'path';
import { createInterface } from 'readline';

const FIRESTORE_DRAFT        = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
const FIRESTORE_STYLE_HISTORY = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/image_style_history';
const OUTPUT_DIR      = path.resolve('Renders/Daily News');
const DEBUG_DIR       = path.resolve('scripts'); // screenshots de debug fuera de Daily News (no se commitean)
const PROJECT_URL     = 'https://chatgpt.com/g/g-p-6a420887ce04819182396abfcbd40400/';
const MAX_ATTEMPTS    = 3;

// Referencias visuales que se ADJUNTAN a cada mensaje de generación.
// Los archivos del proyecto de ChatGPT no llegan de forma confiable al
// generador de imágenes (por eso inventaba escudos) — los adjuntos sí.
const CREST_PATH = path.resolve('Top-Secret.png');
// T3 Kits.png (tres kits puestos en jugadores) y no el póster-catálogo de
// indumentaria: una infografía densa como referencia contamina la generación.
const KITS_PATH  = path.resolve('logos/T3 Kits.png');

// El evaluador debe juzgar contra el ESTILO DEL DÍA, no contra una paleta fija:
// exigir siempre negro+dorado haría rechazar imágenes correctas de estilos claros
// (editorial revista, lluvia teal, estadio azul, etc.).
function buildEvalPrompt(style, draft) {
  return `Sos el Director Creativo de Top Secret FC, club de fútbol virtual argentino de élite.

Te adjunto DOS imágenes: la PRIMERA es la imagen a evaluar; la SEGUNDA es el escudo oficial del club (referencia — insignia circular metálica plateada/negra con un espía de sombrero y anteojos).

Evaluá si la PRIMERA imagen sirve para publicar la noticia de hoy en redes.

NOTICIA DE HOY: "${draft.title || ''}"

ESTILO VISUAL ELEGIDO PARA HOY: ${style.label}
- Paleta esperada del AMBIENTE (fondo y diseño): ${style.palette}
- Dirección de arte: ${style.prompt}

CRITERIOS (todos deben cumplirse):
- Si aparece el escudo del club, su DISEÑO es el de la segunda imagen adjunta: circular, con el espía de sombrero y anteojos, texto "TOP SECRET" / "FOOTBALL CLUB". Un escudo de diseño distinto (otra forma, estrellas, otro ícono) = RECHAZADA sí o sí. PERO: que la luz ambiental de la escena tiña el escudo (dorado en luz cálida, azulado de noche) es fotografía normal y NO es motivo de rechazo
- El ambiente respeta la paleta del estilo de hoy (NO exijas negro/dorado si el estilo pide otra cosa)
- El uniforme del jugador se ve nítido, sin teñirse con la paleta del ambiente
- La camiseta de Top Secret es de uno de los tres kits oficiales: NEGRA, BLANCA o AMARILLA. Una camiseta azul o de cualquier otro color = RECHAZADA
- Estética editorial cinematográfica — nivel ESPN/Fox Sports premium, sin aspecto plástico de IA
- La imagen comunica visualmente el tema de la noticia
- Si hay texto/titular, es legible y con ortografía correcta
- Sin franja/barra de marca en el borde inferior, sin watermarks
- Anatomía correcta (manos, proporciones, caras)

Respondé ÚNICAMENTE con uno de estos dos formatos (nada más):
APROBADA - [motivo breve]
RECHAZADA - [qué falla específicamente, en una línea accionable para el generador de imágenes]`;
}

// Pool de estilos visuales rotativos — nunca se repite en los últimos 5 usos
// Cada estilo define su propia paleta de FONDO y DISEÑO — nunca del uniforme del jugador
const IMAGE_STYLES = [
  { id: 'RETRATO_DRAMATICO',
    label: 'Retrato dramático',
    palette: 'deep black background, single cold blue-white spotlight, no color tinting on the subject',
    prompt: 'Tight close-up dramatic portrait. Single spotlight cutting through deep darkness, face partially sculpted by shadow. Ultra-cinematic and intimate — negative space is part of the composition.' },
  { id: 'ESTADIO_NOCTURNO',
    label: 'Estadio nocturno',
    palette: 'night blue sky, stadium floodlights in whites and pale yellows, electric atmosphere',
    prompt: 'Wide epic establishing shot. Massive night stadium in the background with floodlights blazing. The subject feels powerful but the venue dwarfs everything — atmospheric, cinematic, grand scale.' },
  { id: 'EDITORIAL_REVISTA',
    label: 'Editorial de revista',
    palette: 'clean white or off-white background, silver and charcoal design elements, prestige sports magazine aesthetic',
    prompt: 'High-fashion sports editorial, clean magazine-cover composition. Strong negative space, subject styled like a prestige cover athlete — think ESPN The Magazine meets Vogue Sports.' },
  { id: 'ACCION_DINAMICA',
    label: 'Acción dinámica',
    palette: 'dark background with emerald green pitch reflections, electric particle effects, kinetic energy in whites and greens',
    prompt: 'Explosive freeze-frame action shot. Motion blur on extremities, particle effects and kinetic energy bursting outward, peak-moment intensity frozen in time. Speed and impact.' },
  { id: 'POSTER_CONCEPTUAL',
    label: 'Póster conceptual',
    palette: 'deep navy blue and black background, sharp white graphic lines, abstract geometric accents in electric blue',
    prompt: 'Bold graphic poster art. Diagonal composition, abstract football geometry mixed with photorealistic elements, almost illustrative. A statement piece that reads as both fine art and sports media.' },
  { id: 'VESTUARIO_INTIMO',
    label: 'Vestuario íntimo',
    palette: 'warm amber and orange practical lighting, dark concrete walls, raw and authentic atmosphere',
    prompt: 'Raw behind-the-scenes atmosphere. Tunnel or locker room setting, low warm practical lighting, gritty authenticity. Pre-match or post-match tension you can almost feel.' },
  { id: 'CONTRALUZ_EPICO',
    label: 'Contraluz épico',
    palette: 'blazing white-yellow backlight creating silhouette, god-ray effect, rim light only — minimal color saturation',
    prompt: 'Powerful contre-jour backlight. Subject in dramatic silhouette against blazing stadium lights — god-ray effect, almost mythological in scale. Shadow and light as the main characters.' },
  { id: 'CROMATICO_DORADO',
    label: 'Cromático dorado',
    palette: 'gold (#C8A84B) and black as the background and graphic design palette — metallic luxury aesthetic in the environment and design elements only, NOT on the player',
    prompt: 'Gold and black as the dominant design palette — metallic luxury in the background, graphic elements, and atmosphere. The look of a championship trophy or elite award ceremony. Prestigious, heavy, winning.' },
  { id: 'MINIMALISTA_GEOMETRICO',
    label: 'Minimalista geométrico',
    palette: 'near-black background (#0a0b0e), single thin geometric gold accent line, very little visual noise',
    prompt: 'Minimalist geometric composition. Strong lines, bold shapes, very little visual noise. The subject isolated against a near-black background with a single geometric accent element.' },
  { id: 'CINEMATICO_LLUVIA',
    label: 'Cinemático lluvia',
    palette: 'wet pitch with cyan and teal neon reflections, rain streaks, moody dark atmosphere with cool color temperature',
    prompt: 'Cinematic rain atmosphere. Wet pitch reflections, dramatic rain streaks, neon-lit puddles in cool teal and cyan tones. Gritty and moody — like a sports film scene shot in Argentina.' },
];

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

// Jugadores con render disponible (Renders/T3-Frentes/ local)
// Basta con agregar el PNG acá — se adjunta al mensaje de generación; ya no
// hace falta subirlo al proyecto de ChatGPT
const T3_FRENTES_DIR = path.resolve('Renders/T3-Frentes');
const PLAYERS_WITH_RENDERS = fs.readdirSync(T3_FRENTES_DIR)
  .filter(f => /\.(png|jpg)$/i.test(f))
  .map(f => f.replace(/\.(png|jpg)$/i, ''));

async function fetchStyleHistory() {
  try {
    const res = await fetch(FIRESTORE_STYLE_HISTORY);
    const doc = await res.json();
    if (doc.error) return [];
    const values = doc.fields?.entries?.arrayValue?.values || [];
    return values.map(v => ({
      style: v.mapValue.fields.style.stringValue,
      date:  v.mapValue.fields.date.stringValue,
    }));
  } catch { return []; }
}

// Afinidad tema→estilos: dentro de los no usados recientemente, se prefieren
// estilos coherentes con el tono de la noticia. Si ninguno está disponible,
// cae al pool completo (la rotación anti-repetición siempre manda).
const STYLE_AFFINITY = [
  { match: (d, t) => /victoria|triunfo|goleada|ganamos|campe[oó]n|ascenso/.test(t),
    styles: ['ESTADIO_NOCTURNO', 'ACCION_DINAMICA', 'CROMATICO_DORADO', 'CONTRALUZ_EPICO'] },
  { match: (d, t) => /derrota|perdimos|ca[ií]da|golpe/.test(t),
    styles: ['CINEMATICO_LLUVIA', 'CONTRALUZ_EPICO', 'VESTUARIO_INTIMO', 'RETRATO_DRAMATICO'] },
  { match: (d, t) => /entrevista|mano a mano|nos cont[oó]/.test(t) || (d.category || '') === 'Entrevista',
    styles: ['RETRATO_DRAMATICO', 'EDITORIAL_REVISTA', 'VESTUARIO_INTIMO'] },
  { match: (d, t) => (d.category || '') === 'Institución' || /kits?|indumentaria|sponsor|marca|aniversario/.test(t),
    styles: ['EDITORIAL_REVISTA', 'MINIMALISTA_GEOMETRICO', 'CROMATICO_DORADO', 'POSTER_CONCEPTUAL'] },
];

function pickStyle(history, draft = {}) {
  const recentIds = new Set(history.slice(0, 5).map(h => h.style));
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

async function saveStyleHistory(styleId, date, history) {
  const updated = [{ style: styleId, date }, ...history].slice(0, 10);
  const values = updated.map(e => ({ mapValue: { fields: {
    style: { stringValue: e.style },
    date:  { stringValue: e.date  },
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

function extractMentionedPlayers(draft) {
  const text = [draft.title, draft.excerpt, ...(draft.body || [])].join(' ');
  return PLAYERS_WITH_RENDERS.filter(p => text.includes(p));
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
  const bodyText = (draft.body || []).join(' ').replace(/<[^>]+>/g, ' ');
  const full     = (title + ' ' + bodyText).toLowerCase();
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

function buildPrompt(draft, mentionedPlayers, style, correction = null) {
  const { scene, action } = buildScene(draft, mentionedPlayers);

  const playerBlock = mentionedPlayers.length > 0
    ? `JUGADORES MENCIONADOS EN ESTA NOTICIA (son nuestros jugadores):
Sus renders van ADJUNTOS a este mensaje. El nombre de cada archivo coincide exactamente con el gamertag del jugador. DEBÉS usar esos renders como referencia visual directa — no inventes su apariencia.
${mentionedPlayers.map(p => `- ${p} → render adjunto: "${p}.png" → ${action}`).join('\n')}`
    : `Sin jugadores específicos — composición institucional:
${action}`;

  return `Creá una imagen editorial deportiva para Top Secret FC, un club argentino de fútbol virtual (esports). Todos los jugadores que se mencionan en las noticias son NUESTROS PROPIOS JUGADORES — tenés sus renders subidos al proyecto para usarlos como referencia visual.

⚠️ CRÍTICO — RENDERS Y UNIFORME: Los archivos de renders son imágenes de referencia de nuestros jugadores reales. Si un jugador aparece mencionado, DEBÉS usar su render del proyecto para representarlo — no inventes su cara ni apariencia. El uniforme que aparece en el render es intocable: los colores del kit del jugador no deben ser modificados por la paleta del fondo ni por el estilo del día. La paleta aplica SOLO al ambiente, fondo y elementos gráficos.

═══ SPECS TÉCNICAS ═══
- Dimensiones: 1086x1448 (ligeramente vertical, formato post)
- Paleta del día (fondo y diseño gráfico, no el uniforme): ${style.palette}

═══ ESTILO VISUAL DEL DÍA ═══
${style.prompt}
Aplicá este estilo como base compositiva. La paleta de colores define el AMBIENTE y el DISEÑO de la imagen — el uniforme del jugador queda exactamente como en los renders.

═══ ESCENA Y ACCIÓN ═══
Atmósfera: ${scene}
${playerBlock}

═══ IMÁGENES ADJUNTAS A ESTE MENSAJE — REFERENCIAS OBLIGATORIAS ═══
⚠️ Los adjuntos son SOLO referencias visuales para copiar el diseño del escudo, del kit y las caras de los jugadores. NO son el contenido ni el layout de la imagen: no hagas un catálogo, una grilla de productos, un mosaico ni una reproducción de los adjuntos. La imagen a crear es la ESCENA de la noticia descrita arriba.

Usá cada adjunto según su función:

• "Top-Secret.png" (adjunto) → es el ÚNICO escudo válido de Top Secret FC: insignia CIRCULAR metálica en plateado y negro, con un espía (sombrero fedora y anteojos oscuros) en el centro y el texto "TOP SECRET" arriba y "FOOTBALL CLUB" abajo. Reproducilo EXACTAMENTE como está en la imagen adjunta — mismo diseño, misma forma circular, mismos colores plateados/negros. PROHIBIDO rediseñarlo, recolorearlo, cambiarle la forma o inventar un escudo distinto (nada de escudos con estrellas, formas de escudo heráldico ni otros colores).

• "T3 Kits.png" (adjunto) → referencia de los tres kits del club:
  - Local: camiseta negra
  - Alternativo: camiseta blanca
  - Tercer kit: camiseta amarilla
  Elegí el kit que mejor encaje con la escena y el estilo del día. Variá — no uses siempre el negro. El blanco y el amarillo dan mucha variedad visual. Reproducí el diseño del kit tal cual la referencia.
  ⚠️ Los ÚNICOS colores de camiseta válidos son esos tres: NEGRO, BLANCO o AMARILLO. Una camiseta azul, roja, bordó o de cualquier otro color es un ERROR — el club no tiene kits de otros colores.

• Renders de jugadores adjuntos: cada archivo "[gamertag].png" es el render visual de uno de nuestros jugadores — referencia obligatoria para su cara, físico y apariencia.

⚠️ No incluyas logos ni escudos de otros clubes, y no inventes ningún elemento de marca que no esté en los adjuntos.

═══ TITULAR EN LA IMAGEN ═══
Incluí el siguiente título como texto prominente en la imagen — en letras GRANDES, bold, condensed, mayúsculas — estilo tapa de diario deportivo o revista de fútbol. El texto debe ser inmediatamente legible y ocupar un lugar central o dominante en la composición:

"${draft.title}"

Si el título es largo, podés dividirlo en dos líneas o quedarte con las palabras más impactantes. El objetivo es que alguien que pase rápido por la imagen entienda de qué se trata sin leer el artículo. El color del texto debe contrastar fuerte con el fondo — blanco puro, dorado (#C8A84B), o el que mejor funcione según la paleta del día.

═══ CONTEXTO DE LA NOTA ═══
La imagen tiene que contar visualmente de qué trata la nota. Que un hincha la vea y entienda el tema sin leer nada.${correction ? `

═══ CORRECCIÓN vs. VERSIÓN ANTERIOR ═══
La imagen generada anteriormente no cumplió con la identidad visual del club. Tené en cuenta este feedback para la nueva versión:
"${correction}"
Este punto debe ser claramente diferente y mejor en la imagen nueva.` : ''}`;
}

function buildResizePrompt() {
  return `Tomá la imagen que acabás de generar y recreala en formato vertical historia (941x1672, orientación retrato/portrait), pensada para Instagram Stories.

Mantené EXACTAMENTE la misma escena, el mismo personaje/jugador, la misma pose, los mismos colores y el mismo estilo editorial — es la MISMA pieza, solo adaptada a un encuadre vertical más alto y angosto.

Único cambio es de composición: reacomodá la escena para que ocupe bien el espacio vertical más alto y angosto. No cambies el tema, el contenido ni el mensaje de la imagen.`;
}

async function waitForGeneratedImage(page, excludeSrcs = []) {
  console.log('  Esperando imagen (hasta 15 min)...');
  page.setDefaultTimeout(0);

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

  const TIMEOUT_MS  = 15 * 60 * 1000;
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
  throw new Error('Timeout (15 min) esperando imagen. Screenshot en scripts/debug-timeout.png');
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

async function ensureNormalQuality(page) {
  try {
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent?.trim() === 'Alta');
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (!clicked) return;

    await page.waitForTimeout(800);

    const selected = await page.evaluate(() => {
      // El menú actual ofrece Baja/Media/Alta — "Media" genera en 1-3 min
      // vs 5-15 min de "Alta". Se mantienen los nombres viejos por si la UI vuelve.
      const wanted = ['Media', 'Medium', 'Normal', 'Estándar', 'Standard'];
      const opts = [...document.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemradio"], li, button, div[data-radix-collection-item]')];
      for (const name of wanted) {
        const opt = opts.find(el => el.textContent?.trim() === name);
        if (opt) { opt.click(); return name; }
      }
      return null;
    });

    if (selected) {
      console.log(`  Calidad: ${selected} (mucho más rápido que Alta).`);
      await page.waitForTimeout(400);
    } else {
      console.log('  Calidad: no se pudo cambiar de Alta — la generación será lenta.');
      await page.keyboard.press('Escape');
    }
  } catch { /* quality change optional */ }
}

async function sendPromptInProject(page, prompt, { freshChat = true, attachments = [] } = {}) {
  if (freshChat) {
    await page.goto(PROJECT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
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
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(existing);
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
}

async function generateImage(page, draft, format, prompt, { freshChat, excludeSrcs, attachments = [] }) {
  const now      = new Date();
  const dateStr  = draft.date || now.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const filename   = `${dateStr}_${format}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`\nGenerando imagen ${format.toUpperCase()}...`);

  await sendPromptInProject(page, prompt, { freshChat, attachments });
  const imgUrl = await waitForGeneratedImage(page, excludeSrcs);
  await downloadImage(page, imgUrl, outputPath);

  return { filename, imgUrl };
}

function gitPushImages(postFile, storyFile) {
  const repoRoot = path.resolve('.');
  const run = (cmd) => execSync(cmd, { cwd: repoRoot, stdio: 'pipe' }).toString().trim();

  try {
    // Solo los archivos del día — nunca la carpeta entera, para no arrastrar
    // otros cambios pendientes del working tree.
    const files = [postFile, storyFile].filter(Boolean)
      .map(f => `"Renders/Daily News/${f}"`).join(' ');
    run(`git add ${files}`);
    const status = run('git status --porcelain --cached');
    if (!status) {
      console.log('  Git: sin cambios para commitear.');
      return;
    }
    const date = postFile.split('_')[0];
    run(`git commit -m "feat: imagenes diarias ${date}"`);
    run('git push');
    console.log('  Git: imagenes pusheadas a GitHub.');
  } catch (e) {
    console.warn('  Git push falló (no crítico):', e.message.split('\n')[0]);
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
  const updated = {
    ...fresh,
    imagePost:  `Renders/Daily News/${postFile}`,
    imageStory: `Renders/Daily News/${storyFile}`,
    image:      `Renders/Daily News/${postFile}`,
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

async function evaluateImage(context, imagePath, evalPrompt) {
  console.log('\n  Evaluando imagen con ChatGPT Vision...');
  const page = await context.newPage();
  page.setDefaultTimeout(0);

  try {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Adjuntar la imagen a evaluar + el escudo oficial como referencia
    const evalFiles = [imagePath, CREST_PATH].filter(f => fs.existsSync(f));
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

  const mentioned = extractMentionedPlayers(draft);
  if (mentioned.length > 0) {
    console.log('Jugadores mencionados con renders:', mentioned.join(', '));
  } else {
    console.log('Sin jugadores específicos — composición institucional.');
  }

  console.log('Conectando al Chrome abierto...');
  let browser;
  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch(e) {
    console.error('Chrome no está disponible en localhost:9222.');
    console.error('Abrí Chrome con: chrome.exe --remote-debugging-port=9222');
    process.exit(1);
  }
  const context = browser.contexts()[0];

  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) {
    page = await context.newPage();
  }
  page.setDefaultTimeout(0);
  console.log('Conectado.');

  const dateStr      = draft.date || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const styleHistory = await fetchStyleHistory();
  const chosenStyle  = pickStyle(styleHistory, draft);
  const evalPrompt   = buildEvalPrompt(chosenStyle, draft);
  console.log(`Estilo del día: ${chosenStyle.label} (${chosenStyle.id})`);
  if (draft.imageBrief) console.log(`Brief visual del artículo: ${draft.imageBrief.slice(0, 100)}...`);

  let correction     = FLAG_FEEDBACK;
  let lastPostFile   = `${dateStr}_post.png`;
  let lastPostImgUrl = null;

  try {
    if (FLAG_STORY) {
      const existingPost = path.join(OUTPUT_DIR, lastPostFile);
      if (!fs.existsSync(existingPost)) {
        throw new Error(`--story-only: no existe ${lastPostFile}. Generá el post primero.`);
      }
      console.log(`\nUsando post existente: ${lastPostFile}`);
    }

    // Loop solo sobre el post hasta aprobarlo
    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !FLAG_STORY; attempt++) {
      if (attempt > 1) console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS}...`);

      let postFile, postImgUrl;
      try {
        const postPrompt = buildPrompt(draft, mentioned, chosenStyle, correction);
        // Referencias visuales adjuntas al mensaje: escudo + kits + renders
        // de los jugadores mencionados
        const refAttachments = [
          CREST_PATH,
          KITS_PATH,
          ...mentioned.map(p => {
            const png = path.join(T3_FRENTES_DIR, `${p}.png`);
            return fs.existsSync(png) ? png : path.join(T3_FRENTES_DIR, `${p}.jpg`);
          }),
        ];
        ({ filename: postFile, imgUrl: postImgUrl } = await generateImage(
          page, draft, 'post', postPrompt, { freshChat: true, excludeSrcs: [], attachments: refAttachments }
        ));
      } catch (genErr) {
        console.log(`  Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) throw genErr;
        await deleteChatById(page, currentChatId(page)); // chat del intento fallido
        await page.goto(PROJECT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(3000);
        continue;
      }
      lastPostFile   = postFile;
      lastPostImgUrl = postImgUrl;

      if (FLAG_REVIEW) {
        // Revisión humana interactiva
        console.log(`\n  Post: Renders/Daily News/${postFile}`);
        openImages(postFile);
        const ok = await askYesNo('\n¿La imagen está bien? [s/N]: ');
        if (ok) break;
        correction = await askInput('¿Qué corregir para la próxima versión?: ');
        if (!correction) console.log('Sin feedback — regenerando con el mismo prompt.');
        if (attempt === MAX_ATTEMPTS) console.log('Máximo de intentos alcanzado — usando esta versión.');
        else await deleteChatById(page, currentChatId(page)); // chat del intento descartado
      } else {
        // Evaluación automática con ChatGPT Vision
        let evalResponse = null;
        try {
          evalResponse = await evaluateImage(context, path.join(OUTPUT_DIR, postFile), evalPrompt);
        } catch (evalErr) {
          console.log(`  Evaluación falló (${evalErr.message.split('\n')[0]}) — aceptando imagen.`);
        }

        const approved = !evalResponse || /^aprobada/i.test(evalResponse.trim());

        if (approved || attempt === MAX_ATTEMPTS) {
          if (evalResponse && !approved) console.log('  Máximo de intentos alcanzado — usando última versión.');
          break;
        }

        correction = evalResponse.replace(/^rechazada\s*[-–]\s*/i, '').trim();
        console.log(`  Corrección: "${correction}"`);
        await deleteChatById(page, currentChatId(page)); // chat del intento rechazado
      }
    }

    // Story se genera a partir del post aprobado. También pasa por el evaluador
    // (una corrección como máximo — el post ya fijó escena y estilo).
    let storyFile;
    const storyExclude    = [lastPostImgUrl];
    let storyCorrection = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      let storyImgUrl;
      try {
        const storyPrompt = buildResizePrompt() +
          (storyCorrection ? `\n\nCORRECCIÓN sobre la versión anterior: ${storyCorrection}` : '');
        ({ filename: storyFile, imgUrl: storyImgUrl } = await generateImage(
          page, draft, 'story', storyPrompt, { freshChat: false, excludeSrcs: storyExclude }
        ));
      } catch (genErr) {
        console.log(`  Error generando story (intento ${attempt}/3): ${genErr.message.split('\n')[0]}`);
        if (attempt === 3) { storyFile = null; break; }
        await page.waitForTimeout(5000);
        continue;
      }
      storyExclude.push(storyImgUrl);

      // En modo review el humano ya dirige; y una sola corrección automática alcanza
      if (FLAG_REVIEW || storyCorrection !== null || attempt === 3) break;

      let storyEval = null;
      try {
        storyEval = await evaluateImage(context, path.join(OUTPUT_DIR, storyFile), evalPrompt);
      } catch (evalErr) {
        console.log(`  Evaluación de story falló (${evalErr.message.split('\n')[0]}) — aceptando.`);
      }
      if (!storyEval || /^aprobada/i.test(storyEval.trim())) break;

      storyCorrection = storyEval.replace(/^rechazada\s*[-–]\s*/i, '').trim();
      console.log(`  Story rechazada: "${storyCorrection}" — regenerando.`);
    }

    // Si la story no salió, usar el post como story: perder el formato vertical
    // es mucho mejor que perder el día entero (antes acá se abortaba todo y el
    // post aprobado nunca se publicaba).
    if (!storyFile) {
      storyFile = `${dateStr}_story.png`;
      fs.copyFileSync(path.join(OUTPUT_DIR, lastPostFile), path.join(OUTPUT_DIR, storyFile));
      console.log('  Story falló en todos los intentos — usando el post como story.');
    }

    // Imágenes descargadas — el chat de generación ya no hace falta
    await deleteChatById(page, currentChatId(page));

    await updateDraft(draft, lastPostFile, storyFile);
    await saveStyleHistory(chosenStyle.id, dateStr, styleHistory);
    gitPushImages(lastPostFile, storyFile);

    console.log('\n✓ Listo.');
    console.log('  Post: ', lastPostFile);
    console.log('  Story:', storyFile);
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
