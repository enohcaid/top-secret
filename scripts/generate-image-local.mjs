/**
 * Genera las imágenes (post 4:5 + story 9:16) de la noticia diaria de
 * Top Secret FC con ComfyUI local (Qwen-Image-2.1), reemplazando el
 * pipeline anterior basado en ChatGPT vía Chrome/CDP
 * (scripts/generate-image-chatgpt.mjs — se conserva como referencia,
 * no se borra).
 *
 * Reutiliza de ese archivo TODO lo que es independiente del motor de
 * generación: sistema de marca, rotación de estilos/kit/jugador
 * protagonista, tabla de identidad física por jugador. Lo único nuevo acá
 * es CÓMO se genera la imagen (comfyui-client.mjs) y CÓMO se redacta el
 * prompt para ese motor (más directivo, no la prosa persuasiva armada para
 * ChatGPT).
 *
 * Uso:
 *   node scripts/generate-image-local.mjs                              # automático
 *   node scripts/generate-image-local.mjs --review                    # loop de revisión interactiva
 *   node scripts/generate-image-local.mjs --review --feedback "texto"  # revisión con dirección inicial
 *   node scripts/generate-image-local.mjs --force                     # regenerar sin loop
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import { pathToFileURL } from 'url';
import sharp from 'sharp';

import * as comfy from './comfyui-client.mjs';
import {
  IMAGE_STYLES, KIT_COLORS, cropKitImage, pickKitColor, fetchKitHistory, saveKitHistory,
  T3_FRENTES_DIR, PLAYERS_WITH_RENDERS, PLAYER_TRAITS,
  CREST_PATH, brandFormatBlock,
  pickStyle, fetchStyleHistory, saveStyleHistory,
  extractMentionedPlayers, selectFeaturedPlayers, fetchFeaturedHistory, saveFeaturedHistory,
  uploadImagesToR2, fetchJerseyOverrides,
} from './generate-image-chatgpt.mjs';

const WORKER_BASE      = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const FIRESTORE_DRAFT   = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
const OUTPUT_DIR        = path.resolve('Renders/Daily News');
function r2MediaUrl(relPath) {
  return `${WORKER_BASE}/media/${relPath.split('/').map(encodeURIComponent).join('/')}`;
}

// EditPlus solo acepta hasta 3 imágenes de referencia por generación
// (image1/image2/image3). El escudo y el kit del día ocupan 2 — queda un
// solo lugar para jugador protagonista, así que acá el máximo es 1 (antes,
// con ChatGPT, podían ser hasta 3 jugadores en escena). Decisión tomada al
// migrar (25/9/2026): simplificación aceptada, no es un límite técnico que
// convenga pelear — mostrar un protagonista por imagen es una composición
// más limpia igual.
const MAX_FEATURED_PLAYERS_IMAGE = 1;

const POST_WIDTH   = 1024, POST_HEIGHT   = 1280; // 4:5 exacto
const STORY_WIDTH  = 1024, STORY_HEIGHT  = 1824; // 9:16 (0.561, target 0.5625)
const STEPS = 25, CFG = 1;

// ── CLI flags ─────────────────────────────────────────────────────────────
const _args         = process.argv.slice(2);
const FLAG_FORCE    = _args.includes('--force') || _args.includes('--review');
const FLAG_REVIEW   = _args.includes('--review');
const _fbIdx        = _args.indexOf('--feedback');
const FLAG_FEEDBACK = _fbIdx >= 0 ? _args[_fbIdx + 1] : null;
const MAX_ATTEMPTS  = 3; // reintentos por falla TÉCNICA (ComfyUI caído, timeout), no de contenido

let JERSEY_OVERRIDES = {};
function playerIdentityLine(p) {
  const t = PLAYER_TRAITS[p];
  if (!t) return `- ${p}`;
  const dorsalNum = JERSEY_OVERRIDES[p] ?? t.dorsal;
  const dorsal = dorsalNum !== null && dorsalNum !== undefined
    ? `dorsal ${dorsalNum}, nombre "${p.toUpperCase()}" en la camiseta`
    : 'dorsal no confirmado — no le muestres número ni nombre en la espalda';
  return `${p}: ${t.desc}. ${dorsal}.`;
}

async function fetchDraft() {
  const res = await fetch(FIRESTORE_DRAFT);
  const doc = await res.json();
  if (doc.error) throw new Error('No hay draft en Firestore: ' + doc.error.message);
  return JSON.parse(doc.fields.data.stringValue);
}

// Misma heurística tema→escena que el pipeline anterior (buildScene en
// generate-image-chatgpt.mjs), pero devuelta en frases cortas — acá no hace
// falta convencer a nadie de nada, el modelo local sigue directivas
// concretas mejor que prosa larga.
function sceneForDraft(draft, hasPlayer) {
  if (draft.imageBrief && draft.imageBrief.trim().length > 10) return draft.imageBrief.trim();

  const title = draft.title || '';
  const full  = (title + ' ' + (draft.body || []).join(' ')).toLowerCase();
  const is = (re) => re.test(full);
  const who = hasPlayer ? 'the player from image3' : 'the club';

  if (is(/victoria|triunfo|ganamos|goleada/)) return `${who} celebrating a goal, arms raised, explosive stadium energy, night match lights`;
  if (is(/derrota|perdimos|ca[ií]da/))        return `${who} seated on the pitch after a defeat, head down, low golden light, quiet stadium`;
  if (is(/baja|lesion|reposo|contractura/))    return `${who} sidelined with a visible injury, seated on the bench, medical tape, determined expression`;
  if (is(/entrevista|mano a mano|nos cont[oó]/)) return `${who} in a confident press-interview pose, direct eye contact, training-ground backdrop`;
  if (is(/candidato|refuerzo|evaluac|ficha/))  return `${who} being scouted on a floodlit training pitch, coaches with clipboards observing`;
  if (is(/selecci[oó]n|mundial|albiceleste/))  return `${who} with Argentine national pride elements, blue and white accents mixed into the dark editorial look`;
  if (is(/fixture|rival|pr[oó]ximo|enfrenta/)) return `${who} walking out of the tunnel, focused, stadium lights ahead, pre-match tension`;
  return `${who} in a powerful editorial portrait, dominant and professional`;
}

function buildPositivePrompt(draft, style, kit, featuredPlayer, hasPlayer, correction) {
  const code = `TS-${draft.date || ''}`;
  const scene = sceneForDraft(draft, hasPlayer);

  const playerBlock = hasPlayer
    ? `image3 is a reference photo of one of our players — reproduce THEIR face, hair, skin and accessories exactly as shown, do not invent a different person. ${playerIdentityLine(featuredPlayer)} Their jersey must match image2 exactly (same colors, same AIA sponsor print, same Nike swoosh) — do not recolor it.
EXACTLY ONE person in the whole image — this single player, nobody else. Do not add a second player, teammate, rival, coach or any other human figure, not even out of focus or in the background.`
    : `ZERO people in this image — institutional composition built only from image1 (crest) and image2 (kit). No invented people, no silhouettes, nobody at all.`;

  return `Editorial sports photo for "Top Secret FC", a dark, classified-dossier visual system.

REFERENCES (use them, don't just take inspiration — reproduce their exact design):
- image1: the club crest. Reproduce it exactly (circular badge, spy with fedora hat and sunglasses, "TOP SECRET" / "FOOTBALL CLUB" text) wherever the crest appears in the scene.
- image2: today's jersey (${kit.label} kit) — ${kit.desc} Reproduce this exact jersey design wherever a jersey appears.
${hasPlayer ? '- image3: the featured player — reproduce their face and physical traits exactly.' : ''}

${playerBlock}

SCENE: ${scene}

BRAND SYSTEM (always, every image):
- Dark carbon-black background, subtle archive-paper texture, film grain, no bright gradients or generic stadium glow.
- A stamped "TOP SECRET" ink watermark, worn/desaturated, integrated into the composition once.
- A small dossier tag reading "${code}" in typewriter type near one edge.
- Headline typography: bold stencil/condensed uppercase for the title, monospace/typewriter for secondary text.
- One single accent color for this piece: ${style.palette}
- The crest (image1) appears small and discreet in a corner.
- Forbidden: particle explosions, colored smoke or light flares, generic AI-poster look, real-club logos or sponsors other than "AIA" and Nike.

TODAY'S PIECE: ${style.prompt}

⚠️ Do NOT render any large headline, title or caption text anywhere in the image (not at the top, not at the bottom, not centered) — a headline will be composited separately afterward. The ONLY text allowed in the image is the small stamped "TOP SECRET" watermark and the small dossier tag — nothing else, no big words.

Do not add any extra people, logos or text beyond what's described above.${correction ? `

CORRECTION FROM THE PREVIOUS ATTEMPT — fix this specifically, keep everything else the same:
"${correction}"` : ''}`;
}

const NEGATIVE_PROMPT = 'blurry, low quality, watermark text garbled, extra limbs, deformed hands, mirrored or reversed digits, generic stadium poster, lens flare, particle explosion, real club crest, wrong sponsor logo, second person, extra people, crowd, background figures, multiple players, large headline text, big title caption, large bold words, magazine cover title';

// El modelo de difusión es poco confiable para texto largo (probado
// 25/9/2026: el titular salía bien solo en la primera palabra) — el título
// se compone APARTE con Sharp/texto vectorial, siempre legible y bien
// escrito, en vez de pedírselo al modelo.
function wrapText(text, maxCharsPerLine) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function compositeHeadline(imagePath, title, accentHex) {
  const img = sharp(imagePath);
  const { width, height } = await img.metadata();
  const fontSize = Math.round(width * 0.075);
  const lineHeight = fontSize * 1.05;
  const maxCharsPerLine = Math.round(width / (fontSize * 0.62));
  const lines = wrapText(title.toUpperCase(), maxCharsPerLine).slice(0, 3); // 3 líneas como máximo

  const scrimHeight = Math.round(height * 0.30);
  const padLeft = Math.round(width * 0.06);
  const textBlockHeight = lines.length * lineHeight;
  const firstBaselineY = height - Math.round(height * 0.07) - textBlockHeight + fontSize;

  const textSpans = lines.map((line, i) =>
    `<text x="${padLeft}" y="${firstBaselineY + i * lineHeight}" font-family="Stencil, Impact, 'Arial Black', sans-serif" font-size="${fontSize}" fill="${accentHex}" stroke="#000000" stroke-width="${Math.round(fontSize * 0.04)}" paint-order="stroke">${escapeXml(line)}</text>`
  ).join('\n');

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#000000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.82" />
      </linearGradient>
    </defs>
    <rect x="0" y="${height - scrimHeight}" width="${width}" height="${scrimHeight}" fill="url(#scrim)" />
    ${textSpans}
  </svg>`;

  await img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toFile(imagePath + '.tmp.png');
  fs.renameSync(imagePath + '.tmp.png', imagePath);
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openImage(absPath) {
  execSync(`start "" "${absPath}"`, { stdio: 'ignore' });
}

async function askYesNo(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim().toLowerCase() === 's'); }));
}
async function askInput(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()); }));
}

async function updateDraft(draft, postFile, storyFile) {
  let fresh = draft;
  try { fresh = await fetchDraft(); } catch {}
  if (fresh.date !== draft.date || fresh.id !== draft.id) {
    console.log('El draft cambió durante la generación — no se actualiza Firestore.');
    return;
  }
  const updated = {
    ...fresh,
    imagePost:  r2MediaUrl(`Renders/Daily News/${postFile}`),
    imageStory: r2MediaUrl(`Renders/Daily News/${storyFile}`),
    image:      r2MediaUrl(`Renders/Daily News/${postFile}`),
  };
  await fetch(FIRESTORE_DRAFT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(updated) } } }),
  });
  console.log('Draft actualizado en Firestore.');
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  JERSEY_OVERRIDES = await fetchJerseyOverrides();

  console.log('Leyendo draft...');
  const draft = await fetchDraft();
  console.log('Título:', draft.title);

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  if (draft.date !== today) {
    console.log(`Draft es de ${draft.date}, no de hoy (${today}).`);
    return;
  }
  if (draft.imagePost && !FLAG_FORCE) {
    console.log('El draft ya tiene imágenes. Usá --force o --review para regenerar.');
    return;
  }

  const allMentioned    = extractMentionedPlayers(draft);
  const featuredHistory = await fetchFeaturedHistory();
  const featuredPlayer  = selectFeaturedPlayers(allMentioned, featuredHistory).slice(0, MAX_FEATURED_PLAYERS_IMAGE)[0] || null;
  const hasPlayer       = !!featuredPlayer;
  if (hasPlayer) console.log('Jugador protagonista:', featuredPlayer);
  else console.log('Sin jugador protagonista — composición institucional.');

  const styleHistory = await fetchStyleHistory();
  const chosenStyle  = pickStyle(styleHistory, draft);
  const kitHistory   = await fetchKitHistory();
  const chosenKit    = pickKitColor(kitHistory);
  const kitCropPath  = await cropKitImage(chosenKit.id);
  console.log(`Estilo: ${chosenStyle.label} · Kit: ${chosenKit.label}`);

  const dateStr  = draft.date;
  const fileSlug = (draft.id || dateStr).replace(/[^a-zA-Z0-9_-]/g, '-');

  const referenceImagePaths = [CREST_PATH, kitCropPath];
  if (hasPlayer) {
    const png = path.join(T3_FRENTES_DIR, `${featuredPlayer}.png`);
    const jpg = path.join(T3_FRENTES_DIR, `${featuredPlayer}.jpg`);
    referenceImagePaths.push(fs.existsSync(png) ? png : jpg);
  }

  const comfyState = await comfy.ensureRunning();
  let correction = FLAG_FEEDBACK;
  let seed = Math.floor(Math.random() * 1e9);
  let postFile, storyFile;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) console.log(`Intento ${attempt}/${MAX_ATTEMPTS}...`);
      const positivePrompt = buildPositivePrompt(draft, chosenStyle, chosenKit, featuredPlayer, hasPlayer, correction);

      postFile  = `${fileSlug}_post.png`;
      storyFile = `${fileSlug}_story.png`;

      const accentMatch = chosenStyle.palette.match(/#[0-9A-Fa-f]{6}/);
      const accentHex = accentMatch ? accentMatch[0] : '#C8A84B';

      try {
        console.log('Generando post (4:5)...');
        const postPrefix = `daily_${fileSlug}_post`;
        const postPath = path.join(OUTPUT_DIR, postFile);
        await comfy.generateImage({
          positivePrompt, negativePrompt: NEGATIVE_PROMPT, referenceImagePaths,
          width: POST_WIDTH, height: POST_HEIGHT, seed, steps: STEPS, cfg: CFG,
          filenamePrefix: postPrefix,
          outputPath: postPath,
        });
        comfy.purgeOutputFile(postPrefix); // ya está guardada en Renders/Daily News — no dejar la copia de ComfyUI
        await compositeHeadline(postPath, draft.title, accentHex);

        console.log('Generando story (9:16)...');
        const storyPrefix = `daily_${fileSlug}_story`;
        const storyPath = path.join(OUTPUT_DIR, storyFile);
        await comfy.generateImage({
          positivePrompt, negativePrompt: NEGATIVE_PROMPT, referenceImagePaths,
          width: STORY_WIDTH, height: STORY_HEIGHT, seed, steps: STEPS, cfg: CFG,
          filenamePrefix: storyPrefix,
          outputPath: storyPath,
        });
        comfy.purgeOutputFile(storyPrefix);
        await compositeHeadline(storyPath, draft.title, accentHex);
      } catch (genErr) {
        console.log(`Error técnico (intento ${attempt}/${MAX_ATTEMPTS}): ${genErr.message.split('\n')[0]}`);
        if (attempt === MAX_ATTEMPTS) throw genErr;
        continue;
      }

      if (FLAG_REVIEW) {
        console.log(`\nPost:  Renders/Daily News/${postFile}`);
        console.log(`Story: Renders/Daily News/${storyFile}`);
        openImage(path.join(OUTPUT_DIR, postFile));
        const ok = await askYesNo('\n¿Las imágenes están bien? [s/N]: ');
        if (ok) break;
        correction = await askInput('¿Qué corregir para la próxima versión?: ');
        seed = Math.floor(Math.random() * 1e9); // nueva corrida, nueva semilla
        if (attempt === MAX_ATTEMPTS) console.log('Máximo de intentos — usando esta versión.');
      } else {
        break;
      }
    }

    await updateDraft(draft, postFile, storyFile);
    await saveStyleHistory(chosenStyle.id, dateStr, styleHistory);
    await saveKitHistory(chosenKit.id, dateStr, kitHistory);
    if (hasPlayer) await saveFeaturedHistory([featuredPlayer], dateStr, featuredHistory);
    uploadImagesToR2(postFile, storyFile);

    console.log('\n✓ Listo.');
    console.log('  Post: ', postFile);
    console.log('  Story:', storyFile);
  } finally {
    await comfy.stopIfStartedByUs(comfyState);
  }
}

// Igual criterio que generate-image-chatgpt.mjs: solo corre el pipeline al
// invocar el archivo directamente, para poder importar sus funciones desde
// un test/one-off sin disparar main() (que toca Firestore/R2 reales).
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch(e => { console.error('Error:', e.message); process.exit(1); });
}

export { buildPositivePrompt, compositeHeadline, sceneForDraft, playerIdentityLine, NEGATIVE_PROMPT, POST_WIDTH, POST_HEIGHT, STORY_WIDTH, STORY_HEIGHT };
