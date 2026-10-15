#!/usr/bin/env node
// Escribe la configuración de OBS para el vivo con overlay en %APPDATA%\obs-studio (perfil y colección "TopSecret").
//   node scripts/stream/obs-config.mjs
// Una sola instancia y un lienzo de 3000×1920 con las dos versiones lado a lado (dos instancias de OBS no pueden: el
// navegador interno no arranca en la segunda y su overlay sale vacío, probado 2026-10-15):
//   x 0–1920,    y 0–1080: horizontal — partido a pantalla completa + overlay.html          (topsecretfc, Kick, YouTube)
//   x 1920–3000, y 0–1920: vertical   — partido a lo ancho en y=330 + overlay-vertical.html (Instagram; TikTok más adelante)
// El partido es una sola fuente (la PS5 vía streamlink en http://127.0.0.1:8787) puesta dos veces en la escena.
// OBS manda el lienzo entero con NVENC a 20 Mbps a rtmp://127.0.0.1:1935/live/mix: es local, no gasta subida. Después
// retransmitir.mjs (scripts/stream/salidas.mjs) recorta cada versión y la codifica para las redes.
// obs-websocket en 127.0.0.1:4455 con la clave OBS_WS_PASSWORD de .env (la genera si no está).
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { loadEnv } from '../lib/env.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
loadEnv();
let clave = process.env.OBS_WS_PASSWORD;
if (!clave) {
  clave = crypto.randomBytes(18).toString('base64url');
  fs.appendFileSync(path.join(ROOT, '.env'), `\n# obs-websocket local (scripts/stream/obs-config.mjs)\nOBS_WS_PASSWORD=${clave}\n`);
}

export const LIENZO = [3000, 1920];
const OBS = path.join(process.env.APPDATA, 'obs-studio');
const PERFIL = path.join(OBS, 'basic', 'profiles', 'TopSecret');
const ESCENAS = path.join(OBS, 'basic', 'scenes');
for (const d of [PERFIL, ESCENAS, path.join(OBS, 'plugin_config', 'obs-websocket')]) fs.mkdirSync(d, { recursive: true });
const ini = o => Object.entries(o).map(([s, kv]) => `[${s}]\n` + Object.entries(kv).map(([k, v]) => `${k}=${v}`).join('\n')).join('\n\n') + '\n';
function uuid(n) { const h = crypto.createHash('md5').update('ts-' + n).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; }

fs.writeFileSync(path.join(PERFIL, 'basic.ini'), ini({
  General: { Name: 'TopSecret' },
  Output: { Mode: 'Advanced' },
  AdvOut: { Encoder: 'obs_nvenc_h264_tex', AudioEncoder: 'ffmpeg_aac', TrackIndex: 1, Track1Bitrate: 192, RecEncoder: 'none' },
  Video: { BaseCX: LIENZO[0], BaseCY: LIENZO[1], OutputCX: LIENZO[0], OutputCY: LIENZO[1], FPSType: 0, FPSCommon: 30, ScaleType: 'lanczos', ColorFormat: 'NV12' },
  Audio: { SampleRate: 48000, ChannelSetup: 'Stereo' },
}));
fs.writeFileSync(path.join(PERFIL, 'streamEncoder.json'), JSON.stringify({ rate_control: 'CBR', bitrate: 20000, keyint_sec: 2, preset: 'p5', tune: 'hq', profile: 'high', bf: 2 }));
fs.writeFileSync(path.join(PERFIL, 'service.json'), JSON.stringify({ type: 'rtmp_custom', settings: { server: 'rtmp://127.0.0.1:1935/live', key: 'mix', use_auth: false } }));

const navegador = (name, archivo, w, h) => ({ id: 'browser_source', versioned_id: 'browser_source', name, uuid: uuid(name), settings: {
  is_local_file: true, local_file: path.join(ROOT, 'scripts', 'stream', archivo).replaceAll('\\', '/'),
  width: w, height: h, fps: 30, fps_custom: true, reroute_audio: false, shutdown: false, restart_when_active: false } });
let nItem = 0;
const item = (name, pos, caja) => ({ name, source_uuid: uuid(name), id: ++nItem, visible: true, locked: true, pos: { x: pos[0], y: pos[1] }, rot: 0,
  scale: { x: 1, y: 1 }, align: 5, bounds_type: 2, bounds_align: 0, bounds: { x: caja[0], y: caja[1] }, crop_left: 0, crop_top: 0, crop_right: 0, crop_bottom: 0 });
// De abajo hacia arriba. El fondo del overlay vertical deja transparente el hueco del partido (y 330–938).
const items = [
  item('Partido', [0, 0], [1920, 1080]), item('Overlay', [0, 0], [1920, 1080]),
  item('Partido', [1920, 330], [1080, 608]), item('Overlay vertical', [1920, 0], [1080, 1920]),
];
fs.writeFileSync(path.join(ESCENAS, 'TopSecret.json'), JSON.stringify({
  name: 'TopSecret', current_scene: 'Vivo', current_program_scene: 'Vivo', scene_order: [{ name: 'Vivo' }],
  sources: [
    { id: 'ffmpeg_source', versioned_id: 'ffmpeg_source', name: 'Partido', uuid: uuid('Partido'), settings: {
      is_local_file: false, input: 'http://127.0.0.1:8787/', input_format: '', reconnect_delay_sec: 2, restart_on_activate: true,
      buffering_mb: 4, hw_decode: true, close_when_inactive: false, clear_on_media_end: false } },
    navegador('Overlay', 'overlay.html', 1920, 1080),
    navegador('Overlay vertical', 'overlay-vertical.html', 1080, 1920),
    { id: 'scene', versioned_id: 'scene', name: 'Vivo', uuid: uuid('Vivo'), settings: { id_counter: nItem + 1, custom_size: false, items } },
  ],
}, null, 1));
// Restos de la prueba con dos instancias (perfil/colección "TopSecretV")
fs.rmSync(path.join(OBS, 'basic', 'profiles', 'TopSecretV'), { recursive: true, force: true });
fs.rmSync(path.join(ESCENAS, 'TopSecretV.json'), { force: true });
fs.rmSync(path.join(ESCENAS, 'TopSecretV.json.bak'), { force: true });

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
