/**
 * Genera imágenes para la noticia diaria de Top Secret FC usando ChatGPT.
 * Usa el proyecto "TOP Secret FC" en ChatGPT, que tiene subidos el logo,
 * uniformes y renders de jugadores (T3-Frentes). Conecta al Chrome del
 * usuario via CDP en localhost:9222.
 *
 * Uso: node scripts/generate-image-chatgpt.mjs
 */

import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const FIRESTORE_DRAFT        = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
const FIRESTORE_STYLE_HISTORY = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/image_style_history';
const OUTPUT_DIR      = path.resolve('Renders/Daily News');
const PROJECT_URL     = 'https://chatgpt.com/g/g-p-6a420887ce04819182396abfcbd40400/';

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

// Jugadores con renders en el proyecto de ChatGPT (carpeta T3-Frentes)
// Agregar el archivo PNG a Renders/T3-Frentes/ + subirlo al proyecto de ChatGPT es suficiente
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

function pickStyle(history) {
  const recentIds = new Set(history.slice(0, 5).map(h => h.style));
  const available = IMAGE_STYLES.filter(s => !recentIds.has(s.id));
  const pool = available.length > 0 ? available : IMAGE_STYLES;
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

function buildPrompt(draft, mentionedPlayers, style) {
  const { scene, action } = buildScene(draft, mentionedPlayers);

  const playerBlock = mentionedPlayers.length > 0
    ? `JUGADORES (usá sus renders subidos al proyecto):
${mentionedPlayers.map(p => `- ${p}: ${action}`).join('\n')}`
    : `Sin jugadores específicos:
${action}`;

  return `Creá una imagen editorial deportiva para Top Secret FC, club de fútbol virtual argentino.

⚠️ CRÍTICO — UNIFORME: Si usás los renders de jugadores del proyecto, NO los modifiques ni alteres. Usá exactamente los archivos subidos tal cual. Los colores del uniforme del jugador son intocables — el dorado, el azul, el blanco o cualquier color que aparezca en el diseño de la imagen se aplica únicamente al FONDO, a elementos gráficos y al ambiente, NUNCA sobre el kit del jugador.

═══ SPECS TÉCNICAS ═══
- Dimensiones: 1086x1448 (ligeramente vertical, formato post)
- Paleta del día (fondo y diseño gráfico, no el uniforme): ${style.palette}

═══ ESTILO VISUAL DEL DÍA ═══
${style.prompt}
Aplicá este estilo como base compositiva. La paleta de colores define el AMBIENTE y el DISEÑO de la imagen — el uniforme del jugador queda exactamente como en los renders.

═══ ELEMENTO DE MARCA FIJO ═══
En la parte INFERIOR de la imagen, incluí una franja horizontal delgada con:
  • Fondo negro (#0a0b0e) con un borde/línea fina dorada (#C8A84B) separándola del resto
  • Texto en tipografía condensada, mayúsculas, dorada: "NOTICIAS | TOP SECRET FC"
  • Estilo limpio y profesional — como los banners de ESPN o Fox Sports pero con identidad oscura de élite
  • Podés sumar el logo pequeño del club al costado del texto si mejora la composición

═══ ESCENA Y ACCIÓN ═══
Atmósfera: ${scene}
${playerBlock}

═══ IDENTIDAD VISUAL (usá los archivos del proyecto) ═══
- Logo Top Secret FC: incluilo de forma natural en la composición
- INDUMENTARIA: el proyecto tiene la imagen "Indumentaria TOP Secret T3.png" con todos los kits disponibles (local negro, alternativo blanco, tercer kit amarillo). Elegí el kit que mejor sirva a la escena y al estilo del día — no uses siempre el negro. El blanco y el amarillo dan mucha variedad visual. IMPORTANTE: el kit define el color del uniforme, y ese color no debe ser modificado por la paleta del fondo.
- NO incluyas escudos ni logos de otros clubes
- El logo/escudo del club SÍ debe aparecer (además de la franja de marca)

═══ CONTEXTO DE LA NOTA ═══
"${draft.title}"

La imagen tiene que contar visualmente de qué trata la nota. Que un hincha la vea y entienda el tema sin leer nada.`;
}

function buildResizePrompt() {
  return `Tomá la imagen que acabás de generar y recreala en formato vertical historia (941x1672, orientación retrato/portrait), pensada para Instagram Stories.

Mantené EXACTAMENTE la misma escena, el mismo personaje/jugador, la misma pose, los mismos colores y el mismo estilo editorial — es la MISMA pieza, solo adaptada a un encuadre vertical más alto y angosto.

Único cambio de composición: movés la franja de marca "NOTICIAS | TOP SECRET FC" a la parte SUPERIOR de la imagen (en el post estaba abajo), y reacomodás el resto de la escena para que ocupe bien el espacio vertical. No cambies el tema, el contenido ni el mensaje de la imagen.`;
}

async function waitForGeneratedImage(page, excludeSrcs = []) {
  console.log('  Esperando imagen (hasta 6 min)...');
  page.setDefaultTimeout(0);

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug-after-send.png'), fullPage: false });

  const TIMEOUT_MS = 6 * 60 * 1000;
  const POLL_MS    = 4000;
  const start      = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    const imgSrc = await page.evaluate((excludeSrcs) => {
      const imgs = [...document.querySelectorAll('img')].reverse();
      for (const img of imgs) {
        const src = img.src || '';
        if (excludeSrcs.includes(src)) continue;
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
          return src;
        }
      }
      return null;
    }, excludeSrcs);

    if (imgSrc) {
      console.log('\n  Imagen detectada.');
      return imgSrc;
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`\r  Generando... ${elapsed}s`);
    await page.waitForTimeout(POLL_MS);
  }

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug-timeout.png'), fullPage: true });
  throw new Error('Timeout (6 min) esperando imagen. Screenshot en debug-timeout.png');
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

async function sendPromptInProject(page, prompt, { freshChat = true } = {}) {
  if (freshChat) {
    await page.goto(PROJECT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  const input = page.locator('div[contenteditable="true"], p[data-placeholder]').first();
  await input.waitFor({ state: 'visible', timeout: 20000 });
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
    await sendBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }
}

async function generateImage(page, draft, format, prompt, { freshChat, excludeSrcs }) {
  const now      = new Date();
  const dateStr  = draft.date || now.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const filename   = `${dateStr}_${format}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`\nGenerando imagen ${format.toUpperCase()}...`);

  await sendPromptInProject(page, prompt, { freshChat });
  const imgUrl = await waitForGeneratedImage(page, excludeSrcs);
  await downloadImage(page, imgUrl, outputPath);

  return { filename, imgUrl };
}

function gitPushImages(postFile, storyFile) {
  const repoRoot = path.resolve('.');
  const run = (cmd) => execSync(cmd, { cwd: repoRoot, stdio: 'pipe' }).toString().trim();

  try {
    run('git add "Renders/Daily News/"');
    const status = run('git status --porcelain');
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
  const updated = {
    ...draft,
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
  if (draft.imagePost) {
    console.log('El draft ya tiene imágenes. Nada que hacer.');
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
  const chosenStyle  = pickStyle(styleHistory);
  console.log(`Estilo del día: ${chosenStyle.label} (${chosenStyle.id})`);

  try {
    const postPrompt = buildPrompt(draft, mentioned, chosenStyle);
    const { filename: postFile, imgUrl: postImgUrl } = await generateImage(
      page, draft, 'post', postPrompt, { freshChat: true, excludeSrcs: [] }
    );

    const storyPrompt = buildResizePrompt();
    const { filename: storyFile } = await generateImage(
      page, draft, 'story', storyPrompt, { freshChat: false, excludeSrcs: [postImgUrl] }
    );

    await updateDraft(draft, postFile, storyFile);
    await saveStyleHistory(chosenStyle.id, dateStr, styleHistory);
    gitPushImages(postFile, storyFile);

    console.log('\n✓ Listo.');
    console.log('  Post: ', postFile);
    console.log('  Story:', storyFile);
    console.log('  Estilo guardado en Firestore.');
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
