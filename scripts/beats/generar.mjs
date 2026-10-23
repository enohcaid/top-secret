#!/usr/bin/env node
// Genera beats de trap propios con ACE-Step 1.5 (modelo de música abierto, licencia MIT, corre
// local en la GTX 1070). Cada estilo es un .toml en scripts/beats/estilos/ con caption, bpm y
// tonalidad; las inspiraciones se usan solo para describir el clima, nunca como audio de
// referencia (para que no salga parecido a un tema con derechos).
//
//   node scripts/beats/generar.mjs <estilo> [--n 2] [--duracion 90] [--seed 123]
//   node scripts/beats/generar.mjs nocturno
//
// Instalación (una vez): ACE-Step en fuentes/beats/ACE-Step-1.5 (git clone
// https://github.com/ace-step/ACE-Step-1.5 + `python -m uv sync`). Los pesos (~10 GB) se bajan
// solos la primera vez. Salida: fuentes/beats/salida/<estilo>/ (gitignored). Lo aprobado se
// sube a la biblioteca de R2 (_fuentes/musica/trap) y se registra en scripts/musica-usada.json
// al usarse (ver docs/conocimiento/feedback_musica_unica.md).
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', '..');
const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const estilo = argv[0];
const archivo = estilo && path.join(ROOT, 'scripts', 'beats', 'estilos', `${estilo}.toml`);
if (!archivo || !fs.existsSync(archivo)) {
  const hay = fs.readdirSync(path.join(ROOT, 'scripts', 'beats', 'estilos')).map(f => f.replace('.toml', ''));
  console.error(`uso: node scripts/beats/generar.mjs <estilo> [--n 2] [--duracion 90] [--seed N]\nestilos: ${hay.join(', ')}`);
  process.exit(1);
}
if (!fs.existsSync(path.join(ACE, 'cli.py'))) {
  console.error('Falta ACE-Step en fuentes/beats/ACE-Step-1.5 (ver la cabecera de este script).');
  process.exit(1);
}

const salida = path.join(ROOT, 'fuentes', 'beats', 'salida', estilo);
fs.mkdirSync(salida, { recursive: true });
const toml = s => JSON.stringify(s);   // las cadenas JSON son válidas en TOML
const seed = opt('--seed', null);
// Estilos con voz (2026-10-23, Juan: "las canciones con voces, rapeando, tienen mucha más vida; los sintes las hacen
// robóticas"): si el .toml trae `lyrics`, no se fuerza instrumental y la voz va en español.
const estiloTxt = fs.readFileSync(archivo, 'utf8');
const conVoz = /^lyrics\s*=/m.test(estiloTxt);
// Base para la GTX 1070 (8 GB, arquitectura Pascal): DiT 2B turbo + LM 0.6B con backend PyTorch
// (vLLM no corre en placas anteriores a Volta) y descarga a CPU.
const base = [
  `config_path = "acestep-v15-turbo"`,
  `lm_model_path = "acestep-5Hz-lm-0.6B"`,
  `backend = "pt"`,
  `offload_to_cpu = true`,
  `task_type = "text2music"`,
  ...(conVoz ? ['instrumental = false', ...(/^vocal_language\s*=/m.test(estiloTxt) ? [] : ['vocal_language = "es"'])]
    : ['instrumental = true', 'lyrics = "[Instrumental]"']),
  `thinking = true`,
  `use_cot_caption = false`,
  `use_cot_metas = false`,
  `use_cot_lyrics = false`,
  `duration = ${Number(opt('--duracion', 90))}`,
  `batch_size = ${Number(opt('--n', 2))}`,
  `audio_format = "mp3"`,
  `save_dir = ${toml(salida)}`,
  ...(seed ? [`seeds = ${toml(String(seed))}`, `use_random_seed = false`] : []),
].join('\n');
const cfg = path.join(salida, `_config-${Date.now()}.toml`);
fs.writeFileSync(cfg, `${base}\n${estiloTxt}\n`);

console.log(`Generando "${estilo}" → ${path.relative(ROOT, salida)}`);
const t0 = Date.now();
// Con thinking=true la CLI deja el borrador del LM en instruction.txt y espera un Enter para
// seguir (pensado para editarlo a mano). Se borra el de la corrida anterior (si no, lo reusaría
// para otro estilo) y se le manda el Enter por stdin.
fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
const r = spawnSync('python', ['-m', 'uv', 'run', 'python', 'cli.py', '--config', cfg, '--log-level', 'WARNING'], {
  cwd: ACE, stdio: ['pipe', 'inherit', 'inherit'], input: '\n'.repeat(3),
  // ACE-Step exporta MP3 con ffmpeg del PATH: se usa el de ffmpeg-static (devDependency del repo).
  // float32: en la GTX 1070 (Pascal) el float16 se desborda (NaN) al generar con voz (2026-10-23)
  env: { ...process.env, ACESTEP_DTYPE: process.env.ACESTEP_DTYPE || 'float32',
    // la placa quedaba fragmentada (OOM pidiendo 48 MB con 2,6 GB libres); descargar el DiT a la RAM no entra en 16 GB
    PYTORCH_CUDA_ALLOC_CONF: process.env.PYTORCH_CUDA_ALLOC_CONF || 'expandable_segments:True', PYTHONIOENCODING: 'utf-8', PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}` },
});
fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
fs.rmSync(cfg, { force: true });
console.log(`Terminó en ${Math.round((Date.now() - t0) / 1000)} s (código ${r.status}).`);
process.exit(r.status ?? 1);
