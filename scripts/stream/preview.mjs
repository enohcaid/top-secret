#!/usr/bin/env node
// Vista previa del overlay sobre un cuadro del partido: captura overlay.html (transparente) y lo compone.
//   node scripts/stream/preview.mjs <cuadro.png> <salida-sin-ext> [query del overlay, ej. "demo=clip&torneo=…"]
import path from 'path';
import { pathToFileURL } from 'url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [CUADRO, OUT, QUERY = ''] = process.argv.slice(2);
const html = pathToFileURL(path.resolve(import.meta.dirname, 'overlay.html')).href + '?' + QUERY;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
const capa = await p.screenshot({ omitBackground: true });
await b.close();
await sharp(capa).toFile(OUT + '-capa.png');
await sharp(CUADRO).resize(1920, 1080).composite([{ input: capa }]).jpeg({ quality: 88 }).toFile(OUT + '.jpg');
console.log(OUT + '.jpg');
