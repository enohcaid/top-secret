/**
 * Foto grupal del plantel T4, estilo campaña: cada jugador en su pose única
 * (Renders/<gamertag>/Unica4.png, fondo transparente) en tres planos sueltos.
 * Genera:
 *   logos/plantel-t4-<version>.webp — la imagen (nombre versionado: R2 cachea un año)
 *   plantel-t4-stage.js             — imagen + posición de cada jugador (% de la imagen) para los hotspots
 * Re-ejecutar si cambia el plantel o alguna pose.
 */
import sharp from 'sharp';
import fs from 'fs';

const W = 3200, H = 1700;
// Planos de atrás hacia adelante (se dibujan en ese orden). Por jugador: [gamertag, desfase vertical px, escala extra]
const ROWS = [
  { scale: 0.56, floor: 1060, spread: 0.84, light: 0.7, players: [
    ['Huber236', 30, 1], ['rivarola90', 0, 1], ['Elianja20', -40, 1.03], ['pepolemmo2710', -70, 1.05],
    ['kee_viin03', -30, 1.04], ['Juanchyroman08', 10, 1], ['adri_cai', 20, 1] ] },
  { scale: 0.66, floor: 1330, spread: 0.8, light: 0.86, players: [
    ['Guiidow', 20, 1], ['Alexisraies23', 0, 1], ['Cabers14', -10, 1.02], ['Juan_Martinez4', -30, 1.06],
    ['Lil_Dekuroko', -10, 1.02], ['NicoBJ_96', 0, 1.02], ['RS32-DaniStone', 20, 1] ] },
  { scale: 0.77, floor: 1660, spread: 0.72, light: 1, players: [
    ['Ivan_Cabj_La12', 40, 1], ['nikileo527', 0, 1], ['Lautavester7', 70, 1.04], ['CipriMancini', 10, 1], ['endiabladorojo66', 60, 1] ] },
];

async function cutout(key) {
  const src = fs.existsSync(`Renders/${key}/Unica4.png`) ? `Renders/${key}/Unica4.png` : `Renders/${key}/Brazos4.png`;
  const { data, info } = await sharp(src).trim({ threshold: 5 }).png().toBuffer({ resolveWithObject: true });
  // Offset del recorte dentro del lienzo original (1024x1536): todos los renders comparten escala,
  // así un jugador agachado queda más bajo en vez de agrandarse.
  return { data, w: info.width, h: info.height, src, offTop: -(info.trimOffsetTop || 0), offBottom: 1536 - (-(info.trimOffsetTop || 0)) - info.height };
}

const bg = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="g" cx="50%" cy="32%" r="62%"><stop offset="0" stop-color="#3a2a10"/><stop offset=".45" stop-color="#17120a"/><stop offset="1" stop-color="#0B0A07"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`);

const comps = [], stage = [], missing = [];
for (const [ri, row] of ROWS.entries()) {
  const n = row.players.length;
  const slot = (W * row.spread) / n;
  const x0 = (W - W * row.spread) / 2;
  for (const [i, [key, dy, k]] of row.players.entries()) {
    const c = await cutout(key);
    if (!c.src.endsWith('Unica4.png')) missing.push(key);
    const f = row.scale * k;
    const w = Math.round(c.w * f), h = Math.round(c.h * f);
    const data = await sharp(c.data).resize({ width: w, height: h }).modulate({ brightness: row.light }).png().toBuffer();
    const cx = x0 + slot * (i + 0.5);
    // Apoyado en el piso del plano: el borde inferior del lienzo original cae sobre row.floor
    const top = row.floor + dy - Math.round((c.h + c.offBottom) * f);
    const left = Math.round(cx - w / 2);
    comps.push({ input: data, left, top: Math.round(top) });
    const bw = Math.min(w, slot) * 0.85, bh = h * (ri === 2 ? 0.6 : 0.34);
    stage.push({ key, row: ri, x: +((cx - bw / 2) / W * 100).toFixed(2), y: +(Math.max(top, 0) / H * 100).toFixed(2), w: +(bw / W * 100).toFixed(2), h: +(bh / H * 100).toFixed(2) });
  }
}
comps.push({ input: Buffer.from(`<svg width="${W}" height="${H}"><defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#0B0A07" stop-opacity="0"/><stop offset="1" stop-color="#0B0A07" stop-opacity="1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`), left: 0, top: 0 });

await sharp(bg).composite(comps).png().toFile('logos/plantel-t4.png');
const IMG = `logos/plantel-t4-${Date.now().toString(36)}.webp`;
await sharp('logos/plantel-t4.png').resize({ width: 2400 }).webp({ quality: 84 }).toFile(IMG);
fs.writeFileSync('plantel-t4-stage.js', `// Generado por scripts/plantel-foto-t4.mjs — imagen del escenario de plantilla.html y posición de cada jugador (% del ancho/alto).
export const STAGE_IMG = '${IMG}';
export const STAGE_T4 = ${JSON.stringify(stage).replace(/\},\{/g, '},\n  {')};
`);
// Actualiza el import de plantilla.html para que el navegador no use una versión cacheada.
const ver = IMG.match(/plantel-t4-([a-z0-9]+)\.webp/)[1];
fs.writeFileSync('plantilla.html', fs.readFileSync('plantilla.html', 'utf8').replace(/plantel-t4-stage\.js(\?v=[a-z0-9]+)?'/, `plantel-t4-stage.js?v=${ver}'`));
console.log('ok', stage.length, 'jugadores', IMG, missing.length ? 'SIN pose única: ' + missing.join(', ') : '');
