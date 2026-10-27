#!/usr/bin/env node
// Álbum "Thrive" de Tacet Sin: un tema nuevo por semana, los domingos a las 2:00 (Juan, 2026-10-27; antes, uno por noche). Amor, pasión, entrega y sacrificio
// desde los rasgos psicológicos de querer algo que no siempre nos hace bien; nada deportivo; entre 2:30 y 3:30.
// Referencias del disco: duetos de The Weeknd con mujeres (Lust for Life, The Abyss, Love Me Harder, One of the Girls) →
// cada tema es un dúo masculino-femenino, alt-R&B / synth-pop oscuro y cinematográfico con ADN de trap.
//
// Proceso (Juan, 2026-10-26: "para la instrumental es mejor lo que generamos con código, pero cuando ACE-Step agrega voces
// y pule el beat queda perfecto; esa es la combinación que busco, la de The Shorts"):
//   1. Concepto y sonido (scripts/beats/thrive-concepto.md).
//   2. INSTRUMENTAL COMPUESTA POR CÓDIGO: Claude escribe el .py en UNA llamada (thrive-componer.md, con componer.py y un
//      tema de ejemplo); el código lo renderiza y controla (duración, secciones, dinámica, saturación) y le devuelve los
//      errores, hasta 3 vueltas. Si no sale, respaldo: instrumental de ACE-Step (text2music).
//   3. La letra se escribe para ESA instrumental (thrive-letra.md, con las secciones y compases que declara el propio
//      beat) y se controla la rima por pronunciación (scripts/beats/rimas.py, diccionario fonético CMU).
//   4. ACE-Step "cover" sobre la instrumental (fuerza 0,5, como cantar.mjs en The Shorts): canta el dúo y pule el beat.
//   5. Letra publicada = lo que realmente se canta (scripts/beats/letra-final.mjs: Whisper + Claude).
// Cada paso queda guardado en scripts/beats/thrive.json y en fuentes/beats/thrive/<slug>/: si algo falla, la corrida
// siguiente retoma desde ahí. La instrumental no se publica en la página: va a la música de los videos.
//
//   node scripts/beats/thrive.mjs [--fecha 2026-10-27] [--parte 2]
// Tarea "TopSecretFC-Thrive" (2:00, reintento 5:00, run-thrive-hidden.vbs). Log: scripts/thrive.log
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';
import { pedirJSON, pedirTexto, claude, guardarEjemplo, ultimoMotor } from '../lib/ia.mjs';
import { armarCatalogo } from './catalogo.mjs';
import { letraFinal } from './letra-final.mjs';

loadEnv();
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const FECHA = opt('--fecha', new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }));
// --parte N: otro tema el mismo día (Juan, 2026-10-27: "lanzá otra canción nueva"). Se identifica como <fecha>-<N>.
const PARTE = opt('--parte', null), ID = PARTE && PARTE !== '1' ? `${FECHA}-${PARTE}` : FECHA;
const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const DIR = path.join(ROOT, 'fuentes', 'beats', 'thrive');
const REG = path.join(ROOT, 'scripts', 'beats', 'thrive.json');
const PY = path.join(ROOT, 'fuentes/beats/whisper/.venv/Scripts/python.exe');
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [thrive] ${m}`);
const ff = (...a) => spawnSync(ffmpegPath, ['-hide_banner', ...a], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const dur = f => { const m = (ff('-i', f).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/) || []); return m.length ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; };
const lufs = (f, desde, hasta) => Number((((ff('-ss', String(desde), '-t', String(hasta - desde), '-i', f, '-af', 'ebur128', '-f', 'null', '-').stderr.match(/I:\s*-?[\d.]+ LUFS/g) || []).pop()) || 'I: -70').match(/-?[\d.]+/)[0]);
const toml = s => JSON.stringify(s);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const reg = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : { temas: [] };
const guardar = () => fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
let tema = reg.temas.find(t => (t.id || t.fecha) === ID);
// `fijo`: queda como salió, no se toca (Juan, 2026-10-26, sobre "Too Far In")
if (tema?.fijo || tema?.letraFinal) { log(`El tema ${ID} ya está terminado: "${tema.titulo}".`); process.exit(0); }
fs.mkdirSync(DIR, { recursive: true });
// Una sola corrida a la vez (una prueba a mano y la tarea de las 2:00 se pisarían el mismo tema)
const LOCK = path.join(DIR, '.corriendo');
if (fs.existsSync(LOCK)) {
  const pid = Number(fs.readFileSync(LOCK, 'utf8'));
  let vivo = false; try { process.kill(pid, 0); vivo = true; } catch {}
  if (vivo) { log(`Ya hay una corrida en curso (pid ${pid}).`); process.exit(0); }
}
fs.writeFileSync(LOCK, String(process.pid));
process.on('exit', () => { try { if (fs.readFileSync(LOCK, 'utf8') === String(process.pid)) fs.rmSync(LOCK); } catch {} });

// Ollama (respaldo de la IA para concepto y letra): la app arranca con la sesión; si no, se lo levanta acá
async function asegurarOllama() {
  const vivo = () => fetch('http://127.0.0.1:11434/api/version', { signal: AbortSignal.timeout(3000) }).then(r => r.ok, () => false);
  if (await vivo()) return;
  const exe = path.join(process.env.LOCALAPPDATA || '', 'Programs/Ollama/ollama.exe');
  if (!fs.existsSync(exe)) return;
  spawn(exe, ['serve'], { detached: true, stdio: 'ignore', env: { ...process.env, OLLAMA_MODELS: process.env.OLLAMA_MODELS || 'D:\\ollama\\models' } }).unref();
  for (let i = 0; i < 20 && !(await vivo()); i++) await new Promise(r => setTimeout(r, 1000));
}
await asegurarOllama();

const DEPORTE = /\b(ball|goal|goals|pass(?:es|ed)?|team|club|match|game|field|pitch|stadium|crowd|jersey|coach|referee|whistle|score[ds]?|scoreboard|striker|keeper|kick(?:ed|s)?|penalty|trophy|league)\b/i;
const CASTELLANO = /[áéíóúñ¿¡]|\b(?:del|las|los|una|que|con|por|para|voz|corazón)\b/i;

// ── 1. Concepto y sonido ─────────────────────────────────────────────────────
if (!tema) {
  const anteriores = reg.temas.slice(-30).map(t => `- "${t.titulo}" · trait: ${t.rasgo} · ${t.bpm} BPM, ${t.tonalidad} · sound: ${t.captionInstrumental || t.caption}`).join('\n') || '(none yet)';
  const encargo = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-concepto.md'), 'utf8').replace('{{FECHA}}', FECHA).replace('{{ANTERIORES}}', anteriores);
  log('Concepto y sonido…');
  const j = await pedirJSON(encargo, { orden: ['claude', 'local'], tarea: 'thrive-concepto', temperatura: 0.9,
    claves: ['titulo', 'concepto', 'rasgo', 'caption_instrumental', 'caption_voces', 'voz', 'tonalidad', 'estructura'],
    validar: j => {
      if (!(j.bpm >= 70 && j.bpm <= 140)) return `bpm ${j.bpm}`;
      if (!(j.duracion >= 165 && j.duracion <= 205)) return `duración ${j.duracion}`;
      if (!/^[A-G][#b]? (major|minor)$/.test(String(j.tonalidad).trim())) return `tonalidad "${j.tonalidad}"`;
      if (!Array.isArray(j.estructura) || !j.estructura.includes('chorus')) return 'estructura sin estribillo';
      const t = `${j.titulo}\n${j.caption_instrumental}\n${j.caption_voces}`;
      if (DEPORTE.test(t)) return 'palabra deportiva';
      if (CASTELLANO.test(t)) return 'castellano en título o sonido';
      if (/weeknd|lana|ariana|jennie|lily-rose|del rey|grande/i.test(t)) return 'nombra artistas reales en el sonido';
      if (reg.temas.some(x => x.titulo.toLowerCase() === String(j.titulo).toLowerCase())) return `título repetido "${j.titulo}"`;
      // nada repetido (Juan, 2026-10-27): ni el título ni el rasgo psicológico de un tema anterior
      const norm = x => String(x).toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim();
      if (reg.temas.some(x => norm(x.rasgo) === norm(j.rasgo))) return `rasgo repetido "${j.rasgo}": elegí otro`;
    } });
  const slug = String(j.titulo).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `thrive-${ID}`;
  tema = { ...(ID !== FECHA ? { id: ID } : {}), fecha: FECHA, slug, titulo: j.titulo.trim(), concepto: j.concepto.trim(), rasgo: j.rasgo.trim(), voz: j.voz.trim(),
    captionInstrumental: j.caption_instrumental.trim(), captionVoces: j.caption_voces.trim(), bpm: Math.round(j.bpm),
    tonalidad: j.tonalidad.trim(), duracion: Math.round(j.duracion), estructura: j.estructura };
  reg.temas.push(tema); guardar();
  log(`"${tema.titulo}" — ${tema.rasgo} (${tema.bpm} BPM, ${tema.tonalidad}, ${tema.duracion} s)`);
}
const carpeta = path.join(DIR, tema.slug);
fs.mkdirSync(carpeta, { recursive: true });

// ACE-Step (GTX 1070: float32 —el float16 da NaN— y memoria sin fragmentar, ver generar.mjs)
function aceStep(nombre, lineas) {
  const salida = path.join(carpeta, nombre);
  const listo = () => fs.existsSync(salida) && fs.readdirSync(salida).find(f => f.endsWith('.mp3'));
  if (listo()) return path.join(salida, listo());
  fs.rmSync(salida, { recursive: true, force: true }); fs.mkdirSync(salida, { recursive: true });
  const cfg = path.join(salida, '_config.toml');
  fs.writeFileSync(cfg, [...lineas, `batch_size = 1`, `audio_format = "mp3"`, `save_dir = ${toml(salida)}`].join('\n') + '\n');
  const t0 = Date.now();
  fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
  spawnSync('python', ['-m', 'uv', 'run', 'python', 'cli.py', '--config', cfg, '--log-level', 'WARNING'], {
    cwd: ACE, stdio: ['pipe', 'ignore', 'inherit'], input: '\n'.repeat(3), timeout: 3 * 3600000,
    env: { ...process.env, ACESTEP_DTYPE: 'float32', PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True', ACESTEP_FREE_DIT_BEFORE_VAE: '1', PYTHONIOENCODING: 'utf-8', PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}` },
  });
  fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
  log(`  ACE-Step (${nombre}) terminó en ${Math.round((Date.now() - t0) / 60000)} min`);
  return listo() ? path.join(salida, listo()) : null;
}
const comunes = [`config_path = "acestep-v15-turbo"`, `lm_model_path = "acestep-5Hz-lm-0.6B"`, `backend = "pt"`, `offload_to_cpu = true`, `vocal_language = "en"`, `use_cot_caption = false`, `use_cot_metas = false`, `use_cot_lyrics = false`];

// ── 2. Instrumental compuesta por código ────────────────────────────────────
const PY_TEMA = path.join(ROOT, 'scripts/beats/temas', `thrive_${ID.replace(/-/g, '_')}.py`);
const WAV = path.join(carpeta, 'instrumental.wav'), INSTR = path.join(carpeta, 'instrumental.mp3');
function render() {
  const r = spawnSync('python', ['-m', 'uv', 'run', '--no-project', '--with', 'numpy', '--with', 'scipy', '--with', 'soundfile', PY_TEMA, WAV],
    { cwd: ROOT, encoding: 'utf8', timeout: 15 * 60000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (r.status !== 0 || !fs.existsSync(WAV)) return { error: `El script falló:\n${(r.stderr || r.error?.message || '').slice(-2500)}` };
  const m = (r.stdout || '').match(/SECCIONES=(\[.*\])/);
  let secciones; try { secciones = JSON.parse(m[1]); } catch { return { error: 'No imprimió la línea SECCIONES= con un JSON válido.' }; }
  return { secciones };
}
// Controles del beat: lo que antes se miraba a mano (duración, dinámica por sección, saturación, silencios)
function controlarBeat(secciones) {
  const err = [], d = dur(WAV);
  if (Math.abs(d - tema.duracion) > 12) err.push(`dura ${Math.round(d)} s y tiene que durar ${tema.duracion} s (±8)`);
  if (!secciones.length || !secciones.some(s => s.nombre === 'chorus')) err.push('SECCIONES no declara ningún chorus');
  const med = secciones.map(s => ({ ...s, l: lufs(WAV, s.inicio, Math.max(s.inicio + 1, s.fin)) }));
  const coro = Math.max(...med.filter(s => s.nombre === 'chorus').map(s => s.l));
  for (const s of med) {
    if (s.l < -40) err.push(`la sección ${s.nombre} (${mmss(s.inicio)}) está casi en silencio (${s.l} LUFS)`);
    if (['intro', 'outro'].includes(s.nombre) && coro - s.l < 3.5) err.push(`la ${s.nombre} está apenas ${(coro - s.l).toFixed(1)} dB debajo del estribillo (van 6–8 dB)`);
    if (s.nombre === 'verse' && coro - s.l < 0.8) err.push(`el verso de ${mmss(s.inicio)} suena igual o más fuerte que el estribillo (${(coro - s.l).toFixed(1)} dB)`);
  }
  const pico = Number(((ff('-i', WAV, '-af', 'astats=metadata=0', '-f', 'null', '-').stderr.match(/Peak level dB:\s*(-?[\d.]+)/g) || []).pop() || 'Peak level dB: -1').match(/-?[\d.]+/)[0]);
  if (pico > -0.05) err.push(`satura (pico ${pico} dBFS): normalizar como el ejemplo`);
  return err;
}
if (!fs.existsSync(INSTR)) {
  log('Instrumental compuesta por código…');
  const ejemplo = fs.readFileSync(path.join(ROOT, 'scripts/beats/temas/diario_2026_10_23_1.py'), 'utf8');
  const anteriores = reg.temas.filter(t => t !== tema && t.beat).slice(-10).map(t => `- "${t.titulo}": ${t.beat}`).join('\n') || '(none yet)';
  const base = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-componer.md'), 'utf8')
    .replace('{{CONCEPTO}}', `"${tema.titulo}" — ${tema.concepto} (trait: ${tema.rasgo})`).replace('{{CAPTION}}', tema.captionInstrumental)
    .replace('{{ANTERIORES}}', anteriores).replace('{{REGLAS}}', fs.readFileSync(path.join(ROOT, 'docs/conocimiento/feedback_composicion_musical.md'), 'utf8').replace(/^---[\s\S]*?---\n/, ''))
    .replace('{{BPM}}', tema.bpm).replace('{{TONALIDAD}}', tema.tonalidad).replace('{{ESTRUCTURA}}', tema.estructura.join(', ')).replace('{{DURACION}}', tema.duracion)
    .replace('{{COMPONER}}', fs.readFileSync(path.join(ROOT, 'scripts/beats/componer.py'), 'utf8')).replace('{{EJEMPLO}}', ejemplo);
  let correcciones = '', ok = false;
  for (let i = 1; i <= 3 && !ok; i++) {
    let codigo;
    try {
      log(`  Claude compone (vuelta ${i})…`);
      // Sonnet y razonamiento acotado (Juan, 2026-10-27: "no podemos tardar tanto"): Opus pensaba ~18 min a ~11 tokens/s
      // y escribir el archivo le llevaba otros 10–15; Sonnet escribe varias veces más rápido y es muy bueno con código.
      const res = claude(base.replace('{{CORRECCIONES}}', correcciones), { modelo: 'sonnet', minutos: 15, pensar: 4000 });
      codigo = (res.match(/```(?:python|py)?[ \t]*\r?\n([\s\S]*?)```/i) || [])[1];
      if (!codigo || !/import |def /.test(codigo)) throw new Error(`la respuesta no trae el código del beat; empieza con: ${res.slice(0, 160).replace(/\s+/g, ' ')}`);
    } catch (e) { log(`  ${e.message.slice(0, 260)}`); if (/sin cupo/i.test(e.message)) break; continue; }
    fs.writeFileSync(PY_TEMA, codigo);
    fs.rmSync(WAV, { force: true });
    const r = render();
    const err = r.error ? [r.error] : controlarBeat(r.secciones);
    if (!err.length) { ok = true; if (i === 1) guardarEjemplo('thrive-beat', base.replace('{{CORRECCIONES}}', ''), codigo); tema.secciones = r.secciones; tema.beat = (codigo.match(/Rasgo distintivo:\s*([^\n]+)/i) || [, tema.captionInstrumental])[1].trim(); break; }
    log(`  a corregir: ${err.map(e => e.split('\n')[0]).join(' · ')}`);
    correcciones = `\n## Your previous version failed. Fix it and return the complete file again\n${err.map(e => `- ${e}`).join('\n')}\n\nPrevious file:\n\`\`\`python\n${codigo}\n\`\`\`\n`;
  }
  if (ok) {
    ff('-loglevel', 'error', '-y', '-i', WAV, '-b:a', '256k', INSTR);
    tema.instrumental = 'codigo'; guardar();
    log(`  ✓ beat compuesto (${mmss(dur(INSTR))}): ${path.relative(ROOT, PY_TEMA)}`);
  } else {
    // respaldo: instrumental de ACE-Step, para que el tema de la noche salga igual
    log('  la composición por código no salió: respaldo con ACE-Step text2music');
    const a = aceStep('instrumental-ace', [...comunes, `task_type = "text2music"`, `instrumental = true`, `thinking = true`,
      `caption = ${toml(tema.captionInstrumental + ', instrumental')}`, `bpm = ${tema.bpm}`, `keyscale = ${toml(tema.tonalidad)}`,
      `lyrics = ${toml(tema.estructura.map(s => `[${s}]`).join('\n\n'))}`, `duration = ${tema.duracion}`]);
    if (!a) { log('ERROR: no salió la instrumental. Se reintenta en la próxima corrida.'); process.exit(1); }
    fs.copyFileSync(a, INSTR); tema.instrumental = 'ace'; fs.rmSync(PY_TEMA, { force: true }); guardar();
  }
}

// ── 3. Letra para esa instrumental ──────────────────────────────────────────
// Secciones: las que declara el beat compuesto; con el respaldo de ACE-Step, medidas por energía (sonoridad por compás)
function medir(mp3) {
  const compas = 240 / tema.bpm;
  const m = [...ff('-nostats', '-i', mp3, '-af', 'ebur128=framelog=verbose', '-f', 'null', '-').stderr.matchAll(/t:\s*([\d.]+)\s+TARGET:[^M]*M:\s*(-?[\d.]+|-inf)/g)]
    .map(x => [Number(x[1]), x[2] === '-inf' ? -70 : Math.max(-70, Number(x[2]))]);
  const n = Math.floor(dur(mp3) / compas);
  const barras = Array.from({ length: n }, (_, i) => { const v = m.filter(([t]) => t >= i * compas && t < (i + 1) * compas).map(x => x[1]); return v.length ? v.reduce((a, b) => a + b) / v.length : -70; });
  const secs = [];
  for (let i = 0; i < n; i++) {
    const s = secs[secs.length - 1], media = s && s.e.reduce((a, b) => a + b) / s.e.length;
    if (!s || (s.e.length >= 4 && Math.abs(barras[i] - media) >= 3 && Math.abs((barras[i + 1] ?? barras[i]) - media) >= 3)) secs.push({ desde: i, e: [barras[i]] }); else s.e.push(barras[i]);
  }
  return secs.map(s => ({ nombre: '?', inicio: +(s.desde * compas).toFixed(1), fin: +((s.desde + s.e.length) * compas).toFixed(1), compases: s.e.length }));
}
function rimas(letra) {
  const f = path.join(carpeta, '_letra.txt'); fs.writeFileSync(f, letra);
  const r = spawnSync(PY, [path.join(ROOT, 'scripts/beats/rimas.py'), f], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  try { return JSON.parse(r.stdout); } catch { return { ok: true, problemas: [], aviso: 'no se pudo controlar la rima' }; }
}
if (!tema.letra) {
  const secciones = tema.secciones || medir(INSTR), compas = 240 / tema.bpm;
  tema.duracion = Math.round(dur(INSTR)); guardar();
  const base = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-letra.md'), 'utf8')
    .replace('{{TITULO}}', tema.titulo).replace('{{CONCEPTO}}', tema.concepto).replace('{{RASGO}}', tema.rasgo).replace('{{CAPTION}}', tema.captionInstrumental)
    .replace('{{VOCES}}', tema.captionVoces).replace('{{BPM}}', tema.bpm).replace('{{TONALIDAD}}', tema.tonalidad).replace('{{DURACION}}', tema.duracion)
    .replace('{{COMPAS}}', compas.toFixed(2)).replace('{{ESTRUCTURA}}', tema.estructura.join(', '))
    .replace('{{MAPA}}', secciones.map((s, i) => `${i + 1}. ${s.nombre !== '?' ? s.nombre + ' · ' : ''}${mmss(s.inicio)}–${mmss(s.fin)} · ${s.compases} bars`).join('\n'));
  let correcciones = '', mejor = null;
  // Modelo local primero (Juan, 2026-10-27): 3 vueltas con Gemma corrigiendo rimas; si no rima, Claude Sonnet.
  for (let i = 1; i <= 5; i++) {
    log(`Letra (vuelta ${i})…`);
    const letra = (await pedirTexto(base.replace('{{CORRECCIONES}}', correcciones), { orden: i <= 3 ? ['local', 'claude'] : ['claude', 'local'], claudeModelo: 'sonnet', temperatura: 0.8,   // letra con Sonnet (Juan, 2026-10-27: "solo importa que tenga rimas"; las controla rimas.py)

      validar: x => !/\[(verse|chorus)[^\]]*\]/i.test(x) ? 'sin etiquetas de sección' : DEPORTE.test(x) ? 'palabra deportiva' : CASTELLANO.test(x) ? 'castellano' : null }))
      .replace(/^```\w*\n?|```$/g, '').trim();
    const r = rimas(letra);
    if (!mejor || r.problemas.length < mejor.r.problemas.length) mejor = { letra, r, motor: ultimoMotor };
    if (r.ok) break;
    log(`  rimas a corregir: ${r.problemas.length}`);
    correcciones = `\n## Your previous version\n${letra}\n\n## Fix these lines (they do not rhyme BY SOUND; keep everything else)\n- ${r.problemas.join('\n- ')}\n`;
  }
  if (mejor.r.ok && mejor.motor === 'claude') guardarEjemplo('thrive-letra', base.replace('{{CORRECCIONES}}', ''), mejor.letra);
  tema.letra = mejor.letra; tema.letraPor = mejor.motor; if (!mejor.r.ok) tema.avisosRima = mejor.r.problemas; guardar();
  log(`Letra lista${mejor.r.ok ? ', rimas OK' : ` (quedan ${mejor.r.problemas.length} rimas flojas)`}`);
}

// ── 4. ACE-Step "cover" sobre la instrumental: canta el dúo y pule el beat (como The Shorts) ───────────────
if (!tema.audio) {
  log('Voces y pulido (cover sobre la instrumental)…');
  // la GTX 1070 a veces tira "CUDA error: illegal memory access" a mitad del cover (26/10): un segundo intento
  const cover = () => aceStep('cover', [...comunes, `task_type = "cover"`, `thinking = true`,
    `src_audio = ${toml(INSTR)}`, `audio_cover_strength = 0.5`, `instrumental = false`,
    `caption = ${toml(`${tema.captionInstrumental}, ${tema.captionVoces}`)}`, `bpm = ${tema.bpm}`, `keyscale = ${toml(tema.tonalidad)}`,
    `lyrics = ${toml(tema.letra)}`, `duration = ${Math.round(dur(INSTR))}`]);
  const voces = cover() || (log('  el cover falló, segundo intento…'), cover());
  if (!voces) { log('ERROR: no salió la versión con voz. Se reintenta en la próxima corrida.'); process.exit(1); }
  const final = path.join(DIR, `${tema.slug}.mp3`), d = dur(voces);
  ff('-loglevel', 'error', '-y', '-i', voces, '-af', `loudnorm=I=-14:TP=-1:LRA=11,afade=t=out:st=${Math.max(0, d - 3).toFixed(2)}:d=3`, '-ar', '44100', '-b:a', '192k', final);
  const df = dur(final);
  if (df < 150 || df > 210) log(`AVISO: duró ${Math.round(df)} s (fuera de 2:30–3:30)`);
  await putFile(final, `musica/thrive/${tema.slug}.mp3`);
  tema.audio = `musica/thrive/${tema.slug}.mp3?v=${Date.now().toString(36)}`; tema.duracion = Math.round(df); tema.generado = new Date().toISOString(); guardar();
  log(`✓ "${tema.titulo}" (${mmss(df)}) con voz`);

  // La instrumental no se publica en la página: va a la música de los videos (privado, _fuentes/musica/propios)
  const pulida = path.join(carpeta, 'instrumental-videos.mp3'), di = dur(INSTR);
  ff('-loglevel', 'error', '-y', '-i', INSTR, '-af', `loudnorm=I=-14:TP=-1:LRA=11,afade=t=out:st=${Math.max(0, di - 3).toFixed(2)}:d=3`, '-ar', '44100', '-b:a', '192k', pulida);
  const biblio = `${ID} - ${tema.titulo}.mp3`;
  fs.mkdirSync(path.join(ROOT, 'fuentes/musica/propios'), { recursive: true });
  fs.copyFileSync(pulida, path.join(ROOT, 'fuentes/musica/propios', biblio));
  await putFile(pulida, `_fuentes/musica/propios/${biblio}`);
}

// ── 5. Letra final (lo que realmente se canta), catálogo, commit ─────────────
log('Letra final (Whisper)…');
try { tema.letraFinal = await letraFinal(tema, path.join(DIR, `${tema.slug}.mp3`)); }
catch (e) { log(`  no se pudo transcribir (${e.message}); se publica la letra escrita`); tema.letraFinal = tema.letra; }
guardar();
await armarCatalogo({ log });
const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
git('add', 'scripts/beats/thrive.json', ...(fs.existsSync(PY_TEMA) ? [PY_TEMA] : []));
const c = git('commit', '-m', `feat: Thrive — "${tema.titulo}" (${tema.rasgo})\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
if (c.status === 0) { const ps = git('push', '-q'); log(ps.status === 0 ? 'Commit y push hechos.' : 'Push falló: ' + ps.stderr.slice(-200)); }
log(`✓ "${tema.titulo}" publicado en topsecret.ar/music`);
