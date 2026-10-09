// Textos de cada red para una pieza: los escribe Claude (claude -p) con el encargo de
// scripts/social/textos-encargo.md y los datos reales de la pieza. Devuelve el objeto con una clave por red.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { ROOT } from '../../lib/env.mjs';

const CLAUDE = [path.join(os.homedir(), '.local/bin/claude.exe'), path.join(os.homedir(), 'AppData/Roaming/npm/claude.cmd')].find(fs.existsSync) || 'claude';
const CLAVES = ['instagram_carrusel', 'instagram_reel', 'facebook', 'x', 'tiktok', 'youtube_titulo', 'youtube_texto'];

export function escribirTextos({ pieza, datos }) {
  const encargo = fs.readFileSync(path.join(ROOT, 'scripts/social/textos-encargo.md'), 'utf8')
    .replace('{{PIEZA}}', pieza).replace('{{DATOS}}', typeof datos === 'string' ? datos : JSON.stringify(datos, null, 2));
  for (let intento = 1; intento <= 2; intento++) {
    const r = spawnSync(CLAUDE, ['-p', '--model', 'opus', '--output-format', 'json'], {
      cwd: ROOT, input: encargo, encoding: 'utf8', timeout: 10 * 60000, maxBuffer: 16 * 1024 * 1024, shell: CLAUDE.endsWith('.cmd'),
    });
    try {
      const res = JSON.parse(r.stdout).result;
      const j = JSON.parse(res.slice(res.indexOf('{'), res.lastIndexOf('}') + 1));
      if (CLAVES.every(k => typeof j[k] === 'string' && j[k].trim())) return j;
      throw new Error('faltan claves');
    } catch (e) {
      console.log(`  Textos: respuesta inválida (intento ${intento}): ${e.message}`);
    }
  }
  throw new Error('Claude no devolvió los textos de las redes.');
}
