#!/usr/bin/env node
// Vivo de los partidos. Desde 2026-10-15 la PS5 transmite a twitch.tv/enohcaid (señal fuente, sin gráficos) y esta PC
// arma las 3 transmisiones oficiales con el overlay (scripts/stream/): Twitch topsecretfc, Kick y YouTube.
//   enohcaid ──streamlink (http://127.0.0.1:8787)──▶ OBS (lienzo 3000×1920: versión horizontal + vertical, ver
//            scripts/stream/obs-config.mjs) ──▶ MediaMTX (rtmp://127.0.0.1:1935/live/mix, local)
//            ──ffmpeg (scripts/stream/salidas.mjs: recorta y codifica 720p30)──▶ topsecretfc + Kick + YouTube (+ Instagram vertical)
// Si la cadena con overlay no levanta (OBS, MediaMTX), reenvía enohcaid directo sin gráficos para no dejar los canales
// en negro. Con --sin-overlay va siempre directo. Al detectar el vivo publica (una vez por noche) la historia
// "EN VIVO" en Instagram (placa-envivo.mjs) y mantiene en fuentes/stream/estado.json el partido actual para la placa
// del overlay (los goles los agrega vigia-vivo.mjs).
//
//   node scripts/retransmitir.mjs [--hasta HH:MM] [--sin-historia] [--sin-overlay] [--sin-instagram] [--ig-practica]
//   (corta a esa hora ART; default 00:30). Instagram (versión vertical) va solo con overlay: ig-vivo.mjs crea el vivo en
//   la web (Chrome CDP con la sesión de @fctopsecret), toma la clave y toca "Transmitir" cuando llega la señal.
// Destinos en .env: TWITCH_STREAM_KEY (topsecretfc; TWITCH_RTMP_URL opcional), KICK_RTMP_URL + KICK_STREAM_KEY,
// YT_RTMP_URL + YT_STREAM_KEY. Requisitos: streamlink (python -m pip install --user streamlink); para el overlay, OBS
// (node scripts/stream/obs-config.mjs) y MediaMTX en fuentes/stream/bin/mediamtx/. Log: fuentes/redes/retransmitir.log
import fs from 'fs';
import path from 'path';
import { spawn, execFile, execFileSync } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { loadEnv } from './lib/env.mjs';
import { conectarObs } from './stream/obs-ws.mjs';
import { argsSalidas } from './stream/salidas.mjs';
import { crearVivoIg } from './stream/ig-vivo.mjs';
import { temporada, convocados, listaMusica as prepararMusica } from './stream/datos-vivo.mjs';
const listaMusica = () => prepararMusica(log);

loadEnv();
const E = process.env;
// --prueba: las salidas horizontales van a MediaMTX local (rtmp://127.0.0.1:1935/prueba/h, no salen a ninguna red) e
// Instagram en modo práctica; --fuente <canal> toma otro canal de Twitch en vez de enohcaid (para probar sin la PS5).
const PRUEBA = process.argv.includes('--prueba');
const fi = process.argv.indexOf('--fuente');
const LOGIN = fi > 0 ? process.argv[fi + 1] : 'enohcaid', FUENTE = `twitch.tv/${LOGIN}`;
const LOCAL = 'rtmp://127.0.0.1:1935/live/mix';
const OBS_DIR = 'C:\\Program Files\\obs-studio\\bin\\64bit';
const MTX = path.resolve('fuentes/stream/bin/mediamtx/mediamtx.exe');
const ESTADO = path.resolve('fuentes/stream/estado.json');
const LOG = path.resolve('fuentes/redes/retransmitir.log');
fs.mkdirSync(path.dirname(LOG), { recursive: true });
const ahora = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
const log = (...a) => { const l = `[${ahora()}] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOG, l + '\n'); };
const espera = ms => new Promise(r => setTimeout(r, ms));

const destinos = [];
if (PRUEBA) destinos.push({ nombre: 'Prueba local', url: 'rtmp://127.0.0.1:1935/prueba/h' });
else if (E.TWITCH_STREAM_KEY) destinos.push({ nombre: 'Twitch', url: (E.TWITCH_RTMP_URL || 'rtmp://live.twitch.tv/app').replace(/\/?$/, '/') + E.TWITCH_STREAM_KEY });
if (!PRUEBA && E.KICK_RTMP_URL && E.KICK_STREAM_KEY) destinos.push({ nombre: 'Kick', url: E.KICK_RTMP_URL.replace(/\/?$/, '/') + E.KICK_STREAM_KEY });
if (!PRUEBA && E.YT_RTMP_URL && E.YT_STREAM_KEY) destinos.push({ nombre: 'YouTube', url: E.YT_RTMP_URL.replace(/\/?$/, '/') + E.YT_STREAM_KEY });
// Las claves nunca van al log
const claves = [E.TWITCH_STREAM_KEY, E.KICK_STREAM_KEY, E.YT_STREAM_KEY].filter(Boolean);
const ocultarClaves = t => claves.reduce((x, k) => x.split(k).join('***'), t).replace(/(\/rtmp\/)[^\s|'"]+/g, '$1***');   // + clave de Instagram
if (!destinos.length) { log('No hay destinos en .env (TWITCH_STREAM_KEY, KICK_RTMP_URL/KICK_STREAM_KEY, YT_RTMP_URL/YT_STREAM_KEY).'); process.exit(1); }
const conOverlay = !process.argv.includes('--sin-overlay') && fs.existsSync(path.join(OBS_DIR, 'obs64.exe')) && fs.existsSync(MTX);

const i = process.argv.indexOf('--hasta');
const [hh, mm] = (i > 0 ? process.argv[i + 1] : '00:30').split(':').map(Number);
const limite = (() => {                                     // próxima ocurrencia de HH:MM ART
  const art = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const fin = new Date(art); fin.setHours(hh, mm, 0, 0); if (fin <= art) fin.setDate(fin.getDate() + 1);
  return Date.now() + (fin - art);
})();

const node = (...a) => new Promise((ok, mal) => execFile(process.execPath, a, { timeout: 300000 }, (e, out, err) => e && !out ? mal(new Error(String(err || e.message).slice(0, 300))) : ok(out)));

// Historia "EN VIVO" en Instagram: una sola vez por noche (marca en fuentes/redes), en paralelo a la retransmisión.
const NOCHE = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });   // fecha de la noche (al arrancar)
const MARCA = path.resolve(`fuentes/redes/envivo-publicada-${NOCHE}.txt`);
async function publicarHistoria() {
  if (PRUEBA || process.argv.includes('--sin-historia') || fs.existsSync(MARCA)) return;
  fs.writeFileSync(MARCA, ahora());
  try {
    const jpg = `fuentes/placas/envivo-${NOCHE}.jpg`, clave = `logos/placas/envivo-${NOCHE}.jpg`;
    const info = await node('scripts/placa-envivo.mjs', '--fecha', NOCHE, '--out', jpg);
    log('Placa EN VIVO:', info.split('\n')[0]);
    await node('scripts/r2.mjs', 'put', jpg, clave);
    const tags = /\(VPUG\)/.test(info) ? ['--etiquetar', 'vpugvirtual_prouruguay_gaming'] : [];
    const res = await node('scripts/meta.mjs', 'ig-historia', `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${clave}`, ...tags);
    log('Historia EN VIVO publicada en Instagram.', res.trim().split('\n').pop().slice(0, 150));
  } catch (e) { log('No se pudo publicar la historia EN VIVO:', e.message); fs.rmSync(MARCA, { force: true }); }
}

// Placa del torneo en el overlay: el partido de la noche que ya empezó (o el próximo), desde placa-envivo.mjs --json.
let partidos = null;
async function actualizarPartido() {
  try {
    if (!partidos) partidos = JSON.parse((await node('scripts/placa-envivo.mjs', '--json', '--fecha', NOCHE)).trim().split('\n').pop());
    const hora = new Date(Date.now() + 10 * 60000).toLocaleTimeString('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });
    const p = partidos.filter(x => x.hora <= hora).pop() || partidos[0];
    let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
    Object.assign(e, p
      ? { torneo: [p.liga, p.torneo !== p.liga && p.torneo, p.etapa].filter(Boolean).join(' · ').toUpperCase(), rival: p.rival, escudo: p.escudo || '' }
      : { torneo: '', rival: '', escudo: '' });
    // Para el modo pausa (overlay-pausa.js): partidos que faltan esta noche y números de la temporada
    const ahoraHM = new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit' });
    e.proximos = partidos.filter(x => x.hora >= ahoraHM);
    e.temporada = await temporada();
    // Solo los convocados de hoy en el palco y las charlas (convocatoria.html); si no hay datos, todos
    const conv = await convocados(); if (conv) e.jugadores = conv;
    fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
    fs.writeFileSync(ESTADO + '.tmp', JSON.stringify(e, null, 1)); fs.renameSync(ESTADO + '.tmp', ESTADO);
  } catch (err) { log('No pude actualizar el partido del overlay:', err.message); }
}

// En el modo pausa baja el audio del juego (menús de FC27) para que se escuche la música propia
let modoAudio = null;
async function audioSegunModo() {
  let modo = null; try { modo = JSON.parse(fs.readFileSync(ESTADO, 'utf8')).modo; } catch {}
  const pausa = modo === 'pausa';
  if (pausa === modoAudio) return;
  modoAudio = pausa;
  try { const o = await conectarObs({ timeout: 3000 }); try { await o.pedir('SetInputVolume', { inputName: 'Partido', inputVolumeDb: pausa ? -22 : 0 }); } finally { o.cerrar(); } }
  catch { modoAudio = null; }                                  // reintenta en la próxima vuelta
}

// ¿Está en vivo la PS5? GQL de Twitch con el Client-ID público (sin bloquear el proceso).
async function enVivo() {
  try {
    const r = await fetch('https://gql.twitch.tv/gql', { method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { 'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko' }, body: JSON.stringify({ query: `query{user(login:"${LOGIN}"){stream{id}}}` }) });
    return !!(await r.json()).data?.user?.stream;
  } catch { return null; }                                     // sin respuesta: no se sabe
}

// Reenvía a todos los destinos: 'directo' = la PS5 por streamlink sin recodificar; 'overlay' = el lienzo de OBS desde
// MediaMTX, recortado y codificado por salidas.mjs.
function retransmitir(entrada, igUrl = null) {
  return new Promise(res => {
    const directo = entrada === 'directo';
    const sl = directo ? spawn('python', ['-m', 'streamlink', '--twitch-disable-ads', '--retry-open', '3', '-O', FUENTE, 'best'], { stdio: ['ignore', 'pipe', 'pipe'] }) : null;
    const salidas = destinos.map(d => `[f=flv:onfail=ignore]${d.url}`).join('|');
    const args = directo
      ? ['-hide_banner', '-loglevel', 'warning', '-i', 'pipe:0', '-map', '0:v', '-map', '0:a?', '-c', 'copy',
        '-tag:v', '7', '-tag:a', '10',                       // Twitch entrega fMP4 (tag avc1): FLV necesita sus propios tags
        '-f', 'tee', salidas]
      : argsSalidas({ entrada: LOCAL, horizontales: destinos.map(d => d.url), vertical: igUrl, entradaArgs: ['-rw_timeout', '15000000'] });
    const ff = spawn(ffmpegPath, args, { stdio: [directo ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
    if (sl) {
      sl.stdout.pipe(ff.stdin); ff.stdin.on('error', () => {});
      sl.stderr.on('data', d => { const t = String(d).trim(); if (/error|fail/i.test(t)) log('streamlink:', t.slice(0, 200)); });
    }
    ff.stderr.on('data', d => { const t = String(d).trim(); if (t) log('ffmpeg:', ocultarClaves(t).slice(0, 200)); });
    const fin = () => { sl?.kill(); ff.kill(); };
    let apagado = 0;
    const reloj = setInterval(async () => {
      if (Date.now() > limite) { log('Hora límite: corto.'); return fin(); }
      // con overlay OBS sigue mandando aunque la PS5 corte: el corte lo marca enohcaid (2 chequeos seguidos)
      if (!directo) { apagado = (await enVivo()) === false ? apagado + 1 : 0; if (apagado >= 2) { log(`${FUENTE} dejó de transmitir.`); fin(); } }
    }, 30000);
    ff.on('close', code => { clearInterval(reloj); sl?.kill(); res(code); });
  });
}

// ── Cadena con overlay: MediaMTX + streamlink como servidor http + OBS ──
const procs = [];
async function obs(pedido) { try { const o = await conectarObs({ timeout: 4000 }); try { return await o.pedir(pedido); } finally { o.cerrar(); } } catch (e) { return null; } }
async function levantarCadena() {
  procs.push(spawn(MTX, [path.resolve('scripts/stream/mediamtx.yml')], { stdio: 'ignore', cwd: path.dirname(MTX) }));
  const sl = spawn('python', ['-m', 'streamlink', '--player-external-http', '--player-external-http-interface', '127.0.0.1', '--player-external-http-port', '8787',
    '--player-external-http-continuous', 'yes', '--twitch-disable-ads', '--retry-open', '3', FUENTE, 'best'], { stdio: ['ignore', 'ignore', 'pipe'] });
  sl.stderr.on('data', d => { const t = String(d).trim(); if (/error|fail/i.test(t)) log('streamlink (overlay):', t.slice(0, 200)); });
  procs.push(sl);
  await espera(3000);
  if (await obs('GetVersion')) await obs('StartStream');          // OBS ya abierto
  else {
    // Sin las marcas de .sentinel OBS no cree que el cierre anterior fue un error (si no, se queda esperando en un diálogo)
    const sentinel = path.join(E.APPDATA, 'obs-studio', '.sentinel');
    if (fs.existsSync(sentinel)) for (const f of fs.readdirSync(sentinel)) fs.rmSync(path.join(sentinel, f), { force: true });
    spawn(path.join(OBS_DIR, 'obs64.exe'), ['--profile', 'TopSecret', '--collection', 'TopSecret', '--startstreaming',
    '--minimize-to-tray', '--disable-shutdown-check', '--disable-updater'], { cwd: OBS_DIR, detached: true, stdio: 'ignore' }).unref();
  }
  log('Cadena con overlay levantada (MediaMTX + streamlink + OBS).');
}
async function bajarCadena() {
  await obs('StopStream');
  try { execFileSync('taskkill', ['/IM', 'obs64.exe'], { stdio: 'ignore' }); } catch {}   // cierre normal (sin /F)
  await espera(15000);
  try { execFileSync('taskkill', ['/IM', 'obs64.exe', '/F'], { stdio: 'ignore' }); } catch {}   // si no cerró, a la fuerza
  while (procs.length) procs.pop().kill();
}

async function sesion() {
  publicarHistoria();
  // Vivo nuevo: sin lado de barra ni eventos de una sesión anterior (los vuelve a escribir vigia-vivo.mjs)
  try { fs.rmSync(ESTADO, { force: true }); } catch {}
  await actualizarPartido();
  const partido = setInterval(actualizarPartido, 5 * 60000);
  if (conOverlay) await listaMusica();
  const audio = setInterval(audioSegunModo, 3000);
  try {
    if (conOverlay) {
      await levantarCadena();
      // Instagram: vivo nuevo por sesión, con el partido de la noche como título; si falla, siguen las otras redes
      let ig = null;
      if (!process.argv.includes('--sin-instagram')) {
        try {
          const p = (partidos || [])[0];
          const titulo = p ? `Top Secret FC en vivo · ${p.liga} vs ${p.rival}` : 'Top Secret FC en vivo';
          ig = await crearVivoIg({ titulo, practica: PRUEBA || process.argv.includes('--ig-practica'), log });
        } catch (e) { log('Instagram no disponible:', e.message.slice(0, 200)); }
      }
      let fallas = 0, igIntento = null;
      while (Date.now() < limite && (await enVivo()) !== false) {
        const t0 = Date.now();
        const corriendo = retransmitir('overlay', ig?.url);
        if (ig && !igIntento) igIntento = ig.transmitir().catch(e => log('Instagram:', e.message.slice(0, 200)));   // una sola espera
        const code = await corriendo;
        if (Date.now() - t0 > 60000) { fallas = 0; log(`Retransmisión con overlay cortada (ffmpeg ${code}).`); continue; }
        if (++fallas >= 12) { log('La señal con overlay no aparece en MediaMTX: sigo sin overlay.'); break; }   // ~2 min
        await espera(5000);
      }
      if (ig) await ig.finalizar().catch(() => {});
      await bajarCadena();
      if (fallas < 12) return;
    }
    while (Date.now() < limite && (await enVivo()) !== false) {
      const code = await retransmitir('directo');
      log(`Retransmisión directa terminada (ffmpeg ${code}).`);
      await espera(10000);
    }
  } finally { clearInterval(partido); clearInterval(audio); modoAudio = null; }
}

log(`Retransmisor listo → ${destinos.map(d => d.nombre).join(' + ')}${conOverlay ? ' con overlay' : ' sin overlay'}. Esperando que ${FUENTE} esté en vivo (hasta las ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}).`);
process.on('SIGINT', async () => { await bajarCadena(); process.exit(0); });
while (Date.now() < limite) {
  if (await enVivo()) {
    log(`${FUENTE} en vivo: empiezo a retransmitir.`);
    await sesion();
    log('Sesión terminada. Vuelvo a esperar.');
    await espera(10000);
  } else await espera(30000);
}
log('Fin del horario. Retransmisor apagado.');
process.exit(0);
