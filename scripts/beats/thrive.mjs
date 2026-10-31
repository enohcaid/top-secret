#!/usr/bin/env node
// Álbum "Thrive" de Tacet Sin: un tema nuevo por semana, los domingos a las 2:00 (Juan, 2026-10-27; antes, uno por noche). Amor, pasión, entrega y sacrificio
// desde los rasgos psicológicos de querer algo que no siempre nos hace bien; nada deportivo; entre 2:00 y 2:30 (Juan, 2026-10-31; antes 2:30–3:30).
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
import { pedirJSON, pedirTexto, claude, liberar, guardarEjemplo, ultimoMotor } from '../lib/ia.mjs';
import { pedirPartitura, reparar, criticar, retocar, guardarPartitura, planCompases } from './partitura.mjs';
import { armarCatalogo } from './catalogo.mjs';
import { letraFinal } from './letra-final.mjs';
import { mandarAAprobar } from './musica-aprobacion.mjs';

loadEnv();
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const FECHA = opt('--fecha', new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }));
// --parte N: otro tema el mismo día (Juan, 2026-10-27: "lanzá otra canción nueva"). Se identifica como <fecha>-<N>.
const PARTE = opt('--parte', null);
let ID = PARTE && PARTE !== '1' ? `${FECHA}-${PARTE}` : FECHA;
// --local: tema hecho solo con la IA local (Gemma escribe concepto, beat y letra; Juan, 2026-10-31: "a ver cuánto tarda y
// qué logra"). Entra a aprobar.html como cualquier demo, marcado `motor: 'local'`; sus revisiones también van con Gemma.
let LOCAL = argv.includes('--local');
if (LOCAL) ID += '-local';
const tiempos = {}, cron = (k, t0) => { tiempos[k] = (tiempos[k] || 0) + Math.round((Date.now() - t0) / 1000); };
// --revisar <slug>: rehace las partes que Juan marcó "a mejorar" en aprobar.html, con su comentario (musica-aprobacion.mjs)
const REVISAR = opt('--revisar', null);
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
let tema = REVISAR ? reg.temas.find(t => t.slug === REVISAR) : reg.temas.find(t => (t.id || t.fecha) === ID);
// `fijo`: queda como salió, no se toca (Juan, 2026-10-26, sobre "Too Far In")
if (REVISAR) {
  if (!tema?.revision) { log(`Nada que revisar en ${REVISAR}.`); process.exit(0); }
  ID = tema.id || tema.fecha;
  if (tema.motor === 'local') LOCAL = true;
} else if (tema?.fijo || tema?.letraFinal) { log(`El tema ${ID} ya está terminado: "${tema.titulo}".`); process.exit(0); }
if (LOCAL) process.env.IA_SOLO_LOCAL = '1';
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

// ── 0. Revisión: se borra lo que Juan marcó "a mejorar" (y lo que depende de eso) y se rehace con su comentario ──
const FEEDBACK = REVISAR ? tema.revision : null;
const fb = parte => FEEDBACK && parte in FEEDBACK
  ? `
## The artist's feedback on the previous version (${parte}) — fix exactly this, keep what worked
${FEEDBACK[parte] || '(marked "to improve" without a comment: make it clearly better and different)'}
` : '';
let reemplaza = null;
if (REVISAR) {
  const v = (tema.version || 1) + 1, vieja = path.join(DIR, tema.slug);
  log(`Revisión de "${tema.titulo}" → versión ${v}: ${Object.keys(FEEDBACK).join(', ')}`);
  const borrar = (...ks) => ks.forEach(k => delete tema[k]);
  if ('concepto' in FEEDBACK) {
    // concepto nuevo = tema nuevo (otro título y otro beat); el anterior queda como referencia de lo que no
    reemplaza = { slug: tema.slug, titulo: tema.titulo, concepto: tema.concepto, rasgo: tema.rasgo, version: v };
    reg.temas.splice(reg.temas.indexOf(tema), 1); tema = null;
  } else {
    if ('beat' in FEEDBACK) { borrar('instrumental', 'secciones', 'beat'); for (const x of ['instrumental.mp3', 'instrumental.wav', 'instrumental-ace', 'instrumental-videos.mp3']) fs.rmSync(path.join(vieja, x), { recursive: true, force: true }); }
    if ('beat' in FEEDBACK || 'letra' in FEEDBACK) borrar('letra', 'letraPor', 'avisosRima');
    if ('letra' in FEEDBACK) borrar('historia');
    if ('voces' in FEEDBACK) {
      // la descripción de las voces se reescribe con el comentario (modelo local primero)
      const nueva = await pedirTexto(`Rewrite this vocal description for an AI music model so it fixes the artist's feedback. Keep it a male–female duet, English, comma-separated, max 30 words, no artist names. Answer only with the new description.

Current: ${tema.captionVoces}
${fb('voces')}`,
        { orden: ['local', 'claude'], claudeModelo: 'sonnet', validar: x => x.split(/s+/).length > 45 ? 'muy larga' : CASTELLANO.test(x) ? 'castellano' : null }).catch(() => null);
      if (nueva) tema.captionVoces = nueva.replace(/^["']|["']$/g, '').trim();
    }
    borrar('audio', 'letraFinal', 'generado');
    fs.rmSync(path.join(vieja, 'cover'), { recursive: true, force: true });
    tema.version = v;
  }
  guardar();
}

// ── 1. Concepto y sonido ─────────────────────────────────────────────────────
if (!tema) {
  const anteriores = reg.temas.slice(-30).map(t => `- "${t.titulo}" · trait: ${t.rasgo} · ${t.bpm} BPM, ${t.tonalidad} · sound: ${t.captionInstrumental || t.caption}`).join('\n') || '(none yet)';
  const encargo = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-concepto.md'), 'utf8').replace('{{FECHA}}', FECHA).replace('{{ANTERIORES}}', anteriores)
    + (reemplaza ? `
## This replaces "${reemplaza.titulo}" (${reemplaza.rasgo}: ${reemplaza.concepto}), rejected by the artist
${fb('concepto')}` : '');
  log('Concepto y sonido…');
  const t0 = Date.now();
  const j = await pedirJSON(encargo, { orden: ['claude', 'local'], tarea: 'thrive-concepto', temperatura: 0.9,
    claves: ['titulo', 'concepto', 'rasgo', 'caption_instrumental', 'caption_voces', 'voz', 'tonalidad', 'estructura'],
    validar: j => {
      if (!(j.bpm >= 70 && j.bpm <= 140)) return `bpm ${j.bpm}`;
      if (!(j.duracion >= 120 && j.duracion <= 150)) return `duración ${j.duracion} (va entre 120 y 150 s)`;
      if (!/^[A-G][#b]? (major|minor)$/.test(String(j.tonalidad).trim())) return `tonalidad "${j.tonalidad}"`;
      if (!Array.isArray(j.estructura) || !j.estructura.includes('chorus')) return 'estructura sin estribillo';
      const t = `${j.titulo}\n${j.caption_instrumental}\n${j.caption_voces}`;
      if (DEPORTE.test(t)) return 'palabra deportiva';
      if (CASTELLANO.test(t)) return 'castellano en título o sonido';
      if (/weeknd|lana|ariana|jennie|lily-rose|del rey|grande/i.test(t)) return 'nombra artistas reales en el sonido';
      // Juan, 2026-10-27: el amor es abstracto (nunca una persona) y el género es trap de verdad
      const persona = String(j.concepto).match(/(alguien|una persona|pareja|novi[oa]|amante|tu ex|el otro|la otra|ella|él)/i);
      if (persona) return `el concepto habla de una persona ("${persona[0]}"): el amor de Thrive es abstracto, por algo que no es una persona`;
      if (!/trap/i.test(j.caption_instrumental)) return 'el sonido no dice trap: tiene que ser trap de verdad';
      if (!/rap/i.test(j.caption_voces)) return 'las voces tienen que tener a un rapero liderando';
      if (reg.temas.some(x => x.titulo.toLowerCase() === String(j.titulo).toLowerCase())) return `título repetido "${j.titulo}"`;
      // nada repetido (Juan, 2026-10-27): ni el título ni el rasgo psicológico de un tema anterior
      const norm = x => String(x).toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').trim();
      if (reg.temas.some(x => norm(x.rasgo) === norm(j.rasgo))) return `rasgo repetido "${j.rasgo}": elegí otro`;
    } });
  const slug = String(j.titulo).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `thrive-${ID}`;
  tema = { ...(ID !== FECHA ? { id: ID } : {}), ...(LOCAL ? { motor: 'local' } : {}), ...(reemplaza ? { version: reemplaza.version, reemplaza: reemplaza.slug } : {}), fecha: FECHA, slug, titulo: j.titulo.trim(), concepto: j.concepto.trim(), rasgo: j.rasgo.trim(), voz: j.voz.trim(),
    captionInstrumental: j.caption_instrumental.trim(), captionVoces: j.caption_voces.trim(), bpm: Math.round(j.bpm),
    tonalidad: j.tonalidad.trim(), duracion: Math.round(j.duracion), estructura: j.estructura };
  reg.temas.push(tema); guardar(); cron('concepto', t0);
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
function render(script = PY_TEMA, args = []) {
  const r = spawnSync('python', ['-m', 'uv', 'run', '--no-project', '--with', 'numpy', '--with', 'scipy', '--with', 'soundfile', script, ...args, WAV],
    // PYTHONPATH: el tema importa componer.py relativo a su carpeta; en la demo --local vive en pruebas/ y no lo encontraba
    { cwd: ROOT, encoding: 'utf8', timeout: 15 * 60000, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONPATH: path.join(ROOT, 'scripts/beats') } });
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
// Local (2026-10-31): Gemma no escribe código, escribe la PARTITURA (partitura.mjs) y partitura.py la toca. Escribir
// ~400 líneas de Python con un encargo de ~20K tokens la superaba: copiaba el ejemplo y tardaba ~65 min por vuelta.
async function beatPorPartitura() {
  const compases = Math.round(tema.duracion / (240 / tema.bpm)), plan = planCompases(tema.estructura, compases);
  const JSONP = path.join(carpeta, 'partitura.json');
  let correcciones = fb('beat');
  try {
    for (let i = 1; i <= 6; i++) {
      log(`  Gemma escribe la partitura (vuelta ${i})…`);
      let j;
      try { const r = await pedirPartitura(tema, { compases, plan, correcciones }); j = r.j; log(`    ${mmss(r.segundos)} · encargo ${r.tokensEncargo} tokens, respuesta ${r.tokens}`); }
      catch (e) { log(`    ${e.message.slice(0, 200)}`); continue; }
      fs.writeFileSync(path.join(carpeta, `partitura-gemma-${i}.json`), JSON.stringify(j, null, 2) + '\n');   // lo que escribió, tal cual
      const { P, notas } = reparar(j, { bpm: tema.bpm, tonalidad: tema.tonalidad, compases, plan });
      if (notas.length) log(`    reparado: ${notas.join(' · ')}`);
      let err = criticar(P, { compases, slug: tema.slug });
      // lo que falta es un elemento puntual (glide, variación de hats): se le pregunta solo eso
      if (err.length && err.every(e => /no glide|never changes|keeps the same hats|no hi-hat roll|chorus uses the same drums/.test(e))) {
        const t1 = Date.now();
        await retocar(P, err, tema, log);
        log(`    retoques: ${mmss((Date.now() - t1) / 1000)}`);
        err = criticar(P, { compases, slug: tema.slug });
      }
      if (!err.length) {
        fs.writeFileSync(JSONP, JSON.stringify(P, null, 2) + '\n');
        fs.rmSync(WAV, { force: true });
        const r = render(path.join(ROOT, 'scripts/beats/partitura.py'), [JSONP]);
        err = r.error ? [r.error] : controlarBeat(r.secciones);
        if (!err.length) {
          Object.assign(tema, { secciones: r.secciones, beat: P.rasgo || tema.captionInstrumental, vueltasBeat: i });
          guardarPartitura(tema.slug, P);
          return true;
        }
      }
      log(`    a corregir: ${err.join(' · ')}`);
      // sin la partitura anterior: con ella delante, Gemma la volvía a escribir igual (31/10, 6 vueltas idénticas)
      correcciones = `${fb('beat')}\n## A previous attempt was rejected for these reasons — avoid them this time\n${err.map(e => `- ${e}`).join('\n')}\n`;
    }
    return false;
  } finally { await liberar(); }
}
if (!fs.existsSync(INSTR) && LOCAL) {
  log('Instrumental: partitura de Gemma…');
  const t0 = Date.now();
  if (!(await beatPorPartitura())) { log('ERROR: Gemma no logró una partitura que pase los controles. Se reintenta en la próxima corrida.'); process.exit(1); }
  ff('-loglevel', 'error', '-y', '-i', WAV, '-b:a', '256k', INSTR);
  tema.instrumental = 'partitura'; guardar(); cron('beat', t0);
  log(`  ✓ beat de la partitura (${mmss(dur(INSTR))}): scripts/beats/partituras/${tema.slug}.json`);
}
if (!fs.existsSync(INSTR)) {
  log('Instrumental compuesta por código…');
  const t0 = Date.now();
  const ejemplo = fs.readFileSync(path.join(ROOT, 'scripts/beats/temas/diario_2026_10_23_1.py'), 'utf8');
  const anteriores = reg.temas.filter(t => t !== tema && t.beat).slice(-10).map(t => `- "${t.titulo}": ${t.beat}`).join('\n') || '(none yet)';
  const base = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-componer.md'), 'utf8')
    .replace('{{CONCEPTO}}', `"${tema.titulo}" — ${tema.concepto} (trait: ${tema.rasgo})`).replace('{{CAPTION}}', tema.captionInstrumental)
    .replace('{{ANTERIORES}}', anteriores).replace('{{REGLAS}}', fs.readFileSync(path.join(ROOT, 'docs/conocimiento/feedback_composicion_musical.md'), 'utf8').replace(/^---[\s\S]*?---\n/, ''))
    .replace('{{BPM}}', tema.bpm).replace('{{TONALIDAD}}', tema.tonalidad).replace('{{ESTRUCTURA}}', tema.estructura.join(', ')).replace('{{DURACION}}', tema.duracion)
    .replace('{{COMPONER}}', fs.readFileSync(path.join(ROOT, 'scripts/beats/componer.py'), 'utf8')).replace('{{EJEMPLO}}', ejemplo);
  let correcciones = fb('beat'), ok = false;
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
    correcciones = `${fb('beat')}\n## Your previous version failed. Fix it and return the complete file again\n${err.map(e => `- ${e}`).join('\n')}\n\nPrevious file:\n\`\`\`python\n${codigo}\n\`\`\`\n`;
  }
  if (ok) {
    ff('-loglevel', 'error', '-y', '-i', WAV, '-b:a', '256k', INSTR);
    tema.instrumental = 'codigo'; guardar();
    log(`  ✓ beat compuesto (${mmss(dur(INSTR))}): ${path.relative(ROOT, PY_TEMA)}`);
  } else {
    // Sin respaldo de ACE-Step (Juan, 2026-10-31: "no podemos dejar que ACE haga los beats porque no respeta nuestro
    // estilo, hace pop"): la corrida termina y la retoma el reintento de las 5:00 (o la próxima revisión).
    log('ERROR: la composición por código no salió. Se reintenta en la próxima corrida.'); process.exit(1);
  }
  cron('beat', t0);
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
// Juan, 2026-10-27: el rapero lidera; la voz femenina solo en partes concretas (como mucho un tercio de los versos),
// y el amor no es por una persona (nada de "baby", "girl", "my lover").
function controlarVoces(letra) {
  let actual = '', total = 0, ella = 0;
  for (const l of letra.split('\n')) {
    const tag = l.trim().match(/^\[(.+)\]$/);
    if (tag) { actual = tag[1].toLowerCase(); continue; }
    if (!l.trim()) continue;
    total++;
    if (/female/.test(actual) && !/\bmale\b|&|\band\b/.test(actual.replace('female', ''))) ella++;
  }
  if (total && ella / total > 0.38) return `la voz femenina canta ${ella} de ${total} versos: tiene que aparecer solo en partes concretas (hook, puente); el rapero lidera`;
  if (/\[verse[^\]]*female/i.test(letra) && !/\[verse[^\]]*\bmale/i.test(letra)) return 'los versos tienen que ser del rapero';
  const p = letra.match(/\b(baby|babe|girl|boy|my lover|lover|my ex|darling)\b/i);
  if (p) return `"${p[0]}": el amor de Thrive es abstracto, no por una persona`;
}
// Oficio de letra de trap (Juan, 2026-10-31: "hay que usar referencias de temas de trap real para aprender, a veces menos
// es más"; carril local, thrive-letra-v2.md): hook como mantra, versos que suenan a alguien hablando, nada de dicción
// poética. Las letras anteriores apilaban "…, a fragile grace, a hollow place". Devuelve problemas en inglés, para el modelo.
const CLICHES = /\b(fragile|hollow|fleeting|phantom|gilded|fractured|whisper\w*|echo\w*|ethereal|shimmer\w*|velvet|siren\w*|labyrinth|tapestry|desolate|embrac\w*|solace|ember\w*)\b/gi;
function oficio(letra) {
  const p = [], palabras = l => l.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).length;
  const norm = l => l.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z' ]/g, '').trim();
  const cl = [...new Set((letra.match(CLICHES) || []).map(w => w.toLowerCase()))];
  if (cl.length) p.push(`forbidden poetic words: ${cl.join(', ')} — say it the way a person would`);
  const lineas = letra.split('\n').map(l => l.trim()).filter(l => l && !/^\[/.test(l) && !/^\(.*\)$/.test(l));
  const apos = lineas.filter(l => /(^|,\s*)an?\s+[a-z']+\s+[a-z']+\s*[,.]?$/i.test(l.replace(/\(.*?\)/g, '').trim()));
  if (apos.length > 2) p.push(`${apos.length} lines pile up descriptions like "a cold dark place" (max 2 in the song): ${apos.slice(0, 3).map(l => `"${l}"`).join(', ')}`);
  const partes = letra.split(/^\s*\[([^\]]+)\]\s*$/m);
  for (let i = 1; i < partes.length; i += 2) {
    const tag = partes[i].toLowerCase(), ls = partes[i + 1].split('\n').map(l => l.trim()).filter(l => l && !/^\(.*\)$/.test(l));
    if (/chorus|hook/.test(tag) && !/pre/.test(tag)) {
      if (ls.length > 4) p.push(`a chorus has ${ls.length} lines (max 4)`);
      const distintas = new Set(ls.map(norm)).size;
      if (distintas > 2) p.push(`a chorus has ${distintas} different lines: the hook is a mantra, one short phrase repeated (max 2 different lines)`);
    }
    if (/pre/.test(tag) && ls.length > 2) p.push(`the pre-chorus has ${ls.length} lines (max 2)`);
    if (/verse/.test(tag)) { const largas = ls.filter(l => palabras(l) > 12); if (largas.length) p.push(`verse lines too long (max 12 words): "${largas[0]}"`); }
  }
  if ((letra.match(/\b(I|I'm|I've|I'll|I'd|me|my)\b/g) || []).length < 6) p.push('almost no first person: the verses must sound like someone talking ("I", "my")');
  return p;
}
function rimas(letra) {
  const f = path.join(carpeta, '_letra.txt'); fs.writeFileSync(f, letra);
  const r = spawnSync(PY, [path.join(ROOT, 'scripts/beats/rimas.py'), f], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  try { return JSON.parse(r.stdout); } catch { return { ok: true, problemas: [], aviso: 'no se pudo controlar la rima' }; }
}
if (!tema.letra) {
  const secciones = tema.secciones || medir(INSTR), compas = 240 / tema.bpm;
  tema.duracion = Math.round(dur(INSTR)); guardar();
  // carril local: primero la historia y después la letra que la cuenta (Juan, 2026-10-31: "la letra no tiene sentido,
  // debe contarse algo"). Un modelo chico escribe mejor una letra con sentido si la trama ya está decidida.
  if (LOCAL && !tema.historia) {
    log('Historia de la letra…');
    const t0h = Date.now();
    tema.historia = await pedirJSON(`You are planning the STORY that the lyrics of a trap song will tell, before writing them.
Song: "${tema.titulo}" — ${tema.concepto} (psychological trait: ${tema.rasgo}).
Rules: the love is ABSTRACT — the narrator loves something that is not a person (see the concept): never a lover, an ex, "baby". Nothing about sport.
Make it a real story a listener can follow: one narrator (first person), a concrete place and time, things that HAPPEN (actions, objects, something someone said), a change from the first verse to the second, and a turn in the bridge.
Answer JSON, every value in English, plain words, 1–2 sentences each:
{"quien": "who the narrator is and the situation", "verso1": "what happens in verse 1 (concrete scene)", "gancho": "the hook phrase, 3 to 6 words, that the chorus repeats", "estribillo": "what the chorus means in the story", "verso2": "what happens next in verse 2 (it moved on: consequence or escalation)", "puente": "the turn: what the narrator realizes or decides"}
${fb('letra')}`, { claves: ['quien', 'verso1', 'gancho', 'estribillo', 'verso2', 'puente'], temperatura: 0.85 });
    guardar(); cron('historia', t0h);
    log(`  gancho: "${tema.historia.gancho}" · ${tema.historia.quien}`);
  }
  const H = tema.historia;
  // carril local: encargo nuevo ("menos es más") a prueba antes de pasarlo al proceso semanal
  const base = fs.readFileSync(path.join(ROOT, `scripts/beats/${LOCAL ? 'thrive-letra-v2.md' : 'thrive-letra.md'}`), 'utf8')
    .replace('{{HISTORIA}}', H ? `- Narrator: ${H.quien}\n- Verse 1: ${H.verso1}\n- Chorus: ${H.estribillo} Hook phrase: "${H.gancho}"\n- Verse 2: ${H.verso2}\n- Bridge (the turn): ${H.puente}` : '')
    .replace('{{TITULO}}', tema.titulo).replace('{{CONCEPTO}}', tema.concepto).replace('{{RASGO}}', tema.rasgo).replace('{{CAPTION}}', tema.captionInstrumental)
    .replace('{{VOCES}}', tema.captionVoces).replace('{{BPM}}', tema.bpm).replace('{{TONALIDAD}}', tema.tonalidad).replace('{{DURACION}}', tema.duracion)
    .replace('{{COMPAS}}', compas.toFixed(2)).replace('{{ESTRUCTURA}}', tema.estructura.join(', '))
    .replace('{{MAPA}}', secciones.map((s, i) => `${i + 1}. ${s.nombre !== '?' ? s.nombre + ' · ' : ''}${mmss(s.inicio)}–${mmss(s.fin)} · ${s.compases} bars`).join('\n'));
  let correcciones = fb('letra'), mejor = null;
  const t0 = Date.now();
  // Modelo local primero (Juan, 2026-10-27): 3 vueltas con Gemma corrigiendo rimas; si no rima, Claude Sonnet.
  for (let i = 1; i <= 5; i++) {
    log(`Letra (vuelta ${i})…`);
    let letra;
    try {
      letra = (await pedirTexto(base.replace('{{CORRECCIONES}}', correcciones), { orden: i <= 3 ? ['local', 'claude'] : ['claude', 'local'], claudeModelo: 'sonnet', temperatura: 0.8,   // letra con Sonnet (Juan, 2026-10-27: "solo importa que tenga rimas"; las controla rimas.py)
        validar: x => !/\[(verse|chorus)[^\]]*\]/i.test(x) ? 'sin etiquetas de sección' : DEPORTE.test(x) ? 'palabra deportiva' : CASTELLANO.test(x) ? 'castellano' : controlarVoces(x) }))
        .replace(/^```\w*\n?|```$/g, '').trim();
    } catch (e) { log(`  ${e.message}`); continue; }   // solo local no tiene respaldo: otra vuelta
    const r = rimas(letra);
    const of = LOCAL ? oficio(letra) : [];
    r.problemas = [...of, ...r.problemas]; r.ok = r.ok && !of.length;
    if (!mejor || r.problemas.length < mejor.r.problemas.length) mejor = { letra, r, motor: ultimoMotor };
    if (r.ok) break;
    log(`  a corregir: ${r.problemas.length}${of.length ? ` (oficio: ${of.map(x => x.split(':')[0]).join(' · ')})` : ''}`);
    correcciones = `${fb('letra')}\n## Your previous version\n${letra}\n\n## ${LOCAL ? 'Fix exactly this (keep everything else)' : 'Fix these lines (they do not rhyme BY SOUND; keep everything else)'}\n- ${r.problemas.join('\n- ')}\n`;
  }
  if (!mejor) { log('ERROR: no salió ninguna letra. Se reintenta en la próxima corrida.'); process.exit(1); }
  if (mejor.r.ok && mejor.motor === 'claude') guardarEjemplo('thrive-letra', base.replace('{{CORRECCIONES}}', ''), mejor.letra);
  tema.letra = mejor.letra; tema.letraPor = mejor.motor; if (!mejor.r.ok) tema.avisosRima = mejor.r.problemas; guardar(); cron('letra', t0);
  log(`Letra lista${mejor.r.ok ? ', rimas OK' : ` (quedan ${mejor.r.problemas.length} rimas flojas)`}`);
}

// ── 4. ACE-Step "cover" sobre la instrumental: canta el dúo y pule el beat (como The Shorts) ───────────────
if (!tema.audio) {
  log('Voces y pulido (cover sobre la instrumental)…');
  const t0 = Date.now();
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
  if (df < 115 || df > 160) log(`AVISO: duró ${Math.round(df)} s (fuera de 2:00–2:30)`);
  await putFile(final, `musica/thrive/${tema.slug}.mp3`);
  tema.audio = `musica/thrive/${tema.slug}.mp3?v=${Date.now().toString(36)}`; tema.duracion = Math.round(df); tema.generado = new Date().toISOString(); guardar();
  cron('voces', t0);
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
const t0Final = Date.now();
// carril local: la letra escrita (la final de Gemma copiaba lo que Whisper oía mal: "a fractured musee", 31/10)
if (LOCAL) { tema.letraFinal = tema.letra; log('  local: se publica la letra escrita'); }
else try { tema.letraFinal = await letraFinal(tema, path.join(DIR, `${tema.slug}.mp3`)); }
catch (e) { log(`  no se pudo transcribir (${e.message}); se publica la letra escrita`); tema.letraFinal = tema.letra; tema.letraFinalFallo = true; }
cron('letraFinal', t0Final);
guardar();
if (LOCAL) {
  tema.tiempos = { ...tema.tiempos, ...tiempos };
  log(`Tiempos (IA local): ${Object.entries(tema.tiempos).map(([k, s]) => `${k} ${mmss(s)}`).join(' · ')} · total ${mmss(Object.values(tema.tiempos).reduce((a, b) => a + b, 0))}`);
}
delete tema.revision;
if (tema.publicado !== true) tema.publicado = false;   // se publica cuando Juan lo aprueba en aprobar.html
guardar();
await mandarAAprobar(tema);
await armarCatalogo({ log });
const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
git('add', 'scripts/beats/thrive.json', ...(fs.existsSync(PY_TEMA) ? [PY_TEMA] : []), ...(fs.existsSync(path.join(ROOT, 'scripts/beats/partituras')) ? ['scripts/beats/partituras'] : []));
const c = git('commit', '-m', `feat: Thrive — "${tema.titulo}" (${tema.rasgo})\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
if (c.status === 0) { const ps = git('push', '-q'); log(ps.status === 0 ? 'Commit y push hechos.' : 'Push falló: ' + ps.stderr.slice(-200)); }
log(`✓ "${tema.titulo}" (versión ${tema.version || 1}) listo para revisar en aprobar.html`);
