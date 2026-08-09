// Detecta momentos destacados (goles, atajadas, jugadas) en un VOD de Twitch
// por cambios de pixel sobre el recorte del marcador, y extrae un clip
// candidato por cada uno para revisión manual.
//
// NOTA (2026-08-09): se probaron 3 heurísticas de clasificación automática
// GOL/JUGADA basadas en comparar píxeles del marcador (ver historial de git
// de este archivo) y ninguna dio resultados confiables — demasiados falsos
// positivos y negativos. Se descartó ese camino. Para identificar goles
// puntuales, la vía que sí funcionó fue pedirle a Claude que mire los
// fotogramas directamente (visión real, no heurística de píxeles) — pedirlo
// en el momento en vez de tratar de automatizarlo sin supervisión.
//
// Uso:
//   node scripts/extract-goal-clips.mjs --url <twitch-vod-url> [opciones]
//
// Opciones:
//   --out <dir>        carpeta de salida (default: Clips/<nombre sacado de la URL>)
//   --start <seg>       inicio del rango a descargar/analizar (segundos)
//   --end <seg>         fin del rango
//   --interval <seg>    cada cuanto muestrear el marcador (default: 2)
//   --pre <seg>         segundos antes del cambio a incluir en el clip (default: 18)
//   --post <seg>        segundos despues del cambio a incluir (default: 12)
//   --crop <w:h:x:y>    región del marcador a comparar (default calibrado para
//                       el layout de EA FC Clubs Pro visto en cabers1414: "32:56:258:58",
//                       son los dos dígitos del marcador en la esquina sup. izquierda)
//   --threshold <n>     diferencia media de píxel (0-255) para considerar cambio (default: 35)
//   --skip-start <seg>  segundos a saltar antes de analizar (default: 0). El
//                       lobby/menú previo al kickoff no tiene el HUD del marcador
//                       y puede generar algunos falsos positivos (diffs altos por
//                       animaciones de menú) — se probó autodetectar el kickoff
//                       por señales de píxel (estabilidad, contraste, tinte verde
//                       del lobby) y ninguna resultó confiable entre streams
//                       distintos, así que queda manual. Sin --skip-start, el
//                       umbral (--threshold) + revisión manual de los clips
//                       filtran el ruido de lobby igual.
//   --merge-gap <seg>   separación máxima entre picos para tratarlos como un solo evento (default: 10)
//
// El video fuente se descarga una sola vez en <out>/_work/source.mp4 y se reutiliza
// en corridas siguientes contra la misma carpeta --out (útil para reprocesar con
// otro --threshold sin volver a descargar).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';

const ytdlpBin = path.resolve('node_modules/yt-dlp-exec/bin/yt-dlp.exe');

function getArg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}
const url = getArg('url');
if (!url) {
  console.error('Falta --url <twitch-vod-url>');
  process.exit(1);
}

const vodId = (url.match(/videos\/(\d+)/) || [])[1] || 'vod';
const outDir = path.resolve(getArg('out', `Clips/${vodId}`));
const start = getArg('start');
const end = getArg('end');
const interval = parseFloat(getArg('interval', '2'));
const pre = parseFloat(getArg('pre', '18'));
const post = parseFloat(getArg('post', '12'));
const cropSpec = getArg('crop', '32:56:258:58');
const threshold = parseFloat(getArg('threshold', '35'));
const mergeGap = parseFloat(getArg('merge-gap', '10'));
const skipStart = parseFloat(getArg('skip-start', '0'));

fs.mkdirSync(outDir, { recursive: true });
const workDir = path.join(outDir, '_work');
fs.mkdirSync(workDir, { recursive: true });
const sourceFile = path.join(workDir, 'source.mp4');
const framesDir = path.join(workDir, 'frames');

function run(cmd, args, label) {
  console.log(`[${label}] ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`${label} fallo con status ${res.status}`);
  }
}

// 1. Descargar el VOD (o el rango pedido) si no está ya descargado.
if (!fs.existsSync(sourceFile)) {
  const dlArgs = ['-f', '1080p/best', '-o', sourceFile];
  if (start || end) {
    dlArgs.push('--download-sections', `*${start || 0}-${end || ''}`);
    dlArgs.push('--ffmpeg-location', ffmpegPath);
  }
  dlArgs.push(url);
  run(ytdlpBin, dlArgs, 'yt-dlp');
} else {
  console.log('Video fuente ya descargado, reutilizando:', sourceFile);
}

const [cw, ch, cx, cy] = cropSpec.split(':').map(Number);

// 2. Extraer frames de baja resolución recortados sobre el marcador.
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
run(
  ffmpegPath,
  [
    '-y',
    ...(skipStart > 0 ? ['-ss', String(skipStart)] : []),
    '-i', sourceFile,
    '-vf', `crop=${cw}:${ch}:${cx}:${cy},fps=1/${interval}`,
    path.join(framesDir, 'f_%06d.png'),
  ],
  'ffmpeg-sample'
);

// 3. Comparar frames consecutivos (diferencia media de píxel) para detectar cambios de marcador.
const files = fs.readdirSync(framesDir).filter(f => f.endsWith('.png')).sort();
console.log(`Frames muestreados: ${files.length}`);

const diffs = [];
let prevBuf = null;
for (let i = 0; i < files.length; i++) {
  const buf = await sharp(path.join(framesDir, files[i])).raw().grayscale().toBuffer();
  if (prevBuf) {
    let sum = 0;
    for (let p = 0; p < buf.length; p++) sum += Math.abs(buf[p] - prevBuf[p]);
    const meanDiff = sum / buf.length;
    diffs.push(meanDiff);
  } else {
    diffs.push(0);
  }
  prevBuf = buf;
}

// 4. Agrupar frames con diferencia > threshold en eventos (candidatos a jugada
// destacada: el juego suele cortar a repetición en goles, atajadas y jugadas
// importantes). Un evento puede abarcar varias muestras seguidas (la repetición
// dura varios segundos), así que se guarda inicio Y fin de cada racha.
const events = [];
let current = null;
for (let i = 0; i < diffs.length; i++) {
  const t = skipStart + i * interval;
  if (diffs[i] > threshold) {
    if (current && t - current.end <= mergeGap) {
      current.end = t;
    } else {
      if (current) events.push(current);
      current = { start: t, end: t };
    }
  }
}
if (current) events.push(current);

console.log(`Eventos candidatos detectados: ${events.length}`);
console.log(events.map(e => {
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return `${fmt(e.start)}-${fmt(e.end)}`;
}).join(', '));

// 5. Cortar un clip por evento (con padding), copia de stream (rápido, sin recodificar).
const manifest = [];
for (let i = 0; i < events.length; i++) {
  const { start: evStart, end: evEnd } = events[i];
  const clipStart = Math.max(0, evStart - pre);
  const clipDuration = (evEnd - evStart) + pre + post;
  const outFile = path.join(outDir, `clip_${String(i + 1).padStart(2, '0')}_${Math.floor(evStart)}s.mp4`);
  run(
    ffmpegPath,
    [
      '-y',
      '-ss', String(clipStart),
      '-i', sourceFile,
      '-t', String(clipDuration),
      '-c', 'copy',
      outFile,
    ],
    `clip-${i + 1}`
  );
  manifest.push({ event_start_s: evStart, event_end_s: evEnd, clip: outFile });
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log('Limpiando frames temporales (se conserva el video fuente para reuso)...');
fs.rmSync(framesDir, { recursive: true, force: true });

console.log(`\nListo. ${manifest.length} clips en ${outDir}`);
