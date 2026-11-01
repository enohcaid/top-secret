// Voces de Thrive por tramos (Juan, 2026-11-01: el cover del tema entero "desvirtúa la estructura… no respeta los
// cambios de beat y aplana todo"). Corta la instrumental en tramos de secciones enteras (mínimo ~10 s: ACE no canta
// pedazos más cortos; las secciones chicas se pegan a la vecina), le da a cada tramo SOLO la letra de sus secciones,
// los canta en una sola carga del modelo (ace_secciones.py), los controla con el "oído" (oido.py: letra cantada, pulso
// del beat conservado, voz presente), rehace los que fallan con otra semilla y los une en la grilla del beat (unir_tramos.py).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT } from '../lib/env.mjs';

const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const PY = path.join(ROOT, 'fuentes/beats/whisper/.venv/Scripts/python.exe');
const MIN = 10;
// umbrales del oído (calibrados el 01/11 con "Borrowed Time" v1: dos partes distintas del beat dan ~0.1 de pulso; el
// cover entero que aplanaba, 0.3–0.4)
export const UMBRAL = { letra: 0.6, beat: 0.35, voz: 1.05 };
const PATH_FF = `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}`;

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
    const instrumental = /instrumental/i.test(b[i].tag) || !b[i].texto.replace(/\(.*?\)/g, '').trim();
    const txt = instrumental ? '' : `[${b[i].tag}]\n${b[i].texto}`;
    if (!cur) cur = { inicio: s.inicio, fin: s.fin, letra: [], nombres: [] };
    cur.fin = s.fin; if (txt) cur.letra.push(txt); cur.nombres.push(s.nombre);
    if (cur.fin - cur.inicio >= MIN) { tramos.push(cur); cur = null; }
  });
  if (cur) { if (tramos.length) { const u = tramos.at(-1); u.fin = cur.fin; u.letra.push(...cur.letra); u.nombres.push(...cur.nombres); } else tramos.push(cur); }
  return tramos.map(t => ({ ...t, letra: t.letra.join('\n\n') }));
}

const falla = (o, t) => [o.letra !== undefined && o.letra < UMBRAL.letra && `letra ${o.letra}`, o.beat < UMBRAL.beat && `beat ${o.beat}`,
  t.letra && o.voz < UMBRAL.voz && `voz ${o.voz}`].filter(Boolean);

export function oir(trabajo) {
  const r = spawnSync(PY, [path.join(ROOT, 'scripts/beats/oido.py'), trabajo], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PATH: PATH_FF } });
  const m = (r.stdout || '').match(/OIDO=(.+)/);
  return m ? JSON.parse(m[1]) : null;
}

export function cantarPorSecciones({ wav, secciones, letra, caption, bpm, tonalidad, carpeta, semilla, fuerza = 0.5, rondas = 3, log = console.log }) {
  const dir = path.join(carpeta, 'tramos');
  fs.mkdirSync(dir, { recursive: true });
  const tramos = armarTramos(secciones, letra).map((t, i) => {
    const src = path.join(dir, `beat-${i}.wav`);
    if (!fs.existsSync(src)) spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-ss', String(t.inicio), '-t', String(t.fin - t.inicio), src]);
    return { src, letra: t.letra, duracion: +(t.fin - t.inicio).toFixed(2), salida: path.join(dir, `voz-${i}.wav`), nombres: t.nombres, semilla };
  });
  log(`  ${tramos.length} tramos: ${tramos.map(t => `${t.nombres.join('+')} ${Math.round(t.duracion)}s`).join(' · ')}`);
  const trabajo = path.join(dir, 'trabajo.json');
  let oido = null;
  for (let ronda = 1; ronda <= rondas; ronda++) {
    fs.writeFileSync(trabajo, JSON.stringify({ caption, bpm, tonalidad, fuerza, semilla, tramos }, null, 2));
    const r = spawnSync('python', ['-m', 'uv', 'run', 'python', path.join(ROOT, 'scripts/beats/ace_secciones.py'), trabajo], {
      cwd: ACE, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', timeout: 3 * 3600000, maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, ACESTEP_DTYPE: 'float32', PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True', ACESTEP_FREE_DIT_BEFORE_VAE: '1', PYTHONIOENCODING: 'utf-8', PATH: PATH_FF },
    });
    for (const l of (r.stdout || '').split('\n').filter(l => /^tramo .*(listo|ERROR)/.test(l))) log(`  ${l}`);
    if (!/TRAMOS_OK/.test(r.stdout || '')) return null;
    oido = oir(trabajo);
    if (!oido) { log('  (el oído no respondió: se sigue sin control)'); break; }
    const malos = tramos.map((t, i) => ({ i, f: falla(oido[i], t) })).filter(x => x.f.length);
    log(`  oído (ronda ${ronda}): ${oido.map((o, i) => `${tramos[i].nombres.join('+')} letra ${o.letra ?? '-'} beat ${o.beat} voz ${o.voz}`).join(' · ')}`);
    if (!malos.length || ronda === rondas) break;
    // los que fallan se rehacen con otra semilla (el resto queda: ace_secciones saltea los que ya están)
    for (const { i, f } of malos) {
      log(`  rehago ${tramos[i].nombres.join('+')}: ${f.join(', ')}`);
      fs.rmSync(tramos[i].salida, { force: true });
      tramos[i].semilla = semilla + 7919 * ronda + i;
    }
  }
  const salida = path.join(carpeta, 'voces-por-tramos.wav');
  const u = spawnSync('python', ['-m', 'uv', 'run', '--no-project', '--with', 'numpy', '--with', 'scipy', '--with', 'soundfile', path.join(ROOT, 'scripts/beats/unir_tramos.py'), trabajo, salida],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  log(`  ${(u.stdout || u.stderr || '').trim().split('\n').pop()}`);
  if (oido) fs.writeFileSync(path.join(carpeta, 'oido.json'), JSON.stringify(oido.map((o, i) => ({ ...o, secciones: tramos[i].nombres, fallas: falla(o, tramos[i]) })), null, 2));
  return fs.existsSync(salida) ? salida : null;
}
