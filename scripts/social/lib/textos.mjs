// Textos de cada red para una pieza: los escribe Claude Opus con el encargo de scripts/social/textos-encargo.md y los
// datos reales de la pieza. Devuelve el objeto con una clave por red. Una sola llamada sin herramientas desde una carpeta
// neutra (scripts/lib/ia.mjs): ~1K tokens de contexto en vez de ~47K. Si Claude no tiene cupo, escribe el modelo local
// (gemma3:12b) — rinde menos (comparación 2026-10-26), pero la pieza sale igual y se revisa con revisar-textos.js.
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { pedirJSON } from '../../lib/ia.mjs';
const CLAVES = ['instagram_carrusel', 'instagram_reel', 'facebook', 'x', 'tiktok', 'youtube_titulo', 'youtube_texto'];

export function escribirTextos({ pieza, datos }) {
  return pedir('textos-encargo.md', { PIEZA: pieza, DATOS: datos }, CLAVES);
}

// Texto de la noticia del sitio (resumen semanal): titulo, bajada y los párrafos del cuerpo.
export function escribirNoticia({ datos }) {
  return pedir('noticia-encargo.md', { DATOS: datos }, ['titulo', 'bajada', 'apertura', 'goles', 'viene', 'cierre']);
}

async function pedir(archivoEncargo, vars, claves) {
  let encargo = fs.readFileSync(path.join(ROOT, 'scripts/social', archivoEncargo), 'utf8');
  for (const [k, v] of Object.entries(vars)) encargo = encargo.replace(`{{${k}}}`, typeof v === 'string' ? v : JSON.stringify(v, null, 2));
  return pedirJSON(encargo, { claves, orden: ['claude', 'local'], tarea: archivoEncargo.replace(/-encargo.md$/, ''), temperatura: 0.7 });
}
