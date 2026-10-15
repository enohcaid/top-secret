// Lógica compartida de los overlays del vivo (overlay.html horizontal, overlay-vertical.html para Instagram).
// Cada página pone los mismos ids: torneo/escudo/torneoTxt/rivalTxt, palco con v0/v1, jug/num/gt/dice y gol.
// Lee fuentes/stream/clips/indice.json y fuentes/stream/estado.json cada 1,5 s (ver overlay.html).
const q = new URLSearchParams(location.search);
const CLIPS = q.get('clips') || '../../fuentes/stream/clips/';
const ESTADO = q.get('estado') || '../../fuentes/stream/estado.json';
const ESPERA = ['aliento', 'indicaciones', 'agitado', 'sudor', 'aplaude', 'pide', 'calma'];
const EVENTO = { gol: ['gol', 'festejo'], golRival: ['frustrado', 'reclama'] };
const DICE = { aliento: 'ALIENTA', indicaciones: 'DA INDICACIONES', agitado: 'RECUPERA AIRE', sudor: 'CONCENTRADO', aplaude: 'APLAUDE',
  pide: 'PIDE LA PELOTA', calma: 'PIDE CALMA', gol: 'GRITO DE GOL', festejo: 'FESTEJA', frustrado: 'SE LAMENTA', reclama: 'RECLAMA', triste: 'SE LAMENTA' };
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

// Contra las repeticiones (pedido de Juan): se recuerda cuándo pasó cada clip y cada jugador, y siempre se elige lo
// que hace más tiempo que no sale (con empate, al azar). Así un clip no vuelve hasta que pasaron todos los demás
// del jugador, y al cambiar entra el jugador que hace más que no aparece.
const ultimoClip = {}, ultimoJugador = {};
const masViejo = (lista, cuando) => { const t = Math.min(...lista.map(x => cuando[x] || 0)); return azar(lista.filter(x => (cuando[x] || 0) === t)); };

// Elige el próximo clip: un evento pendiente manda; si no, una emoción de espera del jugador actual
// (cada 3 clips cambia de jugador, entre los convocados si estado.json los trae).
function proximo() {
  // Mientras la tanda no generó clips de espera, cualquier clip sirve.
  const hayEspera = Object.values(indice).some(j => j.emociones.some(e => ESPERA.includes(e)));
  const deEspera = e => !hayEspera || ESPERA.includes(e);
  let pool = Object.keys(indice).filter(gt => indice[gt].emociones.some(deEspera));
  if (estado.jugadores?.length) { const c = pool.filter(gt => estado.jugadores.includes(gt)); if (c.length) pool = c; }
  if (!pool.length) return null;
  const elegir = (gt, emos) => { const e = masViejo(emos, Object.fromEntries(emos.map(x => [x, ultimoClip[gt + '/' + x]])));
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
  if (!actual || !pool.includes(actual) || ++enCola >= 3) {
    const otros = pool.filter(gt => gt !== actual); const nuevo = masViejo(otros.length ? otros : pool, ultimoJugador);
    cambia = nuevo !== actual; actual = nuevo; enCola = 0;
  }
  return { gt: actual, emocion: elegir(actual, indice[actual].emociones.filter(deEspera)), cambia };
}

// Dos <video> alternados: el siguiente se carga oculto y entra recién cuando puede reproducirse (sin parpadeo).
function siguiente() {
  const c = proximo(); if (!c) { setTimeout(siguiente, 3000); return; }
  const v = vids[1 - activo], viejo = vids[activo];
  v.src = `${CLIPS}${encodeURIComponent(c.gt)}/${c.emocion}.webm`;
  v.onerror = () => setTimeout(siguiente, 500);
  v.oncanplay = () => {
    v.oncanplay = null;
    v.play().then(() => {
      v.classList.add('on'); viejo.classList.remove('on'); viejo.pause(); activo = 1 - activo;
      placa(c.gt, c.emocion, c.cambia);
    }).catch(() => setTimeout(siguiente, 1000));
  };
  v.onended = siguiente;
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
    const t = $('torneo'); t.hidden = !e.torneo;
    $('torneoTxt').textContent = e.torneo || ''; $('rivalTxt').textContent = e.rival ? 'vs ' + e.rival : '';
    if (e.escudo) { $('escudo').src = e.escudo; $('escudo').hidden = false; } else $('escudo').hidden = true;
    for (const ev of e.eventos || []) {
      if (visto.has(ev.id)) continue; visto.add(ev.id);
      if (!arranco) continue;                                  // los eventos viejos (de antes de abrir el overlay) no se reproducen
      evento = ev.tipo; if (ev.tipo === 'gol') gol();
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
