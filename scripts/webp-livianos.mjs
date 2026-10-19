// Crea en R2 el .webp liviano que falte al lado de cada PNG/JPG de noticias.
// La home y noticias piden primero el .webp (ver webp() en index-home.js) y caen al
// original si no existe; los PNG del pipeline diario pesan ~3,5 MB cada uno.
//   node scripts/webp-livianos.mjs            → crea los que faltan
//   node scripts/webp-livianos.mjs --dry      → solo lista
import sharp from 'sharp';
import { list, r2, bucket, putBuffer } from './lib/r2.mjs';
import { GetObjectCommand } from '@aws-sdk/client-s3';

const DRY = process.argv.includes('--dry');
// Solo el nivel superior de cada carpeta (Daily News/raw/ son originales de trabajo).
const CARPETAS = ['Renders/Daily News/', 'logos/noticias/'];
const ANCHO = 1080;

async function webpLiviano(buf) {
  return sharp(buf).resize({ width: ANCHO, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
}

async function bajar(key) {
  const r = await r2().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  return Buffer.from(await r.Body.transformToByteArray());
}

for (const pre of CARPETAS) {
  const keys = (await list(pre)).map(o => o.key).filter(k => !k.slice(pre.length).includes('/'));
  const set = new Set(keys);
  const faltan = keys.filter(k => /\.(png|jpe?g)$/i.test(k) && !set.has(k.replace(/\.(png|jpe?g)$/i, '.webp')));
  console.log(`${pre}: ${faltan.length} sin .webp`);
  for (const k of faltan) {
    const dst = k.replace(/\.(png|jpe?g)$/i, '.webp');
    if (DRY) { console.log('  ', dst); continue; }
    const orig = await bajar(k);
    const out = await webpLiviano(orig);
    await putBuffer(out, dst, 'image/webp');
    console.log(`  ${dst}  ${Math.round(orig.length / 1024)} KB → ${Math.round(out.length / 1024)} KB`);
  }
}
