// Partituras de Thrive compuestas por Gemma sobre un MOLDE (Juan, 2026-10-31: "dejá de darle tanta libertad y
// establecele un patrón sobre el cual crear; una estructura que imite tu forma de crear los beats").
//
// Historia: con formato libre (código, después JSON con nombres y largos) Gemma copiaba el ejemplo, no sabía sumar
// duraciones, metía grillas donde iban nombres y, al reintentar, devolvía lo mismo. Le sale bien ELEGIR entre opciones
// concretas. Así que el molde sigue los pasos con que se compone un beat de trap acá:
//   1. armonía: una progresión menor oscura para el verso y otra para el estribillo (vocabulario PROGRESIONES)
//   2. batería: patrones de trap de bombo y hats, ordenados de despojado a cargado; el estribillo más cargado que el
//      verso; la segunda mitad de cada parte = la misma grilla con un fill (redoble o tresillo) en el último tiempo
//   3. 808: sigue al bombo (golpea con él) con la figura de grados que elige Gemma, respira antes de cada golpe y el
//      estribillo termina deslizándose (glide) hacia el compás siguiente
//   4. melodía: una célula rítmica (vocabulario LLAMADAS) + las notas que elige Gemma; la respuesta, otra célula que
//      ocupa los huecos de la llamada (RESPUESTAS)
//   5. un momento distintivo: la sección donde la melodía se transforma y cómo
//   6. transiciones antes de cada estribillo (corte, redoble, tapestop: cada una como mucho dos veces)
//   7. carácter del kit (KITS)
// El vocabulario son técnicas del género (patrones de batería, células rítmicas, progresiones típicas), no material de
// temas anteriores; las notas y las combinaciones son de Gemma. Todo lo elegible es válido de entrada: lo que se controla
// después (estribillo más que verso, progresiones distintas, transiciones, originalidad) se le vuelve a preguntar a Gemma
// con opciones cerradas — el código no corrige su música.
// Las partituras aprobadas quedan en scripts/beats/partituras/<slug>.json: el control de originalidad compara contra ellas.
// Variación dentro del tema (Juan, 2026-11-01: "el ser humano necesita cosas que lo estimulen permanentemente incluso
// dentro de un mismo tema"): el verso 2 no repite la batería del 1 (y puede pasar el clap a 2 y 4), hay un cambio de beat
// (otro kit, otra progresión, otros patrones) en una sección de la segunda mitad, el "silencio" (batería y 808 afuera en
// el último compás) entra como transición, y la intro puede sonar filtrada (radio). Y la melodía no puede ser una escala recta.
import fs from 'fs';
import path from 'path';
import { ROOT } from '../lib/env.mjs';
import { ollama } from '../lib/ia.mjs';

export const DIR_PARTITURAS = path.join(ROOT, 'scripts/beats/partituras');
const INSTR = ['campana', 'pluck', 'piano', 'lead', 'vox', 'cuerdas'], TEXT = ['pad', 'coro', 'cuerdas'];
const NOMBRES = ['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'outro'];
const VARIAC = ['media', 'invertida', 'retrogrado', 'octava'], TRANSICIONES = ['corte', 'redoble', 'tapestop', 'silencio'], CLAPS = ['medio', 'doble'];

// ── Vocabulario del molde ────────────────────────────────────────────────────
// progresiones menores (grados de la escala, un acorde por compás)
const PROGRESIONES = {
  'i-VI-III-VII': '1 6 3 7', 'i-iv-VI-v': '1 4 6 5', 'i-VI-iv-v': '1 6 4 5', 'i-VII-VI-VII': '1 7 6 7', 'i-III-VII-VI': '1 3 7 6',
  'VI-VII-i-i': '6 7 1 1', 'i-i-VI-VI': '1 1 6 6', 'i-iv-i-VI': '1 4 1 6', 'i-v-VI-iv': '1 5 6 4', 'iv-VI-i-VII': '4 6 1 7',
};
// bombos de medio tiempo (nunca en el 3, donde va el clap; nunca en los cuatro tiempos), de menos a más
const BOMBOS = {
  suelto: 'x.........x.....', rebote: 'x......x..x.....', arrastre: 'x.....x...x.....', sincopa: 'x..x......x..x..',
  empuje: 'x..x...x..x.x...', tren: 'x..x.x....x.xx..', galope: 'xx....x...xx..x.',
};
const HATS = {
  corcheas_respira: 'x.x.x...x.x.x...', corcheas: 'x.x.x.x.x.x.x.x.', semis_respira: 'x.xxx.x.x.xxx.x.', rodante: 'x.xrx.x.x.xrx.xt',
  galope: 'xx.xxx.xxx.xxx.x', semis: 'xxxxxxxxxxxxxxxx',
};
const FILLS = { redoble: 'rrrr', medio_redoble: 'x.rr', tresillo: 'tttt', redoble_tresillo: 'rrtt', tresillo_tardio: '..tt', picado: 'xrxr' };
const ABIERTOS = { nada: '................', final: '..............x.', contratiempo: '......x.......x.' };
// células de 2 compases (32 semicorcheas): o = ataque, - = sostiene, . = silencio
const LLAMADAS = {
  suspiro: 'o-------o---o---................', pregunta: 'o--.o--.o-------........o--.o---', escalera: 'o.o.o.o-----....o.o.o-----......',
  eco: 'o---o---........o---o---........', arrastre: 'o-----o-o-------....o-----o-----', golpe: 'o.....o.....o...o---------......',
};
const RESPUESTAS = {
  contesta: '........o-o-o---........o-o-----', sombra: '....o---....o-------....o-------', cierre: '................o.o.o-o---------',
  picado: '........o.o.o.o.........o.o.o...',
};
const KITS = {
  pesado: { bombo_golpe: 0.9, bombo_cola: 0.7, clap_tono: 0.3, hat_metal: 0.5, dist_808: 0.8, sala: 0.4, brillo: 0.3, swing: 0.15, cinta: 0.2, crush: 0.1 },
  nocturno: { bombo_golpe: 0.6, bombo_cola: 0.5, clap_tono: 0.5, hat_metal: 0.4, dist_808: 0.4, sala: 0.8, brillo: 0.5, swing: 0.25, cinta: 0.35, crush: 0 },
  crudo: { bombo_golpe: 0.8, bombo_cola: 0.4, clap_tono: 0.6, hat_metal: 0.8, dist_808: 0.9, sala: 0.3, brillo: 0.6, swing: 0.1, cinta: 0.1, crush: 0.35 },
  frio: { bombo_golpe: 0.5, bombo_cola: 0.6, clap_tono: 0.7, hat_metal: 0.7, dist_808: 0.5, sala: 0.6, brillo: 0.7, swing: 0.2, cinta: 0.2, crush: 0.15 },
  hipnotico: { bombo_golpe: 0.7, bombo_cola: 0.8, clap_tono: 0.4, hat_metal: 0.6, dist_808: 0.6, sala: 0.7, brillo: 0.35, swing: 0.3, cinta: 0.45, crush: 0.05 },
};
const golpes = s => (s.match(/[xrt]/g) || []).length;
for (const [n, r] of Object.entries({ ...LLAMADAS, ...RESPUESTAS })) if (r.length !== 32) throw new Error(`célula ${n}: ${r.length} casilleros`);
for (const [n, b] of Object.entries({ ...BOMBOS, ...HATS })) if (b.length !== 16) throw new Error(`patrón ${n}: ${b.length} casilleros`);

// ── Esquema: todo son elecciones; las notas, números del 1 al 9 ──────────────
const str = { type: 'string' }, bool = { type: 'boolean' };
const obj = (props, req = Object.keys(props)) => ({ type: 'object', properties: props, required: req });
const de = o => ({ type: 'string', enum: Object.keys(o) });
const grado = { type: 'integer', minimum: 1, maximum: 9 };
const parteEsq = obj({ bombo: de(BOMBOS), hats: de(HATS), fill: de(FILLS), abierto: de(ABIERTOS),
  figura_808: { type: 'array', items: { type: 'integer', enum: [1, 3, 4, 5, 7, 8] }, minItems: 2, maxItems: 4 } });
const melodiaEsq = r => obj({ ritmo: de(r), notas: { type: 'array', items: grado, minItems: 8, maxItems: 8 } });
const conMelodia = plan => plan.map((p, i) => (ROLES[p.nombre]?.melodia ? i : null)).filter(x => x !== null);
export const esquema = plan => obj({
  rasgo: str, armonica: bool, kit: de(KITS),
  melodia_instrumento: { type: 'string', enum: INSTR }, respuesta_instrumento: { type: 'string', enum: INSTR }, textura_instrumento: { type: 'string', enum: TEXT },
  progresion_verso: de(PROGRESIONES), progresion_estribillo: de(PROGRESIONES),
  verso: parteEsq, estribillo: parteEsq, puente: obj({ bombo: de(BOMBOS), hats: de(HATS) }),
  llamada: melodiaEsq(LLAMADAS), respuesta: melodiaEsq(RESPUESTAS),
  momento: obj({ seccion: { type: 'integer', enum: conMelodia(plan) }, variacion: { type: 'string', enum: VARIAC } }),
  transiciones: { type: 'array', items: { type: 'string', enum: TRANSICIONES }, minItems: coros(plan), maxItems: coros(plan) },
  intro_radio: bool,
  verso2: obj({ bombo: de(BOMBOS), hats: de(HATS), clap: { type: 'string', enum: CLAPS } }),
  cambio: obj({ seccion: { type: 'integer', enum: paraCambio(plan) }, kit: de(KITS), progresion: de(PROGRESIONES), bombo: de(BOMBOS), hats: de(HATS), clap: { type: 'string', enum: CLAPS } }),
});
// el cambio de beat va en la segunda mitad: el puente, un estribillo que no sea el primero, o el outro
const paraCambio = plan => { const primerCoro = plan.findIndex(p => p.nombre === 'chorus');
  const r = plan.map((p, i) => (i > primerCoro && i >= plan.length / 2 && ['bridge', 'chorus', 'outro'].includes(p.nombre) ? i : null)).filter(x => x !== null);
  return r.length ? r : [plan.length - 1]; };
const coros = plan => plan.filter((p, i) => i > 0 && p.nombre === 'chorus').length;

// Qué toca cada parte según su función
const ROLES = {
  intro: { melodia: true, textura: true, acordes: 'verso', energia: 1 },
  verse: { respuesta: true, bajo: 'verso', bateria: 'verso', bateria_b: 'verso_b', acordes: 'verso', energia: 3 },
  'pre-chorus': { melodia: true, bajo: 'verso', bateria: 'puente', textura: true, acordes: 'verso', energia: 3 },
  chorus: { melodia: true, respuesta: true, bajo: 'estribillo', bateria: 'estribillo', bateria_b: 'estribillo_b', textura: true, acordes: 'estribillo', energia: 5 },
  bridge: { melodia: true, bateria: 'puente', textura: true, acordes: 'estribillo', energia: 2 },
  outro: { melodia: true, textura: true, acordes: 'verso', energia: 1 },
};

// Compases por sección que suman exactamente el total (la aritmética la hace el código, no el modelo)
export function planCompases(estructura, compases) {
  const base = { intro: 4, verse: 8, 'pre-chorus': 4, chorus: 8, bridge: 4, outro: 4 };
  const plan = estructura.map(n => ({ nombre: NOMBRES.includes(n) ? n : 'verse', compases: base[n] || 4 }));
  let dif = compases - plan.reduce((a, s) => a + s.compases, 0);
  // para alargar, los versos primero; para acortar, se recorta desde el final (último estribillo, intro, pre) y los versos
  // quedan enteros: son los que cuentan la historia
  const orden = dif > 0 ? ['verse', 'chorus'] : ['chorus', 'intro', 'pre-chorus', 'outro', 'bridge', 'chorus', 'verse'];
  for (let vuelta = 0; dif && vuelta < 60; vuelta++) {
    const candidatas = plan.filter(x => x.nombre === orden[vuelta % orden.length]);
    if (dif < 0) candidatas.reverse();
    const s = candidatas[Math.floor(vuelta / orden.length) % Math.max(1, candidatas.length)];
    if (!s) continue;
    const paso = Math.sign(dif) * Math.min(Math.abs(dif), dif > 0 ? 4 : 2);
    if (s.compases + paso >= 2 && s.compases + paso <= 16) { s.compases += paso; dif -= paso; }
  }
  if (dif) plan.at(-1).compases = Math.max(1, plan.at(-1).compases + dif);
  return plan;
}

// ── Del molde a la partitura que toca partitura.py (traducción: no decide nada musical) ──
// grilla de casilleros (1–9 nota, - sostiene, . silencio, ~ sostiene y desliza) → tokens GRADO/LARGO
function aTokens(g) {
  const out = []; let glide = false;
  for (const c of g) {
    const ult = out.at(-1);
    if (/[1-9]/.test(c)) { const n = +c; out.push({ n: n > 7 ? `${n - 7}+` : String(n), d: 1, gl: glide }); glide = false; }
    else if (c === '.') { if (ult?.n === 'r') ult.d++; else out.push({ n: 'r', d: 1 }); }
    else { if (ult) ult.d++; else out.push({ n: 'r', d: 1 }); if (c === '~') glide = true; }
  }
  return out.map(t => `${t.n}${t.gl ? '~' : ''}/${t.d}`).join(' ');
}
// célula rítmica + notas de Gemma → grilla
const melodia = (ritmo, notas) => { let k = 0; return [...ritmo].map(c => (c === 'o' ? String(notas[k++ % notas.length]) : c)).join(''); };
// 808 sobre los golpes del bombo: cada nota dura hasta un casillero antes del golpe siguiente (respira); con glide, la
// penúltima se sostiene sin respirar y desliza hacia el último golpe del compás (el acento)
function linea808(bombo, figura, glide) {
  const pos = [...bombo].map((c, i) => (c === 'x' ? i : null)).filter(x => x !== null), g = Array(16).fill('.');
  pos.forEach((p, i) => {
    const fin = i + 1 < pos.length ? pos[i + 1] - 1 : 15;
    g[p] = String(figura[i % figura.length]);
    const desliza = glide && i === pos.length - 2;
    for (let k = p + 1; k < (desliza ? pos[i + 1] : fin); k++) g[k] = desliza ? '~' : '-';
  });
  return g.join('');
}
const conFill = (hats, fill) => hats.slice(0, 12) + FILLS[fill];

export function leer(j, { bpm, tonalidad, plan }) {
  const P = {
    bpm, tonalidad, armonica: !!j.armonica, rasgo: String(j.rasgo || '').trim(), kit: { ...KITS[j.kit] }, molde: j,
    melodia: j.melodia_instrumento, respuesta: j.respuesta_instrumento, textura: j.textura_instrumento,
    progresiones: { verso: PROGRESIONES[j.progresion_verso], estribillo: PROGRESIONES[j.progresion_estribillo] },
    motivos: { llamada: aTokens(melodia(LLAMADAS[j.llamada.ritmo], j.llamada.notas)), respuesta: aTokens(melodia(RESPUESTAS[j.respuesta.ritmo], j.respuesta.notas)) },
    bajos: {
      verso: aTokens(linea808(BOMBOS[j.verso.bombo], j.verso.figura_808, false)),
      estribillo: aTokens(linea808(BOMBOS[j.estribillo.bombo], j.estribillo.figura_808, true)),   // el estribillo siempre desliza
    },
    baterias: {}, secciones: [],
  };
  for (const k of ['verso', 'estribillo']) {
    const p = j[k];
    P.baterias[k] = { bombo: BOMBOS[p.bombo], hats: HATS[p.hats], abierto: ABIERTOS[p.abierto] };
    P.baterias[`${k}_b`] = { ...P.baterias[k], hats: conFill(HATS[p.hats], p.fill) };
  }
  P.baterias.puente = { bombo: BOMBOS[j.puente.bombo], hats: HATS[j.puente.hats], abierto: ABIERTOS.nada };
  P.baterias.verso2 = { bombo: BOMBOS[j.verso2.bombo], hats: HATS[j.verso2.hats], abierto: ABIERTOS[j.verso.abierto] };
  P.baterias.verso2_b = { ...P.baterias.verso2, hats: conFill(HATS[j.verso2.hats], j.verso.fill) };
  P.bajos.verso2 = aTokens(linea808(BOMBOS[j.verso2.bombo], j.verso.figura_808, false));
  P.baterias.cambio = { bombo: BOMBOS[j.cambio.bombo], hats: HATS[j.cambio.hats], abierto: ABIERTOS.contratiempo };
  P.bajos.cambio = aTokens(linea808(BOMBOS[j.cambio.bombo], j.estribillo.figura_808, true));
  P.progresiones.cambio = PROGRESIONES[j.cambio.progresion];
  P.kits = { cambio: { ...KITS[j.cambio.kit] } };
  armarSecciones(P, plan);
  return P;
}
export function armarSecciones(P, plan) {
  const j = P.molde;
  let c = 0, versos = 0;
  P.secciones = plan.map((p, i) => {
    const R = ROLES[p.nombre] || ROLES.verse, siguienteCoro = plan[i + 1]?.nombre === 'chorus';
    const S = { nombre: p.nombre, compases: p.compases, acordes: R.acordes,
      melodia: R.melodia ? 'llamada' : null, respuesta: R.respuesta ? 'respuesta' : null,
      variacion: j.momento?.seccion === i ? j.momento.variacion : 'normal',
      bajo: R.bajo || null, bateria: R.bateria || null, bateria_b: R.bateria_b || null, textura: !!R.textura, energia: R.energia,
      final: siguienteCoro ? (j.transiciones?.[c++] || 'corte') : 'nada' };
    if (p.nombre === 'verse' && versos++ >= 1) Object.assign(S, { bateria: 'verso2', bateria_b: 'verso2_b', bajo: 'verso2', clap: j.verso2?.clap || 'medio' });
    if (p.nombre === 'intro' && j.intro_radio) S.filtro = 'radio';
    if (j.cambio?.seccion === i) Object.assign(S, { kit: 'cambio', acordes: 'cambio', bateria: 'cambio', bateria_b: null, bajo: 'cambio', clap: j.cambio.clap, energia: Math.max(R.energia, 4) });
    return S;
  });
}

// ── Controles (cada uno se le vuelve a preguntar a Gemma con opciones cerradas) ──
const nums = s => String(s).split(/\s+/).filter(t => !t.startsWith('r')).map(t => t.split('/')[0]);
const parecido = (a, b) => {   // proporción de la secuencia de notas compartida en orden (LCS)
  if (!a.length || !b.length) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let k = 1; k <= b.length; k++) dp[i][k] = a[i - 1] === b[k - 1] ? dp[i - 1][k - 1] + 1 : Math.max(dp[i - 1][k], dp[i][k - 1]);
  return dp[a.length][b.length] / Math.max(a.length, b.length);
};
export function anteriores(excepto) {
  if (!fs.existsSync(DIR_PARTITURAS)) return [];
  return fs.readdirSync(DIR_PARTITURAS).filter(f => f.endsWith('.json') && f !== `${excepto}.json`)
    .map(f => ({ slug: f.slice(0, -5), ...JSON.parse(fs.readFileSync(path.join(DIR_PARTITURAS, f), 'utf8')) }));
}
export function criticar(P, { slug }) {
  const F = [], mal = (parte, error) => F.push({ parte, error }), j = P.molde;
  if (golpes(BOMBOS[j.estribillo.bombo]) <= golpes(BOMBOS[j.verso.bombo]) && golpes(HATS[j.estribillo.hats]) <= golpes(HATS[j.verso.hats]))
    mal('estribillo', 'the chorus drums are not bigger than the verse drums');
  if (j.progresion_estribillo === j.progresion_verso) mal('progresion_estribillo', 'the chorus uses the same progression as the verse');
  for (const t of TRANSICIONES) if ((j.transiciones || []).filter(x => x === t).length > 2) mal('transiciones', `"${t}" is used more than twice`);
  if (new Set(j.llamada.notas).size < 3) mal('llamada', 'the call melody uses fewer than 3 different notes');
  // escala recta: 5 pasos seguidos de a un grado en la misma dirección (1 2 3 4 5 6) suena a ejercicio, no a melodía
  const escala = n => { let run = 0, dir = 0; for (let i = 1; i < n.length; i++) { const d = n[i] - n[i - 1]; if (Math.abs(d) === 1 && d === dir) run++; else { run = Math.abs(d) === 1 ? 1 : 0; dir = d; } if (run >= 4) return true; } return false; };
  if (escala(j.llamada.notas)) mal('llamada', 'the call melody is a straight scale run (step by step in one direction): a melody needs leaps, repeated notes and turns');
  if (escala(j.respuesta.notas)) mal('respuesta', 'the answer melody is a straight scale run: it needs leaps, repeated notes and turns');
  if (j.verso2.bombo === j.verso.bombo && j.verso2.hats === j.verso.hats && j.verso2.clap !== 'doble') mal('verso2', 'verse 2 drums are a copy of verse 1');
  if (j.cambio.kit === j.kit) mal('cambio', 'the beat switch uses the same kit as the rest of the song');
  if ([j.progresion_verso, j.progresion_estribillo].includes(j.cambio.progresion)) mal('cambio', 'the beat switch uses a progression the song already has');
  if (j.cambio.bombo === j.estribillo.bombo && j.cambio.hats === j.estribillo.hats) mal('cambio', 'the beat switch drums are the same as the chorus');
  for (const a of anteriores(slug)) {
    if (a.motivos?.llamada && parecido(nums(P.motivos.llamada), nums(a.motivos.llamada)) > 0.7) mal('llamada', `the call melody is too similar to the one of the earlier song "${a.slug}"`);
    if (a.molde && a.molde.progresion_verso === j.progresion_verso && a.molde.progresion_estribillo === j.progresion_estribillo) mal('progresion_estribillo', `the same pair of progressions as the earlier song "${a.slug}"`);
  }
  return F;
}

async function preguntar(texto, esquema, temperatura = 0.8) {
  const r = await ollama(texto, { esquema, temperatura, contexto: 4096, mantener: true, timeoutMin: 15 });
  return JSON.parse(r.texto);
}
export async function reintentar(P, fallas, tema, plan, log = () => {}) {
  const ctx = `You are composing a dark trap beat: "${tema.titulo}" (${tema.bpm} BPM, ${tema.tonalidad}) — ${tema.captionInstrumental}.`;
  const j = P.molde, partes = new Set(fallas.map(f => f.parte));
  if (partes.has('estribillo')) {
    // opciones: solo patrones más cargados que los del verso
    const bv = golpes(BOMBOS[j.verso.bombo]), hv = golpes(HATS[j.verso.hats]);
    const bombos = Object.keys(BOMBOS).filter(k => golpes(BOMBOS[k]) > bv), hats = Object.keys(HATS).filter(k => golpes(HATS[k]) > hv);
    const r = await preguntar(`${ctx}\nThe verse drums are kick "${j.verso.bombo}" and hats "${j.verso.hats}". The chorus must hit harder. Choose the chorus kick and hats from these busier patterns.\nKicks: ${bombos.map(k => `${k} ${BOMBOS[k]}`).join(' · ') || '(none: keep the hats busier)'}\nHats: ${hats.map(k => `${k} ${HATS[k]}`).join(' · ')}\nAnswer JSON {"bombo": "...", "hats": "..."}.`,
      obj({ bombo: { type: 'string', enum: bombos.length ? bombos : Object.keys(BOMBOS) }, hats: { type: 'string', enum: hats.length ? hats : Object.keys(HATS) } }));
    Object.assign(j.estribillo, r);
    log(`      estribillo: bombo ${r.bombo}, hats ${r.hats}`);
  }
  if (partes.has('progresion_estribillo')) {
    const usadas = new Set(anteriores(tema.slug).filter(a => a.molde?.progresion_verso === j.progresion_verso).map(a => a.molde.progresion_estribillo));
    const opciones = Object.keys(PROGRESIONES).filter(k => k !== j.progresion_verso && !usadas.has(k));
    const r = await preguntar(`${ctx}\nThe verse progression is ${j.progresion_verso}. Choose a DIFFERENT progression for the chorus, one that lifts it. Options: ${opciones.join(', ')}. Answer JSON {"progresion": "..."}.`,
      obj({ progresion: { type: 'string', enum: opciones } }));
    j.progresion_estribillo = r.progresion;
    log(`      progresión del estribillo: ${r.progresion}`);
  }
  if (partes.has('transiciones')) {
    const nuevas = [];
    for (let i = 0; i < j.transiciones.length; i++) {
      const opciones = TRANSICIONES.filter(t => nuevas.filter(x => x === t).length < 2);
      const r = await preguntar(`${ctx}\nChoose the transition that announces chorus ${i + 1} of ${j.transiciones.length}${nuevas.length ? ` (before: ${nuevas.join(', ')})` : ''}. Each one may be used at most twice. Options: ${opciones.join(', ')}. Answer JSON {"transicion": "..."}.`,
        obj({ transicion: { type: 'string', enum: opciones } }));
      nuevas.push(r.transicion);
    }
    j.transiciones = nuevas;
    log(`      transiciones: ${nuevas.join(', ')}`);
  }
  if (partes.has('verso2')) {
    const r = await preguntar(`${ctx}\nVerse 1 drums: kick "${j.verso.bombo}", hats "${j.verso.hats}". Verse 2 must feel different (a new pocket for the rapper): choose its kick and hats (not both the same as verse 1), and the clap: "medio" (on beat 3, half-time) or "doble" (on 2 and 4, feels twice as fast).\nKicks: ${Object.keys(BOMBOS).join(', ')}\nHats: ${Object.keys(HATS).join(', ')}\nAnswer JSON {"bombo": "...", "hats": "...", "clap": "..."}.`,
      obj({ bombo: de(BOMBOS), hats: de(HATS), clap: { type: 'string', enum: CLAPS } }), 1.0);
    j.verso2 = r;
    log(`      verso 2: bombo ${r.bombo}, hats ${r.hats}, clap ${r.clap}`);
  }
  if (partes.has('cambio')) {
    const kits = Object.keys(KITS).filter(k => k !== j.kit), progs = Object.keys(PROGRESIONES).filter(k => ![j.progresion_verso, j.progresion_estribillo].includes(k));
    const r = await preguntar(`${ctx}\nThe BEAT SWITCH (one section of the second half that suddenly becomes another beat) was rejected: ${fallas.filter(f => f.parte === 'cambio').map(f => f.error).join('; ')}. The song uses kit "${j.kit}", progressions ${j.progresion_verso} / ${j.progresion_estribillo}, chorus drums ${j.estribillo.bombo} / ${j.estribillo.hats}. Choose a switch that sounds like a different beat.\nKits: ${kits.join(', ')}\nProgressions: ${progs.join(', ')}\nKicks: ${Object.keys(BOMBOS).join(', ')}\nHats: ${Object.keys(HATS).join(', ')}\nAnswer JSON {"kit": "...", "progresion": "...", "bombo": "...", "hats": "...", "clap": "medio|doble"}.`,
      obj({ kit: { type: 'string', enum: kits }, progresion: { type: 'string', enum: progs }, bombo: de(BOMBOS), hats: de(HATS), clap: { type: 'string', enum: CLAPS } }), 1.0);
    Object.assign(j.cambio, r);
    log(`      cambio de beat: kit ${r.kit}, ${r.progresion}, ${r.bombo}/${r.hats}, clap ${r.clap}`);
  }
  if (partes.has('respuesta')) {
    const r = await preguntar(`${ctx}\nYour answer melody (rhythm "${j.respuesta.ritmo}", degrees ${j.respuesta.notas.join(' ')}) was rejected: it is a straight scale run. Write 8 NEW scale degrees (1–7; 8 and 9 = 1 and 2 an octave up) with leaps, a repeated note and a turn. Answer JSON {"notas": [..8 numbers..]}.`,
      obj({ notas: { type: 'array', items: grado, minItems: 8, maxItems: 8 } }), 1.0);
    j.respuesta.notas = r.notas;
    log(`      respuesta: ${r.notas.join(' ')}`);
  }
  if (partes.has('llamada')) {
    const r = await preguntar(`${ctx}\nYour call melody (rhythm "${j.llamada.ritmo}", scale degrees ${j.llamada.notas.join(' ')}) was rejected: ${fallas.filter(f => f.parte === 'llamada').map(f => f.error).join('; ')}. Write 8 NEW scale degrees (1–7; 8 and 9 = 1 and 2 an octave up) for the same rhythm: a line with a clear shape — leaps, a repeated note, a turn; never a straight scale. Answer JSON {"notas": [..8 numbers..]}.`,
      obj({ notas: { type: 'array', items: grado, minItems: 8, maxItems: 8 } }), 1.0);
    j.llamada.notas = r.notas;
    log(`      llamada: ${r.notas.join(' ')}`);
  }
  // se rearma todo lo que sale del molde
  Object.assign(P, leer(j, { bpm: P.bpm, tonalidad: P.tonalidad, plan }));
}

// El vocabulario, para el encargo
export function vocabulario() {
  const lista = (o, f = v => v) => Object.entries(o).map(([k, v]) => `${k} ${f(v)}`).join(' · ');
  return [
    `Progressions (verse / chorus): ${Object.keys(PROGRESIONES).join(', ')}`,
    `Kicks, from sparse to busy (16 sixteenths, x = kick): ${lista(BOMBOS)}`,
    `Hats, from sparse to busy (x hit, r 1/32 roll, t triplet): ${lista(HATS)}`,
    `Fills for the second half of each part (replace the last beat of the hats): ${lista(FILLS)}`,
    `Open hat: ${Object.keys(ABIERTOS).join(', ')}`,
    `Call rhythms, 2 bars (o = a note, - = held, . = silence): ${lista(LLAMADAS)}`,
    `Answer rhythms (they fill the gaps of the call): ${lista(RESPUESTAS)}`,
    `Kit character: ${Object.keys(KITS).join(', ')}`,
    `Transitions before a chorus: corte (stutter cut), redoble (snare roll), tapestop (the tape slows down), silencio (drums and 808 drop out for the last bar: the voice alone, then the chorus slams in)`,
    `Clap: medio (on beat 3, half-time) or doble (on 2 and 4: same tempo, feels twice as fast)`,
  ].join('\n');
}
export function resumenAnteriores(slug) {
  const a = anteriores(slug).slice(-6).filter(x => x.molde);
  return a.length ? a.map(x => `"${x.slug}": kit ${x.molde.kit}, ${x.melodia}/${x.respuesta}/${x.textura}, verse ${x.molde.progresion_verso}, chorus ${x.molde.progresion_estribillo}, call ${x.molde.llamada.ritmo}`).join('; ') : 'none yet';
}

export async function pedirPartitura(tema, { compases, plan, correcciones = '' }) {
  const base = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-partitura.md'), 'utf8')
    .replace('{{PLAN}}', plan.map((s, i) => `${i}. ${s.nombre} (${s.compases} bars)`).join(', '))
    .replace('{{TITULO}}', tema.titulo).replace('{{CONCEPTO}}', tema.concepto).replace('{{RASGO}}', tema.rasgo)
    .replace('{{CAPTION}}', tema.captionInstrumental).replace('{{BPM}}', tema.bpm).replace('{{TONALIDAD}}', tema.tonalidad)
    .replace('{{DURACION}}', tema.duracion).replace('{{VOCABULARIO}}', vocabulario())
    .replace('{{ANTERIORES}}', resumenAnteriores(tema.slug)).replace('{{CORRECCIONES}}', correcciones);
  const r = await ollama(base, { esquema: esquema(plan), temperatura: 0.85, contexto: 12288, mantener: true, timeoutMin: 40 });
  return { j: JSON.parse(r.texto), segundos: r.segundos, tokens: r.tokens, tokensEncargo: r.tokensEncargo, encargo: base };
}

export function guardarPartitura(slug, P) {
  fs.mkdirSync(DIR_PARTITURAS, { recursive: true });
  fs.writeFileSync(path.join(DIR_PARTITURAS, `${slug}.json`), JSON.stringify(P, null, 2) + '\n');
}
