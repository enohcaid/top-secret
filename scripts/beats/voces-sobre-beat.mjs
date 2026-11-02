// Voces de Thrive en dos pasos (Juan, 2026-11-01: "pasar primero el beat por ACE y después las voces en partes y
// anexarlas al beat"). El cover del tema entero corría la letra (los versos de rap perdían más de la mitad de las
// palabras, el último estribillo se caía) y aplanaba la batería (el oído midió que conservaba ~la mitad del pulso).
//   1. ACE pule el beat solo, sin voz, de una pasada (sigue pasando todo por ACE: Juan, "sí o sí tiene que pasar por ACE")
//   2. el beat pulido se corta en tramos de secciones enteras (≥10 s) y ACE canta cada uno con SOLO su letra, misma
//      descripción de voz y misma semilla (ace_secciones.py, una carga del modelo)
//   3. Demucs separa la voz de cada toma y el oído (Whisper sobre la voz sola) controla que se cante su letra; la que
//      falla se rehace con otra semilla
//   4. cada voz entra en el segundo exacto de su tramo sobre el beat pulido (montar_voces.py)
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT } from '../lib/env.mjs';

const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const PY = path.join(ROOT, 'fuentes/beats/whisper/.venv/Scripts/python.exe');
const PATH_FF = `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}`;
const MIN = 10, UMBRAL_LETRA = 0.6;

const bloques = letra => { const p = letra.split(/^\s*\[([^\]]+)\]\s*$/m), out = []; for (let i = 1; i < p.length; i += 2) out.push({ tag: p[i].trim(), texto: p[i + 1].trim() }); return out; };
function tramosDe(secciones, letra) {
  const b = bloques(letra);
  if (b.length !== secciones.length) throw new Error(`la letra tiene ${b.length} secciones y el beat ${secciones.length}`);
  const out = []; let cur = null;
  secciones.forEach((s, i) => {
    const canta = !/instrumental/i.test(b[i].tag) && b[i].texto.replace(/\(.*?\)/g, '').trim();
    if (!cur) cur = { inicio: s.inicio, fin: s.fin, letra: [], nombres: [] };
    cur.fin = s.fin; if (canta) cur.letra.push(`[${b[i].tag}]\n${b[i].texto}`); cur.nombres.push(s.nombre);
    if (cur.fin - cur.inicio >= MIN) { out.push(cur); cur = null; }
  });
  if (cur) { const u = out.at(-1); if (u) { u.fin = cur.fin; u.letra.push(...cur.letra); u.nombres.push(...cur.nombres); } else out.push(cur); }
  return out.map(t => ({ ...t, letra: t.letra.join('\n\n') }));
}
function ace(trabajo) {
  const r = spawnSync('python', ['-m', 'uv', 'run', 'python', path.join(ROOT, 'scripts/beats/ace_secciones.py'), trabajo], {
    cwd: ACE, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', timeout: 3 * 3600000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ACESTEP_DTYPE: 'float32', PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True', ACESTEP_FREE_DIT_BEFORE_VAE: '1', PYTHONIOENCODING: 'utf-8', PATH: PATH_FF },
  });
  return /TRAMOS_OK/.test(r.stdout || '');
}
const cortar = (src, desde, largo, dst) => { if (!fs.existsSync(dst)) spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(desde), '-t', String(largo), '-i', src, dst]); };

export function vocesSobreBeat({ wav, secciones, letra, caption, captionBeat, bpm, tonalidad, carpeta, semilla, fuerzaBeat = 0.65, fuerzaVoz = 0.5, log = console.log }) {
  const dir = path.join(carpeta, 'voces'); fs.mkdirSync(dir, { recursive: true });
  const dur = secciones.at(-1).fin;
  // 1. el beat, pulido por ACE sin voz
  const beat = path.join(dir, 'beat-ace.wav');
  if (!fs.existsSync(beat)) {
    log('  ACE pule el beat (sin voz)…');
    const tb = path.join(dir, 'trabajo-beat.json');
    fs.writeFileSync(tb, JSON.stringify({ caption: captionBeat, bpm, tonalidad, fuerza: fuerzaBeat, semilla, tramos: [{ src: wav, letra: '', duracion: +dur.toFixed(2), salida: beat }] }, null, 2));
    if (!ace(tb)) return null;
  }
  // 2–3. voces por tramo sobre el beat pulido, separadas y controladas
  const tramos = tramosDe(secciones, letra).map((t, i) => {
    const src = path.join(dir, `tramo-${i}.wav`); cortar(beat, t.inicio, t.fin - t.inicio, src);
    return { ...t, src, duracion: +(t.fin - t.inicio).toFixed(2), salida: path.join(dir, `toma-${i}.wav`), voz: path.join(dir, `voz-${i}.wav`), semilla };
  });
  log(`  ${tramos.length} tramos: ${tramos.map(t => `${t.nombres.join('+')}${t.letra ? '' : ' (sin voz)'} ${Math.round(t.duracion)}s`).join(' · ')}`);
  const conVoz = tramos.filter(t => t.letra);
  for (let ronda = 1; ronda <= 3; ronda++) {
    const pendientes = conVoz.filter(t => !fs.existsSync(t.voz));
    if (!pendientes.length) break;
    const tv = path.join(dir, 'trabajo-voces.json');
    fs.writeFileSync(tv, JSON.stringify({ caption, bpm, tonalidad, fuerza: fuerzaVoz, semilla, tramos: pendientes.map(({ src, letra, duracion, salida, semilla }) => ({ src, letra, duracion, salida, semilla })) }, null, 2));
    log(`  ACE canta ${pendientes.length} tramo(s) (ronda ${ronda})…`);
    if (!ace(tv)) return null;
    // Demucs: la voz sola de cada toma
    const sep = path.join(dir, 'sep');
    spawnSync(PY, ['-m', 'demucs', '-n', 'htdemucs', '--two-stems', 'vocals', '-o', sep, ...pendientes.map(t => t.salida)], { encoding: 'utf8', env: { ...process.env, PATH: PATH_FF } });
    for (const t of pendientes) { const v = path.join(sep, 'htdemucs', path.basename(t.salida, '.wav'), 'vocals.wav'); if (fs.existsSync(v)) fs.renameSync(v, t.voz); }
    // oído: ¿se canta la letra de cada tramo?
    const to = path.join(dir, 'trabajo-oido.json');
    fs.writeFileSync(to, JSON.stringify({ tramos: pendientes.filter(t => fs.existsSync(t.voz)).map(t => ({ src: t.src, salida: t.voz, letra: t.letra })) }));
    const o = spawnSync(PY, [path.join(ROOT, 'scripts/beats/oido.py'), to], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PATH: PATH_FF } });
    const m = (o.stdout || '').match(/OIDO=(.+)/), res = m ? JSON.parse(m[1]) : [];
    pendientes.filter(t => fs.existsSync(t.voz)).forEach((t, k) => {
      t.letraOida = res[k]?.letra;
      const mal = t.letraOida !== undefined && t.letraOida < UMBRAL_LETRA;
      log(`    ${t.nombres.join('+')}: letra ${t.letraOida ?? '?'}${mal && ronda < 3 ? ' → otra toma' : ''}`);
      if (mal && ronda < 3) { fs.rmSync(t.voz, { force: true }); fs.rmSync(t.salida, { force: true }); t.semilla = semilla + 7919 * ronda; }
    });
  }
  // 4. montaje
  const salida = path.join(carpeta, 'voces-sobre-beat.wav'), tm = path.join(dir, 'trabajo-montaje.json');
  fs.writeFileSync(tm, JSON.stringify({ beat, tramos: tramos.map(t => ({ inicio: t.inicio, fin: t.fin, voz: t.letra && fs.existsSync(t.voz) ? t.voz : null })) }));
  const u = spawnSync('python', ['-m', 'uv', 'run', '--no-project', '--with', 'numpy', '--with', 'scipy', '--with', 'soundfile', path.join(ROOT, 'scripts/beats/montar_voces.py'), tm, salida], { cwd: ROOT, encoding: 'utf8' });
  log(`  ${(u.stdout || u.stderr || '').trim().split('\n').pop()}`);
  return fs.existsSync(salida) ? { salida, letraPorTramo: tramos.map(t => ({ tramo: t.nombres.join('+'), letra: t.letraOida ?? null })) } : null;
}
