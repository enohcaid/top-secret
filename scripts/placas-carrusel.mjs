#!/usr/bin/env node
// Placas del carrusel de una noticia manual (reglas: scripts/lib/reglas-redes.mjs; dibujo: scripts/lib/carrusel.mjs).
//   node scripts/placas-carrusel.mjs --id <id> --spec <archivo.json> --fondo <foto limpia o URL> [--kicker "FC 27"] [--subir]
// spec: [{ "tipo": "clave", "titulo": "…", "texto": "…" }, { "tipo": "idea", … }, …, { "tipo": "resumen", "items": […] }, { "tipo": "cta", "titulo": "…" }]
// Con --subir imprime las URLs para la nota: imagenesExtra (las .jpg) y capasTikTok (las .png).
// La noticia diaria no usa este script: noticia-lote.mjs arma las placas solo con el "carrusel" que escribe Claude.
import fs from 'fs';
import { armarCarrusel } from './lib/carrusel.mjs';
import { controlarCarrusel } from './lib/reglas-redes.mjs';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const placas = JSON.parse(fs.readFileSync(arg('--spec'), 'utf8'));
const errores = controlarCarrusel(placas);
if (errores.length) console.warn('Fuera de las reglas del carrusel:\n  - ' + errores.join('\n  - '));
const r = await armarCarrusel({ id: arg('--id'), placas, fondo: arg('--fondo'), kicker: arg('--kicker') || '', subir: process.argv.includes('--subir') });
for (const a of r.avisos) console.warn('  ¡' + a);
for (const f of [...r.jpgs, ...r.capas]) console.log('  ' + f);
if (r.urls.length) console.log(JSON.stringify({ imagenesExtra: r.urls, capasTikTok: r.urlsCapas }, null, 2));
