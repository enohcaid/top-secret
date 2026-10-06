#!/usr/bin/env node
// Prueba local de las piezas con título para redes (post de Instagram y historia). Usa el mismo
// dibujante que el sitio (noticia-redes.js, canvas) dentro de un Chromium, así lo que se ve acá
// es exactamente lo que sale desde el paso "Publicar en redes" de noticias.html.
//
//   node scripts/noticia-redes.mjs                 # borrador actual (Firestore news/draft)
//   node scripts/noticia-redes.mjs --id <id>       # noticia ya publicada
//   node scripts/noticia-redes.mjs --titulo "…"    # pisa el título de la imagen
//
// Salida: fuentes/redes/noticias/<id>-ig.jpg y <id>-historia.jpg.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { PLAYER_TRAITS } from './generate-image-chatgpt.mjs';

const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const FS_DRAFT = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/news/draft';
const OUT_DIR = path.resolve('fuentes/redes/noticias');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

export async function cargarNoticia(id) {
  if (id) {
    const { articles } = await (await fetch(`${WORKER}/published-noticias`)).json();
    const n = articles.find(a => a.id === id);
    if (n) return n;
  }
  const doc = await (await fetch(FS_DRAFT)).json();
  const d = JSON.parse(doc.fields?.data?.stringValue || 'null');
  if (!d || (id && d.id !== id)) throw new Error(`No encontré la noticia ${id || '(borrador)'}`);
  return d;
}

export async function generarPiezas(n, { titulo } = {}) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const out = {};
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
    await page.addScriptTag({ path: path.resolve('noticia-redes.js') });
    for (const tipo of ['ig', 'historia']) {
      const dataUrl = await page.evaluate(async ({ n, tipo, titulo, gamertags }) =>
        (await window.TSRedes.render(n, tipo, { titulo, gamertags })).toDataURL('image/jpeg', 0.9),
        { n, tipo, titulo, gamertags: Object.keys(PLAYER_TRAITS) });
      const file = path.join(OUT_DIR, `${n.id}-${tipo}.jpg`);
      fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
      out[tipo] = file;
      console.log(`  ${tipo}: ${path.relative(process.cwd(), file)}`);
    }
  } finally {
    await browser.close();
  }
  return out;
}

if (process.argv[1]?.endsWith('noticia-redes.mjs')) {
  const n = await cargarNoticia(arg('--id'));
  console.log(`Noticia: ${n.id}`);
  await generarPiezas(n, { titulo: arg('--titulo') });
}
