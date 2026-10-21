// Lógica compartida de los overlays del vivo (overlay.html horizontal, overlay-vertical.html para Instagram).
// Cada página pone los mismos ids: torneo/escudo/torneoTxt/rivalTxt, palco con v0/v1, jug/num/gt/dice y gol.
// Lee fuentes/stream/clips/indice.json y fuentes/stream/estado.json cada 1,5 s (ver overlay.html).
const q = new URLSearchParams(location.search);
const CLIPS = q.get('clips') || '../../fuentes/stream/clips/';
const ESTADO = q.get('estado') || '../../fuentes/stream/estado.json';
const ESPERA = ['aliento', 'indicaciones', 'agitado', 'sudor', 'aplaude', 'pide', 'calma'];
// Reacciones: goles (vigia-vivo.mjs) y fin de partido según el resultado
const EVENTO = { gol: ['gol', 'festejo'], golRival: ['frustrado', 'reclama'], victoria: ['festejo', 'gol'], derrota: ['triste', 'frustrado'], empate: ['aplaude', 'aliento'] };
const DICE = { aliento: 'ALIENTA', indicaciones: 'DA INDICACIONES', agitado: 'RECUPERA AIRE', sudor: 'CONCENTRADO', aplaude: 'APLAUDE',
  pide: 'PIDE LA PELOTA', calma: 'PIDE CALMA', habla: 'HABLA', escucha: 'ESCUCHA', gol: 'GRITO DE GOL', festejo: 'FESTEJA', frustrado: 'SE LAMENTA', reclama: 'RECLAMA', triste: 'SE LAMENTA' };
const $ = id => document.getElementById(id);
const azar = a => a[Math.floor(Math.random() * a.length)];
const leer = async url => { try { const r = await fetch(url + '?' + Date.now(), { cache: 'no-store' }); return r.ok ? r.json() : null; } catch { return null; } };

let indice = {}, estado = {}, actual = null, enCola = 0, evento = null, visto = new Set(), arranco = false;
const vids = [$('v0'), $('v1')]; let activo = 0;

function placa(gt, emocion, cambiaJugador) {
  const set = () => { $('gt').textContent = gt; $('num').textContent = indice[gt]?.num || ''; $('dice').textContent = DICE[emocion] || ''; };
  if (!cambiaJugador) return set();
  $('jug').classList.add('cambia'); setTimeout(() => { set(); $('jug').classList.remove('cambia'); }, 250);
}

// Al azar pero sin repetirse (Juan, 2026-10-21: "masViejo" armaba una rueda fija — mismo orden de jugadores y de
// clips en cada vuelta, previsible). Ahora: el próximo jugador sale al azar entre la mitad que hace más que no
// aparece; el clip, al azar entre los que no pasó en sus últimos 3; y cada turno dura 2 a 4 clips (no siempre 3).
const ultimoClip = {}, ultimoJugador = {};
const masViejo = (lista, cuando) => { const t = Math.min(...lista.map(x => cuando[x] || 0)); return azar(lista.filter(x => (cuando[x] || 0) === t)); };
const azarViejos = (lista, cuando, fraccion) => {   // al azar entre los que hace más que no salen (la fracción más vieja)
  const orden = lista.slice().sort((a, b) => (cuando[a] || 0) - (cuando[b] || 0));
  return azar(orden.slice(0, Math.max(1, Math.ceil(orden.length * fraccion))));
};
let turno = 3;

// Elige el próximo clip: un evento pendiente manda; si no, una emoción de espera del jugador actual
// (cada 2-4 clips cambia de jugador, entre los que juegan si estado.json los trae).
function proximo() {
  // Mientras la tanda no generó clips de espera, cualquier clip sirve.
  const hayEspera = Object.values(indice).some(j => j.emociones.some(e => ESPERA.includes(e)));
  const deEspera = e => !hayEspera || ESPERA.includes(e);
  let pool = Object.keys(indice).filter(gt => indice[gt].emociones.some(deEspera));
  if (estado.jugadores?.length) { const c = pool.filter(gt => estado.jugadores.includes(gt)); if (c.length) pool = c; }
  if (!pool.length) return null;
  const elegir = (gt, emos) => {
    const cuando = Object.fromEntries(emos.map(x => [x, ultimoClip[gt + '/' + x]]));
    // fuera los 3 últimos que pasó (si tiene pocos clips, al menos deja uno)
    const e = azarViejos(emos, cuando, emos.length > 4 ? (emos.length - 3) / emos.length : 0.5);
    ultimoClip[gt + '/' + e] = ultimoJugador[gt] = Date.now(); return e; };
  let cambia = false;
  if (evento) {
    const tipo = evento; evento = null;
    const con = gt => indice[gt].emociones.some(e => EVENTO[tipo].includes(e));
    const gt = con(actual) ? actual : (pool.filter(con).length ? masViejo(pool.filter(con), ultimoJugador) : masViejo(pool, ultimoJugador));
    cambia = gt !== actual; actual = gt; enCola = 0;
    const emos = indice[gt].emociones.filter(e => EVENTO[tipo].includes(e));
    if (emos.length) return { gt, emocion: elegir(gt, emos), cambia };
  }
  if (!actual || !pool.includes(actual) || ++enCola >= turno) {
    const otros = pool.filter(gt => gt !== actual); const nuevo = azarViejos(otros.length ? otros : pool, ultimoJugador, 0.5);
    cambia = nuevo !== actual; actual = nuevo; enCola = 0; turno = 2 + Math.floor(Math.random() * 3);
  }
  return { gt: actual, emocion: elegir(actual, indice[actual].emociones.filter(deEspera)), cambia };
}

// Dos <video> alternados: el siguiente se carga oculto y entra recién cuando puede reproducirse (sin parpadeo).
// Los clips duran 5 s: van al 85 % y al terminar el jugador queda quieto en su pose 0,8-2,2 s antes del siguiente
// (terminan en la postura de reposo). Repetir el mismo clip dos veces se notaba como un loop (charlado con Juan).
const VELOCIDAD = 0.85;
let pausaClip = null;
function siguiente() {
  clearTimeout(pausaClip); pausaClip = null;
  const c = proximo(); if (!c) { setTimeout(siguiente, 3000); return; }
  const v = vids[1 - activo], viejo = vids[activo];
  v.src = `${CLIPS}${encodeURIComponent(c.gt)}/${c.emocion}.webm`;
  v.onerror = () => setTimeout(siguiente, 500);
  v.oncanplay = () => {
    v.oncanplay = null;
    v.playbackRate = VELOCIDAD;
    v.play().then(() => {
      v.classList.add('on'); viejo.classList.remove('on'); viejo.pause(); activo = 1 - activo;
      placa(c.gt, c.emocion, c.cambia);
    }).catch(() => setTimeout(siguiente, 1000));
  };
  v.onended = () => { pausaClip = setTimeout(siguiente, 800 + Math.random() * 1400); };
  v.load();
}

// Lado de nuestra barra de FC27 (lo detecta vigia-vivo.mjs): el palco (y la tapa de la barra) se pasan a ese costado
// con un fundido. Sin dato, izquierda.
let ladoActual = 'izq';
function ponerLado(l) {
  if (!l || l === ladoActual) return;
  ladoActual = l; document.body.classList.add('mudando');
  setTimeout(() => { document.body.classList.toggle('lado-der', l === 'der'); document.body.classList.remove('mudando'); }, 350);
}

function gol(ms = 6000) { $('gol').classList.add('on'); setTimeout(() => $('gol').classList.remove('on'), ms); }

async function actualizar() {
  const [i, e] = await Promise.all([leer(CLIPS + 'indice.json'), leer(ESTADO)]);
  if (i) indice = i;
  if (e) {
    estado = e;
    ponerLado(e.lado);
    window.pausa?.poner(e.modo === 'pausa');           // menús/lobby/espera: overlay-pausa.js
    if (e.modo === 'juego') window.victoria?.ocultar();     // arrancó otro partido: fuera la pantalla de victoria
    const t = $('torneo'); t.hidden = !e.torneo;
    $('torneoTxt').textContent = e.torneo || ''; $('rivalTxt').textContent = e.rival ? 'vs ' + e.rival : '';
    if (e.escudo) { $('escudo').src = e.escudo; $('escudo').hidden = false; } else $('escudo').hidden = true;
    for (const ev of e.eventos || []) {
      if (visto.has(ev.id)) continue; visto.add(ev.id);
      if (!arranco) continue;                                  // los eventos viejos (de antes de abrir el overlay) no se reproducen
      if (ev.tipo === 'finPartido') {
        window.ultimoResultado = ev.resultado; evento = ev.resultado;
        if (ev.resultado === 'victoria') window.victoria?.mostrar({ marcador: ev.marcador, rival: e.rival, escudo: e.escudo, torneo: e.torneo });
      }
      else if (EVENTO[ev.tipo]) evento = ev.tipo;
      else continue;                                           // avisos sin reacción (inicioPartido): antes rompían proximo()
      if (ev.tipo === 'gol') gol();
      vids[activo].pause(); siguiente();                       // el evento corta el clip de espera
    }
  }
  if (!arranco && Object.keys(indice).length) { arranco = true; siguiente(); }
}
window.overlay = { gol, evento: tipo => { evento = tipo; if (tipo === 'gol') gol(); siguiente(); } };

if (q.get('lado')) document.body.classList.toggle('lado-der', q.get('lado') === 'der');
if (q.get('demo')) {
  // Vistas fijas para revisar el diseño (scripts/stream/preview.mjs)
  const gt = q.get('gt') || 'Juan_Martinez4', emocion = q.get('emocion') || 'aliento';
  $('gt').textContent = gt; $('num').textContent = q.get('num') || '6'; $('dice').textContent = DICE[emocion];
  if (q.get('torneo')) { $('torneo').hidden = false; $('torneoTxt').textContent = q.get('torneo'); $('rivalTxt').textContent = q.get('rival') ? 'vs ' + q.get('rival') : ''; $('escudo').hidden = true; }
  if (q.get('demo') === 'gol') $('gol').classList.add('on');
  const v = vids[0]; v.src = `${CLIPS}${gt}/${emocion}.webm`; v.currentTime = +(q.get('t') || 2.5); v.classList.add('on');
  if (q.has('sinvideo')) v.style.visibility = 'hidden';
} else {
  actualizar(); setInterval(actualizar, 1500);
}
