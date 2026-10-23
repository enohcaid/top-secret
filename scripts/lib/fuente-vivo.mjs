// Fuente del vivo (la señal limpia del partido): un canal de Twitch (enohcaid = la PS5, por defecto) o un canal de
// YouTube (2026-10-22: esa noche transmitió RS32-DaniStone desde su YouTube y el vigía, que solo miraba enohcaid, no
// corrió: sin goles, repeticiones, pausa ni fin de partido). retransmitir.mjs decide la fuente, la anota en
// fuentes/stream/fuente.json y lanza el vigía con la misma; así los dos miran siempre lo mismo.
import fs from 'fs';
import path from 'path';
import { execFile, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const YTDLP = path.join(ROOT, 'node_modules/yt-dlp-exec/bin/yt-dlp.exe');
export const ARCHIVO_FUENTE = path.join(ROOT, 'fuentes/stream/fuente.json');
const GQL_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';   // Client-ID público de Twitch

// 'enohcaid' | 'twitch.tv/x' | 'https://www.youtube.com/@canal' → { nombre, tipo, url }
export function fuenteDe(x = 'enohcaid') {
  if (/youtube\.com|youtu\.be/i.test(x)) {
    const url = /\/live\/?$|watch\?v=/.test(x) ? x : x.replace(/\/?$/, '/live');
    return { nombre: x, tipo: 'youtube', url };
  }
  const login = x.replace(/^https?:\/\/(www\.)?twitch\.tv\//, '').replace(/^twitch\.tv\//, '').replace(/\/.*$/, '');
  return { nombre: login, tipo: 'twitch', login, url: `twitch.tv/${login}` };
}

// La que anotó retransmitir.mjs esta noche (si el archivo es de hace menos de 12 h); si no, enohcaid
export function fuenteActual() {
  try {
    if (Date.now() - fs.statSync(ARCHIVO_FUENTE).mtimeMs < 12 * 3600e3) return fuenteDe(JSON.parse(fs.readFileSync(ARCHIVO_FUENTE, 'utf8')).fuente);
  } catch {}
  return fuenteDe('enohcaid');
}
export function anotarFuente(f) {
  fs.mkdirSync(path.dirname(ARCHIVO_FUENTE), { recursive: true });
  fs.writeFileSync(ARCHIVO_FUENTE, JSON.stringify({ fuente: f.tipo === 'youtube' ? f.nombre : f.login, url: f.url, desde: new Date().toISOString() }));
}

// ¿Está en vivo? → { id } | false | null (sin respuesta: no se sabe). Sin bloquear el proceso.
export async function enVivo(f) {
  if (f.tipo === 'youtube') return new Promise(ok => execFile('python', ['-m', 'streamlink', '--json', f.url], { timeout: 40000 }, (e, out) => {
    try { const j = JSON.parse(out); ok(Object.keys(j.streams || {}).length ? { id: j.metadata?.id || 'yt' } : false); } catch { ok(e?.killed ? null : false); }
  }));
  try {
    const r = await fetch('https://gql.twitch.tv/gql', { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'Client-ID': GQL_ID },
      body: JSON.stringify({ query: `query{user(login:"${f.login}"){stream{id}}}` }) });
    const s = (await r.json()).data?.user?.stream;
    return s ? { id: s.id } : false;
  } catch { return null; }
}

// URL HLS para leer la señal con ffmpeg (720p alcanza para el vigía)
export function urlLectura(f) {
  if (f.tipo === 'youtube') return execFileSync('python', ['-m', 'streamlink', '--stream-url', f.url, '720p60,720p,best'], { encoding: 'utf8', timeout: 60000 }).trim();
  return execFileSync(YTDLP, ['--no-update', '-g', '-f', 'best[height<=720]/best', `https://www.twitch.tv/${f.login}`], { encoding: 'utf8' }).trim().split('\n')[0];
}
