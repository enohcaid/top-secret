#!/usr/bin/env node
// Publica un video vertical en YouTube (Short), X o TikTok desde el Chrome con CDP (scripts/abrir-chrome-chatgpt.ps1),
// que tiene las sesiones del club. Instagram y Facebook van por la API: scripts/meta.mjs (ig-reel / fb-video).
//
//   node scripts/publicar-video.mjs youtube <video.mp4> --titulo "…" --texto "…"
//   node scripts/publicar-video.mjs x       <video.mp4> --texto "…"
//   node scripts/publicar-video.mjs tiktok  <video.mp4> --texto "…" [--hashtags "A,B,C"]
//
// Selectores y trampas: docs/conocimiento/reference_publicar_redes.md. La música va pegada al archivo (trap libre).
// Deja capturas en fuentes/redes/pub-<red>-*.png para revisar.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const [red, archivo] = argv;
const TITULO = opt('--titulo'), TEXTO = (opt('--texto') || '').replace(/\\n/g, '\n');
const HASHTAGS = (opt('--hashtags') || '').split(',').map(s => s.trim()).filter(Boolean);
const VIDEO = path.resolve(archivo || '');
if (!['youtube', 'x', 'tiktok'].includes(red) || !fs.existsSync(VIDEO)) {
  console.error('uso: node scripts/publicar-video.mjs youtube|x|tiktok <video.mp4> --texto "…" [--titulo "…"] [--hashtags "A,B"]');
  process.exit(1);
}
const SHOTS = path.resolve('fuentes/redes'); fs.mkdirSync(SHOTS, { recursive: true });
const YT_CANAL = 'UCEKzzKDMMPri12Q3E9S7IVw';   // TOP Secret FC (el perfil también tiene el canal personal de Juan)

const b = await chromium.connectOverCDP('http://localhost:9222', { timeout: 20000 });
const ctx = b.contexts()[0];
const p = await ctx.newPage();
const shot = n => p.screenshot({ path: path.join(SHOTS, `pub-${red}-${n}.png`) }).catch(() => {});
const espera = ms => p.waitForTimeout(ms);

try {
  if (red === 'youtube') {
    if (!TITULO) throw new Error('falta --titulo');
    await p.goto(`https://studio.youtube.com/channel/${YT_CANAL}/videos/upload?d=ud`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await espera(6000);
    await p.locator('input[type=file]').first().setInputFiles(VIDEO);
    await espera(12000);
    const boxes = p.locator('#textbox');
    await boxes.nth(0).click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete');
    await boxes.nth(0).type(TITULO, { delay: 5 });
    await boxes.nth(1).click(); await boxes.nth(1).type(TEXTO, { delay: 2 });
    await espera(1000);
    await p.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').click();
    await espera(800);
    for (let i = 0; i < 3; i++) { await p.locator('#next-button').click(); await espera(2500); }
    await p.locator('tp-yt-paper-radio-button[name="PUBLIC"]').click();
    await espera(1500);
    const link = await p.evaluate(() => [...document.querySelectorAll('a')].map(a => a.href).find(h => /youtube\.com\/shorts\/|youtu\.be\//.test(h)) || '');
    await shot('1');
    await p.locator('#done-button').click();
    await espera(8000);
    await shot('2');
    console.log('publicado en YouTube:', link);
  }

  if (red === 'x') {
    await p.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await espera(6000);
    await p.locator('[data-testid="tweetTextarea_0"]').first().click();
    await p.keyboard.type(TEXTO, { delay: 5 });
    await p.locator('input[data-testid="fileInput"]').first().setInputFiles(VIDEO);
    // Listo = el botón Postear se habilita (X lo deja deshabilitado mientras procesa el video)
    let listo = false;
    for (let i = 0; i < 100 && !listo; i++) {
      await espera(3000);
      listo = await p.evaluate(() => {
        const bt = document.querySelector('[data-testid="tweetButtonInline"]');
        return !!bt && !bt.disabled && bt.getAttribute('aria-disabled') !== 'true' && !!document.querySelector('[data-testid="attachments"] video');
      });
    }
    await espera(4000);
    await shot('1');
    if (!listo) throw new Error('X no terminó de subir el video');
    // El click normal falla: una capa del header intercepta el puntero
    await p.evaluate(() => document.querySelector('[data-testid="tweetButtonInline"]').click());
    await espera(12000);
    await p.goto('https://x.com/FCTOPSecret', { waitUntil: 'domcontentloaded' }); await espera(8000);
    const posts = await p.evaluate(() => [...document.querySelectorAll('article')].slice(0, 3).map(a => ({
      link: [...a.querySelectorAll('a[href*="/status/"]')].map(x => x.href).find(h => /\/status\/\d+$/.test(h)),
      txt: a.innerText.replace(/\n+/g, ' ').slice(0, 80) })));
    await shot('2');
    console.log('últimos posts de @FCTOPSecret (el primero suele ser el fijado):\n' + posts.map(x => `  ${x.link}  ${x.txt}`).join('\n'));
  }

  if (red === 'tiktok') {
    await p.goto('https://www.tiktok.com/tiktokstudio/upload?from=webapp', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await espera(8000);
    await p.locator('input[type=file]').first().setInputFiles(VIDEO);
    await espera(25000);
    for (const t of ['Cancelar', 'Entendido']) { try { await p.getByRole('button', { name: t, exact: true }).first().click({ timeout: 4000 }); await espera(800); } catch {} }
    await p.evaluate(() => window.scrollTo(0, 0)); await espera(800);
    const ed = p.locator('.public-DraftEditor-content, [contenteditable="true"]').first();
    await ed.click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete');
    await p.keyboard.type(TEXTO.replace(/\n+/g, ' ') + ' ', { delay: 8 });
    for (const h of HASHTAGS) { await p.keyboard.type('#' + h, { delay: 30 }); await espera(1500); await p.keyboard.press('Space'); }
    await espera(1500);
    await shot('1');
    const pub = p.locator('button', { hasText: /^Publicar$/ }).last();
    await pub.scrollIntoViewIfNeeded(); await pub.click();
    await espera(6000);
    for (const t of ['Publicar ahora', 'Publicar de todos modos', 'Entendido']) { try { await p.getByRole('button', { name: t }).first().click({ timeout: 3000 }); await espera(3000); } catch {} }
    await espera(8000);
    await shot('2');
    console.log('TikTok: enviado (queda "en revisión / Solo yo" unos minutos). URL actual:', p.url());
  }
} finally {
  await p.close().catch(() => {});   // nunca browser.close(): es el Chrome persistente del pipeline
}
process.exit(0);
