// Saca el fondo liso (negro, blanco, crema…) de escudos de rivales y los deja en PNG/WebP transparentes.
// Relleno por inundación desde los bordes: solo se borra el fondo que toca el borde, no el mismo color
// dentro del escudo. Borde suave (alpha parcial) en la franja de transición para que no quede serruchado.
//
//   node scripts/escudos-sin-fondo.mjs <salida-dir> <slug>=<url-o-archivo>[@tolerancia][+borde] …
//   (+borde agrega un contorno blanco, para escudos con texto oscuro fuera del escudo)
//
// Escribe <slug>.png (512px máx, recortado al contenido) y <slug>.webp en <salida-dir>.
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const [outDir, ...items] = process.argv.slice(2);
if (!outDir || !items.length) { console.error('uso: node scripts/escudos-sin-fondo.mjs <salida-dir> slug=url[@tol] …'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

async function load(src) {
  if (/^https?:/.test(src)) return Buffer.from(await (await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0' } })).arrayBuffer());
  return fs.readFileSync(src);
}

for (const it of items) {
  const [, slug, src, tolS, borde] = it.match(/^([^=]+)=(.+?)(?:@(\d+))?(\+borde)?$/);
  const tol = +(tolS || 40);
  // primero se recorta el margen transparente (EG sube el escudo con fondo cuadrado dentro de un PNG con aire)
  const pre = await sharp(await load(src)).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
  const { data, info } = await sharp(pre).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  // Color de fondo = promedio de los píxeles opacos del borde exterior
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < N; i++) {
    const x = i % W, y = (i / W) | 0;
    if (x > 1 && y > 1 && x < W - 2 && y < H - 2) continue;
    if (data[i * 4 + 3] < 128) continue;
    r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; n++;
  }
  if (!n) { console.log(slug, 'ya es transparente en el borde, se copia igual'); }
  const bg = n ? [r / n, g / n, b / n] : [0, 0, 0];
  const dist = i => Math.hypot(data[i * 4] - bg[0], data[i * 4 + 1] - bg[1], data[i * 4 + 2] - bg[2]);
  const isBg = i => data[i * 4 + 3] < 20 || dist(i) <= tol;
  const seen = new Uint8Array(N), stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !isBg(i)) continue;
    seen[i] = 1;
    const x = i % W;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (i >= W) stack.push(i - W);
    if (i < N - W) stack.push(i + W);
  }
  // Apertura (erosión + dilatación) de la máscara de fondo: los trazos finos del mismo color que el
  // fondo y pegados a él (ej. contornos negros de un dibujo sobre fondo negro) no se borran.
  const OPEN = 5;
  const cheb = (src, inside) => { // distancia Chebyshev al píxel más cercano con src != inside
    const d = new Float32Array(N);
    for (let i = 0; i < N; i++) d[i] = src[i] === inside ? 1e9 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue;
      let m = d[i]; if (x) m = Math.min(m, d[i - 1] + 1); if (y) { m = Math.min(m, d[i - W] + 1); if (x) m = Math.min(m, d[i - W - 1] + 1); if (x < W - 1) m = Math.min(m, d[i - W + 1] + 1); } d[i] = m; }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue;
      let m = d[i]; if (x < W - 1) m = Math.min(m, d[i + 1] + 1); if (y < H - 1) { m = Math.min(m, d[i + W] + 1); if (x < W - 1) m = Math.min(m, d[i + W + 1] + 1); if (x) m = Math.min(m, d[i + W - 1] + 1); } d[i] = m; }
    return d;
  };
  const er = cheb(seen, 1);                       // dentro del fondo: distancia al borde
  const core = new Uint8Array(N); for (let i = 0; i < N; i++) core[i] = er[i] > OPEN ? 1 : 0;
  const dl = cheb(core, 0);                       // fuera del núcleo: distancia al núcleo
  for (let i = 0; i < N; i++) if (seen[i] && !core[i] && dl[i] > OPEN && data[i * 4 + 3] >= 20) seen[i] = 0;
  for (let i = 0; i < N; i++) {
    if (seen[i]) { data[i * 4 + 3] = 0; continue; }
    // franja de transición: vecino de fondo y color parecido → alpha parcial
    const x = i % W;
    const nb = (x > 0 && seen[i - 1]) || (x < W - 1 && seen[i + 1]) || (i >= W && seen[i - W]) || (i < N - W && seen[i + W]);
    if (nb) {
      const d = dist(i);
      if (d < tol * 2.5) data[i * 4 + 3] = Math.min(data[i * 4 + 3], Math.round(255 * (d - tol) / (tol * 1.5)));
    }
  }
  let trimmed = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
  if (borde) { // contorno blanco: para textos oscuros que quedarían invisibles sobre el fondo oscuro del sitio
    const P = 8;
    const padded = await sharp(trimmed).extend({ top: P, bottom: P, left: P, right: P, background: '#0000' }).png().toBuffer();
    const m = await sharp(padded).metadata();
    const halo = await sharp(padded).extractChannel('alpha').blur(3).threshold(10).toBuffer();
    const white = await sharp({ create: { width: m.width, height: m.height, channels: 3, background: '#fff' } })
      .joinChannel(halo).png().toBuffer();
    trimmed = await sharp(white).composite([{ input: padded }]).png().toBuffer();
  }
  const sized = sharp(trimmed).resize(512, 512, { fit: 'inside', withoutEnlargement: true });
  await sized.clone().png({ compressionLevel: 9 }).toFile(path.join(outDir, slug + '.png'));
  await sized.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(outDir, slug + '.webp'));
  console.log(slug, 'fondo', bg.map(Math.round).join(','), 'tol', tol);
}
