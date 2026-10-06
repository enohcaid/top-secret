#!/usr/bin/env node
// Emprolija los beats que genera scripts/beats/generar.mjs para escucharlos y usarlos:
// recorta el silencio del final (ACE-Step suele dejar ~7 s), normaliza a -14 LUFS (lo que piden
// las redes) y hace un fundido de salida de 2 s. Nombres legibles: <estilo>-<n>.mp3.
//
//   node scripts/beats/pulir.mjs [estilo …]     (sin estilos: todos los de fuentes/beats/salida)
// Salida: fuentes/beats/escuchar/.
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';

const SALIDA = path.resolve('fuentes/beats/salida');
const DEST = path.resolve('fuentes/beats/escuchar');
fs.mkdirSync(DEST, { recursive: true });
const estilos = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(SALIDA);

const run = args => spawnSync(ffmpeg, ['-hide_banner', '-y', ...args], { encoding: 'utf8' });

for (const estilo of estilos) {
  const dir = path.join(SALIDA, estilo);
  if (!fs.existsSync(dir)) { console.warn(`No hay beats de "${estilo}"`); continue; }
  const mp3s = fs.readdirSync(dir).filter(f => /\.(mp3|wav)$/.test(f)).sort((a, b) => fs.statSync(path.join(dir, a)).mtimeMs - fs.statSync(path.join(dir, b)).mtimeMs);
  mp3s.forEach((f, i) => {
    const src = path.join(dir, f);
    // Dónde empieza el silencio final (si lo hay) → duración útil.
    const det = run(['-i', src, '-af', 'silencedetect=n=-45dB:d=1.5', '-f', 'null', '-']).stderr;
    const dur = Number((det.match(/Duration: (\d+):(\d+):([\d.]+)/) || []).slice(1).reduce((t, v, k) => t + Number(v) * [3600, 60, 1][k], 0));
    const finales = [...det.matchAll(/silence_start: ([\d.]+)/g)].map(m => Number(m[1])).filter(s => s > dur - 15);
    const fin = finales.length ? Math.min(...finales) + 0.3 : dur;
    const out = path.join(DEST, `${estilo}-${i + 1}.mp3`);
    const r = run(['-i', src, '-t', fin.toFixed(2), '-af',
      `loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=${Math.max(0, fin - 2).toFixed(2)}:d=2,aresample=48000`,
      '-b:a', '192k', out]);
    if (r.status !== 0) { console.error(`Falló ${f}: ${r.stderr.split('\n').slice(-3).join(' ')}`); return; }
    console.log(`${path.basename(out)}  ${Math.round(fin)} s  (de ${f})`);
  });
}
