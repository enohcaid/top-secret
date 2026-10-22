#!/usr/bin/env node
// Publica un carrusel de fotos en TikTok (modo fotos de TikTok Studio) desde el Chrome con CDP, con un tema de trap
// instrumental de la biblioteca de TikTok (pedido de Juan, 2026-10-22: las noticias también salen en TikTok, con
// música de la plataforma). Lo usa scripts/social/publicar.mjs (método 'tiktok-fotos') para la noticia del día.
//
//   node scripts/publicar-tiktok-fotos.mjs <foto1.jpg> [foto2.jpg …] --titulo "…" --texto "…" [--prueba]
//
// --prueba hace todo (sube, escribe, elige el tema) menos Publicar, y descarta el borrador.
// Los temas usados quedan en scripts/tiktok-sonidos-usados.json: no se repite ninguno de los últimos 30.
// Captura en fuentes/redes/pub-tiktok-fotos-*.png.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { asegurarVentana } from './lib/ventana.mjs';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const fin = argv.findIndex(a => a.startsWith('--'));
const FOTOS = (fin < 0 ? argv : argv.slice(0, fin)).map(f => path.resolve(f));
const TITULO = (opt('--titulo') || '').slice(0, 90), TEXTO = (opt('--texto') || '').replace(/\\n/g, '\n');
const PRUEBA = argv.includes('--prueba');
if (!FOTOS.length || FOTOS.some(f => !fs.existsSync(f))) {
  console.error('uso: node scripts/publicar-tiktok-fotos.mjs <foto.jpg…> --titulo "…" --texto "…" [--prueba]');
  process.exit(1);
}
const SHOTS = path.resolve('fuentes/redes'); fs.mkdirSync(SHOTS, { recursive: true });
const USADOS = path.resolve('scripts/tiktok-sonidos-usados.json');
// Búsquedas que rotan; de los resultados se queda con el primer beat instrumental (sin letra: nada de dobles
// sentidos ni temas comerciales cantados) que no se haya usado.
const BUSQUEDAS = ['trap beat instrumental', 'dark trap beat', 'hard trap instrumental', 'trap type beat', 'epic trap beat'];
const usados = (() => { try { return JSON.parse(fs.readFileSync(USADOS, 'utf8')); } catch { return []; } })();

const b = await chromium.connectOverCDP('http://localhost:9222', { timeout: 20000 });
const p = await b.contexts()[0].newPage();
await asegurarVentana(p);
const shot = n => p.screenshot({ path: path.join(SHOTS, `pub-tiktok-fotos-${n}.png`) }).catch(() => {});
const espera = ms => p.waitForTimeout(ms);

try {
  await p.goto('https://www.tiktok.com/tiktokstudio/upload?from=webapp&tab=photo', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await espera(8000);
  // La pestaña Fotos (si la URL no la abrió) y su input, que acepta varias imágenes.
  if (!await p.locator('input[type=file][multiple]').count()) { await p.getByRole('tab', { name: 'Fotos', exact: true }).click(); await espera(3000); }
  await p.locator('input[type=file][multiple]').first().setInputFiles(FOTOS, { timeout: 3 * 60000 });
  await p.waitForURL(/upload\/post\/photo/, { timeout: 60000 });
  await p.locator('input[placeholder="Añade un título llamativo"]').waitFor({ timeout: 60000 });
  await espera(4000);
  for (const t of ['Entendido', 'Cancelar']) { try { await p.locator('[role=dialog]').getByRole('button', { name: t, exact: true }).first().click({ timeout: 3000 }); await espera(800); } catch {} }

  if (TITULO) await p.locator('input[placeholder="Añade un título llamativo"]').fill(TITULO);
  const ed = p.locator('.public-DraftEditor-content, [contenteditable="true"]').first();
  await ed.click(); await p.keyboard.press('Control+A'); await p.keyboard.press('Delete');
  await p.keyboard.type(TEXTO.replace(/\n+/g, ' ') + ' ', { delay: 8 });
  await espera(1500);
  await p.keyboard.press('Escape');   // cierra la sugerencia de hashtags si quedó abierta

  // Sonido
  await p.getByText('Añadir un sonido', { exact: true }).click();
  await espera(4000);
  let elegido = null;
  for (const q of [...BUSQUEDAS.slice(usados.length % BUSQUEDAS.length), ...BUSQUEDAS]) {
    const s = p.locator('input[placeholder="Buscar sonidos"]');
    await s.fill(q); await p.keyboard.press('Enter');
    await espera(5000);
    const items = await p.evaluate(() => [...document.querySelectorAll('.MusicPanelMusicItem__container')].map(e => ({
      titulo: e.querySelector('.MusicPanelMusicItem__infoBasicTitle')?.innerText.trim() || '',
      desc: e.querySelector('.MusicPanelMusicItem__infoBasicDesc')?.innerText.trim() || '' })));
    const i = items.findIndex(it => /beat|instrumental/i.test(it.titulo) && !/original sound|sonido original|remix|lofi|lo-fi/i.test(`${it.titulo} ${it.desc}`)
      && !usados.slice(-30).includes(`${it.titulo} · ${it.desc.replace(/^[\d:]+ · /, '')}`));
    if (i < 0) continue;
    elegido = `${items[i].titulo} · ${items[i].desc.replace(/^[\d:]+ · /, '')}`;
    await p.locator('.MusicPanelMusicItem__container').nth(i).getByRole('button', { name: 'Use' }).click();
    break;
  }
  if (!elegido) throw new Error('No encontré un tema de trap instrumental sin usar en TikTok');
  await espera(4000);
  if (!await p.getByText('Sustituir', { exact: true }).count()) throw new Error('TikTok no tomó el sonido');
  console.log('Sonido:', elegido);
  await shot('1');

  if (PRUEBA) {
    await p.getByRole('button', { name: 'Descartar', exact: true }).last().click();
    await p.locator('[role=dialog]').getByRole('button', { name: 'Descartar cambios' }).click({ timeout: 5000 }).catch(() => {});
    await espera(2000);
    console.log('Prueba: todo listo, no se publicó (borrador descartado).');
  } else {
    const pub = p.locator('[data-e2e="post_video_button"]').or(p.locator('button', { hasText: /^Publicar$/ })).last();
    await pub.scrollIntoViewIfNeeded(); await pub.click();
    await espera(6000);
    for (const t of ['Publicar ahora', 'Publicar de todos modos', 'Entendido']) { try { await p.getByRole('button', { name: t }).first().click({ timeout: 3000 }); await espera(3000); } catch {} }
    await espera(6000);
    await shot('2');
    fs.writeFileSync(USADOS, JSON.stringify([...usados, elegido].slice(-100), null, 1));
    console.log('TikTok: enviado (queda "en revisión" unos minutos). https://www.tiktok.com/@topsecretfc');
  }
} catch (e) {
  await shot('error');
  throw e;
} finally {
  await p.close().catch(() => {});   // nunca browser.close(): es el Chrome persistente del pipeline
}
process.exit(0);
