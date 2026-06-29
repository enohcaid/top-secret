/**
 * Genera imágenes para la noticia diaria de Top Secret FC usando ChatGPT.
 * Primera vez: abre el browser para que el usuario inicie sesión en ChatGPT.
 * Siguientes veces: usa cookies guardadas automáticamente.
 *
 * Uso: node scripts/generate-image-chatgpt.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const FIRESTORE_DRAFT = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
const OUTPUT_DIR      = path.resolve('Renders/Daily News');
const SESSION_FILE    = path.resolve('scripts/.chatgpt-session.json');

async function fetchDraft() {
  const res  = await fetch(FIRESTORE_DRAFT);
  const doc  = await res.json();
  if (doc.error) throw new Error('No hay draft en Firestore: ' + doc.error.message);
  return JSON.parse(doc.fields.data.stringValue);
}

function buildPrompt(draft, format) {
  const isStory  = format === 'story';
  const category = draft.category || 'Análisis';

  const moods = {
    'Resultado':   'dramatic sports celebration, football pitch atmosphere at night, lights, intensity',
    'Análisis':    'tactical sports analysis, professional football media editorial',
    'Fixture':     'upcoming match anticipation, stadium lights, dramatic atmosphere',
    'Selección':   'Argentine national football, celestial blue and white, national pride and passion',
    'Institución': 'elite esports club announcement, prestige, professional organization',
  };
  const mood = moods[category] || moods['Análisis'];
  const orientation = isStory
    ? 'vertical portrait format 941x1672, tall composition, space at top for title and bottom for logo'
    : 'slightly vertical format 1086x1448, centered bold composition';

  return `Generá una imagen editorial deportiva para el club de fútbol virtual argentino Top Secret FC.

Diseño:
- Fondo negro profundo (#0a0b0e)
- Detalles y acentos dorados (#C8A84B)
- Estilo: editorial deportivo moderno, oscuro, minimalista, de élite
- Atmósfera: ${mood}
- ${orientation}
- NO incluyas texto en la imagen
- NO incluyas escudos de otros clubes

Contexto de la nota: "${draft.title}"

La imagen debe transmitir identidad élite y profesional. Fondo predominantemente negro con toques dorados estratégicos.`;
}

async function waitForGeneratedImage(page) {
  console.log('  Esperando que ChatGPT genere la imagen (hasta 6 min)...');

  // Disable any page-level default timeout so our manual loop controls timing
  page.setDefaultTimeout(0);

  await page.screenshot({ path: 'Renders/Daily News/debug-after-send.png', fullPage: false });

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
      console.log('\n  Imagen detectada en el DOM.');
      return imgSrc;
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`\r  Generando... ${elapsed}s`);
    await page.waitForTimeout(POLL_MS);
  }

  await page.screenshot({ path: 'Renders/Daily News/debug-timeout.png', fullPage: true });
  throw new Error('Timeout (6 min) esperando imagen. Screenshot en debug-timeout.png');
}

async function downloadImage(page, imgUrl, outputPath) {
  if (imgUrl.startsWith('blob:')) {
    // Blob URLs: canvas trick to extract pixels
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

async function sendPromptAndWait(page, prompt) {
  // Navigate to a fresh chat
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Find the visible contenteditable input (ChatGPT uses a hidden fallback textarea + visible div)
  const input = page.locator('div[contenteditable="true"]').first();
  await input.waitFor({ state: 'visible', timeout: 30000 });
  await input.click();
  await page.waitForTimeout(500);

  // Clear and type
  await input.evaluate((el, text) => {
    el.focus();
    el.innerText = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, prompt);

  // Use clipboard paste for reliable input of long text
  await page.evaluate((text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, prompt);
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(200);
  // Type the text directly
  await input.type(prompt, { delay: 5 });
  await page.waitForTimeout(1000);

  // Send
  const sendBtn = page.locator('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Enviar"]').first();
  const hasSendBtn = await sendBtn.count() > 0;
  if (hasSendBtn) {
    await sendBtn.click();
  } else {
    await input.press('Enter');
  }
}

async function generateImage(page, draft, format) {
  const now      = new Date();
  const dateStr  = draft.date || now.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
  const artNow   = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const hh       = String(artNow.getHours()).padStart(2, '0');
  const mm       = String(artNow.getMinutes()).padStart(2, '0');
  const timeStr  = `${hh}${mm}`;
  const filename   = `${dateStr}_${timeStr}_${format}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`\nGenerando imagen ${format.toUpperCase()}...`);
  const prompt = buildPrompt(draft, format);

  await sendPromptAndWait(page, prompt);
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
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  console.log('\nDraft actualizado en Firestore.');
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Leyendo draft...');
  const draft = await fetchDraft();
  console.log('Título:', draft.title);
  console.log('Fecha:', draft.date);

  // Connect to already-running Chrome (launched with --remote-debugging-port=9222)
  console.log('Conectando al Chrome abierto...');
  const browser  = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context  = contexts[0];

  // Use existing page or open new one
  let page = context.pages().find(p => p.url().includes('chatgpt.com'));
  if (!page) {
    page = await context.newPage();
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
  }
  // Disable default timeout so waitForGeneratedImage's manual loop is authoritative
  page.setDefaultTimeout(0);
  console.log('Conectado a ChatGPT.');

  try {
    const postFile  = await generateImage(page, draft, 'post');
    const storyFile = await generateImage(page, draft, 'story');
    await updateDraft(draft, postFile, storyFile);

    console.log('\n✓ Listo.');
    console.log('  Post: ', postFile);
    console.log('  Story:', storyFile);
  } finally {
    await browser.close(); // disconnect only, Chrome keeps running
  }
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
