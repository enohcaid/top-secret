#!/usr/bin/env node
// Voz en inglés para los temas del club (pedido de Juan, 2026-10-23: "las canciones con voces tienen mucha más vida",
// "hacé todas las letras en inglés", "priorizá que las letras rimen"). Por cada tema de scripts/beats/letras.json:
// baja el instrumental propio de R2, le pone voz con ACE-Step en modo "cover" (el tema original guía la estructura y
// el clima; la letra y la voz son nuevas), lo pule (-14 LUFS), lo sube a R2 musica/voz/ (público) y actualiza el
// catálogo público musica/catalogo.json que lee la página topsecret.ar/music.
//
//   node scripts/beats/cantar.mjs [--solo <slug>] [--rehacer] [--fuerza 0.5]
//   node scripts/beats/cantar.mjs --catalogo      → solo rearma y sube el catálogo (sin generar)
//
// letras.json: [{ slug, titulo, original (archivo del instrumental en _fuentes/musica/propios, o null si es un tema
// nuevo), concepto, caption, bpm, tonalidad (ACE-Step: "D minor"), letra }]. Las letras no hablan de fútbol
// (docs/conocimiento/feedback_composicion_musical.md) y riman.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT, loadEnv } from '../lib/env.mjs';
import { putFile as putR2, getFile } from '../lib/r2.mjs';

loadEnv();
const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const DIR = path.join(ROOT, 'fuentes', 'beats', 'voz');
const LETRAS = path.join(ROOT, 'scripts', 'beats', 'letras.json');
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/';
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const SOLO = opt('--solo', null), REHACER = argv.includes('--rehacer'), FUERZA = Number(opt('--fuerza', 0.5));
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [cantar] ${m}`);
fs.mkdirSync(DIR, { recursive: true });
// la subida a R2 se cortó una vez (ECONNABORTED) y tiró abajo toda la tanda: 4 intentos con espera
async function putFile(local, clave) {
  for (let i = 1; ; i++) { try { return await putR2(local, clave); } catch (e) { if (i >= 4) throw e; log(`  subida de ${clave} falló (${e.code || e.message}), reintento ${i}…`); await new Promise(r => setTimeout(r, 5000 * i)); } }
}

const letras = JSON.parse(fs.readFileSync(LETRAS, 'utf8'));
const guardar = () => fs.writeFileSync(LETRAS, JSON.stringify(letras, null, 2) + '\n');
const dur = f => { const m = (spawnSync(ffmpegPath, ['-hide_banner', '-i', f], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/) || []); return m.length ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 90; };
const toml = s => JSON.stringify(s);

async function catalogo() {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/temas-diarios.json'), 'utf8')).temas;
  const lista = [];
  for (const l of letras) {
    const t = reg.find(x => x.archivo === l.original);
    let instrumental = null;
    if (l.original) {                                     // copia pública del instrumental (los de _fuentes son privados)
      const clave = `musica/temas/${l.slug}.mp3`;
      if (!l.instrumentalPublico) {
        const local = path.join(DIR, `${l.slug}-instrumental.mp3`);
        if (!fs.existsSync(local)) await getFile(`_fuentes/musica/propios/${l.original}`, local);
        await putFile(local, clave); l.instrumentalPublico = true; guardar();
      }
      instrumental = MEDIA + clave;
    }
    lista.push({ slug: l.slug, titulo: l.titulo, fecha: (l.original || '').slice(0, 10) || l.fecha || null, concepto: l.concepto,
      bpm: l.bpm, tonalidad: l.tonalidad, letra: l.letra, voz: l.voz ? MEDIA + l.voz : null, instrumental, original: t?.nombre || null });
  }
  const f = path.join(DIR, 'catalogo.json');
  fs.writeFileSync(f, JSON.stringify({ actualizado: new Date().toISOString(), temas: lista }, null, 1));
  await putFile(f, 'musica/catalogo.json');
  log(`catálogo: ${lista.length} temas (${lista.filter(x => x.voz).length} con voz)`);
}

if (argv.includes('--catalogo')) { await catalogo(); process.exit(0); }

for (const l of letras) {
  if (SOLO && l.slug !== SOLO) continue;
  if (l.voz && !REHACER) continue;
  try {
  const salida = path.join(DIR, l.slug);
  // si ya se generó (y falló algo después, p. ej. la subida), se reusa: no se vuelve a pedir a la placa
  const hecho = !REHACER && fs.existsSync(salida) && fs.readdirSync(salida).some(f => f.endsWith('.mp3'));
  if (!hecho) { fs.rmSync(salida, { recursive: true, force: true }); fs.mkdirSync(salida, { recursive: true }); }
  let src = null;
  if (l.original) { src = path.join(DIR, `${l.slug}-instrumental.mp3`); if (!fs.existsSync(src)) await getFile(`_fuentes/musica/propios/${l.original}`, src); }
  const duracion = Math.round(src ? dur(src) : 95);
  const cfg = path.join(salida, '_config.toml');
  fs.writeFileSync(cfg, [
    `config_path = "acestep-v15-turbo"`, `lm_model_path = "acestep-5Hz-lm-0.6B"`, `backend = "pt"`, `offload_to_cpu = true`,
    `task_type = ${toml(src ? 'cover' : 'text2music')}`, ...(src ? [`src_audio = ${toml(src)}`, `audio_cover_strength = ${FUERZA}`] : []),
    `instrumental = false`, `vocal_language = "en"`, `thinking = true`, `use_cot_caption = false`, `use_cot_metas = false`, `use_cot_lyrics = false`,
    `caption = ${toml(l.caption)}`, `bpm = ${l.bpm}`, `keyscale = ${toml(l.tonalidad)}`, `lyrics = ${toml(l.letra)}`,
    `duration = ${duracion}`, `batch_size = 1`, `audio_format = "mp3"`, `save_dir = ${toml(salida)}`,
  ].join('\n') + '\n');
  log(`${l.titulo} (${src ? 'cover de ' + l.original : 'tema nuevo'}, ${duracion} s)${hecho ? ' — ya generado, solo sube' : '…'}`);
  const t0 = Date.now();
  fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
  if (!hecho) spawnSync('python', ['-m', 'uv', 'run', 'python', 'cli.py', '--config', cfg, '--log-level', 'WARNING'], {
    cwd: ACE, stdio: ['pipe', 'ignore', 'inherit'], input: '\n'.repeat(3),
    // GTX 1070: float32 (el float16 da NaN) y memoria sin fragmentar (ver generar.mjs)
    env: { ...process.env, ACESTEP_DTYPE: 'float32', PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True', ACESTEP_FREE_DIT_BEFORE_VAE: '1', PYTHONIOENCODING: 'utf-8', PATH: `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}` },
  });
  fs.rmSync(path.join(ACE, 'instruction.txt'), { force: true });
  const mp3 = fs.readdirSync(salida).find(f => f.endsWith('.mp3'));
  if (!mp3) { log(`  ✗ ${l.titulo}: no salió audio (${Math.round((Date.now() - t0) / 1000)} s)`); continue; }
  // pulido: -14 LUFS, fundido de salida
  const final = path.join(DIR, `${l.slug}.mp3`), d = dur(path.join(salida, mp3));
  spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(salida, mp3), '-af', `loudnorm=I=-14:TP=-1:LRA=11,afade=t=out:st=${Math.max(0, d - 2.5).toFixed(2)}:d=2.5`, '-ar', '44100', '-b:a', '192k', final]);
  await putFile(final, `musica/voz/${l.slug}.mp3`);
  l.voz = `musica/voz/${l.slug}.mp3?v=${Date.now().toString(36)}`; l.generado = new Date().toISOString(); guardar();
  log(`  ✓ ${l.titulo} en ${Math.round((Date.now() - t0) / 1000)} s → ${MEDIA}musica/voz/${l.slug}.mp3`);
  await catalogo();
  } catch (e) { log(`  ✗ ${l.titulo}: ${e.message}`); }
}
await catalogo();
