#!/usr/bin/env node
// Álbum "Thrive": un tema nuevo con voz cada noche a las 2:00 (Juan, 2026-10-26). Temática: amor, pasión,
// sentimiento, entrega y sacrificio, desde los rasgos psicológicos de querer algo que no siempre nos hace bien;
// nada deportivo. Duración entre 2:30 y 3:30. Reemplaza al beat diario compuesto por Claude (diario.mjs).
//
//   node scripts/beats/thrive.mjs                  → el tema de hoy, si todavía no existe
//   node scripts/beats/thrive.mjs --fecha 2026-10-27 [--modelo qwen3:14b] [--solo-letra]
//
// 1. Letra, concepto y sonido: IA local (Ollama, scripts/lib/ia.mjs) con el encargo scripts/beats/thrive-encargo.md;
//    si la local falla o no pasa los controles, Claude.
// 2. Música y voz: ACE-Step text2music en la GTX 1070 (mismo setup que cantar.mjs).
// 3. Pulido (-14 LUFS, fundido) → R2 musica/thrive/<slug>.mp3, registro scripts/beats/thrive.json, catálogo de
//    topsecret.ar/music, commit y push. Tarea "TopSecretFC-Thrive" (run-thrive-hidden.vbs). Log: scripts/thrive.log
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';
import { pedirJSON, MODELO } from '../lib/ia.mjs';
import { armarCatalogo } from './catalogo.mjs';

loadEnv();
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const FECHA = opt('--fecha', new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }));
const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const DIR = path.join(ROOT, 'fuentes', 'beats', 'thrive');
const REG = path.join(ROOT, 'scripts', 'beats', 'thrive.json');
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [thrive] ${m}`);
const dur = f => { const m = (spawnSync(ffmpegPath, ['-hide_banner', '-i', f], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/) || []); return m.length ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; };
const toml = s => JSON.stringify(s);

const reg = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : { temas: [] };
const guardar = () => fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
let tema = reg.temas.find(t => t.fecha === FECHA);
if (tema?.audio) { log(`El tema de ${FECHA} ya existe: "${tema.titulo}".`); process.exit(0); }
fs.mkdirSync(DIR, { recursive: true });

// Ollama tiene que estar levantado (la app arranca con la sesión; si no, se lo levanta acá)
async function asegurarOllama() {
  const vivo = () => fetch('http://127.0.0.1:11434/api/version', { signal: AbortSignal.timeout(3000) }).then(r => r.ok, () => false);
  if (await vivo()) return;
  const exe = path.join(process.env.LOCALAPPDATA || '', 'Programs/Ollama/ollama.exe');
  if (!fs.existsSync(exe)) return;
  spawn(exe, ['serve'], { detached: true, stdio: 'ignore', env: { ...process.env, OLLAMA_MODELS: process.env.OLLAMA_MODELS || 'D:\\ollama\\models' } }).unref();
  for (let i = 0; i < 20 && !(await vivo()); i++) await new Promise(r => setTimeout(r, 1000));
}

// Controles de la letra: lo que el modelo local suele romper
const DEPORTE = /\b(ball|goal|goals|pass(?:es|ed)?|team|club|match|game|field|pitch|stadium|crowd|jersey|coach|referee|whistle|score[ds]?|scoreboard|striker|keeper|kick(?:ed|s)?|penalty|trophy|league)\b/i;
function validar(j) {
  const bpm = Number(j.bpm), d = Number(j.duracion);
  if (!(bpm >= 70 && bpm <= 160)) return `bpm ${j.bpm}`;
  if (!(d >= 160 && d <= 205)) return `duración ${j.duracion}`;
  if (!/^[A-G][#b]? (major|minor)$/.test(String(j.tonalidad).trim())) return `tonalidad "${j.tonalidad}"`;
  const l = String(j.letra);
  for (const s of ['[verse]', '[chorus]', '[bridge]']) if (!l.includes(s)) return `falta ${s}`;
  const versos = l.split('\n').filter(x => x.trim() && !/^\[.*\]$/.test(x.trim()));
  if (versos.length < 36) return `letra corta (${versos.length} versos)`;
  const dep = l.match(DEPORTE) || String(j.titulo).match(DEPORTE);
  if (dep) return `palabra deportiva "${dep[0]}"`;
  if (reg.temas.some(t => t.titulo.toLowerCase() === String(j.titulo).toLowerCase())) return `título repetido "${j.titulo}"`;
}

// ── 1. Letra ─────────────────────────────────────────────────────────────────
if (!tema) {
  await asegurarOllama();
  const anteriores = reg.temas.slice(-30).map(t => `- "${t.titulo}" · trait: ${t.rasgo} · ${t.bpm} BPM, ${t.tonalidad} · voice: ${t.voz} · ${t.concepto}`).join('\n') || '(none yet: this is the first song of the album)';
  const encargo = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-encargo.md'), 'utf8').replace('{{FECHA}}', FECHA).replace('{{ANTERIORES}}', anteriores);
  log(`Escribiendo la letra (${opt('--modelo', MODELO)})…`);
  const j = await pedirJSON(encargo, { modelo: opt('--modelo', MODELO), claves: ['titulo', 'concepto', 'rasgo', 'caption', 'voz', 'tonalidad', 'letra'], validar, temperatura: 0.9 });
  const slug = String(j.titulo).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `thrive-${FECHA}`;
  tema = { fecha: FECHA, slug, titulo: j.titulo.trim(), concepto: j.concepto.trim(), rasgo: j.rasgo.trim(), voz: j.voz.trim(),
    caption: j.caption.trim(), bpm: Math.round(j.bpm), tonalidad: j.tonalidad.trim(), duracion: Math.round(j.duracion), letra: j.letra.trim() };
  reg.temas.push(tema); guardar();
  log(`Letra lista: "${tema.titulo}" — ${tema.rasgo} (${tema.bpm} BPM, ${tema.tonalidad}, ${tema.duracion} s)`);
}
if (argv.includes('--solo-letra')) process.exit(0);

// ── 2. Música y voz (ACE-Step) ──────────────────────────────────────────────
const salida = path.join(DIR, tema.slug);
const hecho = fs.existsSync(salida) && fs.readdirSync(salida).some(f => f.endsWith('.mp3'));
if (!hecho) {
  fs.rmSync(salida, { recursive: true, force: true }); fs.mkdirSync(salida, { recursive: true });
  const cfg = path.join(salida, '_config.toml');
  fs.writeFileSync(cfg, [
    `config_path = "acestep-v15-turbo"`, `lm_model_path = "acestep-5Hz-lm-0.6B"`, `backend = "pt"`, `offload_to_cpu = true`,
    `task_type = "text2music"`, `instrumental = false`, `vocal_language = "en"`, `thinking = true`,
    `use_cot_caption = false`, `use_cot_metas = false`, `use_cot_lyrics = false`,
    `caption = ${toml(tema.caption)}`, `bpm = ${tema.bpm}`, `keyscale = ${toml(tema.tonalidad)}`, `lyrics = ${toml(tema.letra)}`,
    `duration = ${tema.duracion}`, `batch_size = 1`, `audio_format = "mp3"`, `save_dir = ${toml(salida)}`,
  ].join('\n') + '\n');
  log(`ACE-Step: ${tema.duracion} s de música…`);
  const t0 = Date.now();
  fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
  spawnSync('python', ['-m', 'uv', 'run', 'python', 'cli.py', '--config', cfg, '--log-level', 'WARNING'], {
    cwd: ACE, stdio: ['pipe', 'ignore', 'inherit'], input: '\n'.repeat(3), timeout: 3 * 3600000,
    // GTX 1070: float32 (el float16 da NaN) y memoria sin fragmentar (ver generar.mjs)
    env: { ...process.env, ACESTEP_DTYPE: 'float32', PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True', ACESTEP_FREE_DIT_BEFORE_VAE: '1', PYTHONIOENCODING: 'utf-8', PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}` },
  });
  fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
  log(`ACE-Step terminó en ${Math.round((Date.now() - t0) / 60000)} min`);
}
const crudo = fs.readdirSync(salida).find(f => f.endsWith('.mp3'));
if (!crudo) { log('ERROR: ACE-Step no generó audio. Se reintenta la próxima corrida (la letra queda guardada).'); process.exit(1); }

// ── 3. Pulido, R2, catálogo, commit ─────────────────────────────────────────
const final = path.join(DIR, `${tema.slug}.mp3`), d = dur(path.join(salida, crudo));
spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(salida, crudo), '-af', `loudnorm=I=-14:TP=-1:LRA=11,afade=t=out:st=${Math.max(0, d - 3).toFixed(2)}:d=3`, '-ar', '44100', '-b:a', '192k', final]);
const df = dur(final);
if (df < 150 || df > 210) log(`AVISO: duró ${Math.round(df)} s (fuera de 2:30–3:30)`);
await putFile(final, `musica/thrive/${tema.slug}.mp3`);
tema.audio = `musica/thrive/${tema.slug}.mp3?v=${Date.now().toString(36)}`; tema.duracion = Math.round(df); tema.generado = new Date().toISOString(); guardar();
await armarCatalogo({ log });
const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
git('add', 'scripts/beats/thrive.json');
const c = git('commit', '-m', `feat: Thrive — "${tema.titulo}" (${tema.rasgo})\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
if (c.status === 0) { const ps = git('push', '-q'); log(ps.status === 0 ? 'Commit y push hechos.' : 'Push falló: ' + ps.stderr.slice(-200)); }
log(`✓ "${tema.titulo}" (${Math.floor(df / 60)}:${String(Math.round(df % 60)).padStart(2, '0')}) en topsecret.ar/music`);
