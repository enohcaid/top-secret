// Voz en off para los videos de redes (pedido de Juan, 2026-10-14: "siempre que se pueda, una voz viral").
// Voces neuronales de Microsoft (edge-tts, gratis, sin clave) con acento rioplatense; lib/voz.py hace la síntesis.
//
//   const pistas = await narracion([{ en: 0, texto: 'Se le cortó la conexión a un compañero.' }, { en: 4.2, texto: '…' }], carpeta)
//   await agregarVoz('video.mp4', pistas, 'video-voz.mp4')   → mezcla la voz y baja la música mientras habla
//
// Cada frase se ubica en el segundo `en` del video (el arranque de su escena). Si una frase dura más que su escena,
// la siguiente se corre para no pisarse. Las frases se cachean por texto + voz (no se regeneran).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../../lib/env.mjs';

// La voz del club, siempre (elección de Juan, 2026-10-14): Elena, argentina, a ritmo de TikTok (+12 %).
// Solo en videos que cuentan una historia; los musicales (antes y después, transiciones) van sin voz.
export const VOZ = { voz: 'es-AR-ElenaNeural', rate: '+12%', pitch: '+0Hz' };
const PY = process.platform === 'win32' ? 'python' : 'python3';

export function duracion(archivo) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', archivo], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

// Una frase → { archivo, dur, palabras: [{ t, d, w }] } (t relativo al inicio de la frase).
export function narrar(texto, carpeta, opts = {}) {
  const v = { ...VOZ, ...opts };
  fs.mkdirSync(carpeta, { recursive: true });
  const h = crypto.createHash('sha1').update(JSON.stringify([texto, v.voz, v.rate, v.pitch])).digest('hex').slice(0, 12);
  const mp3 = path.join(carpeta, `voz-${h}.mp3`), js = path.join(carpeta, `voz-${h}.json`);
  if (!fs.existsSync(mp3) || !fs.existsSync(js)) {
    const txt = path.join(carpeta, `voz-${h}.txt`);
    fs.writeFileSync(txt, texto, 'utf8');
    const r = spawnSync(PY, [path.join(ROOT, 'scripts/social/lib/voz.py'), txt, v.voz, v.rate, v.pitch, mp3, js], { encoding: 'utf8', timeout: 120000 });
    fs.rmSync(txt, { force: true });
    if (r.status !== 0 || !fs.existsSync(mp3)) throw new Error('Voz (edge-tts) falló: ' + (r.stderr || r.stdout || '').trim().split('\n').pop());
  }
  return { archivo: mp3, dur: duracion(mp3), palabras: JSON.parse(fs.readFileSync(js, 'utf8')) };
}

// Varias frases ubicadas en el tiempo → pistas con `en` final y palabras en tiempo absoluto del video.
export function narracion(frases, carpeta, opts = {}) {
  let libre = 0;
  return frases.map(f => {
    const n = narrar(f.texto, carpeta, { ...opts, ...(f.voz || {}) });
    const en = Math.max(f.en, libre);
    libre = en + n.dur + 0.15;
    return { ...n, en, texto: f.texto, palabras: n.palabras.map(p => ({ ...p, t: p.t + en })) };
  });
}

// Mezcla las pistas de voz sobre un video ya renderizado: la voz arriba, la música (el audio que ya tenga) baja
// sola mientras se habla (sidechain) y vuelve en los silencios. Devuelve la ruta de salida.
export function agregarVoz(videoIn, pistas, salida, { volumenMusica = 0.6 } = {}) {
  const total = duracion(videoIn);
  const fin = pistas.at(-1);
  if (fin && fin.en + fin.dur > total + 0.05) throw new Error(`La voz termina en ${(fin.en + fin.dur).toFixed(1)} s y el video dura ${total.toFixed(1)} s: acortá el texto o alargá las escenas.`);
  const tieneAudio = /Audio:/.test(spawnSync(ffmpeg, ['-hide_banner', '-i', videoIn], { encoding: 'utf8' }).stderr || '');
  const args = ['-hide_banner', '-y', '-i', videoIn];
  pistas.forEach(p => args.push('-i', p.archivo));
  const voces = pistas.map((p, i) => `[${i + 1}:a]loudnorm=I=-13:TP=-1.5:LRA=7,aresample=48000,adelay=${Math.round(p.en * 1000)}:all=1[v${i}]`);
  const vz = `${pistas.map((_, i) => `[v${i}]`).join('')}amix=inputs=${pistas.length}:normalize=0,apad,atrim=0:${total.toFixed(3)}`;
  const f = tieneAudio
    ? [...voces, `${vz},asplit=2[vz1][vz2]`,
       `[0:a]aresample=48000,volume=${volumenMusica}[mu]`,
       `[mu][vz1]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450[mud]`,
       `[mud][vz2]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]`]
    : [...voces, `${vz},alimiter=limit=0.95[a]`];
  args.push('-filter_complex', f.join(';'), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', salida);
  const r = spawnSync(ffmpeg, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (voz) falló: ' + (r.stderr || '').slice(-800));
  return salida;
}
