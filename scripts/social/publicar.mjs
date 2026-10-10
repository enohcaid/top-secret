#!/usr/bin/env node
// Publica las piezas APROBADAS en aprobar.html cuando llega la hora de su lote (lo llama watch-regen.ps1 cada
// minuto; sale enseguida si no hay nada). Anota en el mismo KV el estado y el link de cada pieza, y registra la
// ronda en `social_historial` (de ahí salen las métricas y la regla de "más de 2 días sin ronda").
//
//   node scripts/social/publicar.mjs            → publica lo que corresponda ahora
//   node scripts/social/publicar.mjs --estado   → muestra los lotes y el estado de cada pieza
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { chromium } from 'playwright';
import { ROOT } from '../lib/env.mjs';
import { asegurarVentana, enfocar } from '../lib/ventana.mjs';
import { leer, actualizarPieza, leerKV, guardarKV } from './lib/aprobaciones.mjs';
import { asegurarChrome } from './lib/chrome.mjs';

const espera = ms => new Promise(r => setTimeout(r, ms));
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [publicar] ${m}`);

// Sin process.exit(): en Windows, salir así con conexiones de fetch abiertas tira
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" (código 9). Se deja terminar solo.
const data = await leer();
const ESTADO = process.argv.includes('--estado');
if (ESTADO) {
  for (const l of data.lotes) { console.log(`${l.id} (${l.publicarA})`); for (const p of l.piezas) console.log(`  ${p.id.padEnd(12)} ${(p.decision || '').padEnd(10)} ${p.estado || ''} ${p.url || p.error || ''}`); }
}
const ahora = Date.now();
const cola = ESTADO ? [] : data.lotes.filter(l => l.publicarA && Date.parse(l.publicarA) <= ahora && ahora - Date.parse(l.publicarA) < 36 * 3600000)
  .flatMap(l => l.piezas.filter(p => p.decision === 'aprobada' && (!p.estado || (p.estado === 'publicando' && ahora - Date.parse(p.desde || 0) > 15 * 60000))).map(p => ({ l, p })));

function correr(script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, script), ...args], { cwd: ROOT, encoding: 'utf8', timeout: 20 * 60000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status !== 0) throw new Error(out.split('\n').filter(Boolean).pop() || `${script} salió con ${r.status}`);
  return out;
}
const link = s => (s.match(/https:\/\/\S+/g) || []).pop() || null;
const urls = p => p.media.map(m => m.url);

async function xConImagenes(texto, archivos) {
  const b = await chromium.connectOverCDP('http://localhost:9222', { timeout: 30000 });
  const page = await b.contexts()[0].newPage();
  try {
    await asegurarVentana(page);
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await espera(6000);
    await enfocar(page, '[data-testid="tweetTextarea_0"]');
    await page.keyboard.type(texto, { delay: 5 });
    await page.locator('input[data-testid="fileInput"]').first().setInputFiles(archivos);
    // Que terminen de subir las imágenes: el botón se habilita recién ahí.
    for (let i = 0; i < 30; i++) {
      await espera(2000);
      const ok = await page.evaluate(() => { const bt = document.querySelector('[data-testid="tweetButtonInline"]'); return !!bt && !bt.disabled && bt.getAttribute('aria-disabled') !== 'true'; });
      if (ok) break;
      if (i === 29) throw new Error('X no habilitó el botón de publicar');
    }
    await page.evaluate(() => document.querySelector('[data-testid="tweetButtonInline"]').click());
    await espera(12000);
    await page.goto('https://x.com/FCTOPSecret', { waitUntil: 'domcontentloaded' });
    await espera(8000);
    const inicio = texto.split('\n')[0].slice(0, 40);
    return await page.evaluate(inicio => {
      for (const a of document.querySelectorAll('article')) {
        if (!a.innerText.includes(inicio)) continue;
        const h = [...a.querySelectorAll('a[href*="/status/"]')].map(x => x.href).find(h => /\/status\/\d+$/.test(h));
        if (h) return h;
      }
      return 'https://x.com/FCTOPSecret';
    }, inicio);
  } catch (e) {
    await page.screenshot({ path: path.join(ROOT, 'scripts', 'debug-x.png') }).catch(() => {});
    throw new Error(`${e.message.split('\n')[0]} (captura en scripts/debug-x.png)`);
  } finally { await page.close().catch(() => {}); await b.close().catch(() => {}); }
}

// Noticia del sitio (resumen semanal): los 4 párrafos editables de aprobar.html vuelven a su lugar en el cuerpo
// (apertura, goles, lo que viene, cierre) y la nota entra a published_noticias, igual que las del pipeline diario.
async function noticiaSitio(p) {
  const n = structuredClone(p.noticia);
  const parr = p.texto.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const huecos = n.body.map((b, i) => typeof b === 'string' ? i : -1).filter(i => i >= 0);
  if (parr.length !== huecos.length) throw new Error(`La noticia tiene que tener ${huecos.length} párrafos separados por una línea en blanco (tiene ${parr.length}).`);
  huecos.forEach((i, k) => { n.body[i] = k === huecos.length - 1 && !/<a /.test(parr[k]) ? `${parr[k]} <a href='calendario.html'>Calendario</a>` : parr[k]; });
  n.title = p.titulo || n.title;
  n.publishedAt = new Date().toISOString();
  const lista = await leerKV('published_noticias', []);
  await guardarKV('published_noticias', [n, ...lista.filter(a => a.id !== n.id)]);
  return `https://enohcaid.github.io/top-secret/noticias.html?id=${n.id}`;
}

async function publicar(p) {
  const video = p.local?.video && fs.existsSync(p.local.video) ? p.local.video : null;
  const necesitaLocal = ['x-imagenes', 'tiktok', 'youtube', 'x-video'].includes(p.metodo);
  if (necesitaLocal && !video && !(p.local?.slides || []).every(f => fs.existsSync(f))) throw new Error('No están los archivos locales de la pieza (fuentes/redes/ronda).');
  switch (p.metodo) {
    case 'sitio-noticia': return noticiaSitio(p);
    case 'ig-carrusel': return link(correr('scripts/meta.mjs', ['ig-carrusel', p.texto, ...urls(p)]));
    case 'ig-reel':     return link(correr('scripts/meta.mjs', ['ig-reel', urls(p)[0], p.texto]));
    case 'fb-album':    return link(correr('scripts/meta.mjs', ['fb-album', p.texto, ...urls(p)]));
    case 'fb-video':    return link(correr('scripts/meta.mjs', ['fb-video', urls(p)[0], p.texto]));
    case 'x-imagenes':  return xConImagenes(p.texto, p.local.slides.slice(0, 4));
    case 'x-video':     return link(correr('scripts/publicar-video.mjs', ['x', video, '--texto', p.texto]));
    case 'tiktok':      return link(correr('scripts/publicar-video.mjs', ['tiktok', video, '--texto', p.texto])) || 'https://www.tiktok.com/@topsecretfc';
    case 'youtube':     return link(correr('scripts/publicar-video.mjs', ['youtube', video, '--titulo', p.titulo, '--texto', p.texto]));
    default: throw new Error('Método desconocido: ' + p.metodo);
  }
}

// X, TikTok y YouTube van por el Chrome con CDP: si está cerrado, se abre antes de empezar.
if (cola.some(({ p }) => ['x-imagenes', 'x-video', 'tiktok', 'youtube'].includes(p.metodo))) await asegurarChrome().catch(e => log(e.message));

for (const { l, p } of cola) {
  log(`${l.id} · ${p.id}: publicando…`);
  await actualizarPieza(l.id, p.id, { estado: 'publicando', desde: new Date().toISOString(), error: null });
  try {
    const url = await publicar(p);
    await actualizarPieza(l.id, p.id, { estado: 'publicado', url, publicadoEn: new Date().toISOString() });
    log(`${l.id} · ${p.id}: publicado ${url || ''}`);
    const h = await leerKV('social_historial', { rondas: [], piezas: [] });
    h.piezas = [{ lote: l.id, fecha: l.publicarA.slice(0, 10), pieza: p.id, red: p.red, formato: p.formato, url, publicadoEn: new Date().toISOString() }, ...(h.piezas || [])].slice(0, 500);
    if (!h.rondas.some(r => r.id === l.id)) h.rondas = [{ id: l.id, fecha: l.publicarA.slice(0, 10) }, ...h.rondas].slice(0, 200);
    await guardarKV('social_historial', h);
  } catch (e) {
    const msg = String(e.message || e).slice(0, 300);
    await actualizarPieza(l.id, p.id, { estado: 'error', error: msg });
    log(`${l.id} · ${p.id}: ERROR ${msg}`);
  }
}
