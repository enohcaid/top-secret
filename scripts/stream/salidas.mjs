// Argumentos de ffmpeg para repartir el lienzo combinado de OBS (3000×1920, ver obs-config.mjs) a las redes:
//   horizontal: recorte 1920×1080 → 1280×720  → tee a cada destino horizontal (topsecretfc, Kick, YouTube)
//   vertical:   recorte 1080×1920 → 720×1280  → Instagram (si hay destino)
// Las dos con NVENC 30 fps CBR (kbps, default 1500) y fotogramas clave cada 2 s. Pedido de Juan: mantener 720; la
// subida de la PC (~10 Mbps) la comparten 4 copias + la PS5.
// Salidas separadas (2026-10-19, tras la primera noche real): un codificador deja la horizontal y la vertical en
// MediaMTX local (LOCAL_H / LOCAL_V: no sale a internet, nunca se traba) y un relevo por red las copia sin recodificar
// (argsRelevo). Si una red se traba o corta, se reinicia solo su relevo: antes, con un único ffmpeg y tee, una red lenta
// trababa a todas y MediaMTX cortaba la salida entera.
export const LOCAL_H = 'rtmp://127.0.0.1:1935/live/h', LOCAL_V = 'rtmp://127.0.0.1:1935/live/v';
// Audio (prioridad de Juan, 2026-10-23): la PS5 manda el juego muy bajo (-34 LUFS medidos en la señal limpia del
// 20/10) y el 22/10, desde el YouTube de otro jugador, llegó a -50: el vivo se escuchaba casi mudo. Se normaliza la
// mezcla completa (juego + música del modo pausa) a -16 LUFS, el nivel de Twitch/YouTube, con picos a -1,5 dBTP.
// loudnorm mira 3 s hacia adelante: suma ~3 s de demora pero respeta las marcas de tiempo (no desincroniza).
// Probado sobre la grabación del 20/10: -34 → -15,7 LUFS. 160 kbps (antes 96): +64 kbps por red.
export const AUDIO_FILTRO = 'loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000';
export function argsCodificador({ entrada, vertical = true, kbps = 1000, audioKbps = 160, entradaArgs = [] }) {
  const video = ['-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'cbr', '-b:v', `${kbps}k`, '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`,
    '-g', '60', '-bf', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', `${audioKbps}k`, '-ar', '48000'];
  const filtro = vertical
    ? `[0:v]split=2[a][b];[a]crop=1920:1080:0:0,scale=1280:720[h];[b]crop=1080:1920:1920:0,scale=720:1280[v];[0:a]${AUDIO_FILTRO},asplit=2[ah][av]`
    : `[0:v]crop=1920:1080:0:0,scale=1280:720[h];[0:a]${AUDIO_FILTRO}[ah]`;
  return ['-hide_banner', '-loglevel', 'warning', ...entradaArgs, '-i', entrada, '-filter_complex', filtro,
    '-map', '[h]', '-map', '[ah]', ...video, '-f', 'flv', LOCAL_H,
    ...(vertical ? ['-map', '[v]', '-map', '[av]', ...video, '-f', 'flv', LOCAL_V] : [])];
}
export const argsRelevo = (entrada, destino) =>
  ['-hide_banner', '-loglevel', 'warning', '-rw_timeout', '15000000', '-i', entrada, '-map', '0', '-c', 'copy', '-f', 'flv', destino];

export function argsSalidas({ entrada, horizontales, vertical = null, kbps = 1500, entradaArgs = [] }) {
  const video = ['-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'cbr', '-b:v', `${kbps}k`, '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`,
    '-g', '60', '-bf', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000'];
  const filtro = vertical
    ? '[0:v]split=2[a][b];[a]crop=1920:1080:0:0,scale=1280:720[h];[b]crop=1080:1920:1920:0,scale=720:1280[v]'
    : '[0:v]crop=1920:1080:0:0,scale=1280:720[h]';
  return ['-hide_banner', '-loglevel', 'warning', ...entradaArgs, '-i', entrada, '-filter_complex', filtro,
    '-map', '[h]', '-map', '0:a?', ...video, '-f', 'tee', horizontales.map(u => `[f=flv:onfail=ignore]${u}`).join('|'),
    // la vertical también por tee con onfail=ignore: si Instagram corta, no se cae la salida horizontal
    ...(vertical ? ['-map', '[v]', '-map', '0:a?', ...video, '-f', 'tee', `[f=flv:onfail=ignore]${vertical}`] : [])];
}
