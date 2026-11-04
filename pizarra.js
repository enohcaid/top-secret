// Pizarra en vivo (topsecret.ar/pizarra). Todo lo que se mueve o se dibuja se comparte por Firestore:
//   plantel/pizarra         → f: { <id ficha>: {x, y, b, l} }   solo las fichas que alguien movió
//   plantel/pizarra-trazos  → t: { <id trazo>: {c, k, p} }      c color, k 'l' lápiz | 'a' flecha, p [x,y,x,y…]
// El equipo sale de la cancha de la convocatoria (convocatoria/state.lineup, solo lectura). La movida de un
// jugador guarda en `l` la alineación para la que se hizo: si la convocatoria cambia, deja de valer.
// Coordenadas en un marco único de cancha: x 0→1 de nuestro arco al rival, y 0→1 a lo ancho. La PC la
// ve acostada y el celular parada (nuestro arco abajo): el giro se resuelve solo al dibujar (toPx/fromPx).
import { ROSTER_T4 } from './roster.js';

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const FB_CONFIG = {
  apiKey: 'AIzaSyAzjOjdspr1SRMiX88ge0AuoKirrsJB17M',
  authDomain: 'top-secret-fc.firebaseapp.com',
  projectId: 'top-secret-fc',
  storageBucket: 'top-secret-fc.firebasestorage.app',
  messagingSenderId: '303110190986',
  appId: '1:303110190986:web:6a5987dfff32af49a4fa73',
};

const CADA_MS = 200;       // como mucho 5 escrituras por segundo mientras se arrastra o se dibuja
const MAX_TRAZOS = 120;    // el documento tiene que quedar lejos del tope de 1 MB de Firestore
const MAX_PUNTOS = 300;
const PASO_MIN = 0.004;
const ALTO_LARGO = 105, ALTO_ANCHO = 68;

// Posiciones de FORMATIONS en convocatoria.html, [x, y] en %. Si se agrega una formación allá, agregarla acá.
const FORMACIONES = {
  '4-3-3': { GK: [50, 87], RB: [85, 63], CB1: [64, 66], CB2: [36, 66], LB: [15, 63], RM: [75, 37], CM: [50, 44], LM: [25, 37], RW: [80, 14], CF: [50, 14], LW: [20, 14] },
  '4-4-2': { GK: [50, 87], RB: [85, 63], CB1: [64, 66], CB2: [36, 66], LB: [15, 63], RM: [80, 37], CM1: [60, 44], CM2: [40, 37], LM: [20, 37], ST1: [64, 14], ST2: [36, 14] },
  '4-2-3-1': { GK: [50, 87], RB: [85, 63], CB1: [64, 66], CB2: [36, 66], LB: [15, 63], CDM1: [62, 49], CDM2: [38, 49], RAM: [78, 34], CAM: [50, 31], LAM: [22, 34], CF: [50, 14] },
  '3-5-2': { GK: [50, 87], CB1: [72, 68], CB2: [50, 67], CB3: [28, 68], RM: [86, 40], CM1: [64, 48], CM2: [36, 48], LM: [14, 40], CAM: [50, 31], ST1: [64, 14], ST2: [36, 14] },
  '3-1-4-2': { GK: [50, 87], CB1: [72, 68], CB2: [50, 67], CB3: [28, 68], RM: [85, 37], CM1: [67, 35], CM2: [50, 44], CM3: [33, 35], LM: [15, 37], ST1: [64, 14], ST2: [36, 14] },
  '3-4-3': { GK: [50, 87], CB1: [72, 68], CB2: [50, 67], CB3: [28, 68], RM: [85, 37], CM1: [62, 44], CM2: [38, 44], LM: [15, 37], RW: [80, 14], CF: [50, 14], LW: [20, 14] },
  '4-1-2-1-2': { GK: [50, 87], RB: [85, 63], CB1: [64, 66], CB2: [36, 66], LB: [15, 63], CDM: [50, 53], CM1: [72, 43], CM2: [28, 43], CAM: [50, 31], ST1: [64, 14], ST2: [36, 14] },
};
// Allá el arco propio está abajo (y 87) y el ataque arriba (y 14); acá cada equipo ocupa su mitad de cancha.
const aCancha = ([x, y]) => ({ x: r3(.05 + (87 - y) / 73 * .42), y: x / 100, b: false });

// Modos del equipo: reubican a los once de un 4-3-3 de la convocatoria, puesto por puesto.
// CM = el líbero (tapón), RM/LM = medio derecho e izquierdo, CF = el 9, RW/LW = los extremos.
const MODOS = {
  defensa: FORMACIONES['4-3-3'],
  ataque: { // 3-4-3: el líbero entre los centrales, los medios abiertos de laterales
    GK: [50, 87],
    CB1: [72, 68], CM: [50, 67], CB2: [28, 68],
    RM: [85, 37], RB: [62, 44], LB: [38, 44], LM: [15, 37],
    RW: [80, 14], CF: [50, 14], LW: [20, 14],
  },
  ultradef: { // 5-2-1-2: el líbero de tapón, el 9 de enganche, los extremos cerrados de delanteros
    GK: [50, 87],
    RB: [88, 62], CB1: [70, 68], CM: [50, 71], CB2: [30, 68], LB: [12, 62],
    RM: [64, 48], LM: [36, 48],
    CF: [50, 31],
    RW: [64, 14], LW: [36, 14],
  },
};

// Formación de respaldo, si la convocatoria está vacía o no se puede leer: el 3-5-2 con MCO del plan de juego.
const XI = {
  Ivan_Cabj_La12: [.05, .5],
  rivarola90: [.19, .25], Alexisraies23: [.16, .5], Cabers14: [.19, .75],
  Guiidow: [.36, .1], Huber236: [.36, .9],
  Juan_Martinez4: [.31, .37], Ciprimancini32: [.31, .63],
  'RS32-DaniStone': [.41, .5],
  Lautavester7: [.47, .33], NicoBJ_96: [.47, .67],
};
const RIVAL = [[.95, .5], [.8, .14], [.8, .38], [.8, .62], [.8, .86], [.67, .28], [.67, .5], [.67, .72], [.56, .2], [.56, .5], [.56, .8]];
const SILUETA = '<svg viewBox="0 0 100 100"><g class="bo"><circle cx="50" cy="31" r="21"/><path d="M12 92c0-22 15-35 38-35s38 13 38 35z"/></g><g class="si"><circle cx="50" cy="31" r="21"/><path d="M12 92c0-22 15-35 38-35s38 13 38 35z"/></g></svg>';
const PELOTA = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#F2EEE0" stroke="#000" stroke-width="1"/><path d="M12 7l4.5 3.3-1.7 5.3H9.2l-1.7-5.3zM12 7V2.5M16.5 10.3l4-1.5M14.8 15.6l2.7 3.6M9.2 15.6l-2.7 3.6M7.5 10.3l-4-1.5" fill="none" stroke="#000" stroke-width="1"/><path d="M12 7l4.5 3.3-1.7 5.3H9.2l-1.7-5.3z" fill="#000"/></svg>';

const $ = id => document.getElementById(id);
const stage = $('stage'), cancha = $('cancha'), trazosSvg = $('trazos'), banco = $('banco'), area = $('area');
const SVGNS = 'http://www.w3.org/2000/svg';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const r3 = v => Math.round(v * 1000) / 1000;

// ── Fichas ───────────────────────────────────────────────
const fichas = [];
const porId = {};
const EN_BANCO = { x: .25, y: .5, b: true };
function agregar(id, tipo, def, html, titulo) {
  const el = document.createElement('div');
  el.className = `tk ${tipo}`;
  el.dataset.id = id;
  el.innerHTML = html;
  if (titulo) { el.title = titulo; el.setAttribute('aria-label', titulo); }
  stage.appendChild(el);
  porId[id] = { id, tipo, def, el };
  fichas.push(porId[id]);
}
ROSTER_T4.forEach(j => {
  const img = `<img alt="" draggable="false" src="${MEDIA}/logos/pizarra/caras/${encodeURIComponent(j.key)}.webp">`;
  agregar(j.key, 'j', EN_BANCO, `${img}<b>${j.num}</b>`, `${j.key} · ${j.num}`);
});
RIVAL.forEach(([x, y], i) => agregar(`r${i + 1}`, 'r', { x, y, b: false }, SILUETA, 'Rival'));
agregar('pelota', 'b', { x: .5, y: .5, b: false }, PELOTA, 'Pelota');
fichas.forEach(f => {
  const img = f.el.querySelector('img');
  if (img) img.addEventListener('error', () => img.remove()); // sin cara queda el número sobre la ficha
});

// ── Estado compartido ────────────────────────────────────
const estado = { f: {}, t: {} };
let arrastre = null;   // {ficha, pointerId, ultimo}
let trazo = null;      // trazo que estoy dibujando
const mios = [];       // ids de mis trazos, para Deshacer
let firma = null;      // identifica la alineación vigente; null hasta leer la convocatoria

const posDe = f => {
  const s = estado.f[f.id];
  const vigente = s && (f.tipo !== 'j' || s.l === firma);
  if (vigente && Number.isFinite(s.x) && Number.isFinite(s.y)) return { x: clamp(s.x), y: clamp(s.y), b: !!s.b && f.tipo === 'j' };
  return f.def;
};

// Ubica al equipo según la convocatoria y el modo. Un puesto ocupado por alguien sin ficha (el "Prueba" de
// la convocatoria) se muestra con una ficha genérica, para que la cancha tenga los mismos que allá.
// Espera a tener las dos lecturas: así quien entra no ve al equipo viajar del modo por defecto al vigente.
let lineupActual;      // undefined hasta leer la convocatoria; null si no hay
let modoLeido = false;
let modo = 'defensa';
let pintado = null;
function aplicarEquipo() {
  if (lineupActual === undefined || !modoLeido) return;
  const lineup = lineupActual;
  const slots = (lineup && lineup.slots) || {};
  let formacion = lineup && lineup.formation;
  if (formacion === '3-5-2' && 'CM3' in slots) formacion = '3-1-4-2'; // misma corrección que convocatoria.html
  if (!FORMACIONES[formacion]) formacion = '4-3-3';
  const ocupados = Object.keys(slots).filter(k => FORMACIONES[formacion][k] && slots[k]).sort();
  const conModos = formacion === '4-3-3' && ocupados.length > 0;
  const puestos = conModos ? MODOS[modo] : FORMACIONES[formacion];
  pintarModos(conModos);
  const nueva = ocupados.length ? JSON.stringify([formacion, ocupados.map(k => [k, slots[k]])]) : 'plan';
  const clave = `${nueva}|${conModos ? modo : ''}`;
  if (clave === pintado) return;
  const primera = pintado === null;
  pintado = clave;
  firma = nueva;

  fichas.filter(f => f.tipo === 'j').forEach(f => { f.def = EN_BANCO; });
  if (ocupados.length) {
    const invitados = new Set();
    ocupados.forEach(k => {
      let f = porId[slots[k]];
      if (!f || f.tipo !== 'j') {
        const id = `inv-${k}`;
        invitados.add(id);
        if (!porId[id]) agregar(id, 'j inv', EN_BANCO, '<i>?</i>', slots[k]);
        f = porId[id];
        f.tipo = 'j';
      }
      f.def = aCancha(puestos[k]);
    });
    fichas.filter(f => f.id.startsWith('inv-') && !invitados.has(f.id)).forEach(sacarFicha);
  } else {
    fichas.filter(f => f.id.startsWith('inv-')).forEach(sacarFicha);
    Object.entries(XI).forEach(([key, [x, y]]) => { if (porId[key]) porId[key].def = { x, y, b: false }; });
  }
  if (primera) {
    stage.classList.add('quieto', 'listo'); // la primera vez aparecen en su lugar, sin viajar desde el banco
    ubicarTodas();
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('quieto')));
  } else {
    ubicarTodas();
  }
}
function sacarFicha(f) {
  f.el.remove();
  fichas.splice(fichas.indexOf(f), 1);
  delete porId[f.id];
}
const botonesModo = [...document.querySelectorAll('.pz-modo')];
function pintarModos(conModos) {
  botonesModo.forEach(b => {
    b.disabled = !conModos;
    b.setAttribute('aria-pressed', String(conModos && b.dataset.modo === modo));
  });
  $('modos-nota').hidden = conModos;
}

// ── Geometría ────────────────────────────────────────────
let G = { W: 0, H: 0, parada: false, s: 40, banco: 60 };
const toPx = (x, y) => G.parada ? [y * G.W, (1 - x) * G.H] : [x * G.W, y * G.H];
const fromPx = (px, py) => G.parada ? [1 - py / G.H, px / G.W] : [px / G.W, py / G.H];

function medir() {
  const cw = area.clientWidth, ch = area.clientHeight;
  if (!cw || !ch) return;
  const parada = cw / ch < 1;
  const prop = ALTO_LARGO / ALTO_ANCHO;
  let bancoH = 60, W = 0, H = 0, s = 40;
  for (let i = 0; i < 2; i++) {
    if (parada) { H = Math.min(ch - bancoH - 6, cw * prop); W = H / prop; }
    else { W = Math.min(cw, (ch - bancoH - 6) * prop); H = W / prop; }
    s = Math.round(clamp(Math.min(W, H) * .085, 26, 46));
    bancoH = s + 22;
  }
  G = { W: Math.round(W), H: Math.round(H), parada, s, banco: bancoH };
  stage.style.width = `${G.W}px`;
  stage.style.height = `${G.H + 6 + bancoH}px`;
  stage.style.setProperty('--s', `${s}px`);
  banco.style.height = `${bancoH}px`;
  dibujarCancha();
  ubicarTodas();
  dibujarTrazos();
}

function dibujarCancha() {
  const vw = G.parada ? ALTO_ANCHO : ALTO_LARGO, vh = G.parada ? ALTO_LARGO : ALTO_ANCHO;
  cancha.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  cancha.setAttribute('width', G.W);
  cancha.setAttribute('height', G.H);
  let franjas = '';
  for (let i = 0; i < 10; i += 2) franjas += `<rect class="g-franja" x="${i * 10.5}" y="0" width="10.5" height="68"/>`;
  const giro = G.parada ? ' transform="rotate(-90) translate(-105 0)"' : '';
  cancha.innerHTML = `<g${giro}>
    <rect class="g-pasto" width="105" height="68"/>${franjas}
    <rect class="g-cal" x="1.2" y="1.2" width="102.6" height="65.6"/>
    <line class="g-cal" x1="52.5" y1="1.2" x2="52.5" y2="66.8"/>
    <circle class="g-cal" cx="52.5" cy="34" r="9.15"/><circle class="g-pto" cx="52.5" cy="34" r=".5"/>
    <rect class="g-cal" x="1.2" y="13.84" width="16.5" height="40.32"/><rect class="g-cal" x="87.3" y="13.84" width="16.5" height="40.32"/>
    <rect class="g-cal" x="1.2" y="24.84" width="5.5" height="18.32"/><rect class="g-cal" x="98.3" y="24.84" width="5.5" height="18.32"/>
    <circle class="g-pto" cx="12.2" cy="34" r=".4"/><circle class="g-pto" cx="92.8" cy="34" r=".4"/>
    <path class="g-cal" d="M17.7 26.7a9.150 9.150 0 0 1 0 14.6M87.3 26.7a9.150 9.150 0 0 0 0 14.6"/>
  </g>`;
}

function ubicar(f) {
  if (arrastre && arrastre.ficha === f) return;
  const p = posDe(f);
  const lado = f.tipo === 'b' ? G.s * .5 : G.s;
  let px, py;
  if (p.b) {
    const enBanco = fichas.filter(o => o.tipo === 'j' && posDe(o).b);
    const paso = Math.min(G.s + 10, (G.W - G.s) / Math.max(enBanco.length, 1));
    const i = enBanco.indexOf(f);
    px = G.W / 2 + (i - (enBanco.length - 1) / 2) * paso;
    py = G.H + 6 + G.banco / 2 + 3;
  } else {
    [px, py] = toPx(p.x, p.y);
  }
  f.el.style.transform = `translate3d(${px - lado / 2}px,${py - lado / 2}px,0)`;
}
const ubicarTodas = () => fichas.forEach(ubicar);

// ── Trazos ───────────────────────────────────────────────
let pendienteDibujo = false;
function dibujarTrazos() {
  if (pendienteDibujo) return;
  pendienteDibujo = true;
  requestAnimationFrame(() => {
    pendienteDibujo = false;
    trazosSvg.setAttribute('width', G.W);
    trazosSvg.setAttribute('height', G.H);
    trazosSvg.setAttribute('viewBox', `0 0 ${G.W} ${G.H}`);
    const grosor = Math.max(2.5, G.s * .075);
    const frag = document.createDocumentFragment();
    Object.keys(estado.t).sort().forEach(id => {
      const t = estado.t[id];
      if (!t || !Array.isArray(t.p) || t.p.length < 2) return;
      const color = ['o', 'b', 'r'].includes(t.c) ? t.c : 'o';
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', `c-${color}`);
      const pts = [];
      for (let i = 0; i + 1 < t.p.length; i += 2) pts.push(toPx(+t.p[i] || 0, +t.p[i + 1] || 0));
      const linea = document.createElementNS(SVGNS, 'polyline');
      linea.setAttribute('class', 'tr');
      linea.setAttribute('stroke-width', grosor);
      if (t.k === 'a' && pts.length >= 2) {
        const a = pts[0], b = pts[pts.length - 1];
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), largo = grosor * 4.2;
        const punta = [[b[0] + Math.cos(ang) * grosor, b[1] + Math.sin(ang) * grosor],
          [b[0] - Math.cos(ang - .45) * largo, b[1] - Math.sin(ang - .45) * largo],
          [b[0] - Math.cos(ang + .45) * largo, b[1] - Math.sin(ang + .45) * largo]];
        linea.setAttribute('points', `${a[0]},${a[1]} ${b[0] - Math.cos(ang) * largo * .6},${b[1] - Math.sin(ang) * largo * .6}`);
        const tri = document.createElementNS(SVGNS, 'polygon');
        tri.setAttribute('class', 'pu');
        tri.setAttribute('points', punta.map(q => q.join(',')).join(' '));
        g.append(linea, tri);
      } else {
        // Un toque sin mover deja un punto: la línea necesita dos vértices para pintarse.
        const v = pts.length === 1 ? [pts[0], pts[0]] : pts;
        linea.setAttribute('points', v.map(q => q.join(',')).join(' '));
        g.append(linea);
      }
      frag.appendChild(g);
    });
    trazosSvg.replaceChildren(frag);
  });
}

const distSeg = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  const t = l ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
function borrarEn(px, py) {
  for (const id of Object.keys(estado.t)) {
    const t = estado.t[id];
    if (!t || !Array.isArray(t.p)) continue;
    const pts = [];
    for (let i = 0; i + 1 < t.p.length; i += 2) pts.push(toPx(+t.p[i] || 0, +t.p[i + 1] || 0));
    const cerca = pts.some((q, i) => distSeg([px, py], q, pts[Math.min(i + 1, pts.length - 1)]) < Math.max(10, G.s * .25));
    if (cerca) borrarTrazo(id);
  }
}

// ── Firestore ────────────────────────────────────────────
let docFichas = null, docTrazos = null, docEquipo = null, borrarCampo = null;
try {
  if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
  const db = firebase.firestore();
  docFichas = db.collection('plantel').doc('pizarra');
  docTrazos = db.collection('plantel').doc('pizarra-trazos');
  docEquipo = db.collection('convocatoria').doc('state');
  borrarCampo = firebase.firestore.FieldValue.delete;
} catch (e) { console.warn('[pizarra] Firebase no disponible:', e); }

function estadoRed(s) {
  const el = $('status');
  el.dataset.s = s;
  $('status-txt').textContent = { vivo: 'En vivo', con: 'Conectando', off: 'Sin conexión' }[s];
}
const fallo = e => { console.warn('[pizarra] no se pudo guardar:', e); estadoRed('off'); };

const enviarFicha = (f, v) => docFichas && docFichas.set({ f: { [f.id]: { x: r3(v.x), y: r3(v.y), b: !!v.b, ...(v.l ? { l: v.l } : {}) } } }, { merge: true }).catch(fallo);
const enviarTrazo = (id, t) => docTrazos && docTrazos.set({ t: { [id]: t } }, { merge: true }).catch(fallo);
function borrarTrazo(id) {
  delete estado.t[id];
  dibujarTrazos();
  if (docTrazos) docTrazos.set({ t: { [id]: borrarCampo() } }, { merge: true }).catch(fallo);
}

// Con la pestaña oculta no se escucha: cada cambio de otro es una lectura facturada para cada abierto.
let bajas = [];
function escuchar() {
  if (!docFichas || bajas.length) return;
  const opts = { includeMetadataChanges: true };
  bajas = [
    docFichas.onSnapshot(opts, snap => {
      estado.f = (snap.exists && snap.data().f) || {};
      if (arrastre) estado.f[arrastre.ficha.id] = arrastre.ultimo;
      const m = snap.exists && snap.data().m;
      modo = MODOS[m] ? m : 'defensa';
      modoLeido = true;
      aplicarEquipo();
      ubicarTodas();
      estadoRed(snap.metadata.fromCache ? 'con' : 'vivo');
    }, e => { console.warn(e); estadoRed('off'); modoLeido = true; aplicarEquipo(); }),
    docTrazos.onSnapshot(opts, snap => {
      estado.t = (snap.exists && snap.data().t) || {};
      if (trazo) estado.t[trazo.id] = trazo.datos;
      dibujarTrazos();
    }, e => { console.warn(e); estadoRed('off'); }),
    docEquipo.onSnapshot(snap => {
      lineupActual = (snap.exists && snap.data().lineup) || null;
      aplicarEquipo();
    }, e => {
      console.warn(e);
      if (lineupActual === undefined) { lineupActual = null; aplicarEquipo(); }
    }),
  ];
}
function dejarDeEscuchar() { bajas.forEach(b => b()); bajas = []; }
document.addEventListener('visibilitychange', () => { if (document.hidden) dejarDeEscuchar(); else escuchar(); });

// ── Interacción ──────────────────────────────────────────
let herramienta = 'mover', color = 'o', gesto = null, ultimoEnvio = 0, envioDiferido = null;

const local = e => {
  const r = stage.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
};
function limitado(fn) {
  const falta = CADA_MS - (performance.now() - ultimoEnvio);
  clearTimeout(envioDiferido);
  if (falta <= 0) { ultimoEnvio = performance.now(); fn(); }
  else envioDiferido = setTimeout(() => { ultimoEnvio = performance.now(); fn(); }, falta);
}
function terminarEnvio(fn) { clearTimeout(envioDiferido); ultimoEnvio = performance.now(); fn(); }

function moverFicha(f, px, py) {
  const lado = f.tipo === 'b' ? G.s * .5 : G.s;
  const altoMax = f.tipo === 'j' ? G.H + 6 + G.banco : G.H;
  const X = clamp(px, 0, G.W), Y = clamp(py, 0, altoMax);
  f.el.style.transform = `translate3d(${X - lado / 2}px,${Y - lado / 2}px,0)`;
  const enBanco = f.tipo === 'j' && Y > G.H;
  const [x, y] = fromPx(X, Math.min(Y, G.H));
  return { x: clamp(x), y: clamp(y), b: enBanco, ...(f.tipo === 'j' ? { l: firma } : {}) };
}

stage.addEventListener('pointerdown', e => {
  if (gesto !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const [px, py] = local(e);
  if (herramienta === 'mover') {
    const el = e.target.closest('.tk');
    if (!el) return;
    const f = porId[el.dataset.id];
    e.preventDefault();
    gesto = e.pointerId;
    stage.setPointerCapture(e.pointerId);
    el.classList.add('drag');
    arrastre = { ficha: f, ultimo: moverFicha(f, px, py) };
    estado.f[f.id] = arrastre.ultimo;
    return;
  }
  if (py > G.H) return; // el banco no se dibuja
  e.preventDefault();
  gesto = e.pointerId;
  stage.setPointerCapture(e.pointerId);
  if (herramienta === 'goma') { borrarEn(px, py); return; }
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const orden = Object.keys(estado.t).sort();
  if (orden.length >= MAX_TRAZOS) borrarTrazo(orden[0]);
  const [x, y] = fromPx(px, py);
  trazo = { id, datos: { c: color, k: herramienta === 'flecha' ? 'a' : 'l', p: [r3(x), r3(y)] } };
  estado.t[id] = trazo.datos;
  mios.push(id);
  dibujarTrazos();
  limitado(() => trazo && enviarTrazo(trazo.id, trazo.datos));
});

stage.addEventListener('pointermove', e => {
  if (e.pointerId !== gesto) return;
  const [px, py] = local(e);
  if (arrastre) {
    arrastre.ultimo = moverFicha(arrastre.ficha, px, py);
    estado.f[arrastre.ficha.id] = arrastre.ultimo;
    if (herramienta === 'mover') {
      const { ficha, ultimo } = arrastre;
      limitado(() => enviarFicha(ficha, ultimo));
    }
    return;
  }
  if (herramienta === 'goma') { borrarEn(px, py); return; }
  if (!trazo) return;
  const [x, y] = fromPx(clamp(px, 0, G.W), clamp(py, 0, G.H));
  const p = trazo.datos.p;
  if (trazo.datos.k === 'a') {
    trazo.datos.p = [p[0], p[1], r3(x), r3(y)];
  } else {
    if (p.length >= MAX_PUNTOS * 2) return;
    if (Math.hypot(x - p[p.length - 2], y - p[p.length - 1]) < PASO_MIN) return;
    p.push(r3(x), r3(y));
  }
  dibujarTrazos();
  const { id, datos } = trazo;
  limitado(() => enviarTrazo(id, datos));
});

function soltar(e) {
  if (e.pointerId !== gesto) return;
  gesto = null;
  if (arrastre) {
    const { ficha, ultimo } = arrastre;
    arrastre = null;
    ficha.el.classList.remove('drag');
    terminarEnvio(() => enviarFicha(ficha, ultimo));
    ubicarTodas();
    return;
  }
  if (trazo) {
    const { id, datos } = trazo;
    trazo = null;
    if (datos.k === 'a' && datos.p.length < 4) { // flecha sin largo: no marca nada
      mios.pop();
      clearTimeout(envioDiferido);
      borrarTrazo(id);
      return;
    }
    terminarEnvio(() => enviarTrazo(id, datos));
  }
}
stage.addEventListener('pointerup', soltar);
stage.addEventListener('pointercancel', soltar);

// ── Barra de herramientas ────────────────────────────────
document.querySelectorAll('[data-tool].pz-btn').forEach(b => b.addEventListener('click', () => {
  herramienta = b.dataset.tool;
  stage.dataset.tool = herramienta;
  document.querySelectorAll('[data-tool].pz-btn').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
}));
document.querySelectorAll('.pz-color').forEach(b => b.addEventListener('click', () => {
  color = b.dataset.color;
  document.querySelectorAll('.pz-color').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
  if (herramienta === 'mover' || herramienta === 'goma') document.querySelector('[data-tool="lapiz"].pz-btn').click();
}));
$('deshacer').addEventListener('click', () => {
  while (mios.length) {
    const id = mios.pop();
    if (estado.t[id]) { borrarTrazo(id); return; }
  }
});
// Afecta a todos y no se puede deshacer: pide un segundo toque.
function conConfirmacion(btn, accion) {
  const span = btn.querySelector('span'), texto = span.textContent;
  let espera = null;
  const volver = () => { clearTimeout(espera); espera = null; btn.classList.remove('seguro'); span.textContent = texto; };
  btn.addEventListener('click', () => {
    if (espera) { volver(); accion(); return; }
    btn.classList.add('seguro');
    span.textContent = '¿Seguro?';
    espera = setTimeout(volver, 3000);
  });
}
conConfirmacion($('limpiar'), () => {
  estado.t = {};
  mios.length = 0;
  dibujarTrazos();
  if (docTrazos) docTrazos.set({ t: {} }).catch(fallo);
});
conConfirmacion($('reset'), () => {
  estado.f = {};
  ubicarTodas();
  if (docFichas) docFichas.set({ f: {}, m: modo }).catch(fallo);
});
// Cambiar de modo reubica al equipo para todos: las movidas de jugadores se descartan; rivales y pelota quedan.
botonesModo.forEach(b => b.addEventListener('click', () => {
  modo = b.dataset.modo;
  const jugadores = fichas.filter(f => f.tipo === 'j').map(f => f.id);
  jugadores.forEach(id => { delete estado.f[id]; });
  aplicarEquipo();
  ubicarTodas();
  if (docFichas) docFichas.set({ m: modo, f: Object.fromEntries(jugadores.map(id => [id, borrarCampo()])) }, { merge: true }).catch(fallo);
}));

// ── Arranque ─────────────────────────────────────────────
new ResizeObserver(() => {
  stage.classList.add('quieto');
  medir();
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('quieto')));
}).observe(area);
medir();
if (docFichas) escuchar(); else { estadoRed('off'); lineupActual = null; modoLeido = true; aplicarEquipo(); }
