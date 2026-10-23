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
import { tituloDeNoche, partidosDe, ponerTitulos } from './stream/titulos-vivo.mjs';
import { temporada, convocados, espacioGamer, listaMusica as prepararMusica } from './stream/datos-vivo.mjs';
import { fuenteDe, anotarFuente, enVivo as fuenteEnVivo } from './lib/fuente-vivo.mjs';
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
// --fuente también acepta un canal de YouTube (2026-10-22: esa noche se transmitió desde el YouTube de otro jugador):
// --fuente https://www.youtube.com/@canal → se toma <canal>/live. Queda anotada en fuentes/stream/fuente.json y el
// vigía (que lanza este script al empezar cada sesión) mira la misma (lib/fuente-vivo.mjs).
const FTE = fuenteDe(fi > 0 ? process.argv[fi + 1] : 'enohcaid');
const FUENTE = FTE.url;
if (!process.argv.includes('--prueba')) anotarFuente(FTE);
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
// Los avisos de una sesión que terminó después de medianoche quedan en estado.json con la misma fecha que la noche
// siguiente: el 2026-10-22 se contaron al arrancar los 4 partidos de la noche anterior y el overlay mostraba al último
// rival (y el cierre). El id del aviso es su hora en ms: más de 6 h de antigüedad = de otra noche.
const reciente = x => !(+x.id > 1e12) || Date.now() - +x.id < 6 * 3600e3;
let inicios = []; try { inicios = JSON.parse(fs.readFileSync(INICIOS, 'utf8')); } catch {}
function contarInicios() {
  let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
  // "enCurso": el vigía arrancó con un partido ya en juego; cuenta solo si esta noche todavía no se contó ninguno
  // (si no, es un reinicio del vigía a mitad de un partido ya contado). Sin esto, con el vivo empezado tarde, el modo
  // pausa mostraba como "próximo" al rival que ya se había jugado (2026-10-20, Sub 21).
  // Excepción: si el último partido contado ya terminó, el "enCurso" es uno nuevo (2026-10-21: se cayó la PS5, el vigía
  // se reinició con el partido 3 empezado y el overlay siguió mostrando al rival del 2).
  const nuevos = (e.eventos || []).filter(x => x.tipo === 'inicioPartido' && !inicios.includes(x.id) && reciente(x)
    && (!x.enCurso || !inicios.length || finales.length >= inicios.length)).map(x => x.id);
  if (!nuevos.length) return false;
  inicios.push(...nuevos); fs.writeFileSync(INICIOS, JSON.stringify(inicios));
  log(`Empieza el partido ${inicios.length} de la noche${partidos?.[inicios.length - 1] ? ` (vs ${partidos[inicios.length - 1].rival})` : ''}.`);
  return true;
}

// Resultados de la noche (avisos 'finPartido' del vigía, que traen rival y marcador) para la pantalla de cierre.
// Mismo criterio que los inicios: un archivo por noche, sobrevive a los cortes.
const FINALES = path.resolve(`fuentes/stream/finales-${NOCHE}.json`);
let finales = []; try { finales = JSON.parse(fs.readFileSync(FINALES, 'utf8')); } catch {}
function contarFinales() {
  let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
  const nuevos = (e.eventos || []).filter(x => x.tipo === 'finPartido' && !finales.some(f => f.id === x.id) && reciente(x));
  if (!nuevos.length) return false;
  finales.push(...nuevos.map(x => ({ id: x.id, rival: x.rival || '', escudo: x.escudo || '', marcador: x.marcador || '', resultado: x.resultado })));
  fs.writeFileSync(FINALES, JSON.stringify(finales));
  for (const x of nuevos) log(`Termina el partido vs ${x.rival || '?'}: ${x.marcador} (${x.resultado}).`);
  return true;
}

// ¿YouTube está realmente al aire? Entre el 8/10 y el 21/10 ninguna noche salió en YouTube y nadie se enteró: el envío
// corría sin errores (y en modo directo el tee ignora los destinos caídos). Se mira la página pública /live del canal.
const YT_CANAL = 'UCEKzzKDMMPri12Q3E9S7IVw';
async function verificarYouTube() {
  try {
    const html = await (await fetch(`https://www.youtube.com/channel/${YT_CANAL}/live`, { headers: { 'Accept-Language': 'es' }, signal: AbortSignal.timeout(20000) })).text();
    if (/"isLiveNow":true|"isLive":true/.test(html)) log('YouTube: al aire (verificado en la página del canal).');
    else log('⚠ YouTube NO está al aire aunque se le está enviando señal: revisar Studio (visibilidad, clave, avisos de la cuenta).');
  } catch (e) { log('YouTube: no pude verificar si está al aire:', e.message.slice(0, 120)); }
}

// Próximo partido después de esta noche (para el cierre): el primer día con partidos en los próximos 14.
let siguiente;
async function buscarSiguiente() {
  if (siguiente !== undefined) return siguiente;
  siguiente = null;
  for (let d = 1; d <= 14 && !siguiente; d++) {
    const f = new Date(new Date(NOCHE + 'T12:00:00Z').getTime() + d * 864e5).toISOString().slice(0, 10);
    try { const ps = JSON.parse((await node('scripts/placa-envivo.mjs', '--json', '--fecha', f)).trim().split('\n').pop()); if (ps.length) siguiente = { fecha: f, ...ps[0], cantidad: ps.length }; } catch {}
  }
  return siguiente;
}

// Placa del torneo en el overlay: el partido de la noche que ya empezó (o el próximo), desde placa-envivo.mjs --json.
let partidos = null;
async function actualizarPartido() {
  try {
    // Se relee en cada vuelta: un amistoso puede cambiar de rival en plena noche (2026-10-21: 23:20 pasó de
    // Atletico de Rafaela a Sarmiento eSports y el overlay seguía mostrando el viejo). Si falla, queda el anterior.
    try { partidos = JSON.parse((await node('scripts/placa-envivo.mjs', '--json', '--fecha', NOCHE)).trim().split('\n').pop()); }
    catch (e) { if (!partidos) throw e; }
    // Partido actual: según cuántos partidos vio empezar el vigía esta noche (no por la hora: el 2026-10-19, con atrasos,
    // la hora salteaba la vuelta contra Kannabiense). Sin avisos todavía, el primero de la noche.
    contarInicios(); contarFinales();
    const n = inicios.length;
    const p = partidos[Math.min(Math.max(n - 1, 0), partidos.length - 1)];
    let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
    Object.assign(e, p
      ? { torneo: [p.liga, p.torneo !== p.liga && p.torneo, p.etapa].filter(Boolean).join(' · ').toUpperCase(), rival: p.rival, escudo: p.escudo || '' }
      : { torneo: '', rival: '', escudo: '' });
    // Para el modo pausa (overlay-pausa.js): partidos que faltan esta noche y números de la temporada
    e.proximos = partidos.slice(n);
    e.temporada = await temporada();
    // Espacio Gamer (tabla + nuestros números), resultados de la noche y el próximo partido: tarjetas de la pausa y cierre
    const eg = await espacioGamer(); if (eg) e.eg = eg;
    e.noche = finales.map(({ id, ...f }) => f);
    e.cierre = !e.proximos.length && finales.length > 0 && finales.length >= n;   // terminó el último partido de la noche
    e.siguiente = await buscarSiguiente();
    // Solo los convocados de hoy en el palco y las charlas (convocatoria.html); si no hay datos, todos
    const conv = await convocados(); if (conv) e.jugadores = conv;
    fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
    fs.writeFileSync(ESTADO + '.tmp', JSON.stringify(e, null, 1)); fs.renameSync(ESTADO + '.tmp', ESTADO);
  } catch (err) { log('No pude actualizar el partido del overlay:', err.message); }
}

// Se cayó la PS5 (enohcaid) en pleno vivo (Juan, 2026-10-21): las redes NO se cortan. El overlay pasa a la pausa
// ("SE CORTÓ LA SEÑAL · YA VOLVEMOS", tapa la imagen congelada) y, cuando la fuente vuelve, se reconecta streamlink
// y la fuente 'Partido' de OBS. La sesión termina recién si la fuente sigue caída GRACIA_SIN_SENAL seguidos.
const GRACIA_SIN_SENAL = 15 * 60000;
let caidaDesde = null;                                          // ms en que se vio caída la fuente (null = en el aire)
function marcarSinSenal(v) {
  try {
    let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
    if (!!e.sinSenal === v) return;
    e.sinSenal = v;
    fs.writeFileSync(ESTADO + '.tmp', JSON.stringify(e, null, 1)); fs.renameSync(ESTADO + '.tmp', ESTADO);
  } catch {}
}
// true = seguir con la sesión (fuente en el aire, o caída hace menos de GRACIA_SIN_SENAL); false = terminarla
async function seguirSesion() {
  const vivo = await enVivo();
  if (vivo === null) return true;                               // sin respuesta de Twitch: no se sabe, se sigue
  if (vivo) {
    if (caidaDesde) {
      log(`${FUENTE} volvió tras ${Math.round((Date.now() - caidaDesde) / 1000)} s: reconecto la señal.`);
      caidaDesde = null;
      await reconectarFuente();
      marcarSinSenal(false);
    }
    return true;
  }
  if (!caidaDesde) { caidaDesde = Date.now(); log(`${FUENTE} se cayó: pongo la pausa y las redes siguen al aire (espero hasta ${GRACIA_SIN_SENAL / 60000} min).`); }
  marcarSinSenal(true);
  if (Date.now() - caidaDesde < GRACIA_SIN_SENAL) return true;
  log(`${FUENTE} lleva ${GRACIA_SIN_SENAL / 60000} min caído: termino la transmisión.`);
  return false;
}

// En el modo pausa baja el audio del juego (menús de FC27) para que se escuche la música propia
let modoAudio = null;
async function audioSegunModo() {
  let modo = null, sinSenal = false; try { ({ modo, sinSenal } = JSON.parse(fs.readFileSync(ESTADO, 'utf8'))); } catch {}
  const pausa = modo === 'pausa' || !!sinSenal;
  if (pausa === modoAudio) return;
  modoAudio = pausa;
  try { const o = await conectarObs({ timeout: 3000 }); try { await o.pedir('SetInputVolume', { inputName: 'Partido', inputVolumeDb: pausa ? -22 : 0 }); } finally { o.cerrar(); } }
  catch { modoAudio = null; }                                  // reintenta en la próxima vuelta
}

// ¿Está en vivo la fuente? true | false | null (sin respuesta: no se sabe)
async function enVivo() { const v = await fuenteEnVivo(FTE); return v === null ? null : !!v; }

// El vigía (goles, repeticiones, modo juego/pausa/reporte, inicio y fin de cada partido, lado de la barra) mira la
// misma fuente. Antes lo lanzaba solo watch-regen.ps1 y solo si enohcaid estaba en vivo: el 2026-10-22, con la señal
// desde YouTube, no corrió en toda la noche y el overlay quedó sin nada de eso. Ahora lo lanza cada sesión (el lock
// del vigía evita que corran dos).
function lanzarVigia() {
  if (PRUEBA || process.argv.includes('--sin-vigia')) return;
  const lock = path.resolve('fuentes/vivo/.vigia.lock');
  try { process.kill(+fs.readFileSync(lock, 'utf8'), 0); return; } catch {}       // ya hay uno vivo
  const salida = fs.openSync(path.resolve('scripts/vigia-vivo.log'), 'a');
  const hasta = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  spawn(process.execPath, ['scripts/vigia-vivo.mjs', '--fuente', FTE.tipo === 'youtube' ? FTE.nombre : FTE.login, '--hasta', hasta],
    { detached: true, stdio: ['ignore', salida, salida], windowsHide: true }).unref();
  log(`Vigía lanzado sobre ${FUENTE}.`);
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
    const reloj = setInterval(async () => {
      if (Date.now() > limite) { log('Hora límite: corto.'); return fin(); }
      // con overlay OBS sigue mandando aunque la PS5 corte (con la pausa encima): se corta recién pasada la gracia
      if (!directo && !(await seguirSesion())) fin();
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
  lanzarStreamlink();
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
// streamlink sirve la PS5 por http://127.0.0.1:8787 a la fuente 'Partido' de OBS
let slOverlay = null;
function lanzarStreamlink() {
  const sl = spawn('python', ['-m', 'streamlink', '--player-external-http', '--player-external-http-interface', '127.0.0.1', '--player-external-http-port', '8787',
    '--player-external-http-continuous', 'yes', '--twitch-disable-ads', '--retry-open', '3', FUENTE, 'best'], { stdio: ['ignore', 'ignore', 'pipe'] });
  sl.stderr.on('data', d => { const t = String(d).trim(); if (/error|fail/i.test(t)) log('streamlink (overlay):', t.slice(0, 200)); });
  procs.push(sl); slOverlay = sl;
}
// La fuente volvió después de una caída: streamlink nuevo (el anterior puede haber quedado colgado del vivo viejo)
// y OBS reinicia la fuente 'Partido' para engancharlo. El codificador y los relevos no se tocan.
async function reconectarFuente() {
  if (!conOverlay) return;
  try { slOverlay?.kill(); } catch {}
  const i = procs.indexOf(slOverlay); if (i >= 0) procs.splice(i, 1);
  await espera(2000);
  lanzarStreamlink();
  await espera(6000);
  try {
    const o = await conectarObs({ timeout: 4000 });
    try { await o.pedir('TriggerMediaInputAction', { inputName: 'Partido', mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART' }); }
    finally { o.cerrar(); }
  } catch (e) { log('No pude reiniciar la fuente Partido de OBS:', e.message?.slice(0, 120)); }
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
  try { contarInicios(); contarFinales(); fs.rmSync(ESTADO, { force: true }); } catch {}   // antes, los avisos de partido nuevo pendientes
  caidaDesde = null;
  lanzarVigia();
  await actualizarPartido();
  const partido = setInterval(actualizarPartido, 5 * 60000);
  const inicio = setInterval(() => { { const a = contarInicios(), b = contarFinales(); if (a || b) actualizarPartido(); } }, 15000);   // partido nuevo o terminado: placa y cierre al toque
  if (conOverlay) await listaMusica();
  const audio = setInterval(audioSegunModo, 3000);
  try {
    if (conOverlay) {
      await levantarCadena();
      // Instagram: vivo nuevo por sesión, con el partido de la noche como título; si falla, siguen las otras redes
      let ig = null;
      if (!process.argv.includes('--sin-instagram')) {
        try {
          const titulo = tituloDeNoche(partidos || []);   // el mismo título que Twitch/Kick/YouTube
          ig = await crearVivoIg({ titulo, practica: PRUEBA || process.argv.includes('--ig-practica'), log });
        } catch (e) { log('Instagram no disponible:', e.message.slice(0, 200)); }
      }
      // Un relevo por red desde MediaMTX local; el codificador (retransmitir('overlay')) solo escribe ahí
      const rel = relevos([...destinos.map(d => ({ ...d, entrada: LOCAL_H })), ...(ig ? [{ nombre: 'Instagram', url: ig.url, entrada: LOCAL_V }] : [])]);
      if (destinos.some(d => d.nombre === 'YouTube')) setTimeout(verificarYouTube, 90000);
      let fallas = 0, igIntento = null;
      while (Date.now() < limite && await seguirSesion()) {
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
// Títulos de la noche en Twitch/Kick/YouTube antes de que arranque el vivo (titulos-vivo.mjs; Instagram lo pone al crear
// su vivo). En segundo plano: si una red falla queda en el log y el vivo sigue igual.
if (!PRUEBA && !process.argv.includes('--sin-titulos')) {
  const redes = destinos.map(d => ({ Twitch: 'twitch', Kick: 'kick', YouTube: 'youtube' })[d.nombre]).filter(Boolean);
  (async () => {
    try { const t = tituloDeNoche(partidosDe(NOCHE)); log(`Títulos de la noche: ${t}`); await ponerTitulos(t, { redes, log }); }
    catch (e) { log('Títulos: no pude ponerlos:', e.message.slice(0, 200)); }
  })();
}
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
