// Arma el video vertical 1080x1920 de fichajes: intro + 3 s por jugador (clip de Canva + texto) + cierre.
const { execFileSync } = require('child_process');
const fs = require('fs');
const FF = require('ffmpeg-static');
const D = 'fuentes/video-fichajes/';
const P = require('./jugadores.json').map(j => j[0]);
const X = 0.35;                 // duración de cada fundido cruzado
const SEG = 3 + X;              // cada jugador dura 3 s visibles + lo que se come el fundido
const INTRO = 1.6 + X, OUTRO = 2.2;

const inputs = [], filters = [];
let n = 0;
const add = args => { inputs.push(...args); return n++; };

// Intro: placa fija con zoom muy suave.
const iIntro = add(['-loop', '1', '-t', String(INTRO), '-i', D + 'intro.png']);
filters.push(`[${iIntro}:v]scale=1188:2112,zoompan=z='min(zoom+0.0009,1.06)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,trim=duration=${INTRO},setsar=1,format=yuv420p[s0]`);

P.forEach((k, i) => {
  const v = add(['-ss', '0.4', '-t', String(SEG), '-i', D + k + '.mp4']);
  const o = add(['-loop', '1', '-t', String(SEG), '-i', D + 'ov-' + k + '.png']);
  filters.push(
    `[${v}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1[v${i}]`,
    `[${o}:v]format=rgba,fade=in:st=${X + 0.15}:d=0.45:alpha=1[o${i}]`,
    `[v${i}][o${i}]overlay=0:0:shortest=1,trim=duration=${SEG},format=yuv420p[s${i + 1}]`);
});

const iOut = add(['-loop', '1', '-t', String(OUTRO), '-i', D + 'outro.png']);
filters.push(`[${iOut}:v]scale=1188:2112,zoompan=z='min(zoom+0.0009,1.06)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,trim=duration=${OUTRO},fade=out:st=${OUTRO - 0.5}:d=0.5,setsar=1,format=yuv420p[s${P.length + 1}]`);

// Encadenar con fundidos cruzados.
const durs = [INTRO, ...P.map(() => SEG), OUTRO];
let prev = 's0', t = durs[0];
for (let i = 1; i < durs.length; i++) {
  const out = i === durs.length - 1 ? 'vout' : `x${i}`;
  filters.push(`[${prev}][s${i}]xfade=transition=fade:duration=${X}:offset=${(t - X).toFixed(3)}[${out}]`);
  t += durs[i] - X;
  prev = out;
}

const outFile = D + 'nuevos-fichajes-t4.mp4';
execFileSync(FF, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[vout]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', '30', outFile], { stdio: 'inherit' });
console.log('ok', outFile, (fs.statSync(outFile).size / 1048576).toFixed(1) + ' MB', 'duración ~' + t.toFixed(1) + ' s');
