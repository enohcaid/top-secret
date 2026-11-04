// Links cortos de descarga, por cada jugador del plantel actual (ROSTER_T4):
//   https://topsecret.ar/plantilla/<gamertag>/FotoVPUG → Renders/<gamertag>/Frente4-cerca.png
//   https://topsecret.ar/plantilla/<gamertag>/FotoVPN  → Renders/<gamertag>/Frente4.png
// GitHub Pages es estático: escribe una página plantilla/<gamertag>/<link>/index.html que dispara la descarga
// (R2, vía Worker con ?dl=). Re-correr cuando cambie el plantel o se regeneren esas fotos (subir su v).
//   node scripts/links-fotos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const FOTOS = [
  { link: 'FotoVPUG', archivo: 'Frente4-cerca.png', v: '2026-10-30' }, // se subió sin fondo el 2026-10-30
  { link: 'FotoVPN', archivo: 'Frente4.png', v: '2026-11-04' },        // mismo valor que RENDER_V
];
const { ROSTER_T4 } = await import(pathToFileURL(path.resolve('roster.js')).href);

fs.rmSync('plantilla', { recursive: true, force: true });
for (const p of ROSTER_T4) {
  const folder = p.folderOverride || p.key;
  for (const { link, archivo, v } of FOTOS) {
    const url = `${MEDIA}/Renders/${encodeURIComponent(folder)}/${archivo}?v=${v}&dl=${encodeURIComponent(`${p.key}-${link}.png`)}`;
    const dir = path.join('plantilla', p.key, link);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${link} — ${p.key}</title>
<meta http-equiv="refresh" content="0;url=${url}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0A07;color:#F2EEE0;font:600 16px Barlow,system-ui,sans-serif;text-align:center}a{color:#F5C518}</style>
</head><body><p>Descargando la foto de ${p.key}…<br><a href="${url}">Si no empieza, tocá acá</a></p>
<script>location.replace(${JSON.stringify(url)})</script></body></html>
`);
    console.log(`https://topsecret.ar/plantilla/${p.key}/${link}`);
  }
}
