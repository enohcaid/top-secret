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
// Lo público de Tacet Sin va solo en inglés (Juan, 2026-11-05). Concepto en inglés por tema; si un tema nuevo no lo tiene todavía, no se muestra.
const CONCEPTOS = path.join(ROOT, 'scripts', 'beats', 'conceptos-en.json');
const SHORTS_VOL1 = 12;   // los primeros 12 de letras.json son el volumen 1, el resto el 2

// Artista: Tacet Sin (Juan, 2026-10-26; "tacet" = "calla" en la partitura). Logo: el Clean logo de Top Secret, blanco.
// Las portadas llevan ?v=N: R2 se sirve con caché de un año; al cambiar una portada, subir el número.
export const ARTISTA = 'Tacet Sin';
export const ALBUMES = [
  { id: 'thrive', titulo: 'Thrive', portada: MEDIA + 'musica/portadas/thrive.webp?v=5',
    descripcion: 'Love, passion, surrender and sacrifice: wanting something that isn\'t always good for us, and growing anyway. A new song every night.' },
  { id: 'the-shorts', volumen: 1, titulo: 'The Shorts', portada: MEDIA + 'musica/portadas/the-shorts-1.webp?v=5',
    descripcion: 'Short songs, each one a moment: the night before something big, the effort nobody sees, the wound that takes its time to close.' },
  { id: 'the-shorts', volumen: 2, titulo: 'The Shorts', portada: MEDIA + 'musica/portadas/the-shorts-2.webp?v=5',
    descripcion: 'The second part: later, deeper.' },
];

async function conReintentos(fn, intentos = 4) {
  for (let i = 1; ; i++) { try { return await fn(); } catch (e) { if (i >= intentos) throw e; await new Promise(r => setTimeout(r, 5000 * i)); } }
}

export async function armarCatalogo({ log = console.log } = {}) {
  const letras = JSON.parse(fs.readFileSync(LETRAS, 'utf8'));
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/temas-diarios.json'), 'utf8')).temas;
  const lista = [];
  const en = JSON.parse(fs.readFileSync(CONCEPTOS, 'utf8'));
  // Solo la versión final (con voz): las instrumentales dejaron de publicarse (Juan, 2026-10-26).
  // La letra que se muestra es la transcripción de lo que realmente canta la versión final (`letraFinal`,
  // scripts/beats/letra-final.mjs); si todavía no está, la letra escrita.
  for (const [i, l] of letras.entries()) {
    const t = reg.find(x => x.archivo === l.original);
    lista.push({ slug: l.slug, titulo: l.titulo, album: 'the-shorts', volumen: i < SHORTS_VOL1 ? 1 : 2, pista: i < SHORTS_VOL1 ? i + 1 : i - SHORTS_VOL1 + 1,
      fecha: (l.original || '').slice(0, 10) || l.fecha || null, concepto: en[l.slug] || null, bpm: l.bpm, tonalidad: l.tonalidad,
      letra: l.letraFinal || l.letra, voz: l.voz ? MEDIA + l.voz : null, original: t?.nombre || null });
  }
  const thrive = fs.existsSync(THRIVE) ? JSON.parse(fs.readFileSync(THRIVE, 'utf8')).temas : [];
  for (const [i, t] of thrive.entries()) {
    // Solo lo aprobado por Juan (desde 2026-10-27 cada tema nuevo pasa antes por aprobar.html como demo)
    if (!t.audio || t.publicado !== true) continue;
    lista.push({ slug: t.slug, titulo: t.titulo, album: 'thrive', pista: i + 1, fecha: t.fecha, concepto: en[t.slug] || null,
      bpm: t.bpm, tonalidad: t.tonalidad, duracion: t.duracion, letra: t.letraFinal || t.letra, voz: MEDIA + t.audio });
  }
  const f = path.join(DIR, 'catalogo.json');
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ actualizado: new Date().toISOString(), artista: ARTISTA, albumes: ALBUMES, temas: lista }, null, 1));
  await conReintentos(() => putFile(f, 'musica/catalogo.json'));
  log(`catálogo: ${lista.length} temas (${lista.filter(x => x.album === 'thrive').length} en Thrive, ${lista.filter(x => x.voz).length} con voz)`);
}
