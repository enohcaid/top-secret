// Corre el detector de goles de vigia-vivo.mjs (scripts/lib/marcador.mjs) sobre una grabación o un VOD,
// sin OCR ni clips: sirve para calibrarlo y para probar cambios contra partidos ya conocidos.
//   node scripts/probar-marcador.mjs <video.mp4 | url HLS> [--salida <carpeta>]   (guarda el recorte de cada gol)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { SB_CAJA, SB_NUM, hayMarcador, crearDetector } from './lib/marcador.mjs';

const args = process.argv.slice(2);
const src = args[0];
const salida = args.includes('--salida') ? path.resolve(args[args.indexOf('--salida') + 1]) : null;
if (!src) { console.log('Uso: node scripts/probar-marcador.mjs <video | url> [--salida <carpeta>]'); process.exit(1); }
if (salida) mkdirSync(salida, { recursive: true });

const W = 1280, H = 720, AUSENCIA_PARTIDO = 90;
const R = { x: 60, y: 30, w: 150, h: 66 };   // = SB_RECORTE, contiene caja y cifras
const n = R.w * R.h;
const hms = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const sub = (f, reg) => { const o = new Uint8Array(reg.width * reg.height); for (let j = 0; j < reg.height; j++) o.set(f.subarray((reg.top - R.y + j) * R.w + reg.left - R.x, (reg.top - R.y + j) * R.w + reg.left - R.x + reg.width), j * reg.width); return o; };

const det = crearDetector(process.env.MARCADOR_OPC ? JSON.parse(process.env.MARCADOR_OPC) : {});
const desde = args.includes('--desde') ? Number(args[args.indexOf('--desde') + 1]) : 0;
let seg = desde, ultimo = -1e9, inicio = 0, partidos = 0, goles = 0, pend = Buffer.alloc(0), cola = Promise.resolve();
const p = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', String(desde), '-i', src, '-an',
  '-vf', `fps=1,scale=${W}:${H},crop=${R.w}:${R.h}:${R.x}:${R.y},format=gray`, '-f', 'rawvideo', 'pipe:1'], { stdio: ['ignore', 'pipe', 'inherit'] });
p.stdout.on('data', chunk => {
  pend = Buffer.concat([pend, chunk]);
  while (pend.length >= n) {
    const f = Buffer.from(pend.subarray(0, n)); pend = pend.subarray(n);
    const s = seg++;
    if (!hayMarcador(sub(f, SB_CAJA))) continue;
    if (s - ultimo > AUSENCIA_PARTIDO) { det.reiniciar(); partidos++; inicio = s; console.log(`[${hms(s)}] marcador (partido/tiempo #${partidos})`); }
    ultimo = s;
    const ev = det.paso(sub(f, SB_NUM), sub(f, SB_CAJA), s);
    if (s - inicio >= 5 && !det.asentado) det.asentar();
    if (!ev || s - inicio < 5) continue;
    goles++;
    console.log(`[${hms(ev.seg)}] gol #${goles} (fila ${ev.fila ? 'visita' : 'local'})`);
    if (salida) cola = cola.then(() => sharp(f, { raw: { width: R.w, height: R.h, channels: 1 } }).resize(450)
      .png().toFile(path.join(salida, `gol-${String(goles).padStart(2, '0')}-${hms(ev.seg).replace(/:/g, '')}.png`)));
  }
});
p.on('exit', async () => { await cola; console.log(`Listo: ${hms(seg)} analizado, ${partidos} partidos/tiempos, ${goles} goles.`); });
