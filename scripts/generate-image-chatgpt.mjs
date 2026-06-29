/**
 * Genera imágenes para la noticia diaria de Top Secret FC usando ChatGPT.
 * Usa el proyecto "TOP Secret FC" en ChatGPT, que tiene subidos el logo,
 * uniformes y renders de jugadores (T3-Frentes). Conecta al Chrome del
 * usuario via CDP en localhost:9222.
 *
 * Uso: node scripts/generate-image-chatgpt.mjs
 */

import { chromium } from 'playwright';
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

function buildPrompt(draft, format, mentionedPlayers) {
  const isStory  = format === 'story';
  const category = draft.category || 'Análisis';

  const dimensions = isStory
    ? '941x1672 (vertical/portrait, formato historia)'
    : '1086x1448 (ligeramente vertical, formato post)';

  const categoryInstructions = {
    'Resultado': `
- Ambiente: celebración, victoria/derrota futbolística, estadio nocturno con luces
- Si hay jugadores del plantel mencionados, ponelos en posición heroica/activa`,
    'Análisis': `
- Ambiente: sala de análisis táctica, pizarrón, profesionalismo técnico
- Composición editorial seria y elegante`,
    'Fixture': `
- Ambiente: anticipación, luces de estadio, tensión previa al partido
- Composición que transmita expectativa`,
    'Selección': `
- Ambiente: orgullo nacional argentino, celeste y blanco
- Podés mezclar los colores nacionales con el negro/dorado del club`,
    'Institución': `
- Ambiente: anuncio institucional, élite, organización profesional
- Foco en la identidad del club`,
  };
  const catInstr = categoryInstructions[category] || categoryInstructions['Análisis'];

  let playerInstr = '';
  if (mentionedPlayers.length > 0) {
    playerInstr = `
JUGADORES A DESTACAR (usá sus renders del proyecto):
${mentionedPlayers.map(p => `- ${p}`).join('\n')}
Incorporá su imagen de forma creativa y editorial, con el uniforme negro/dorado del club.`;
  } else {
    playerInstr = `
No hay jugadores específicos para destacar. Usá el uniforme del club como elemento visual
junto al logo. Podés usar siluetas o composición abstracta deportiva.`;
  }

  return `Creá una imagen editorial para el club de fútbol virtual argentino Top Secret FC.

SPECS TÉCNICAS:
- Dimensiones: ${dimensions}
- Fondo negro profundo (#0a0b0e)
- Acentos y detalles dorados (#C8A84B)
- NO incluyas texto en la imagen
- NO incluyas escudos o logos de otros clubes

IDENTIDAD VISUAL (usá los archivos del proyecto):
- Logo: usá el logo de Top Secret FC (blanco o versión completa según conveniencia)
- Uniforme: negro con detalles dorados (disponible en el proyecto)
- Estilo: editorial deportivo moderno, oscuro, minimalista, de élite
${catInstr}
${playerInstr}

CONTEXTO DE LA NOTA:
"${draft.title}"

La imagen debe transmitir identidad élite y profesional. Que se vea como la portada de una revista deportiva de primer nivel.`;
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
  const artNow   = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const hh       = String(artNow.getHours()).padStart(2, '0');
  const mm       = String(artNow.getMinutes()).padStart(2, '0');
  const filename   = `${dateStr}_${hh}${mm}_${format}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`\nGenerando imagen ${format.toUpperCase()}...`);
  const prompt = buildPrompt(draft, format, mentionedPlayers);

  await sendPromptInProject(page, prompt);
  const imgUrl = await waitForGeneratedImage(page);
  await downloadImage(page, imgUrl, outputPath);

  return filename;
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

    console.log('\n✓ Listo.');
    console.log('  Post: ', postFile);
    console.log('  Story:', storyFile);
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
