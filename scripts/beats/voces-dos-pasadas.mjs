// Voces de Thrive en dos pasadas de ACE-Step (2026-11-02, después de medir con el oído):
//   1. ACE pule el beat solo, sin voz (idea de Juan: "pasar primero el beat por ACE"; sigue pasando todo por ACE)
//   2. ACE canta el tema ENTERO sobre ese beat ya pulido, con fuerza alta (0,75): como el beat ya tiene el sonido de
//      ACE, la fuerza alta lo conserva y le suma la voz; y el tema entero ubica bien los estribillos.
// Se descartó cantar por tramos sueltos: el oído midió entre 0 y 0,39 de letra cantada en todos (01/11).
// Hasta 2 intentos de voz (otra semilla), queda el mejor según el oído. La placa (GTX 1070) se colgó dos veces con
// muchas corridas seguidas: una cosa por vez y un minuto de pausa entre corridas.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT } from '../lib/env.mjs';
import { oirTema } from './oido.mjs';

const ACE = path.join(ROOT, 'fuentes', 'beats', 'ACE-Step-1.5');
const PATH_FF = `${path.dirname(ffmpegPath)}${path.delimiter}${process.env.PATH}`;
const pausa = () => spawnSync('powershell', ['-NoProfile', '-c', 'Start-Sleep -Seconds 60']);

function ace(trabajo) {
  const r = spawnSync('python', ['-m', 'uv', 'run', 'python', path.join(ROOT, 'scripts/beats/ace_secciones.py'), trabajo], {
    cwd: ACE, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', timeout: 2 * 3600000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ACESTEP_DTYPE: 'float32', PYTORCH_CUDA_ALLOC_CONF: 'expandable_segments:True', ACESTEP_FREE_DIT_BEFORE_VAE: '1', PYTHONIOENCODING: 'utf-8', PATH: PATH_FF },
  });
  return /TRAMOS_OK/.test(r.stdout || '');
}

export function vocesDosPasadas({ wav, secciones, letra, caption, captionBeat, bpm, tonalidad, carpeta, semilla, fuerzaBeat = 0.65, fuerzaVoz = 0.75, intentos = 2, log = console.log }) {
  const dir = path.join(carpeta, 'voces'); fs.mkdirSync(dir, { recursive: true });
  const dur = +secciones.at(-1).fin.toFixed(2);
  const beat = path.join(dir, 'beat-ace.wav');
  if (!fs.existsSync(beat)) {
    log('  1/2 ACE pule el beat (sin voz)…');
    const t = path.join(dir, 'trabajo-beat.json');
    fs.writeFileSync(t, JSON.stringify({ caption: captionBeat, bpm, tonalidad, fuerza: fuerzaBeat, semilla, tramos: [{ src: wav, letra: '', duracion: dur, salida: beat }] }, null, 2));
    if (!ace(t)) return null;
    pausa();
  }
  let mejor = null;
  for (let k = 1; k <= intentos; k++) {
    const salida = path.join(dir, `cantado-${k}.wav`);
    if (!fs.existsSync(salida)) {
      log(`  2/2 ACE canta el tema entero sobre el beat pulido (intento ${k}, fuerza ${fuerzaVoz})…`);
      const t = path.join(dir, `trabajo-voz-${k}.json`);
      fs.writeFileSync(t, JSON.stringify({ caption, bpm, tonalidad, fuerza: fuerzaVoz, semilla: semilla + 7919 * (k - 1), tramos: [{ src: beat, letra, duracion: dur, salida }] }, null, 2));
      if (!ace(t)) { log(`  el intento ${k} falló`); continue; }
    }
    const o = oirTema({ instrumental: wav, cantado: salida, secciones, letra, carpeta });
    if (o.error) { log(`  oído: ${o.error}`); mejor = mejor || { salida, o: null }; break; }
    log(`  oído (intento ${k}): ${o.secciones.map(x => `${x.seccion} letra ${x.letra ?? '-'} beat ${x.beat}${x.fallas.length ? ' ✗' : ''}`).join(' · ')}`);
    if (!mejor || !mejor.o || o.fallas < mejor.o.fallas || (o.fallas === mejor.o.fallas && o.puntaje > mejor.o.puntaje)) mejor = { salida, o };
    if (!o.fallas || k === intentos) break;
    pausa();
  }
  return mejor;
}
