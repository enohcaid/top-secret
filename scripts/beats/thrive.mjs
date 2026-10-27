#!/usr/bin/env node
// Álbum "Thrive": un tema nuevo cada noche a las 2:00 (Juan, 2026-10-26). Amor, pasión, entrega y sacrificio desde los
// rasgos psicológicos de querer algo que no siempre nos hace bien; nada deportivo; entre 2:30 y 3:30. Referencias del
// disco: duetos de The Weeknd con mujeres (Lust for Life, The Abyss, Love Me Harder, One of the Girls) → cada tema es un
// dúo masculino-femenino, alt-R&B / synth-pop oscuro y cinematográfico.
//
// Proceso (definido por Juan, 2026-10-26):
//   1. Concepto y sonido (scripts/beats/thrive-concepto.md).
//   2. INSTRUMENTAL primero, con ACE-Step turbo: marca el estilo de la canción.
//   3. Se mide la instrumental (secciones por energía, en compases) y la letra se escribe para ESA instrumental
//      (thrive-letra.md), con control de rimas por pronunciación (scripts/beats/rimas.py, diccionario fonético CMU).
//   4. La voz al final: ACE-Step base, tarea "lego" (genera la pista de voces sobre la instrumental, sin cambiarla).
//   5. Letra publicada = lo que realmente se canta (scripts/beats/letra-final.mjs: Whisper + Claude).
// Claude escribe en llamadas livianas (scripts/lib/ia.mjs) con el modelo local de respaldo. Cada paso queda guardado en
// scripts/beats/thrive.json y en fuentes/beats/thrive/<slug>/: si algo falla, la corrida siguiente retoma desde ahí.
// La instrumental no se publica (Juan: no más versiones instrumentales en la página); va solo a la música de los videos.
//
//   node scripts/beats/thrive.mjs [--fecha 2026-10-27]
// Tarea "TopSecretFC-Thrive" (2:00, reintento 5:00, run-thrive-hidden.vbs). Log: scripts/thrive.log
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';
import { pedirJSON, pedirTexto } from '../lib/ia.mjs';
import { armarCatalogo } from './catalogo.mjs';
import { letraFinal } from './letra-final.mjs';

loadEnv();
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const FECHA = opt('--fecha', new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }));
const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const DIR = path.join(ROOT, 'fuentes', 'beats', 'thrive');
const REG = path.join(ROOT, 'scripts', 'beats', 'thrive.json');
const PY = path.join(ROOT, 'fuentes/beats/whisper/.venv/Scripts/python.exe');
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [thrive] ${m}`);
const ff = (...a) => spawnSync(ffmpegPath, ['-hide_banner', ...a], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const dur = f => { const m = (ff('-i', f).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/) || []); return m.length ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; };
const toml = s => JSON.stringify(s);
const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const reg = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : { temas: [] };
const guardar = () => fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
let tema = reg.temas.find(t => t.fecha === FECHA);
// `fijo`: queda como salió, no se toca (Juan, 2026-10-26, sobre "Too Far In")
if (tema?.fijo || tema?.letraFinal) { log(`El tema de ${FECHA} ya está terminado: "${tema.titulo}".`); process.exit(0); }
fs.mkdirSync(DIR, { recursive: true });

// Ollama (respaldo de la IA): la app arranca con la sesión; si no, se lo levanta acá
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
  const j = await pedirJSON(encargo, { orden: ['claude', 'local'], temperatura: 0.9,
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
    } });
  const slug = String(j.titulo).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `thrive-${FECHA}`;
  tema = { fecha: FECHA, slug, titulo: j.titulo.trim(), concepto: j.concepto.trim(), rasgo: j.rasgo.trim(), voz: j.voz.trim(),
    captionInstrumental: j.caption_instrumental.trim(), captionVoces: j.caption_voces.trim(), bpm: Math.round(j.bpm),
    tonalidad: j.tonalidad.trim(), duracion: Math.round(j.duracion), estructura: j.estructura };
  reg.temas.push(tema); guardar();
  log(`"${tema.titulo}" — ${tema.rasgo} (${tema.bpm} BPM, ${tema.tonalidad}, ${tema.duracion} s)`);
}
const carpeta = path.join(DIR, tema.slug);

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
    cwd: ACE, stdio: ['pipe', 'ignore', 'inherit'], input: '\n'.repeat(3), timeout: 4 * 3600000,
    env: { ...process.env, ACESTEP_DTYPE: 'float32', PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True', ACESTEP_FREE_DIT_BEFORE_VAE: '1', PYTHONIOENCODING: 'utf-8', PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}` },
  });
  fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
  log(`  ACE-Step (${nombre}) terminó en ${Math.round((Date.now() - t0) / 60000)} min`);
  return listo() ? path.join(salida, listo()) : null;
}
const comunes = [`backend = "pt"`, `offload_to_cpu = true`, `vocal_language = "en"`, `use_cot_caption = false`, `use_cot_metas = false`, `use_cot_lyrics = false`];

// ── 2. Instrumental ──────────────────────────────────────────────────────────
log('Instrumental…');
const instrumental = aceStep('instrumental', [
  `config_path = "acestep-v15-turbo"`, `lm_model_path = "acestep-5Hz-lm-0.6B"`, ...comunes, `task_type = "text2music"`, `instrumental = true`, `thinking = true`,
  `caption = ${toml(tema.captionInstrumental + ', instrumental')}`, `bpm = ${tema.bpm}`, `keyscale = ${toml(tema.tonalidad)}`,
  `lyrics = ${toml(tema.estructura.map(s => `[${s}]`).join('\n\n'))}`, `duration = ${tema.duracion}`,
]);
if (!instrumental) { log('ERROR: ACE-Step no generó la instrumental. Se reintenta en la próxima corrida.'); process.exit(1); }

// ── 3. Medición de la instrumental y letra ──────────────────────────────────
// Sonoridad momentánea (ebur128) promediada por compás; una sección nueva cuando la energía cambia ≥ 3 dB
// sostenidos (mínimo 4 compases). Es lo que se le da al letrista: dónde está cada sección y cuánto dura.
function mapa(mp3) {
  const compas = 240 / tema.bpm;
  const m = [...ff('-nostats', '-i', mp3, '-af', 'ebur128=framelog=verbose', '-f', 'null', '-').stderr.matchAll(/t:\s*([\d.]+)\s+TARGET:[^M]*M:\s*(-?[\d.]+|-inf)/g)]
    .map(x => [Number(x[1]), x[2] === '-inf' ? -70 : Math.max(-70, Number(x[2]))]);
  const total = dur(mp3), n = Math.floor(total / compas);
  const barras = Array.from({ length: n }, (_, i) => { const v = m.filter(([t]) => t >= i * compas && t < (i + 1) * compas).map(x => x[1]); return v.length ? v.reduce((a, b) => a + b) / v.length : -70; });
  const secs = [];
  for (let i = 0; i < n; i++) {
    const s = secs[secs.length - 1], media = s && s.e.reduce((a, b) => a + b) / s.e.length;
    const cambia = s && s.e.length >= 4 && Math.abs(barras[i] - media) >= 3 && Math.abs((barras[i + 1] ?? barras[i]) - media) >= 3;
    if (!s || cambia) secs.push({ desde: i, e: [barras[i]] }); else s.e.push(barras[i]);
  }
  const max = Math.max(...secs.map(s => s.e.reduce((a, b) => a + b) / s.e.length));
  return { compas, secciones: secs.map(s => { const e = s.e.reduce((a, b) => a + b) / s.e.length;
    return { inicio: +(s.desde * compas).toFixed(1), fin: +((s.desde + s.e.length) * compas).toFixed(1), compases: s.e.length, energia: e >= max - 3 ? 'alta' : e >= max - 8 ? 'media' : 'baja' }; }) };
}
function rimas(letra) {
  const f = path.join(carpeta, '_letra.txt'); fs.writeFileSync(f, letra);
  const r = spawnSync(PY, [path.join(ROOT, 'scripts/beats/rimas.py'), f], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  try { return JSON.parse(r.stdout); } catch { return { ok: true, problemas: [], aviso: 'no se pudo controlar la rima' }; }
}
if (!tema.letra) {
  const { compas, secciones } = mapa(instrumental);
  tema.duracion = Math.round(dur(instrumental)); tema.mapa = secciones; guardar();
  const base = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-letra.md'), 'utf8')
    .replace('{{TITULO}}', tema.titulo).replace('{{CONCEPTO}}', tema.concepto).replace('{{RASGO}}', tema.rasgo).replace('{{CAPTION}}', tema.captionInstrumental)
    .replace('{{VOCES}}', tema.captionVoces).replace('{{BPM}}', tema.bpm).replace('{{TONALIDAD}}', tema.tonalidad).replace('{{DURACION}}', tema.duracion)
    .replace('{{COMPAS}}', compas.toFixed(2)).replace('{{ESTRUCTURA}}', tema.estructura.join(', '))
    .replace('{{MAPA}}', secciones.map((s, i) => `${i + 1}. ${mmss(s.inicio)}–${mmss(s.fin)} · ${s.compases} bars · energy ${s.energia}`).join('\n'));
  let correcciones = '', mejor = null;
  for (let i = 1; i <= 4; i++) {
    log(`Letra (vuelta ${i})…`);
    const letra = (await pedirTexto(base.replace('{{CORRECCIONES}}', correcciones), { orden: ['claude', 'local'], temperatura: 0.8,
      validar: x => !/\[(verse|chorus)[^\]]*\]/i.test(x) ? 'sin etiquetas de sección' : DEPORTE.test(x) ? 'palabra deportiva' : CASTELLANO.test(x) ? 'castellano' : null }))
      .replace(/^```\w*\n?|```$/g, '').trim();
    const r = rimas(letra);
    if (!mejor || r.problemas.length < mejor.r.problemas.length) mejor = { letra, r };
    if (r.ok) break;
    log(`  rimas a corregir: ${r.problemas.length}`);
    correcciones = `\n## Your previous version\n${letra}\n\n## Fix these lines (they do not rhyme BY SOUND; keep everything else)\n- ${r.problemas.join('\n- ')}\n`;
  }
  tema.letra = mejor.letra; if (!mejor.r.ok) tema.avisosRima = mejor.r.problemas; guardar();
  log(`Letra lista${mejor.r.ok ? ', rimas OK' : ` (quedan ${mejor.r.problemas.length} rimas flojas)`}`);
}

// ── 4. Voz sobre la instrumental (ACE-Step base, "lego": genera la pista de voces en contexto) ────────────
if (!tema.audio) {
  log('Voces (lego)…');
  let voces = aceStep('voces', [
    `config_path = "acestep-v15-base"`, `lm_model_path = "acestep-5Hz-lm-0.6B"`, ...comunes, `task_type = "lego"`, `lego_track = "vocals"`, `thinking = false`,
    `src_audio = ${toml(instrumental)}`, `repainting_start = 0.0`, `repainting_end = -1.0`, `instrumental = false`,
    `caption = ${toml(tema.captionVoces)}`, `bpm = ${tema.bpm}`, `keyscale = ${toml(tema.tonalidad)}`, `lyrics = ${toml(tema.letra)}`, `duration = ${tema.duracion}`,
  ]);
  const final = path.join(DIR, `${tema.slug}.mp3`);
  if (voces) {
    // si lego devolvió solo la pista de voces (la intro instrumental queda en silencio), se mezcla con la instrumental
    const intro = Math.min(6, tema.mapa?.[0]?.fin || 6);
    const lufs = f => Number(((ff('-t', String(intro), '-i', f, '-af', 'ebur128', '-f', 'null', '-').stderr.match(/I:\s*-?[\d.]+ LUFS/g) || []).pop() || 'I: -70').match(/-?[\d.]+/)[0]);
    const soloVoces = lufs(voces) < lufs(instrumental) - 15;
    log(`  lego devolvió ${soloVoces ? 'la pista de voces sola: se mezcla con la instrumental' : 'la mezcla completa'}`);
    if (soloVoces) {
      const mezcla = path.join(carpeta, 'mezcla.wav');
      ff('-y', '-i', instrumental, '-i', voces, '-filter_complex', '[0:a]volume=0.85[a];[1:a]volume=1.0[b];[a][b]amix=inputs=2:normalize=0:duration=first', mezcla);
      voces = mezcla;
    }
    tema.voces = 'lego';
  } else {
    // respaldo: "cover" con el turbo sobre la instrumental (rehace la mezcla guiada por ella, como The Shorts)
    log('  lego no generó audio: respaldo con cover sobre la instrumental');
    voces = aceStep('cover', [
      `config_path = "acestep-v15-turbo"`, `lm_model_path = "acestep-5Hz-lm-0.6B"`, ...comunes, `task_type = "cover"`, `thinking = true`,
      `src_audio = ${toml(instrumental)}`, `audio_cover_strength = 0.6`, `instrumental = false`,
      `caption = ${toml(`${tema.captionInstrumental}, ${tema.captionVoces}`)}`, `bpm = ${tema.bpm}`, `keyscale = ${toml(tema.tonalidad)}`, `lyrics = ${toml(tema.letra)}`, `duration = ${tema.duracion}`,
    ]);
    if (!voces) { log('ERROR: no salió la versión con voz. Se reintenta en la próxima corrida.'); process.exit(1); }
    tema.voces = 'cover';
  }
  const d = dur(voces);
  ff('-loglevel', 'error', '-y', '-i', voces, '-af', `loudnorm=I=-14:TP=-1:LRA=11,afade=t=out:st=${Math.max(0, d - 3).toFixed(2)}:d=3`, '-ar', '44100', '-b:a', '192k', final);
  const df = dur(final);
  if (df < 150 || df > 210) log(`AVISO: duró ${Math.round(df)} s (fuera de 2:30–3:30)`);
  await putFile(final, `musica/thrive/${tema.slug}.mp3`);
  tema.audio = `musica/thrive/${tema.slug}.mp3?v=${Date.now().toString(36)}`; tema.duracion = Math.round(df); tema.generado = new Date().toISOString(); guardar();
  log(`✓ "${tema.titulo}" (${mmss(df)}) con voz`);

  // La instrumental no se publica: va solo a la música de los videos (privado, _fuentes/musica/propios)
  const pulida = path.join(carpeta, 'instrumental-videos.mp3'), di = dur(instrumental);
  ff('-loglevel', 'error', '-y', '-i', instrumental, '-af', `loudnorm=I=-14:TP=-1:LRA=11,afade=t=out:st=${Math.max(0, di - 3).toFixed(2)}:d=3`, '-ar', '44100', '-b:a', '192k', pulida);
  const biblio = `${FECHA} - ${tema.titulo}.mp3`;
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
git('add', 'scripts/beats/thrive.json');
const c = git('commit', '-m', `feat: Thrive — "${tema.titulo}" (${tema.rasgo})\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
if (c.status === 0) { const ps = git('push', '-q'); log(ps.status === 0 ? 'Commit y push hechos.' : 'Push falló: ' + ps.stderr.slice(-200)); }
log(`✓ "${tema.titulo}" publicado en topsecret.ar/music`);
