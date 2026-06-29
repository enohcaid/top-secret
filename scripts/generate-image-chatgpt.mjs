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

const FIRESTORE_DRAFT = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
const OUTPUT_DIR      = path.resolve('Renders/Daily News');
const PROJECT_URL     = 'https://chatgpt.com/g/g-p-6a420887ce04819182396abfcbd40400/';

// Jugadores con renders disponibles en el proyecto (T3-Frentes)
const PLAYERS_WITH_RENDERS = [
  'CipriMancini', 'Guiidow', 'Huber236', 'Juan_Martinez4',
  'Lautavester7', 'rivarola90', 'slandaco9', 'zPibu__',
];

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

  if (is(/baja|lesion|lesionad|indefinid|reposo|contractura|distens|sobrecarga/)) {
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

  // Default: institutional / generic editorial
  return {
    scene: 'elite Argentine esports football club, prestige and professionalism, dark cinematic atmosphere',
    action: players
      ? `${players} in powerful editorial portrait pose, dominant club identity`
      : 'Top Secret FC club crest and uniform as hero visual, sleek dark editorial design',
  };
}

function buildPrompt(draft, format, mentionedPlayers) {
  const isStory  = format === 'story';
  const { scene, action } = buildScene(draft, mentionedPlayers);

  // Branding strip: bottom for post (player fills top), top for story (player fills center-bottom)
  const brandPosition = isStory ? 'en la parte SUPERIOR' : 'en la parte INFERIOR';
  const dimensions    = isStory
    ? '941x1672 (vertical/portrait, formato historia)'
    : '1086x1448 (ligeramente vertical, formato post)';

  const playerBlock = mentionedPlayers.length > 0
    ? `JUGADORES (usá sus renders subidos al proyecto):
${mentionedPlayers.map(p => `- ${p}: ${action}`).join('\n')}`
    : `Sin jugadores específicos:
${action}`;

  return `Creá una imagen editorial deportiva para Top Secret FC, club de fútbol virtual argentino.

═══ SPECS TÉCNICAS ═══
- Dimensiones: ${dimensions}
- Fondo negro profundo (#0a0b0e), acentos dorados (#C8A84B)
- Estilo: editorial deportivo de élite, oscuro, cinematográfico, como portada de revista deportiva

═══ ELEMENTO DE MARCA FIJO (siempre igual en todas las imágenes) ═══
${brandPosition} de la imagen, incluí una franja horizontal delgada con:
  • Fondo negro (#0a0b0e) con un borde/línea fina dorada (#C8A84B) separándola del resto
  • Texto en tipografía condensada, mayúsculas, dorada: "NOTICIAS | TOP SECRET FC"
  • Estilo limpio y profesional — como los banners de ESPN o Fox Sports pero con identidad oscura de élite
  • Podés sumar el logo pequeño del club al costado del texto si mejora la composición

═══ ESCENA Y ACCIÓN ═══
Atmósfera: ${scene}
${playerBlock}

═══ IDENTIDAD VISUAL (usá los archivos del proyecto) ═══
- Logo Top Secret FC: incluilo de forma natural en la composición
- Uniforme negro con detalles dorados del club
- NO incluyas escudos ni logos de otros clubes
- El logo/escudo del club SÍ debe aparecer (además de la franja de marca)

═══ CONTEXTO DE LA NOTA ═══
"${draft.title}"

La imagen tiene que contar visualmente de qué trata la nota. Que un hincha la vea y entienda el tema sin leer nada.`;
}

async function waitForGeneratedImage(page) {
  console.log('  Esperando imagen (hasta 6 min)...');
  page.setDefaultTimeout(0);

  await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug-after-send.png'), fullPage: false });

  const TIMEOUT_MS = 6 * 60 * 1000;
  const POLL_MS    = 4000;
  const start      = Date.now();

  while (Date.now() - start < TIMEOUT_MS) {
    const imgSrc = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')].reverse();
      for (const img of imgs) {
        const src = img.src || '';
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
    });

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

async function sendPromptInProject(page, prompt) {
  // Navigate to the Top Secret FC project
  await page.goto(PROJECT_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // The project page has a chat input — same contenteditable as regular chats
  const input = page.locator('div[contenteditable="true"], p[data-placeholder]').first();
  await input.waitFor({ state: 'visible', timeout: 20000 });
  await input.click();
  await page.waitForTimeout(500);

  // Clear any existing text and type the prompt
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(200);
  await input.type(prompt, { delay: 3 });
  await page.waitForTimeout(800);

  // Send
  const sendBtn = page.locator('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Enviar"]').first();
  if (await sendBtn.count() > 0) {
    await sendBtn.click();
  } else {
    await input.press('Enter');
  }
}

async function generateImage(page, draft, format, mentionedPlayers) {
  const now      = new Date();
  const dateStr  = draft.date || now.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const filename   = `${dateStr}_${format}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`\nGenerando imagen ${format.toUpperCase()}...`);
  const prompt = buildPrompt(draft, format, mentionedPlayers);

  await sendPromptInProject(page, prompt);
  const imgUrl = await waitForGeneratedImage(page);
  await downloadImage(page, imgUrl, outputPath);

  return filename;
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

  const mentioned = extractMentionedPlayers(draft);
  if (mentioned.length > 0) {
    console.log('Jugadores mencionados con renders:', mentioned.join(', '));
  } else {
    console.log('Sin jugadores específicos — composición institucional.');
  }

  console.log('Conectando al Chrome abierto...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];

  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) {
    page = await context.newPage();
  }
  page.setDefaultTimeout(0);
  console.log('Conectado.');

  try {
    const postFile  = await generateImage(page, draft, 'post', mentioned);
    const storyFile = await generateImage(page, draft, 'story', mentioned);
    await updateDraft(draft, postFile, storyFile);
    gitPushImages(postFile, storyFile);

    console.log('\n✓ Listo.');
    console.log('  Post: ', postFile);
    console.log('  Story:', storyFile);
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
