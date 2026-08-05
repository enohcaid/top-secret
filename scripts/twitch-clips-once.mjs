// Busca el VOD mas reciente del canal de Twitch de cabers1414 y corre sobre el
// la extraccion de clips candidatos (scripts/extract-goal-clips.mjs).
// Pensado para Windows Task Scheduler (corrida nocturna, sin supervision).
//
// Uso: node scripts/twitch-clips-once.mjs [--channel <usuario>]

import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ytdlpBin = path.resolve('node_modules/yt-dlp-exec/bin/yt-dlp.exe');

function getArg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

const channel = getArg('channel', 'cabers1414');
const ts = () => new Date().toISOString();

console.log(`[${ts()}] Buscando videos de ${channel}...`);
const listRes = spawnSync(ytdlpBin, ['--flat-playlist', '--dump-json', `https://www.twitch.tv/${channel}/videos`], {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 50,
});
if (listRes.status !== 0) {
  console.error(`[${ts()}] yt-dlp fallo al listar videos (status ${listRes.status}):`);
  console.error(listRes.stderr);
  process.exit(1);
}

const lines = listRes.stdout.split('\n').filter(Boolean);
if (!lines.length) {
  console.error(`[${ts()}] El canal no devolvio ningun video (¿sin VODs disponibles?).`);
  process.exit(1);
}

const videos = lines.map(l => JSON.parse(l));
// El listado de Twitch viene ordenado por mas reciente primero.
const latest = videos[0];
const url = latest.url || `https://www.twitch.tv/videos/${latest.id}`;
console.log(`[${ts()}] VOD mas reciente: ${latest.id} — "${latest.title}" (${latest.duration}s)`);
console.log(`[${ts()}] URL: ${url}`);

console.log(`[${ts()}] Corriendo extract-goal-clips.mjs...`);
const extractRes = spawnSync('node', ['scripts/extract-goal-clips.mjs', '--url', url], {
  stdio: 'inherit',
});

if (extractRes.status !== 0) {
  console.error(`[${ts()}] extract-goal-clips.mjs termino con error (status ${extractRes.status}).`);
  process.exit(extractRes.status || 1);
}

console.log(`[${ts()}] Listo.`);
