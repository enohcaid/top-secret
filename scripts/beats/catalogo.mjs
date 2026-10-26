// Catálogo público de topsecret.ar/music (R2 musica/catalogo.json), por álbum (Juan, 2026-10-26):
//   · The Shorts — los temas cortos con voz de scripts/beats/letras.json (cantar.mjs), en 2 volúmenes
//   · Thrive — un tema nuevo cada noche (scripts/beats/thrive.mjs, registro scripts/beats/thrive.json)
// La página agrupa por `album` y `volumen`; `albumes` trae título, descripción y portada de cada uno.
import fs from 'fs';
import path from 'path';
import { ROOT } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';

export const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const DIR = path.join(ROOT, 'fuentes', 'beats', 'voz');
const LETRAS = path.join(ROOT, 'scripts', 'beats', 'letras.json');
const THRIVE = path.join(ROOT, 'scripts', 'beats', 'thrive.json');
const SHORTS_VOL1 = 12;   // los primeros 12 de letras.json son el volumen 1, el resto el 2

export const ALBUMES = [
  { id: 'thrive', titulo: 'Thrive', portada: MEDIA + 'musica/portadas/thrive.webp',
    descripcion: 'Amor, pasión, entrega y sacrificio: querer algo que no siempre nos hace bien, y crecer igual. Un tema nuevo cada noche.' },
  { id: 'the-shorts', volumen: 1, titulo: 'The Shorts', portada: MEDIA + 'musica/portadas/the-shorts-1.webp',
    descripcion: 'Temas cortos, cada uno un momento: la noche antes de algo grande, el esfuerzo que nadie ve, la herida que tarda en cerrar.' },
  { id: 'the-shorts', volumen: 2, titulo: 'The Shorts', portada: MEDIA + 'musica/portadas/the-shorts-2.webp',
    descripcion: 'La segunda parte: más tarde, más adentro.' },
];

async function conReintentos(fn, intentos = 4) {
  for (let i = 1; ; i++) { try { return await fn(); } catch (e) { if (i >= intentos) throw e; await new Promise(r => setTimeout(r, 5000 * i)); } }
}

export async function armarCatalogo({ log = console.log } = {}) {
  const letras = JSON.parse(fs.readFileSync(LETRAS, 'utf8'));
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/temas-diarios.json'), 'utf8')).temas;
  const lista = [];
  // Solo la versión final (con voz): las instrumentales dejaron de publicarse (Juan, 2026-10-26).
  // La letra que se muestra es la transcripción de lo que realmente canta la versión final (`letraFinal`,
  // scripts/beats/letra-final.mjs); si todavía no está, la letra escrita.
  for (const [i, l] of letras.entries()) {
    const t = reg.find(x => x.archivo === l.original);
    lista.push({ slug: l.slug, titulo: l.titulo, album: 'the-shorts', volumen: i < SHORTS_VOL1 ? 1 : 2, pista: i < SHORTS_VOL1 ? i + 1 : i - SHORTS_VOL1 + 1,
      fecha: (l.original || '').slice(0, 10) || l.fecha || null, concepto: l.concepto, bpm: l.bpm, tonalidad: l.tonalidad,
      letra: l.letraFinal || l.letra, voz: l.voz ? MEDIA + l.voz : null, original: t?.nombre || null });
  }
  const thrive = fs.existsSync(THRIVE) ? JSON.parse(fs.readFileSync(THRIVE, 'utf8')).temas : [];
  for (const [i, t] of thrive.entries()) {
    if (!t.audio) continue;
    lista.push({ slug: t.slug, titulo: t.titulo, album: 'thrive', pista: i + 1, fecha: t.fecha, concepto: t.concepto, rasgo: t.rasgo,
      bpm: t.bpm, tonalidad: t.tonalidad, duracion: t.duracion, letra: t.letraFinal || t.letra, voz: MEDIA + t.audio });
  }
  const f = path.join(DIR, 'catalogo.json');
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ actualizado: new Date().toISOString(), albumes: ALBUMES, temas: lista }, null, 1));
  await conReintentos(() => putFile(f, 'musica/catalogo.json'));
  log(`catálogo: ${lista.length} temas (${lista.filter(x => x.album === 'thrive').length} en Thrive, ${lista.filter(x => x.voz).length} con voz)`);
}
