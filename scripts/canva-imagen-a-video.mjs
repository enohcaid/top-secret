#!/usr/bin/env node
/**
 * Convierte una imagen en un video de 5 s con la herramienta "Imagen a video" de Canva,
 * manejando el Chrome con CDP (el mismo de ChatGPT: scripts/abrir-chrome-chatgpt.ps1,
 * con la sesión de Canva iniciada).
 *
 *   node scripts/canva-imagen-a-video.mjs <imagen> [--prompt "movimiento" | --inteligente] [--out salida.mp4] [--r2 clave/en/r2.mp4]
 *
 * - Sin --prompt usa PROMPT_SEGURO (modo "Personalizar"). Con --inteligente deja que Canva decida.
 * - Con --prompt propio: pedir SOLO movimiento de cámara y de luz (evitar la palabra humo),
 *   y decir que las personas posan "inmóviles como estatuas, con la boca cerrada".
 *   Probado 2026-09-30: si el prompt menciona humo (aunque sea del fondo) o "respirar", los
 *   jugadores terminan exhalando nubes de humo por la boca. PROMPT_SEGURO dio el mejor resultado.
 * - Sin --prompt (modo Inteligente) también generó humo saliendo de la boca en la portada de kits.
 * - El video sale con la proporción de la imagen (p. ej. 1536x1024 → 1152x768), 30 fps.
 * - Reusa siempre el mismo diseño de Canva (guardado en scripts/.canva-design.json) para no
 *   crear uno nuevo por video. Cada imagen queda además en "Subidos" de Canva.
 * - Cada generación consume créditos de IA de Canva.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { putFile } from './lib/r2.mjs';

export const PROMPT_SEGURO = 'Travelling de cámara muy lento hacia adelante, estilo publicidad deportiva de alta gama. La iluminación se mantiene estable. Las personas posan inmóviles como estatuas, con la boca cerrada.';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const PROMPT = opt('--prompt') ?? (argv.includes('--inteligente') ? null : PROMPT_SEGURO);
if (argv.includes('--inteligente')) argv.splice(argv.indexOf('--inteligente'), 1);
const R2KEY = opt('--r2');
const IMG = argv[0];
const OUT = opt('--out') || (IMG && IMG.replace(/\.[a-z]+$/i, '') + '.mp4');
if (!IMG || !fs.existsSync(IMG)) { console.error('Uso: node scripts/canva-imagen-a-video.mjs <imagen> [--prompt "..."] [--out x.mp4] [--r2 clave.mp4]'); process.exit(1); }

const DESIGN_FILE = path.resolve('scripts/.canva-design.json');
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
page.setDefaultTimeout(60000);

try {
  // 1. Diseño de trabajo (se crea una sola vez).
  let designUrl = fs.existsSync(DESIGN_FILE) ? JSON.parse(fs.readFileSync(DESIGN_FILE, 'utf8')).url : null;
  await page.goto(designUrl || 'https://www.canva.com/design?create=true&width=1920&height=1080&units=px', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/design\/.+\/edit/, { timeout: 90000 });
  if (/login/.test(page.url())) throw new Error('Canva no tiene la sesión iniciada en este Chrome.');
  if (!designUrl) { designUrl = page.url(); fs.writeFileSync(DESIGN_FILE, JSON.stringify({ url: designUrl }, null, 2)); log('diseño de trabajo creado', designUrl); }
  await page.waitForTimeout(6000);

  // 2. Vaciar la página (videos/imágenes de corridas anteriores).
  await page.mouse.click(1170, 500);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(1000);

  // 3. Subir la imagen y agregarla (la subida nueva aparece primera en "Subidos").
  await page.getByText('Subidos', { exact: true }).first().click();
  await page.waitForTimeout(2500);
  const before = await page.evaluate(() => [...document.querySelectorAll('img')].map(i => i.src));
  await page.locator('input[type=file]').first().setInputFiles(path.resolve(IMG));
  log('subiendo', path.basename(IMG));
  let thumb = null;
  for (let i = 0; i < 60 && !thumb; i++) {
    await page.waitForTimeout(2000);
    thumb = await page.evaluate(prev => {
      const imgs = [...document.querySelectorAll('img')].filter(i => { const r = i.getBoundingClientRect(); return r.left < 430 && r.top > 250 && r.width > 50 && !prev.includes(i.src); });
      imgs.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      const r = imgs[0]?.getBoundingClientRect();
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    }, before);
  }
  if (!thumb) throw new Error('No apareció la miniatura de la imagen subida.');
  await page.mouse.click(thumb.x, thumb.y);
  await page.waitForTimeout(4000);

  // 4. Seleccionada la imagen: Editar → Imagen a video.
  const editar = page.locator('button:visible', { hasText: /^Editar$/ });
  const n = await editar.count();
  let clicked = false;
  for (let i = 0; i < n && !clicked; i++) {
    const bb = await editar.nth(i).boundingBox();
    if (bb && bb.y > 60 && bb.y < 130 && bb.x > 450) { await editar.nth(i).click(); clicked = true; }
  }
  if (!clicked) throw new Error('No encontré el botón "Editar" de la imagen.');
  await page.waitForTimeout(3000);
  await page.getByText('Imagen a video', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  // 5. Generar.
  const prevVideos = await page.evaluate(() => [...document.querySelectorAll('video')].map(v => v.currentSrc || v.src));
  if (PROMPT) {
    await page.getByText('Personalizar', { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await page.getByPlaceholder('Describí el efecto de movimiento ideal').fill(PROMPT);
    await page.waitForTimeout(800);
  }
  await page.locator('button:visible', { hasText: 'Generar video de 5 segundos' }).first().click();
  log('generando', PROMPT ? '(personalizado)' : '(inteligente)');
  let src = null;
  for (let i = 0; i < 60 && !src; i++) {
    await page.waitForTimeout(5000);
    src = await page.evaluate(prev => [...document.querySelectorAll('video')].map(v => v.currentSrc || v.src)
      .find(s => s && s.includes('ingredient-generation') && !prev.includes(s)), prevVideos);
  }
  if (!src) throw new Error('Canva no devolvió el video (¿sin créditos o error de generación?).');

  // 6. Descargar (y subir a R2 si se pidió).
  const res = await fetch(src);
  if (!res.ok) throw new Error('Descarga falló: HTTP ' + res.status);
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, Buffer.from(await res.arrayBuffer()));
  log('video guardado', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB');
  if (R2KEY) { await putFile(OUT, R2KEY, 'video/mp4'); log('subido a R2', R2KEY); }
} finally {
  await page.close().catch(() => {});
}
process.exit(0);
