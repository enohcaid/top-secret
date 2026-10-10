#!/usr/bin/env node
// Tema del día (regla de Juan, 2026-10-09): un beat de trap nuevo y 100% original por día, compuesto por
// código, que pasa directo a la biblioteca de música de los videos (sin aprobación: decisión de Juan).
//
//   node scripts/beats/diario.mjs            → compone el tema de hoy si todavía no existe
//   node scripts/beats/diario.mjs --fecha 2026-10-10
//
// 1. Le encarga la composición a Claude Code (claude -p, encargo en scripts/beats/diario-encargo.md):
//    escribe scripts/beats/temas/diario_<fecha>.py, lo renderiza y lo controla (niveles, espectrograma).
// 2. Pule el wav (silencio final, -14 LUFS, fundido) → fuentes/musica/propios/<fecha> - <Nombre>.mp3
// 3. Lo sube a R2 _fuentes/musica/propios/, lo anota en scripts/beats/temas-diarios.json y commitea.
// Lo corre la tarea programada "TopSecretFC-TemaDelDia" (run-tema-diario-hidden.vbs). Log: scripts/tema-diario.log
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../lib/env.mjs';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const FECHA = opt('--fecha') || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
// --parte N: varios temas por día (pedido de Juan 2026-10-10: "componer de a 2, estamos atrasados"). Cada uno se
// identifica como <fecha>-<N> (archivos, registro y biblioteca); sin --parte, como <fecha>.
const PARTE = opt('--parte');
const ID = PARTE ? `${FECHA}-${PARTE}` : FECHA;
const ARCHIVO = `diario_${ID.replace(/-/g, '_')}.py`;
const REG = path.join(ROOT, 'scripts/beats/temas-diarios.json');
const SALIDA = path.join(ROOT, 'fuentes/beats/salida/diario');
const BIBLIO = path.join(ROOT, 'fuentes/musica/propios');
const CLAUDE = [path.join(os.homedir(), '.local/bin/claude.exe'), path.join(os.homedir(), 'AppData/Roaming/npm/claude.cmd')].find(fs.existsSync) || 'claude';
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [tema-diario] ${m}`);

const reg = fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, 'utf8')) : { temas: [] };
if (reg.temas.some(t => (t.id || t.fecha) === ID)) { log(`El tema ${ID} ya existe.`); process.exit(0); }
fs.mkdirSync(SALIDA, { recursive: true });
fs.mkdirSync(BIBLIO, { recursive: true });
const wav = path.join(SALIDA, `${ID}.wav`), ficha = path.join(SALIDA, `${ID}.json`);

// ── 1. Composición ───────────────────────────────────────────────────────────
if (!fs.existsSync(wav) || !fs.existsSync(ficha)) {
  const anteriores = reg.temas.slice(-20).map(t => `- ${t.fecha} · "${t.nombre}" · ${t.bpm} BPM, ${t.tonalidad} · concepto: ${t.concepto} · rasgo: ${t.rasgo} · recursos: ${(t.recursos || []).join(', ')}`).join('\n') || '(ninguno todavía: este es el primero)';
  const encargo = fs.readFileSync(path.join(ROOT, 'scripts/beats/diario-encargo.md'), 'utf8')
    .replaceAll('{{FECHA}}', ID).replaceAll('{{ARCHIVO}}', ARCHIVO)
    .replaceAll('{{ANTERIORES}}', anteriores).replaceAll('{{FFMPEG}}', ffmpeg.replace(/\\/g, '/'));
  log(`Componiendo el tema ${ID} (${ARCHIVO})…`);
  const r = spawnSync(CLAUDE, ['-p', '--model', 'opus', '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read Write Edit Glob Grep Bash'], {
    cwd: ROOT, input: encargo, encoding: 'utf8', timeout: 75 * 60000, maxBuffer: 64 * 1024 * 1024, shell: CLAUDE.endsWith('.cmd'),
  });
  const out = `${r.stdout || ''}`.trim();
  log(`Claude terminó (código ${r.status}${r.error ? ', ' + r.error.message : ''}): ${out.split('\n').slice(-1)[0] || '(sin salida)'}`);
  if (r.stderr) log(r.stderr.trim().slice(-500));
}
if (!fs.existsSync(wav) || !fs.existsSync(ficha)) { log('ERROR: no quedó el wav o la ficha del tema. Ver la salida de arriba.'); process.exit(1); }

const meta = JSON.parse(fs.readFileSync(ficha, 'utf8'));
if (!meta.nombre) { log('ERROR: la ficha no tiene nombre.'); process.exit(1); }

// ── 2. Pulido: recorte del silencio final, -14 LUFS (lo que piden las redes), fundido de 2 s ──
const dur = Number((spawnSync(ffmpeg, ['-hide_banner', '-i', wav], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/) || [])
  .slice(1).reduce((s, v, i) => s + Number(v) * [3600, 60, 1][i], 0));
if (!(dur >= 60 && dur <= 130)) { log(`ERROR: duración fuera de rango (${dur.toFixed(1)} s).`); process.exit(1); }
const nombreArchivo = `${ID} - ${meta.nombre.replace(/[\\/:*?"<>|]/g, '')}.mp3`;
const mp3 = path.join(BIBLIO, nombreArchivo);
const p = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', wav, '-af',
  `areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${Math.max(0, dur - 2.5).toFixed(2)}:d=2`,
  '-ar', '44100', '-b:a', '256k', mp3], { encoding: 'utf8' });
if (p.status !== 0) { log('ERROR al pulir: ' + p.stderr.slice(-400)); process.exit(1); }

// ── 3. Biblioteca (R2) + registro + commit ──────────────────────────────────
const up = spawnSync(process.execPath, [path.join(ROOT, 'scripts/r2.mjs'), 'put', mp3, `_fuentes/musica/propios/${nombreArchivo}`], { cwd: ROOT, encoding: 'utf8' });
if (up.status !== 0) { log('ERROR subiendo a R2: ' + (up.stderr || up.stdout).slice(-300)); process.exit(1); }
reg.temas.push({ fecha: FECHA, id: ID, archivo: nombreArchivo, script: `scripts/beats/temas/${ARCHIVO}`, duracion: Math.round(dur), ...meta });
fs.writeFileSync(REG, JSON.stringify(reg, null, 2) + '\n');
log(`Tema del día: "${meta.nombre}" (${meta.bpm} BPM, ${meta.tonalidad}, ${Math.round(dur)} s) → ${nombreArchivo}`);

const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
git('add', `scripts/beats/temas/${ARCHIVO}`, 'scripts/beats/temas-diarios.json');
const c = git('commit', '-m', `feat: tema del día ${ID} — "${meta.nombre}" (${meta.concepto})\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
if (c.status === 0) { const ps = git('push', '-q'); log(ps.status === 0 ? 'Commit y push hechos.' : 'Push falló: ' + ps.stderr.slice(-200)); }
else log('Commit no hecho: ' + (c.stdout + c.stderr).slice(-200));
