#!/usr/bin/env node
// Escribe la configuración de OBS para el vivo con overlay (perfil y colección "TopSecret") en %APPDATA%\obs-studio.
//   node scripts/stream/obs-config.mjs
// Escena "Vivo": la señal de la PS5 (twitch.tv/enohcaid, servida en http://127.0.0.1:8787 por streamlink) escalada a
// 1920×1080 + scripts/stream/overlay.html encima. Salida: NVENC 720p60 CBR (--kbps, default 2000), fotogramas clave
// cada 2 s (lo que pide Kick), a rtmp://127.0.0.1:1935/live/ts (MediaMTX); retransmitir.mjs lo reparte a los canales.
// Por qué 720p y poco bitrate: la PS5 manda 720p60 a ~2 Mbps (más resolución no suma) y la subida de la PC mide
// ~10 Mbps (2026-10-15): van 3 copias (topsecretfc, Kick, YouTube) más la señal de la PS5 si comparte la conexión.
// obs-websocket en 127.0.0.1:4455 con la clave OBS_WS_PASSWORD de .env (la genera si no está).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { loadEnv } from '../lib/env.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const ki = process.argv.indexOf('--kbps'), KBPS = ki > 0 ? +process.argv[ki + 1] : 2000;
loadEnv();
let clave = process.env.OBS_WS_PASSWORD;
if (!clave) {
  clave = crypto.randomBytes(18).toString('base64url');
  fs.appendFileSync(path.join(ROOT, '.env'), `\n# obs-websocket local (scripts/stream/obs-config.mjs)\nOBS_WS_PASSWORD=${clave}\n`);
}

const OBS = path.join(process.env.APPDATA, 'obs-studio');
const PERFIL = path.join(OBS, 'basic', 'profiles', 'TopSecret');
const ESCENAS = path.join(OBS, 'basic', 'scenes');
for (const d of [PERFIL, ESCENAS, path.join(OBS, 'plugin_config', 'obs-websocket')]) fs.mkdirSync(d, { recursive: true });
const ini = o => Object.entries(o).map(([s, kv]) => `[${s}]\n` + Object.entries(kv).map(([k, v]) => `${k}=${v}`).join('\n')).join('\n\n') + '\n';

fs.writeFileSync(path.join(PERFIL, 'basic.ini'), ini({
  General: { Name: 'TopSecret' },
  Output: { Mode: 'Advanced' },
  AdvOut: { Encoder: 'obs_nvenc_h264_tex', AudioEncoder: 'ffmpeg_aac', TrackIndex: 1, Track1Bitrate: 160, RecEncoder: 'none' },
  Video: { BaseCX: 1920, BaseCY: 1080, OutputCX: 1280, OutputCY: 720, FPSType: 0, FPSCommon: 60, ScaleType: 'lanczos', ColorFormat: 'NV12' },
  Audio: { SampleRate: 48000, ChannelSetup: 'Stereo' },
}));
fs.writeFileSync(path.join(PERFIL, 'streamEncoder.json'), JSON.stringify({ rate_control: 'CBR', bitrate: KBPS, keyint_sec: 2, preset: 'p5', tune: 'hq', profile: 'high', bf: 2 }));
fs.writeFileSync(path.join(PERFIL, 'service.json'), JSON.stringify({ type: 'rtmp_custom', settings: { server: 'rtmp://127.0.0.1:1935/live', key: 'ts', use_auth: false } }));

const item = (name, id) => ({ name, source_uuid: uuid(name), id, visible: true, locked: true, pos: { x: 0, y: 0 }, rot: 0, scale: { x: 1, y: 1 },
  align: 5, bounds_type: 2, bounds_align: 0, bounds: { x: 1920, y: 1080 }, crop_left: 0, crop_top: 0, crop_right: 0, crop_bottom: 0 });
function uuid(n) { const h = crypto.createHash('md5').update('ts-' + n).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; }
const coleccion = {
  name: 'TopSecret', current_scene: 'Vivo', current_program_scene: 'Vivo', scene_order: [{ name: 'Vivo' }],
  sources: [
    { id: 'ffmpeg_source', versioned_id: 'ffmpeg_source', name: 'Partido', uuid: uuid('Partido'), settings: {
      is_local_file: false, input: 'http://127.0.0.1:8787/', input_format: '', reconnect_delay_sec: 2, restart_on_activate: true,
      buffering_mb: 4, hw_decode: true, close_when_inactive: false, clear_on_media_end: false } },
    { id: 'browser_source', versioned_id: 'browser_source', name: 'Overlay', uuid: uuid('Overlay'), settings: {
      is_local_file: true, local_file: path.join(ROOT, 'scripts', 'stream', 'overlay.html').replaceAll('\\', '/'),
      width: 1920, height: 1080, fps: 30, fps_custom: true, reroute_audio: false, shutdown: false, restart_when_active: false } },
    { id: 'scene', versioned_id: 'scene', name: 'Vivo', uuid: uuid('Vivo'), settings: { id_counter: 3, custom_size: false,
      items: [item('Partido', 1), item('Overlay', 2)] } },
  ],
};
fs.writeFileSync(path.join(ESCENAS, 'TopSecret.json'), JSON.stringify(coleccion, null, 1));

fs.writeFileSync(path.join(OBS, 'plugin_config', 'obs-websocket', 'config.json'), JSON.stringify({
  alerts_enabled: false, auth_required: true, first_load: false, server_enabled: true, server_password: clave, server_port: 4455 }));

// global.ini / user.ini (OBS 31+ guarda ahí lo del usuario): abre con este perfil/colección, sin el asistente de
// primer uso y sin confirmaciones que traben el arranque/cierre automático.
let txt = '';
const poner = (sec, k, v) => {
  const re = new RegExp(`(\\[${sec}\\][^\\[]*?)^${k}=.*$`, 'm');
  if (re.test(txt)) txt = txt.replace(re, `$1${k}=${v}`);
  else if (txt.includes(`[${sec}]`)) txt = txt.replace(`[${sec}]`, `[${sec}]\n${k}=${v}`);
  else txt += `\n[${sec}]\n${k}=${v}\n`;
};
for (const archivo of ['global.ini', 'user.ini']) {
  const g = path.join(OBS, archivo);
  txt = fs.existsSync(g) ? fs.readFileSync(g, 'utf8').replace(/^﻿/, '') : '';
  poner('General', 'FirstRun', 'true'); poner('General', 'EnableAutoUpdates', 'false'); poner('General', 'ConfirmOnExit', 'false');
  poner('Basic', 'Profile', 'TopSecret'); poner('Basic', 'ProfileDir', 'TopSecret');
  poner('Basic', 'SceneCollection', 'TopSecret'); poner('Basic', 'SceneCollectionFile', 'TopSecret');
  poner('BasicWindow', 'WarnBeforeStartingStream', 'false'); poner('BasicWindow', 'WarnBeforeStoppingStream', 'false');
  poner('BasicWindow', 'SysTrayMinimizeToTray', 'true');
  fs.writeFileSync(g, txt.trim() + '\n');
}
console.log('OBS configurado en', OBS);
