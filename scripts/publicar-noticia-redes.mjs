#!/usr/bin/env node
// Publica en las redes el pedido que dejó el paso "Publicar en redes" de noticias.html.
// El Worker guarda el pedido en KV (redes_job) con las piezas ya subidas a R2; este script
// (lo llama watch-regen.ps1 cada minuto, solo si hay algo en cola) lo toma, publica destino
// por destino y anota el estado de cada uno en el mismo KV, que el sitio va mostrando.
//
//   ig-post      → meta.mjs ig-imagen  (pieza con título + texto)
//   ig-historia  → meta.mjs ig-historia
//   fb-post      → meta.mjs fb-link    (link a la nota: la vista previa trae foto y título)
//   fb-historia  → meta.mjs fb-historia
//   x            → Chrome con CDP (sesión @FCTOPSecret), texto + link (tarjeta con la foto)
//
//   node scripts/publicar-noticia-redes.mjs           # procesa el pedido en cola, si hay
//   node scripts/publicar-noticia-redes.mjs --estado  # muestra el pedido actual
//   --prueba: recorre todo (contenedores de Meta, borrador en X) sin publicar nada
import { spawnSync } from 'child_process';
import path from 'path';
import { chromium } from 'playwright';
import { need, ROOT } from './lib/env.mjs';

const KV = `https://api.cloudflare.com/client/v4/accounts/${need('CF_ACCOUNT_ID')}/storage/kv/namespaces/${need('KV_NAMESPACE_ID')}/values/redes_job`;
const AUTH = { 'X-Auth-Email': need('CF_EMAIL'), 'X-Auth-Key': need('CF_API_KEY') };
const espera = ms => new Promise(r => setTimeout(r, ms));
const PRUEBA = process.argv.includes('--prueba');

async function leer() {
  const r = await fetch(KV, { headers: AUTH });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`KV ${r.status}`);
  return r.json();
}
async function guardar(job) {
  const r = await fetch(KV, { method: 'PUT', headers: { ...AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify(job) });
  if (!r.ok) throw new Error(`KV PUT ${r.status}: ${await r.text()}`);
}

function meta(...args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'meta.mjs'), ...args, ...(PRUEBA ? ['--prueba'] : [])], { cwd: ROOT, encoding: 'utf8' });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  if (r.status !== 0) throw new Error(out.split('\n').pop() || `meta.mjs salió con ${r.status}`);
  return out;
}
const primerLink = s => (s.match(/https:\/\/\S+/) || [])[0] || null;

async function publicarX(texto) {
  let b;
  try { b = await chromium.connectOverCDP('http://localhost:9222', { timeout: 20000 }); }
  catch (e) { throw new Error('El Chrome con CDP no está abierto (scripts/abrir-chrome-chatgpt.ps1)'); }
  const p = await b.contexts()[0].newPage();
  try {
    await p.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await espera(6000);
    await p.locator('[data-testid="tweetTextarea_0"]').first().click();
    await p.keyboard.type(texto, { delay: 5 });
    await espera(6000);   // que X arme la tarjeta del link
    const ok = await p.evaluate(() => {
      const bt = document.querySelector('[data-testid="tweetButtonInline"]');
      return !!bt && !bt.disabled && bt.getAttribute('aria-disabled') !== 'true';
    });
    if (!ok) throw new Error('X no habilitó el botón de publicar (¿texto demasiado largo?)');
    if (PRUEBA) { await p.keyboard.press('Control+A'); await p.keyboard.press('Delete'); return '(prueba: no se publicó)'; }
    // El click normal falla: una capa del header intercepta el puntero (ver reference_publicar_redes).
    await p.evaluate(() => document.querySelector('[data-testid="tweetButtonInline"]').click());
    await espera(10000);
    await p.goto('https://x.com/FCTOPSecret', { waitUntil: 'domcontentloaded' });
    await espera(8000);
    const inicio = texto.split('\n')[0].slice(0, 40);
    const url = await p.evaluate(inicio => {
      for (const a of document.querySelectorAll('article')) {
        if (!a.innerText.includes(inicio)) continue;
        const h = [...a.querySelectorAll('a[href*="/status/"]')].map(x => x.href).find(h => /\/status\/\d+$/.test(h));
        if (h) return h;
      }
      return null;
    }, inicio);
    if (!url) throw new Error('No encontré el post en el perfil: revisar x.com/FCTOPSecret');
    return url;
  } finally {
    await p.close().catch(() => {});
    await b.close().catch(() => {});
  }
}

async function publicar(d, job) {
  switch (d.red) {
    case 'ig-post': return primerLink(meta('ig-imagen', d.imagen, d.texto));
    case 'ig-historia': meta('ig-historia', d.imagen); return 'https://www.instagram.com/stories/fctopsecret/';
    case 'fb-post': return primerLink(meta('fb-link', job.link, d.texto));
    case 'fb-historia': meta('fb-historia', d.imagen); return null;
    case 'x': return publicarX(d.texto);
    default: throw new Error('Red desconocida: ' + d.red);
  }
}

const job = await leer();
if (process.argv.includes('--estado')) { console.log(JSON.stringify(job, null, 2)); process.exit(0); }
if (!job) process.exit(0);
// Otro proceso publicando hace menos de 10 min: no pisarlo.
const enCurso = job.destinos.find(d => d.estado === 'publicando');
if (enCurso && Date.now() - Date.parse(enCurso.desde || 0) < 10 * 60000) process.exit(0);
const cola = job.destinos.filter(d => d.estado === 'pendiente' || d.estado === 'publicando');
if (!cola.length) process.exit(0);

console.log(`Publicando ${job.id} en: ${cola.map(d => d.red).join(', ')}`);
for (const d of cola) {
  d.estado = 'publicando'; d.desde = new Date().toISOString();
  await guardar(job);
  try {
    d.url = await publicar(d, job);
    d.estado = 'publicado';
    console.log(`  ${d.red}: publicado ${d.url || ''}`);
  } catch (e) {
    d.estado = 'error'; d.error = String(e.message || e).slice(0, 300);
    console.log(`  ${d.red}: ERROR ${d.error}`);
  }
  d.hecho = new Date().toISOString();
  await guardar(job);
}
