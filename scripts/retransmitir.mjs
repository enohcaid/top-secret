#!/usr/bin/env node
// Vivo de los partidos. Desde 2026-10-15 la PS5 transmite a twitch.tv/enohcaid (señal fuente, sin gráficos) y esta PC
// arma las 3 transmisiones oficiales con el overlay (scripts/stream/): Twitch topsecretfc, Kick y YouTube.
//   enohcaid ──streamlink (http://127.0.0.1:8787)──▶ OBS (lienzo 3000×1920: versión horizontal + vertical, ver
//            scripts/stream/obs-config.mjs) ──▶ MediaMTX (rtmp://127.0.0.1:1935/live/mix, local)
//            ──ffmpeg (scripts/stream/salidas.mjs: recorta y codifica 720p30)──▶ topsecretfc + Kick + YouTube (+ Instagram vertical)
// Nunca se transmite sin overlay (Juan, 2026-11-03): si la cadena no levanta (OBS, MediaMTX), se baja y se vuelve a
// armar entera hasta que salga; las redes esperan sin señal. Al detectar el vivo publica (una vez por noche) la historia
// "EN VIVO" en Instagram (placa-envivo.mjs) y mantiene en fuentes/stream/estado.json el partido actual para la placa
// del overlay (los goles los agrega vigia-vivo.mjs).
//
//   node scripts/retransmitir.mjs [--hasta HH:MM] [--sin-historia] [--sin-instagram] [--ig-practica]
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
import { clasificarInicios, clasificarFinales } from './stream/conteo-noche.mjs';
import { fuenteDe, anotarFuente, enVivo as fuenteEnVivo } from './lib/fuente-vivo.mjs';
import { vigilarSalud } from './stream/salud-vivo.mjs';
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
// --fuente también acepta un canal de YouTube (2026-10-22: esa noche se transmitió desde el YouTube de otro jugador):
// --fuente https://www.youtube.com/@canal → se toma <canal>/live. Queda anotada en fuentes/stream/fuente.json y el
// vigía (que lanza este script al empezar cada sesión) mira la misma (lib/fuente-vivo.mjs).
// Fuentes que se vigilan (Juan, 2026-10-28): la PS5 de Juan (enohcaid), el Twitch de cabers1414 y el YouTube de
// RS32-DaniStone. Se arranca con la primera que esté en vivo, en este orden; si en plena sesión se cae la que se usa y
// otra está al aire, se pasa a esa. --fuente <canal> (repetible) reemplaza la lista.
const FUENTES_POR_DEFECTO = ['enohcaid', 'cabers1414', 'https://www.youtube.com/@danielvillarruel4868'];
const fuentesArg = process.argv.flatMap((a, k) => a === '--fuente' && process.argv[k + 1] ? [process.argv[k + 1]] : []);
const FUENTES = (fuentesArg.length ? fuentesArg : FUENTES_POR_DEFECTO).map(x => fuenteDe(x));
let FTE = FUENTES[0], FUENTE = FTE.url;
function usarFuente(f) { FTE = f; FUENTE = f.url; if (!PRUEBA) anotarFuente(f); }
// La primera de la lista que esté en vivo (se consultan todas a la vez; YouTube tarda hasta 40 s), o null
async function fuenteEnElAire(excepto = null) {
  const lista = FUENTES.filter(f => f !== excepto);
  const vivos = await Promise.all(lista.map(f => fuenteEnVivo(f).catch(() => null)));
  return lista.find((f, k) => vivos[k]) || null;
}
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
if (!fs.existsSync(path.join(OBS_DIR, 'obs64.exe')) || !fs.existsSync(MTX)) { log('Falta OBS o MediaMTX: sin overlay no se transmite.'); process.exit(1); }

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
const avisados = new Set();                                     // amistosos ya anotados en el log (se revisan en cada vuelta)
function contarInicios() {
  let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
  // "enCurso": el vigía arrancó con un partido ya en juego; cuenta solo si esta noche todavía no se contó ninguno
  // (si no, es un reinicio del vigía a mitad de un partido ya contado). Sin esto, con el vivo empezado tarde, el modo
  // pausa mostraba como "próximo" al rival que ya se había jugado (2026-10-20, Sub 21).
  // Excepción: si el último partido contado ya terminó, el "enCurso" es uno nuevo (2026-10-21: se cayó la PS5, el vigía
  // se reinició con el partido 3 empezado y el overlay siguió mostrando al rival del 2).
  if (!partidos) return false;                                  // sin la lista de la noche no se puede decidir: queda para la próxima vuelta
  const { contar: nuevos, amistosos } = clasificarInicios((e.eventos || []).filter(x => x.tipo === 'inicioPartido' && !inicios.includes(x.id) && reciente(x)),
    { inicios, finales, partidos, noche: NOCHE });
  for (const id of amistosos) if (!avisados.has(id)) { avisados.add(id); log('Empezó un partido fuera de los registrados: amistoso, no se cuenta.'); }
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
  const { contar: nuevos, amistosos } = clasificarFinales((e.eventos || []).filter(x => x.tipo === 'finPartido' && !finales.some(f => f.id === x.id) && reciente(x)),
    { inicios, finales });
  for (const { id, marcador } of amistosos) if (!avisados.has(id)) { avisados.add(id); log(`Terminó un amistoso (${marcador}): no va a los resultados de la noche.`); }
  if (!nuevos.length) return false;
  finales.push(...nuevos.map(x => ({ id: x.id, rival: x.rival || '', escudo: x.escudo || '', marcador: x.marcador || '', resultado: x.resultado })));
  fs.writeFileSync(FINALES, JSON.stringify(finales));
  for (const x of nuevos) log(`Termina el partido vs ${x.rival || '?'}: ${x.marcador} (${x.resultado}).`);
  return true;
}

// ¿YouTube está realmente al aire? Entre el 8/10 y el 21/10 ninguna noche salió en YouTube y nadie se enteró: el envío
// corría sin errores (el viejo modo directo, con tee, ignoraba los destinos caídos). Se mira la página pública /live del canal.
const YT_CANAL = 'UCEKzzKDMMPri12Q3E9S7IVw';
// true / false, o null si no se pudo consultar. La usa vigilarYouTube() (más abajo), que reconecta el relevo si no sale.
async function youTubeAlAire() {
  try {
    const html = await (await fetch(`https://www.youtube.com/channel/${YT_CANAL}/live`, { headers: { 'Accept-Language': 'es' }, signal: AbortSignal.timeout(20000) })).text();
    return /"isLiveNow":true|"isLive":true/.test(html);
  } catch (e) { log('YouTube: no pude verificar si está al aire:', e.message.slice(0, 120)); return null; }
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
    // Terminó el último partido de la noche, o la fuente se cortó sin partido en juego (ver noHayPartidoEnCurso)
    e.cierre = (!e.proximos.length || !!caidaDesde) && finales.length > 0 && finales.length >= n;
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
// Si la fuente se corta con los partidos ya terminados (Juan, 2026-10-28: el que transmite apaga al final de la noche,
// aunque en la lista quede un partido que no se jugó), es el final: la pausa pasa al cierre ("FIN DE LA TRANSMISIÓN",
// resultados, próximo partido) y las redes se cortan a los GRACIA_FIN. Si la fuente vuelve, sigue todo como antes.
const GRACIA_FIN = 5 * 60000;
const noHayPartidoEnCurso = () => finales.length > 0 && finales.length >= inicios.length;
let caidaDesde = null;                                          // ms en que se vio caída la fuente (null = en el aire)
let caidaFinal = false;                                         // la caída actual fue con los partidos terminados
function marcarSinSenal(v) {
  try {
    let e = {}; try { e = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}
    if (!!e.sinSenal === v) return;
    e.sinSenal = v;
    fs.writeFileSync(ESTADO + '.tmp', JSON.stringify(e, null, 1)); fs.renameSync(ESTADO + '.tmp', ESTADO);
  } catch {}
}
// true = seguir con la sesión (fuente en el aire, o caída hace menos de GRACIA_SIN_SENAL); false = terminarla
// Una sola evaluación a la vez: la llaman el reloj del codificador y el bucle de la sesión. Si se pisaban, una ponía
// caidaDesde en null mientras la otra esperaba y "ahora - null" daba "lleva 15 min caído" (2026-11-05, corte en falso).
let evaluacionEnCurso = null;
function seguirSesion() { return evaluacionEnCurso ||= evaluarSesion().finally(() => { evaluacionEnCurso = null; }); }
async function evaluarSesion() {
  const vivo = await enVivo();
  if (vivo === null) return true;                               // sin respuesta de Twitch: no se sabe, se sigue
  if (vivo) {
    if (caidaDesde) {
      log(`${FUENTE} volvió tras ${Math.round((Date.now() - caidaDesde) / 1000)} s: reconecto la señal.`);
      caidaDesde = null;
      await reconectarFuente();
      marcarSinSenal(false);
      if (caidaFinal) { caidaFinal = false; await actualizarPartido(); }   // saca el cierre
    }
    return true;
  }
  // Otra de las fuentes está al aire: se pasa a esa sin cortar las redes (streamlink nuevo + vigía sobre la nueva)
  const otra = FUENTES.length > 1 ? await fuenteEnElAire(FTE) : null;
  if (otra) {
    log(`${FUENTE} no está en vivo y ${otra.url} sí: paso a esa fuente.`);
    usarFuente(otra);
    try { process.kill(+fs.readFileSync(path.resolve('fuentes/vivo/.vigia.lock'), 'utf8')); } catch {}   // el vigía viejo mira la fuente anterior
    lanzarVigia();
    caidaDesde = null;
    await reconectarFuente();
    marcarSinSenal(false);
    if (caidaFinal) { caidaFinal = false; await actualizarPartido(); }
    return true;
  }
  if (!caidaDesde) {
    caidaDesde = Date.now(); caidaFinal = noHayPartidoEnCurso();
    if (caidaFinal) { log(`${FUENTE} se cortó con los partidos terminados: pongo el cierre y corto en ${GRACIA_FIN / 60000} min si no vuelve.`); await actualizarPartido(); }
    else log(`${FUENTE} se cayó: pongo la pausa y las redes siguen al aire (espero hasta ${GRACIA_SIN_SENAL / 60000} min).`);
  }
  marcarSinSenal(true);
  const gracia = caidaFinal ? GRACIA_FIN : GRACIA_SIN_SENAL;
  if (Date.now() - caidaDesde < gracia) return true;
  log(`${FUENTE} lleva ${gracia / 60000} min caído: termino la transmisión.`);
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

// Codificador: el lienzo de OBS desde MediaMTX, recortado y codificado por salidas.mjs (los relevos lo suben a cada red).
function retransmitir(vertical) {
  return new Promise(res => {
    const args = argsCodificador({ entrada: LOCAL, vertical, kbps: KBPS, entradaArgs: ['-rw_timeout', '15000000'] });
    const ff = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    ff.stderr.on('data', d => { const t = String(d).trim(); if (t) log('ffmpeg:', ocultarClaves(t).slice(0, 200)); });
    const fin = () => ff.kill();
    const reloj = setInterval(async () => {
      if (Date.now() > limite) { log('Hora límite: corto.'); return fin(); }
      // con overlay OBS sigue mandando aunque la PS5 corte (con la pausa encima): se corta recién pasada la gracia
      if (!(await seguirSesion())) fin();
    }, 30000);
    ff.on('close', code => { clearInterval(reloj); res(code); });
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
    const p = spawn(ffmpegPath, argsRelevo(d.entrada, d.url), { stdio: ['ignore', 'ignore', 'pipe'] }); vivos.add(p); d.proc = p;
    p.stderr.on('data', x => { const t = String(x).trim(); if (t) ultimo = ocultarClaves(t).replace(/s+/g, ' ').slice(0, 160); });
    p.on('close', code => {
      vivos.delete(p); if (parado) return;
      if (d.pausa) { const ms = d.pausa; d.pausa = 0; d.fallas = 0; setTimeout(() => lanzar(d), ms); return; }   // reinicio pedido (reiniciar())
      const duro = Date.now() - t0;
      if (duro > 30000) { d.fallas = 0; log(`${d.nombre}: relevo cortado tras ${Math.round(duro / 1000)} s (ffmpeg ${code}), lo reconecto. ${ultimo}`); }
      else if (++d.fallas % 10 === 0) log(`${d.nombre}: el relevo no logra conectar (${d.fallas} intentos). ${ultimo}`);
      setTimeout(() => lanzar(d), Math.min(20000, 1000 * 2 ** Math.min(d.fallas, 4)));
    });
  };
  lista.forEach(d => { d.fallas = 0; lanzar(d); });
  return {
    parar() { parado = true; for (const p of vivos) p.kill(); },
    // Corta el relevo de una red y lo vuelve a conectar pasados `pausaMs` (las demás redes no se enteran)
    reiniciar(nombre, pausaMs) { const d = lista.find(x => x.nombre === nombre); if (!d?.proc || parado) return false; d.pausa = pausaMs; d.proc.kill(); return true; },
  };
}

// YouTube recibe la señal pero no siempre sale al aire: las 3 veces (26/10, 2/11 y 9/11) fue al reabrir el vivo
// enseguida de un corte, con YouTube todavía cerrando la transmisión anterior (clave reutilizable, inicio/detención
// automáticos). Antes solo había un chequeo a los 90 s que dejaba un aviso en el log. Ahora se mira cada 2 min toda
// la sesión; con 2 chequeos seguidos sin estar al aire se corta solo el relevo de YouTube, se espera 45 s a que suelte
// la conexión vieja y se reconecta. Así hasta que salga (avisando en el log cada intento).
function vigilarYouTube(rel) {
  let negativos = 0, intentos = 0, alAire = null;
  const chequeo = async () => {
    const vivo = await youTubeAlAire();
    if (vivo === null) return;                                   // no se pudo consultar: no se sabe, no se toca nada
    if (vivo) {
      if (alAire !== true) log(intentos ? `YouTube: al aire tras ${intentos} reconexión(es) del relevo.` : 'YouTube: al aire (verificado en la página del canal).');
      alAire = true; negativos = 0; intentos = 0; return;
    }
    alAire = false;
    if (++negativos < 2) { log('YouTube: no figura al aire, lo vuelvo a mirar en 2 min.'); return; }
    negativos = 0; intentos++;
    if (rel.reiniciar('YouTube', 45000)) log(`⚠ YouTube NO está al aire aunque se le manda señal: reconecto su relevo en 45 s (intento ${intentos}).${intentos >= 3 ? ' Si sigue igual, revisar Studio (visibilidad, clave, avisos de la cuenta).' : ''}`);
  };
  const t = setInterval(chequeo, 120000);
  const t0 = setTimeout(chequeo, 90000);
  return { parar() { clearInterval(t); clearTimeout(t0); } };
}

// ── Cadena con overlay: MediaMTX + streamlink como servidor http + OBS ──
const procs = [];
async function obs(pedido) { try { const o = await conectarObs({ timeout: 4000 }); try { return await o.pedir(pedido); } finally { o.cerrar(); } } catch (e) { return null; } }
async function levantarCadena() {
  procs.push(spawn(MTX, [path.resolve('scripts/stream/mediamtx.yml')], { stdio: 'ignore', cwd: path.dirname(MTX) }));
  lanzarStreamlink();
  await espera(3000);
  if (await obs('GetVersion')) await obs('StartStream');          // OBS ya abierto
  else abrirObs();
  log('Cadena con overlay levantada (MediaMTX + streamlink + OBS).');
}
function abrirObs() {
  // Sin las marcas de .sentinel OBS no cree que el cierre anterior fue un error (si no, se queda esperando en un diálogo)
  const sentinel = path.join(E.APPDATA, 'obs-studio', '.sentinel');
  if (fs.existsSync(sentinel)) for (const f of fs.readdirSync(sentinel)) fs.rmSync(path.join(sentinel, f), { force: true });
  // --multi: tras matar un OBS colgado, el aviso "OBS ya se está ejecutando" dejaba al nuevo trabado (2026-11-05).
  // Antes de llegar acá ya se comprobó que no hay otro abierto (GetVersion o reiniciarObs).
  spawn(path.join(OBS_DIR, 'obs64.exe'), ['--profile', 'TopSecret', '--collection', 'TopSecret', '--startstreaming', '--multi',
    '--minimize-to-tray', '--disable-shutdown-check', '--disable-updater'], { cwd: OBS_DIR, detached: true, stdio: 'ignore' }).unref();
}
const obsAbierto = () => /obs64\.exe|obs-browser-page\.exe/i.test(execFileSync('tasklist', { encoding: 'utf8' }));
// OBS colgado (proceso abierto, sin mandar nada): se cierra a la fuerza y se abre otro. MediaMTX, streamlink, el
// codificador y los relevos no se tocan: se reenganchan solos cuando vuelve la señal.
async function reiniciarObs() {
  for (const imagen of ['obs64.exe', 'obs-browser-page.exe']) { try { execFileSync('taskkill', ['/F', '/T', '/IM', imagen], { stdio: 'ignore' }); } catch {} }
  for (let i = 0; i < 15 && obsAbierto(); i++) await espera(1000);
  await espera(2000);
  abrirObs();
}
let rearmando = false;
async function rearmarCadena() {
  rearmando = true;
  try { await bajarCadena(); await levantarCadena(); } finally { rearmando = false; }
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
  try { partidos ||= partidosDe(NOCHE); } catch {}
  try { contarInicios(); contarFinales(); fs.rmSync(ESTADO, { force: true }); } catch {}   // antes, los avisos de partido nuevo pendientes
  caidaDesde = null; caidaFinal = false;
  lanzarVigia();
  const vigia = setInterval(lanzarVigia, 60000);   // si el vigía se cae en plena sesión, vuelve a arrancar
  await actualizarPartido();
  const partido = setInterval(actualizarPartido, 5 * 60000);
  const inicio = setInterval(() => { { const a = contarInicios(), b = contarFinales(); if (a || b) actualizarPartido(); } }, 15000);   // partido nuevo o terminado: placa y cierre al toque
  await listaMusica();
  const audio = setInterval(audioSegunModo, 3000);
  let salud = null;
  try {
    await levantarCadena();
    salud = vigilarSalud({ obs, reiniciarObs, rearmar: rearmarCadena, ocupado: () => rearmando, log });
    // Instagram: vivo nuevo por sesión, con el partido de la noche como título; si falla, siguen las otras redes
    let ig = null;
    if (!process.argv.includes('--sin-instagram')) {
      try {
        const titulo = tituloDeNoche(partidos || []);   // el mismo título que Twitch/Kick/YouTube
        ig = await crearVivoIg({ titulo, practica: PRUEBA || process.argv.includes('--ig-practica'), log });
      } catch (e) { log('Instagram no disponible:', e.message.slice(0, 200)); }
    }
    // Un relevo por red desde MediaMTX local; el codificador (retransmitir()) solo escribe ahí
    const rel = relevos([...destinos.map(d => ({ ...d, entrada: LOCAL_H })), ...(ig ? [{ nombre: 'Instagram', url: ig.url, entrada: LOCAL_V }] : [])]);
    const yt = destinos.some(d => d.nombre === 'YouTube') ? vigilarYouTube(rel) : null;
    let fallas = 0, igIntento = null;
    while (Date.now() < limite && await seguirSesion()) {
      const t0 = Date.now();
      const corriendo = retransmitir(!!ig);                       // sin Instagram no se gasta CPU en codificar la vertical
      if (ig && !igIntento) igIntento = ig.transmitir().catch(e => log('Instagram:', e.message.slice(0, 200)));   // una sola espera
      const code = await corriendo;
      if (Date.now() - t0 > 60000) {
        fallas = 0; log(`Codificador con overlay cortado (ffmpeg ${code}): lo vuelvo a levantar.`);
        continue;
      }
      // Sin señal en MediaMTX ~2 min: se baja la cadena entera (OBS, MediaMTX, streamlink) y se vuelve a armar.
      // Los relevos y el vivo de Instagram siguen esperando: se reenganchan solos cuando vuelve la señal.
      if (++fallas >= 12) {
        log('La señal con overlay no aparece en MediaMTX: rearmo la cadena (nunca se sale sin overlay).');
        await rearmarCadena(); fallas = 0;
        continue;
      }
      // OBS prueba conectarse a MediaMTX una sola vez: si falló (2026-11-02, "Connection failed -2"), se queda sin transmitir
      const st = await obs('GetStreamStatus');
      if (st && !st.outputActive) { log('OBS no está mandando a MediaMTX: se lo vuelvo a pedir.'); await obs('StartStream'); }
      await espera(5000);
    }
    yt?.parar();
    rel.parar();
    if (ig) await ig.finalizar().catch(() => {});
    rearmando = true;                                             // que la salud no reinicie OBS mientras se baja
    await bajarCadena();
    rearmando = false;
  } finally { await salud?.parar().catch(() => {}); clearInterval(partido); clearInterval(inicio); clearInterval(audio); clearInterval(vigia); modoAudio = null; }
}

log(`Retransmisor listo → ${destinos.map(d => d.nombre).join(' + ')} con overlay. Esperando que alguna fuente esté en vivo (${FUENTES.map(f => f.url).join(', ')}) (hasta las ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}).`);
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
  const f = await fuenteEnElAire();
  if (f) {
    usarFuente(f);
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
  // Goles sin autor (EA no guardó el partido o lo guardó corrupto): web de la liga y, si no alcanza, la ficha del gol
  // en la grabación del vigía. Lo que no cierra queda como "REVISAR A MANO" en el log.
  try { log('Goleadores:', (await node('scripts/completar-goleadores.mjs', '--aplicar', '--commit')).trim().replace(/\s*\n\s*/g, ' · ').slice(0, 800)); }
  catch (e) { log('No pude completar los goleadores:', e.message.slice(0, 200)); }
}
process.exit(0);
