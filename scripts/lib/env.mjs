// Carga credenciales desde `.env` (raíz del repo, gitignored) sin dependencias.
// Las variables ya definidas en el entorno (p. ej. secretos de GitHub Actions o de
// Claude Code en la web) tienen prioridad sobre el archivo.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let loaded = false;
export function loadEnv() {
  if (loaded) return process.env;
  loaded = true;
  const file = path.join(ROOT, '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return process.env;
}

// Devuelve la variable o corta con un mensaje claro de qué falta y dónde cargarla.
export function need(name) {
  loadEnv();
  const v = process.env[name];
  if (!v) {
    console.error(`Falta la variable ${name}. Copiá .env.example a .env y completala (ver docs/trabajar-desde-otra-pc.md).`);
    process.exit(1);
  }
  return v;
}

export const WORKER_BASE = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';

// Capturas del juego, cartas de jugadores y láminas de kits (referencias para generar renders).
// En la PC original viven en Documents; en cualquier otra, `node scripts/r2.mjs sync-down _fuentes/fotos fuentes/fotos`
// las baja a `fuentes/fotos/` (gitignored). TS_FOTOS_DIR permite apuntar a otra carpeta.
const LEGACY_FOTOS = 'C:/Users/User/Documents/TOP SECRET/Fotos';
loadEnv();
export const FOTOS_DIR = process.env.TS_FOTOS_DIR
  || (fs.existsSync(LEGACY_FOTOS) ? LEGACY_FOTOS : path.join(ROOT, 'fuentes', 'fotos'));
