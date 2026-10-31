// Partituras de Thrive escritas por Gemma (Juan, 2026-10-31: "hay que enseñarle a componer a Gemma; no podemos dejar que
// ACE haga los beats porque hace pop"). Gemma no escribe código: escribe la partitura (acordes, motivos, 808, grillas de
// batería, arreglo, kit) y scripts/beats/partitura.py la toca. El encargo baja de ~20K tokens a ~2K y entra entero en la
// GTX 1070.
// El código NO corrige la música de Gemma (Juan, 2026-10-31: "no lo repares vos, repará lo que falló en Gemma y que Gemma
// lo vuelva a intentar"): detecta cada falla, la ata a una parte concreta y le pregunta a Gemma solo por esa parte, hasta
// que pase. Lo único que hace el código es traducir el formato y armar las secciones según la función de cada parte.
// Las partituras aprobadas quedan en scripts/beats/partituras/<slug>.json: el control de originalidad compara contra ellas.
import fs from 'fs';
import path from 'path';
import { ROOT } from '../lib/env.mjs';
import { ollama } from '../lib/ia.mjs';

export const DIR_PARTITURAS = path.join(ROOT, 'scripts/beats/partituras');
const INSTR = ['campana', 'pluck', 'piano', 'lead', 'vox', 'cuerdas'], TEXT = ['pad', 'coro', 'cuerdas'];
const NOMBRES = ['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'outro'];
const VARIAC = ['normal', 'media', 'invertida', 'retrogrado', 'octava'], FINALES = ['nada', 'corte', 'tapestop', 'redoble'];
const KNOBS = ['bombo_golpe', 'bombo_cola', 'clap_tono', 'hat_metal', 'dist_808', 'sala', 'brillo', 'swing', 'cinta', 'crush'];

const str = { type: 'string' }, num = { type: 'number' }, bool = { type: 'boolean' };
const obj = (props, req = Object.keys(props)) => ({ type: 'object', properties: props, required: req });
const grupos = c => ({ type: 'string', pattern: `^${c}{4} ${c}{4} ${c}{4} ${c}{4}$` });
// Partes con NOMBRE FIJO (31/10): con nombres libres, Gemma metía la grilla de batería en el lugar del nombre ("bateria":
// "x... x... x... x...") y el estribillo quedaba sin batería; las referencias cruzadas son una trampa para un modelo chico.
// Escribe el material de cada parte (verso, estribillo, puente) y las secciones se arman según la función de cada una,
// lo que además garantiza que las partes se distingan.
// Melodías y 808 en GRILLA de casilleros (31/10): con tokens GRADO/LARGO, Gemma no lograba que los largos sumaran
// (escribía 244, 136, 496 semicorcheas en vez de 32, ronda tras ronda, aun con el error delante). Las grillas de batería
// le salían siempre bien: con casilleros fijos el largo es correcto por construcción y no hay nada que sumar.
// Casillero = una semicorchea: 1–7 nota (grado; 8 y 9 = 1 y 2 una octava arriba), - sostiene, . silencio,
// ~ (solo 808) sostiene y desliza hacia la nota siguiente.
const grillaN = (n, c) => ({ type: 'string', pattern: `^${Array(n).fill(`${c}{4}`).join(' ')}$` });
const motivoEsq = grillaN(8, '[1-9.-]'), bajoEsq = grillaN(4, '[1-8.~-]');
const gradosEsq = { type: 'array', items: { type: 'integer', minimum: 1, maximum: 7 }, minItems: 2, maxItems: 8 };
// grillas en 4 grupos de 4 (un modelo de 12B no cuenta 16 caracteres seguidos; de a 4 sí)
const bateriaEsq = () => obj({ bombo: grupos('[x.]'), hats: grupos('[xrt.]'), abierto: grupos('[x.]') });
const arregloEsq = n => ({ type: 'array', minItems: n, maxItems: n,
  items: obj({ seccion: { type: 'string', enum: NOMBRES }, variacion: { type: 'string', enum: VARIAC }, final: { type: 'string', enum: FINALES } }) });
export const esquema = plan => obj({
  rasgo: str, armonica: bool,
  kit: obj(Object.fromEntries(KNOBS.map(k => [k, num]))),
  melodia_instrumento: { type: 'string', enum: INSTR }, respuesta_instrumento: { type: 'string', enum: INSTR },
  textura_instrumento: { type: 'string', enum: TEXT },
  progresion_verso: gradosEsq, progresion_estribillo: gradosEsq,
  llamada: motivoEsq, respuesta: motivoEsq, bajo_verso: bajoEsq, bajo_estribillo: bajoEsq,
  bateria_verso: bateriaEsq(), bateria_verso_b: bateriaEsq(), bateria_estribillo: bateriaEsq(), bateria_estribillo_b: bateriaEsq(), bateria_puente: bateriaEsq(),
  arreglo: arregloEsq(plan.length),
});
// Qué toca cada parte según su función (el material es de Gemma)
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

// ── Lectura: solo traduce el formato (no cambia notas, largos ni grillas) ──
const grilla = s => String(s || '').replace(/\s+/g, '');
// grilla de casilleros → tokens GRADO/LARGO que entiende partitura.py (traducción pura: no cambia ninguna nota)
function aTokens(g) {
  const out = []; let glide = false;
  for (const c of grilla(g)) {
    const ult = out.at(-1);
    if (/[1-9]/.test(c)) { const n = +c; out.push({ n: n > 7 ? `${n - 7}+` : String(n), d: 1, gl: glide }); glide = false; }
    else if (c === '.') { if (ult?.n === 'r') ult.d++; else out.push({ n: 'r', d: 1 }); }
    else { if (ult) ult.d++; else out.push({ n: 'r', d: 1 }); if (c === '~') glide = true; }
  }
  return out.map(t => `${t.n}${t.gl ? '~' : ''}/${t.d}`).join(' ');
}
const fila = h => (h.match(/.{1,4}/g) || []).join(' ');
const largo = s => String(s || '').trim().split(/\s+/).reduce((a, t) => a + (+t.split('/')[1] || 0), 0);
const clamp01 = x => Math.min(1, Math.max(0, Number.isFinite(+x) ? +x : 0.5));
const PARTES_NOTAS = { llamada: ['motivos', 'llamada', 32], respuesta: ['motivos', 'respuesta', 32], bajo_verso: ['bajos', 'verso', 16], bajo_estribillo: ['bajos', 'estribillo', 16] };

export function leer(j, { bpm, tonalidad, plan }) {
  const P = {
    bpm, tonalidad, armonica: !!j.armonica, rasgo: String(j.rasgo || '').trim(),
    kit: Object.fromEntries(KNOBS.map(k => [k, clamp01(j.kit?.[k])])),
    melodia: j.melodia_instrumento, respuesta: j.respuesta_instrumento, textura: j.textura_instrumento,
    progresiones: {}, motivos: {}, bajos: {}, baterias: {}, secciones: [], arreglo: j.arreglo || [], grillas: {},
  };
  for (const k of ['verso', 'estribillo']) if (Array.isArray(j[`progresion_${k}`])) P.progresiones[k] = j[`progresion_${k}`].join(' ');
  for (const k of Object.keys(PARTES_NOTAS)) if (j[k]) ponerNotas(P, k, j[k]);
  for (const k of ['verso', 'verso_b', 'estribillo', 'estribillo_b', 'puente']) {
    const d = j[`bateria_${k}`];
    if (d) P.baterias[k] = { bombo: grilla(d.bombo), hats: grilla(d.hats), abierto: grilla(d.abierto) };
  }
  armarSecciones(P, plan);
  return P;
}
function ponerNotas(P, k, g) {
  const [tabla, clave] = PARTES_NOTAS[k];
  P.grillas[k] = String(g).trim(); P[tabla][clave] = aTokens(g);
}
// secciones = el plan de compases + el arreglo de Gemma (variación y transición) + lo que toca cada parte por su función
export function armarSecciones(P, plan) {
  P.secciones = plan.map((p, i) => {
    const R = ROLES[p.nombre] || ROLES.verse, a = P.arreglo[i] || {};
    return { nombre: p.nombre, compases: p.compases, acordes: R.acordes,
      melodia: R.melodia ? 'llamada' : null, respuesta: R.respuesta ? 'respuesta' : null, variacion: a.variacion || 'normal',
      bajo: R.bajo || null, bateria: R.bateria || null, bateria_b: R.bateria_b || null,
      textura: !!R.textura, energia: R.energia, final: a.final || 'nada' };
  });
}

// ── Control: cada falla atada a una parte, para preguntarle a Gemma solo por esa parte ──
const grados = s => String(s).split(/\s+/).filter(t => !t.startsWith('r')).map(t => t.split('/')[0]);
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
// Devuelve [{parte, error}]: parte = llamada | respuesta | bajo_verso | bajo_estribillo | bateria_<x> | arreglo | todo
export function criticar(P, { slug }) {
  const F = [], mal = (parte, error) => F.push({ parte, error });
  for (const [k, [tabla, clave, debe]] of Object.entries(PARTES_NOTAS)) {
    const s = P[tabla][clave];
    if (!s) { mal(k, `${k} is missing`); continue; }
    if (largo(s) !== debe) mal(k, `${k} lasts ${largo(s)} sixteenths; it must last exactly ${debe}`);
    if (tabla === 'motivos' && grados(s).length < 3) mal(k, `${k} has fewer than 3 notes`);
    if (tabla === 'bajos' && !/(^|\s)r\//.test(s)) mal(k, `${k} never rests: the 808 must breathe — leave silent sixteenths (.) in the grid`);
  }
  if (!Object.values(P.bajos).some(b => b.includes('~'))) mal('bajo_estribillo', 'no glide (~) anywhere in the 808: glide into one accent');
  for (const k of ['verso', 'verso_b', 'estribillo', 'estribillo_b', 'puente']) {
    const d = P.baterias[k];
    if (!d) { mal(`bateria_${k}`, `bateria_${k} is missing`); continue; }
    if ([0, 4, 8, 12].every(i => d.bombo[i] === 'x')) mal(`bateria_${k}`, `bateria_${k}: four-on-the-floor kick is pop, not trap`);
    if (!d.bombo.includes('x') && k !== 'puente') mal(`bateria_${k}`, `bateria_${k} has no kick`);
  }
  const B = P.baterias;
  if (B.verso && B.verso_b && B.verso.hats === B.verso_b.hats) mal('bateria_verso_b', 'bateria_verso_b has the same hats as bateria_verso: it must be a variation with a fill');
  if (B.estribillo && B.estribillo_b && B.estribillo.hats === B.estribillo_b.hats) mal('bateria_estribillo_b', 'bateria_estribillo_b has the same hats as bateria_estribillo: it must be a variation with a fill');
  // el estribillo tiene que ser MÁS que el verso (no solo distinto): más bombos o más golpes de hats
  const golpes = (s, c) => (s.match(new RegExp(`[${c}]`, 'g')) || []).length;
  if (B.verso && B.estribillo && !(golpes(B.estribillo.bombo, 'x') > golpes(B.verso.bombo, 'x') || golpes(B.estribillo.hats, 'xrt') > golpes(B.verso.hats, 'xrt')))
    mal('bateria_estribillo', `bateria_estribillo is not bigger than bateria_verso (verse: ${golpes(B.verso.bombo, 'x')} kicks and ${golpes(B.verso.hats, 'xrt')} hat hits; chorus: ${golpes(B.estribillo.bombo, 'x')} kicks and ${golpes(B.estribillo.hats, 'xrt')} hat hits): the chorus needs MORE kicks or more hat hits`);
  if (!Object.values(B).some(d => /[rt]/.test(d.hats))) mal('bateria_estribillo_b', 'no hi-hat roll (r) or triplet (t) anywhere');
  // arreglo: transición antes de cada estribillo, cada recurso como mucho dos veces, al menos una transformación
  const S = P.secciones;
  const antes = S.map((s, i) => (s.nombre === 'chorus' && i > 0 ? i - 1 : null)).filter(x => x !== null);
  const sin = antes.filter(i => S[i].final === 'nada');
  if (sin.length) mal('arreglo', `entries ${antes.join(', ')} come right before a chorus and each one needs a final (corte, tapestop or redoble); ${sin.join(', ')} still ${sin.length > 1 ? 'have' : 'has'} "nada"`);
  const fin = S.filter(s => s.final !== 'nada').map(s => s.final);
  for (const f of new Set(fin)) if (fin.filter(x => x === f).length > 2) mal('arreglo', `"${f}" is used ${fin.filter(x => x === f).length} times (entries ${S.map((s, i) => (s.final === f ? i : null)).filter(x => x !== null).join(', ')}): use each device at most twice — mix corte, tapestop and redoble`);
  if (!S.some(s => s.melodia && s.variacion !== 'normal')) mal('arreglo', 'the llamada never transforms (variacion): the distinctive trait needs at least one');
  // originalidad: nada del material de partituras anteriores
  for (const a of anteriores(slug)) {
    for (const [n, m] of Object.entries(P.motivos)) for (const m2 of Object.values(a.motivos || {}))
      if (parecido(grados(m), grados(m2)) > 0.7) mal(n, `${n} is too similar to a motif of the earlier song "${a.slug}": write a new one`);
    for (const p of Object.values(P.progresiones)) for (const p2 of Object.values(a.progresiones || {}))
      if (p === p2 && p.split(' ').length >= 4) mal('todo', `a progression (${p}) is the same as in "${a.slug}"`);
  }
  return F;
}

// ── Gemma vuelve a intentar SOLO la parte que falló ─────────────────────────
async function preguntar(texto, esquema, temperatura = 0.8) {
  const r = await ollama(texto, { esquema, temperatura, contexto: 4096, mantener: true, timeoutMin: 15 });
  return JSON.parse(r.texto);
}
// Si devuelve exactamente lo rechazado (31/10: el mismo 808 y la misma batería 3 rondas seguidas), se le avisa y se le
// pregunta otra vez con más temperatura
async function preguntarDistinto(texto, esquema, igual) {
  const j = await preguntar(texto, esquema);
  return igual(j) ? preguntar(`${texto}\nYour last answer was IDENTICAL to the rejected one. Change it so it fixes the problem.`, esquema, 1.1) : j;
}
const SINTAXIS = 'Grid: one character per sixteenth, in groups of 4. A digit starts a note (scale degree 1–7; 8 and 9 = degrees 1 and 2 an octave up), - holds the note, . is silence, ~ (808 only) holds and glides into the next note.';
export async function reintentar(P, fallas, tema, plan, log = () => {}) {
  const ctx = `You are composing a dark trap beat: "${tema.titulo}" (${tema.bpm} BPM, ${tema.tonalidad}) — ${tema.captionInstrumental}.`;
  const porParte = {};
  for (const f of fallas) (porParte[f.parte] ||= []).push(f.error);
  for (const [parte, errores] of Object.entries(porParte)) {
    const que = errores.map(e => `- ${e}`).join('\n');
    if (parte in PARTES_NOTAS) {
      const [tabla] = PARTES_NOTAS[parte], esBajo = tabla === 'bajos';
      const papel = esBajo ? `one bar of the 808 line, 4 groups of 4 (${parte === 'bajo_verso' ? 'verse: sparse' : 'chorus: busier'}); the degree is counted from the chord root of each bar, 8 = root an octave up` : `a 2-bar motif, 8 groups of 4 (${parte === 'llamada' ? 'the call, the main melody' : 'the answer to the call'})`;
      const j = await preguntarDistinto(`${ctx}\nThis is your ${parte}, ${papel}:\n${P.grillas[parte] || '(missing)'}\nIt was rejected:\n${que}\n${SINTAXIS}\nWrite it again. Answer JSON {"notas": "..."}.`,
        obj({ notas: esBajo ? bajoEsq : motivoEsq }), x => grilla(x.notas) === grilla(P.grillas[parte]));
      ponerNotas(P, parte, j.notas);
      log(`      ${parte}: ${P.grillas[parte]}`);
    } else if ((parte === 'bateria_verso_b' || parte === 'bateria_estribillo_b') && P.baterias[parte.slice(8, -2)] && errores.every(e => /same hats/.test(e))) {
      // variación = TU grilla con el último grupo cambiado por un fill (el esquema exige un redoble o un tresillo ahí)
      const base = P.baterias[parte.slice(8, -2)], k = parte.slice(8);
      const fill = '([rt][xrt.]{3}|[xrt.][rt][xrt.]{2}|[xrt.]{2}[rt][xrt.]|[xrt.]{3}[rt])';
      const esq = obj({ hats: { type: 'string', pattern: `^[xrt.]{4} [xrt.]{4} [xrt.]{4} ${fill}$` } });
      const j = await preguntarDistinto(`${ctx}\nThese are your hats for one bar, 4 groups of 4 sixteenths (x hit, r 1/32 roll, t triplet, . nothing):\n${fila(base.hats)}\nWrite the VARIATION that plays in the second half of the section: keep the first three groups or change them a little, and turn the LAST group into a fill with a roll (r) or a triplet (t), different from what is there now. Answer JSON {"hats": "...."}.`,
        esq, x => grilla(x.hats) === base.hats);
      P.baterias[k] = { ...base, hats: grilla(j.hats) };
      log(`      bateria_${k} (variación): hats ${fila(P.baterias[k].hats)}`);
    } else if (parte === 'bateria_estribillo' && P.baterias.verso && errores.every(e => /not bigger/.test(e))) {
      // estribillo más grande: con números concretos y SIN mostrarle una grilla para copiar
      const v = P.baterias.verso, nk = (v.bombo.match(/x/g) || []).length, nh = (v.hats.match(/[xrt]/g) || []).length;
      const j = await preguntarDistinto(`${ctx}\nWrite the CHORUS drums for one bar, 4 groups of 4 sixteenths (kick: x/. ; hats: x hit, r 1/32 roll, t triplet, . nothing; open hat: x/.; the clap is already on beat 3). The verse has ${nk} kicks and ${nh} hat hits; the chorus must hit harder: write a kick with ${nk + 2} x (syncopated, pushing the 808 — never on all four beats) and hats with at least ${nh + 2} hits including rolls. Answer JSON {"bombo": "....", "hats": "....", "abierto": "...."}.`,
        bateriaEsq(), x => grilla(x.bombo) === v.bombo && grilla(x.hats) === v.hats);
      P.baterias.estribillo = { bombo: grilla(j.bombo), hats: grilla(j.hats), abierto: grilla(j.abierto) };
      log(`      bateria_estribillo: kick ${fila(P.baterias.estribillo.bombo)} · hats ${fila(P.baterias.estribillo.hats)}`);
    } else if (parte.startsWith('bateria_')) {
      const k = parte.slice(8), d = P.baterias[k], par = { verso_b: 'verso', estribillo_b: 'estribillo', estribillo: 'verso' }[k];
      const ref = par && P.baterias[par] ? `\nFor reference, bateria_${par}: kick ${fila(P.baterias[par].bombo)} · hats ${fila(P.baterias[par].hats)}` : '';
      const j = await preguntarDistinto(`${ctx}\nThis is your bateria_${k}, one bar in 4 groups of 4 sixteenths (kick: x/. ; hats: x hit, r 1/32 roll, t triplet, . nothing; the clap is already on beat 3):\nkick ${d ? fila(d.bombo) : '(missing)'} · hats ${d ? fila(d.hats) : '(missing)'} · open hat ${d ? fila(d.abierto) : '(missing)'}${ref}\nIt was rejected:\n${que}\nWrite it again. Answer JSON {"bombo": "....", "hats": "....", "abierto": "...."} in 4 groups of 4.`, bateriaEsq(),
        x => d && grilla(x.bombo) === d.bombo && grilla(x.hats) === d.hats);
      P.baterias[k] = { bombo: grilla(j.bombo), hats: grilla(j.hats), abierto: grilla(j.abierto) };
      log(`      bateria_${k}: kick ${fila(P.baterias[k].bombo)} · hats ${fila(P.baterias[k].hats)}`);
    } else if (parte === 'arreglo') {
      // una decisión por vez, con las opciones válidas en el esquema (reescribiendo el arreglo entero arreglaba una cosa y
      // rompía otra). Las decisiones son de Gemma: el código solo le muestra qué opciones quedan.
      P.arreglo = plan.map((p, i) => ({ seccion: p.nombre, variacion: P.arreglo[i]?.variacion || 'normal', final: P.arreglo[i]?.final || 'nada' }));
      const usos = f => P.arreglo.filter(a => a.final === f).length;
      const dispositivos = ['corte', 'tapestop', 'redoble'];
      const resumen = () => plan.map((p, i) => `${i}. ${p.nombre}${P.arreglo[i].final !== 'nada' ? ` → ${P.arreglo[i].final}` : ''}`).join(' · ');
      const antesDeCoro = plan.map((p, i) => (plan[i + 1]?.nombre === 'chorus' ? i : null)).filter(x => x !== null);
      for (let i = 0; i < plan.length; i++) {
        const a = P.arreglo[i], sobra = a.final !== 'nada' && usos(a.final) > 2, falta = antesDeCoro.includes(i) && a.final === 'nada';
        if (!sobra && !falta) continue;
        const opciones = dispositivos.filter(f => usos(f) < 2 && f !== a.final).concat(antesDeCoro.includes(i) ? [] : ['nada']);
        if (!opciones.length) continue;
        const j = await preguntar(`${ctx}\nArrangement so far: ${resumen()}\nChoose the transition at the end of section ${i} (${plan[i].nombre}), ${antesDeCoro.includes(i) ? 'right before a chorus: mark its arrival' : 'not before a chorus'}. Each device (corte, tapestop, redoble) may be used at most twice in the song. Options: ${opciones.join(', ')}. Answer JSON {"final": "..."}.`,
          obj({ final: { type: 'string', enum: opciones } }));
        a.final = j.final;
      }
      if (!P.arreglo.some((a, i) => a.variacion !== 'normal' && ROLES[plan[i].nombre]?.melodia)) {
        const conMelodia = plan.map((p, i) => (ROLES[p.nombre]?.melodia ? i : null)).filter(x => x !== null);
        const j = await preguntar(`${ctx}\nThe main melody never transforms, and the song needs ONE distinctive moment. Sections where the melody plays: ${conMelodia.map(i => `${i} (${plan[i].nombre})`).join(', ')}. Choose the section and the transformation (media = half speed, invertida = mirrored, retrogrado = backwards, octava = an octave up). Answer JSON {"seccion": n, "variacion": "..."}.`,
          obj({ seccion: { type: 'integer', enum: conMelodia }, variacion: { type: 'string', enum: VARIAC.filter(v => v !== 'normal') } }));
        P.arreglo[j.seccion].variacion = j.variacion;
      }
      armarSecciones(P, plan);
      log(`      arreglo: ${P.secciones.map(s => `${s.nombre}${s.variacion !== 'normal' ? ' ' + s.variacion : ''}${s.final !== 'nada' ? ' → ' + s.final : ''}`).join(' · ')}`);
    }
  }
}

// Resumen de las partituras anteriores para el encargo (que suene distinto: instrumentos y kit)
export function resumenAnteriores(slug) {
  const a = anteriores(slug).slice(-6);
  return a.length ? a.map(x => `"${x.slug}": ${x.melodia}/${x.respuesta}/${x.textura}, kit ${Object.entries(x.kit).map(([k, v]) => `${k} ${v}`).join(', ')}`).join('; ') : 'none yet';
}

export async function pedirPartitura(tema, { compases, plan, correcciones = '' }) {
  const base = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-partitura.md'), 'utf8')
    .replace('{{PLAN}}', plan.map(s => `${s.nombre} ${s.compases} bars`).join(', '))
    .replace('{{TITULO}}', tema.titulo).replace('{{CONCEPTO}}', tema.concepto).replace('{{RASGO}}', tema.rasgo)
    .replace('{{CAPTION}}', tema.captionInstrumental).replace('{{BPM}}', tema.bpm).replace('{{TONALIDAD}}', tema.tonalidad)
    .replace('{{COMPASES}}', compases).replace('{{DURACION}}', tema.duracion).replace('{{ESTRUCTURA}}', tema.estructura.join(', '))
    .replace('{{ANTERIORES}}', resumenAnteriores(tema.slug)).replace('{{CORRECCIONES}}', correcciones);
  const r = await ollama(base, { esquema: esquema(plan), temperatura: 0.85, contexto: 12288, mantener: true, timeoutMin: 40 });
  return { j: JSON.parse(r.texto), segundos: r.segundos, tokens: r.tokens, tokensEncargo: r.tokensEncargo, encargo: base };
}

export function guardarPartitura(slug, P) {
  fs.mkdirSync(DIR_PARTITURAS, { recursive: true });
  fs.writeFileSync(path.join(DIR_PARTITURAS, `${slug}.json`), JSON.stringify(P, null, 2) + '\n');
}
