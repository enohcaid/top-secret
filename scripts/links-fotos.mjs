// Links cortos de descarga: https://topsecret.ar/plantilla/<gamertag>/FotoVPUG
// GitHub Pages es estático: por cada jugador del plantel actual (ROSTER_T4) escribe una página
// plantilla/<gamertag>/FotoVPUG/index.html que dispara la descarga de Renders/<gamertag>/Frente4-cerca.png
// (R2, vía Worker con ?dl=). Re-correr cuando cambie el plantel o RENDER_V.   node scripts/links-fotos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const RENDER_V = '2026-09-30';
const { ROSTER_T4 } = await import(pathToFileURL(path.resolve('roster.js')).href);

fs.rmSync('plantilla', { recursive: true, force: true });
for (const p of ROSTER_T4) {
  const folder = p.folderOverride || p.key;
  const url = `${MEDIA}/Renders/${encodeURIComponent(folder)}/Frente4-cerca.png?v=${RENDER_V}&dl=${encodeURIComponent(p.key + '-FotoVPUG.png')}`;
  const dir = path.join('plantilla', p.key, 'FotoVPUG');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Foto VPUG — ${p.key}</title>
<meta http-equiv="refresh" content="0;url=${url}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0B0A07;color:#F2EEE0;font:600 16px Barlow,system-ui,sans-serif;text-align:center}a{color:#F5C518}</style>
</head><body><p>Descargando la foto de ${p.key}…<br><a href="${url}">Si no empieza, tocá acá</a></p>
<script>location.replace(${JSON.stringify(url)})</script></body></html>
`);
  console.log(`https://topsecret.ar/plantilla/${p.key}/FotoVPUG`);
}
