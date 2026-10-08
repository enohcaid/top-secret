#!/usr/bin/env node
// Retransmite el vivo de Twitch (twitch.tv/topsecretfc, que sale directo de la PS5) a Kick — y a YouTube cuando
// esté habilitado. Espera a que el canal esté en vivo, toma el video con streamlink y lo reenvía con ffmpeg SIN
// recodificar (-c copy): casi no usa CPU; sale con ~10–20 s de retraso respecto de Twitch. Si se corta, reintenta.
//
//   node scripts/retransmitir.mjs [--hasta HH:MM]     (corta a esa hora ART; default 03:00)
// Destinos en .env: KICK_RTMP_URL + KICK_STREAM_KEY (y opcional YT_RTMP_URL + YT_STREAM_KEY).
// Requisitos: Python con streamlink (python -m pip install --user streamlink). Log: fuentes/redes/retransmitir.log
import fs from 'fs';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { loadEnv } from './lib/env.mjs';

loadEnv();
const E = process.env;
const CANAL = 'twitch.tv/topsecretfc';
const LOG = path.resolve('fuentes/redes/retransmitir.log');
fs.mkdirSync(path.dirname(LOG), { recursive: true });
const ahora = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
const log = (...a) => { const l = `[${ahora()}] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOG, l + '\n'); };

const destinos = [];
if (E.KICK_RTMP_URL && E.KICK_STREAM_KEY) destinos.push({ nombre: 'Kick', url: E.KICK_RTMP_URL.replace(/\/?$/, '/') + E.KICK_STREAM_KEY });
if (E.YT_RTMP_URL && E.YT_STREAM_KEY) destinos.push({ nombre: 'YouTube', url: E.YT_RTMP_URL.replace(/\/?$/, '/') + E.YT_STREAM_KEY });
// Las claves nunca van al log
const claves = [E.KICK_STREAM_KEY, E.YT_STREAM_KEY].filter(Boolean);
const ocultarClaves = t => claves.reduce((x, k) => x.split(k).join('***'), t);
if (!destinos.length) { log('No hay destinos en .env (KICK_RTMP_URL/KICK_STREAM_KEY, YT_RTMP_URL/YT_STREAM_KEY).'); process.exit(1); }

const i = process.argv.indexOf('--hasta');
const [hh, mm] = (i > 0 ? process.argv[i + 1] : '03:00').split(':').map(Number);
const limite = (() => {                                     // próxima ocurrencia de HH:MM ART
  const art = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const fin = new Date(art); fin.setHours(hh, mm, 0, 0); if (fin <= art) fin.setDate(fin.getDate() + 1);
  return Date.now() + (fin - art);
})();

function enVivo() {
  try { const j = JSON.parse(execFileSync('python', ['-m', 'streamlink', '--json', CANAL], { encoding: 'utf8', timeout: 60000 })); return !j.error; }
  catch (e) { try { return !JSON.parse(e.stdout || '{}').error; } catch { return false; } }
}

function retransmitir() {
  return new Promise(res => {
    const sl = spawn('python', ['-m', 'streamlink', '--twitch-disable-ads', '--retry-open', '3', '-O', CANAL, 'best'], { stdio: ['ignore', 'pipe', 'pipe'] });
    // Un solo ingreso y una salida por destino (tee), sin recodificar
    const salidas = destinos.map(d => `[f=flv:onfail=ignore]${d.url}`).join('|');
    const ff = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'warning', '-i', 'pipe:0', '-map', '0:v', '-map', '0:a?', '-c', 'copy',
      '-tag:v', '7', '-tag:a', '10',                         // Twitch entrega fMP4 (tag avc1): FLV necesita sus propios tags
      '-f', 'tee', salidas], { stdio: ['pipe', 'ignore', 'pipe'] });
    sl.stdout.pipe(ff.stdin);
    sl.stderr.on('data', d => { const t = String(d).trim(); if (/error|fail/i.test(t)) log('streamlink:', t.slice(0, 200)); });
    ff.stderr.on('data', d => { const t = String(d).trim(); if (t) log('ffmpeg:', ocultarClaves(t).slice(0, 200)); });
    const fin = () => { sl.kill(); ff.kill(); };
    const reloj = setInterval(() => { if (Date.now() > limite) { log('Hora límite: corto.'); fin(); } }, 30000);
    ff.on('close', code => { clearInterval(reloj); sl.kill(); res(code); });
    ff.stdin.on('error', () => {});
  });
}

log(`Retransmisor listo → ${destinos.map(d => d.nombre).join(' + ')}. Esperando que ${CANAL} esté en vivo (hasta las ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}).`);
while (Date.now() < limite) {
  if (enVivo()) {
    log('Twitch en vivo: empiezo a retransmitir.');
    const code = await retransmitir();
    log(`Retransmisión terminada (ffmpeg ${code}). Vuelvo a esperar.`);
    await new Promise(r => setTimeout(r, 10000));
  } else await new Promise(r => setTimeout(r, 30000));
}
log('Fin del horario. Retransmisor apagado.');
process.exit(0);
