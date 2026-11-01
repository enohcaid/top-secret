// Voces de Thrive por tramos (Juan, 2026-11-01: el cover del tema entero "desvirtúa la estructura… no respeta los
// cambios de beat y aplana todo"). Corta la instrumental en tramos de secciones enteras (mínimo ~10 s: ACE no canta
// pedazos más cortos; las secciones chicas se pegan a la vecina), le da a cada tramo SOLO la letra de sus secciones,
// los canta en una sola carga del modelo (ace_secciones.py) y los une en la grilla del beat (unir_tramos.py).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT } from '../lib/env.mjs';

const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const MIN = 10;

// letra → bloques en orden: [{ tag, texto }]
export function bloques(letra) {
  const partes = letra.split(/^\s*\[([^\]]+)\]\s*$/m), out = [];
  for (let i = 1; i < partes.length; i += 2) out.push({ tag: partes[i].trim(), texto: partes[i + 1].trim() });
  return out;
}

// secciones del beat + bloques de la letra (mismo orden y cantidad: lo controla la letra) → tramos de ≥ MIN segundos
export function armarTramos(secciones, letra) {
  const b = bloques(letra);
  if (b.length !== secciones.length) throw new Error(`la letra tiene ${b.length} secciones y el beat ${secciones.length}`);
  const tramos = [];
  let cur = null;
  secciones.forEach((s, i) => {
    const txt = b[i].texto ? `[${b[i].tag}]\n${b[i].texto}` : '';
    if (!cur) cur = { inicio: s.inicio, fin: s.fin, letra: [], nombres: [] };
    cur.fin = s.fin; if (txt) cur.letra.push(txt); cur.nombres.push(s.nombre);
    if (cur.fin - cur.inicio >= MIN) { tramos.push(cur); cur = null; }
  });
  if (cur) { if (tramos.length) { const u = tramos.at(-1); u.fin = cur.fin; u.letra.push(...cur.letra); u.nombres.push(...cur.nombres); } else tramos.push(cur); }
  return tramos.map(t => ({ ...t, letra: t.letra.join('\n\n') }));
}

export function cantarPorSecciones({ wav, secciones, letra, caption, bpm, tonalidad, carpeta, semilla, log = console.log }) {
  const dir = path.join(carpeta, 'tramos');
  fs.mkdirSync(dir, { recursive: true });
  const tramos = armarTramos(secciones, letra).map((t, i) => {
    const src = path.join(dir, `beat-${i}.wav`);
    if (!fs.existsSync(src)) spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-ss', String(t.inicio), '-t', String(t.fin - t.inicio), src]);
    return { src, letra: t.letra, duracion: +(t.fin - t.inicio).toFixed(2), salida: path.join(dir, `voz-${i}.wav`), nombres: t.nombres };
  });
  log(`  ${tramos.length} tramos: ${tramos.map(t => `${t.nombres.join('+')} ${Math.round(t.duracion)}s`).join(' · ')}`);
  const trabajo = path.join(dir, 'trabajo.json');
  fs.writeFileSync(trabajo, JSON.stringify({ caption, bpm, tonalidad, fuerza: 0.5, semilla, tramos }, null, 2));
  const r = spawnSync('python', ['-m', 'uv', 'run', 'python', path.join(ROOT, 'scripts/beats/ace_secciones.py'), trabajo], {
    cwd: ACE, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', timeout: 3 * 3600000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ACESTEP_DTYPE: 'float32', PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True', ACESTEP_FREE_DIT_BEFORE_VAE: '1', PYTHONIOENCODING: 'utf-8', PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}` },
  });
  for (const l of (r.stdout || '').split('\n').filter(l => /^tramo|TRAMOS_OK/.test(l))) log(`  ${l}`);
  if (!/TRAMOS_OK/.test(r.stdout || '')) return null;
  const salida = path.join(carpeta, 'voces-por-tramos.wav');
  const u = spawnSync('python', ['-m', 'uv', 'run', '--no-project', '--with', 'numpy', '--with', 'scipy', '--with', 'soundfile', path.join(ROOT, 'scripts/beats/unir_tramos.py'), trabajo, salida],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  log(`  ${(u.stdout || u.stderr || '').trim().split('\n').pop()}`);
  return fs.existsSync(salida) ? salida : null;
}
