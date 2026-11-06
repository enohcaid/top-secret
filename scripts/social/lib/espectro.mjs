// Espectro real de un tema, por franja y por cuadro, para que las piezas se muevan con la música y no con un seno inventado.
//   espectro(mp3, segundos, desde, franjas = 23) → [[v0…v22] por cada 1/30 s], valores de 0 a 1
// Cada banda se normaliza contra sí misma y sube rápido y baja lento, como un vúmetro. Después se mezclan para que las
// franjas no formen una rampa de graves a agudos.
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';

export function espectro(mp3, seg, desde, franjas = 23) {
  const SR = 22050, N = 2048;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', String(desde), '-t', String(seg + .2), '-i', mp3, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('espectro: ' + r.stderr);
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
  const cortes = Array.from({ length: franjas + 1 }, (_, i) => 70 * Math.pow(9000 / 70, i / franjas));
  const crudo = [];
  for (let f = 0; f < Math.round(seg * 30); f++) {
    const c = Math.round(f / 30 * SR), re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = (pcm[c + i] || 0) * (.5 - .5 * Math.cos(2 * Math.PI * i / (N - 1)));
    for (let i = 0, j = 0; i < N; i++) { if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } let m = N >> 1; while (m >= 1 && j & m) { j ^= m; m >>= 1; } j |= m; }
    for (let l = 2; l <= N; l <<= 1) {
      const a = -2 * Math.PI / l;
      for (let i = 0; i < N; i += l) for (let k = 0; k < l / 2; k++) {
        const w = a * k, wr = Math.cos(w), wi = Math.sin(w), p = i + k, q = p + l / 2, tr = wr * re[q] - wi * im[q], ti = wr * im[q] + wi * re[q];
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
      }
    }
    crudo.push(cortes.slice(0, franjas).map((d, b) => {
      const a = Math.max(1, Math.floor(d * N / SR)), z = Math.max(a + 1, Math.ceil(cortes[b + 1] * N / SR));
      let s = 0; for (let k = a; k < z; k++) s += Math.hypot(re[k], im[k]);
      return Math.log10(1 + s / (z - a));
    }));
  }
  const lim = Array.from({ length: franjas }, (_, b) => { const v = crudo.map(f => f[b]).sort((x, y) => x - y); return [v[Math.floor(v.length * .15)], v[Math.floor(v.length * .98)]]; });
  const prev = new Array(franjas).fill(0), mezcla = Array.from({ length: franjas }, (_, i) => i * 10 % franjas);
  return crudo.map(f => {
    f.forEach((v, b) => { const n = Math.max(0, Math.min(1, (v - lim[b][0]) / (lim[b][1] - lim[b][0] || 1))); prev[b] = n > prev[b] ? prev[b] + (n - prev[b]) * .7 : prev[b] * .88 + n * .12; });
    return mezcla.map(b => +prev[b].toFixed(3));
  });
}

// Pulso del tramo más fuerte del tema: para cortar la imagen sobre la música.
//   pulso(mp3, largo) → { beat, inicio } (segundos por pulso y segundo del tema donde arranca un pulso de ese tramo)
export function pulso(mp3, largo) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', '11025', '-f', 's16le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
  const M = 110, en = new Float32Array(Math.floor(pcm.length / M));
  for (let i = 0; i < en.length; i++) { let s = 0; for (let j = 0; j < M; j++) s += Math.abs(pcm[i * M + j]); en[i] = s / M; }
  const flujo = en.map((v, i) => i ? Math.max(0, v - en[i - 1]) : 0);
  const V = Math.round(largo * 100);
  let suma = 0, mejor = -1, desde = 0;
  for (let i = 0; i < en.length; i++) { suma += en[i]; if (i >= V) suma -= en[i - V]; if (i >= V && suma > mejor) { mejor = suma; desde = i - V + 1; } }
  const a = flujo.subarray(desde, desde + V);
  let lag = 60, top = -1;
  for (let l = 35; l <= 86; l++) { let c = 0; for (let i = l; i < a.length; i++) c += a[i] * a[i - l]; if (c > top) { top = c; lag = l; } }
  let fase = 0, fTop = -1;
  for (let f = 0; f < lag; f++) { let c = 0; for (let i = f; i < a.length; i += lag) c += a[i]; if (c > fTop) { fTop = c; fase = f; } }
  return { beat: lag / 100, inicio: (desde + fase) / 100 };
}
