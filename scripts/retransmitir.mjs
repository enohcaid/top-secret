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
import { argsCodificador, argsRelevo, LOCAL_H, LOCAL_V } from './stream/salidas.mjs';
import { crearVivoIg } from './stream/ig-vivo.mjs';
import { temporada, convocados, listaMusica as prepararMusica } from './stream/datos-vivo.mjs';
const listaMusica = () => prepararMusica(log);

loadEnv();
const E = process.env;
// --prueba: las salidas horizontales van a MediaMTX local (rtmp://127.0.0.1:1935/prueba/h, no salen a ninguna red) e
// Instagram en modo práctica; --fuente <canal> toma otro canal de Twitch en vez de enohcaid (para probar sin la PS5).
const PRUEBA = process.argv.includes('--prueba');
// --kbps N: bitrate de video de cada salida con overlay (default 1000). La subida de la casa es ~9,5 Mbps y la comparte
// la PS5 (~3,4 Mbps, por cable): 4 copias a 1500 la llenaban y la PS5 perdía su conexión con Twitch (2026-10-19).
// A 1000 + 96 de audio son ~4,4 Mbps entre las 4 redes.
const KBPS = +(process.argv[process.argv.indexOf('--kbps') + 1] || 0) || 1000;
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

// Partidos que empezaron esta noche: avisos 'inicioPartido' de vigia-vivo.mjs en estado.json. Se guardan en un archivo
// por noche porque estado.json se borra al empezar cada sesión (cortes de la PS5, reinicios).
const INICIOS = path.resolve(`fuentes/stream/inicios-${NOCHE}.json`);
let inicios = []; try { inicios = JSON.parse(fs.readFileSync(INICIOS, 'utf8')); } catch {}
function contarInicios() {
  let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
  const nuevos = (e.eventos || []).filter(x => x.tipo === 'inicioPartido' && !inicios.includes(x.id)).map(x => x.id);
  if (!nuevos.length) return false;
  inicios.push(...nuevos); fs.writeFileSync(INICIOS, JSON.stringify(inicios));
  log(`Empieza el partido ${inicios.length} de la noche${partidos?.[inicios.length - 1] ? ` (vs ${partidos[inicios.length - 1].rival})` : ''}.`);
  return true;
}

// Placa del torneo en el overlay: el partido de la noche que ya empezó (o el próximo), desde placa-envivo.mjs --json.
let partidos = null;
async function actualizarPartido() {
  try {
    if (!partidos) partidos = JSON.parse((await node('scripts/placa-envivo.mjs', '--json', '--fecha', NOCHE)).trim().split('\n').pop());
    // Partido actual: según cuántos partidos vio empezar el vigía esta noche (no por la hora: el 2026-10-19, con atrasos,
    // la hora salteaba la vuelta contra Kannabiense). Sin avisos todavía, el primero de la noche.
    contarInicios();
    const n = inicios.length;
    const p = partidos[Math.min(Math.max(n - 1, 0), partidos.length - 1)];
    let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
    Object.assign(e, p
      ? { torneo: [p.liga, p.torneo !== p.liga && p.torneo, p.etapa].filter(Boolean).join(' · ').toUpperCase(), rival: p.rival, escudo: p.escudo || '' }
      : { torneo: '', rival: '', escudo: '' });
    // Para el modo pausa (overlay-pausa.js): partidos que faltan esta noche y números de la temporada
    e.proximos = partidos.slice(n);
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
function retransmitir(entrada) {
  return new Promise(res => {
    const directo = entrada === 'directo';
    const sl = directo ? spawn('python', ['-m', 'streamlink', '--twitch-disable-ads', '--retry-open', '3', '-O', FUENTE, 'best'], { stdio: ['ignore', 'pipe', 'pipe'] }) : null;
    const salidas = destinos.map(d => `[f=flv:onfail=ignore]${d.url}`).join('|');
    const args = directo
      ? ['-hide_banner', '-loglevel', 'warning', '-i', 'pipe:0', '-map', '0:v', '-map', '0:a?', '-c', 'copy',
        '-tag:v', '7', '-tag:a', '10',                       // Twitch entrega fMP4 (tag avc1): FLV necesita sus propios tags
        '-f', 'tee', salidas]
      : argsCodificador({ entrada: LOCAL, vertical: !process.argv.includes('--sin-instagram'), kbps: KBPS, entradaArgs: ['-rw_timeout', '15000000'] });
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

// Un relevo por red: copia sin recodificar de MediaMTX local al destino. Si se corta (la red se trabó, MediaMTX lo
// soltó, el destino cerró), se reinicia solo ese, con espera creciente; las demás redes no se enteran. Los intentos
// fallidos mientras el codificador todavía no publicó no se anotan.
function relevos(lista) {
  let parado = false; const vivos = new Set();
  const lanzar = d => {
    if (parado) return;
    const t0 = Date.now(); let ultimo = '';
    const p = spawn(ffmpegPath, argsRelevo(d.entrada, d.url), { stdio: ['ignore', 'ignore', 'pipe'] }); vivos.add(p);
    p.stderr.on('data', x => { const t = String(x).trim(); if (t) ultimo = ocultarClaves(t).replace(/s+/g, ' ').slice(0, 160); });
    p.on('close', code => {
      vivos.delete(p); if (parado) return;
      const duro = Date.now() - t0;
      if (duro > 30000) { d.fallas = 0; log(`${d.nombre}: relevo cortado tras ${Math.round(duro / 1000)} s (ffmpeg ${code}), lo reconecto. ${ultimo}`); }
      else if (++d.fallas % 10 === 0) log(`${d.nombre}: el relevo no logra conectar (${d.fallas} intentos). ${ultimo}`);
      setTimeout(() => lanzar(d), Math.min(20000, 1000 * 2 ** Math.min(d.fallas, 4)));
    });
  };
  lista.forEach(d => { d.fallas = 0; lanzar(d); });
  return { parar() { parado = true; for (const p of vivos) p.kill(); } };
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
  try { contarInicios(); fs.rmSync(ESTADO, { force: true }); } catch {}   // antes, los avisos de partido nuevo pendientes
  await actualizarPartido();
  const partido = setInterval(actualizarPartido, 5 * 60000);
  const inicio = setInterval(() => { if (contarInicios()) actualizarPartido(); }, 15000);   // partido nuevo: placa al toque
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
      // Un relevo por red desde MediaMTX local; el codificador (retransmitir('overlay')) solo escribe ahí
      const rel = relevos([...destinos.map(d => ({ ...d, entrada: LOCAL_H })), ...(ig ? [{ nombre: 'Instagram', url: ig.url, entrada: LOCAL_V }] : [])]);
      let fallas = 0, igIntento = null;
      while (Date.now() < limite && (await enVivo()) !== false) {
        const t0 = Date.now();
        const corriendo = retransmitir('overlay');
        if (ig && !igIntento) igIntento = ig.transmitir().catch(e => log('Instagram:', e.message.slice(0, 200)));   // una sola espera
        const code = await corriendo;
        if (Date.now() - t0 > 60000) {
          fallas = 0; log(`Codificador con overlay cortado (ffmpeg ${code}): lo vuelvo a levantar.`);
          continue;
        }
        if (++fallas >= 12) { log('La señal con overlay no aparece en MediaMTX: sigo sin overlay.'); break; }   // ~2 min
        await espera(5000);
      }
      rel.parar();
      if (ig) await ig.finalizar().catch(() => {});
      await bajarCadena();
      if (fallas < 12) return;
    }
    while (Date.now() < limite && (await enVivo()) !== false) {
      const code = await retransmitir('directo');
      log(`Retransmisión directa terminada (ffmpeg ${code}).`);
      await espera(10000);
    }
  } finally { clearInterval(partido); clearInterval(inicio); clearInterval(audio); modoAudio = null; }
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
// Partidos de la noche a seed_matches.js desde EA (los guarda el Worker): así los números del sitio y del modo pausa
// se actualizan solos. Los que no cierran (cortados) quedan avisados en el log para revisar a mano.
if (!PRUEBA) {
  try { log('Carga desde EA:', (await node('scripts/cargar-partidos-ea.mjs', '--aplicar', '--commit')).trim().replace(/\s*\n\s*/g, ' · ').slice(0, 600)); }
  catch (e) { log('No pude cargar los partidos desde EA:', e.message.slice(0, 200)); }
}
process.exit(0);
