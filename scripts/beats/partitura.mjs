// Partituras de Thrive escritas por Gemma (Juan, 2026-10-31: "hay que enseñarle a componer a Gemma; no podemos dejar que
// ACE haga los beats porque hace pop"). Gemma no escribe código: escribe la partitura (acordes, motivos, 808, grillas de
// batería, arreglo, kit) y scripts/beats/partitura.py la toca. El encargo baja de ~20K tokens a ~2K y entra entero en la
// GTX 1070. Acá: el esquema que Ollama impone, la reparación de lo mecánico (largos, rangos, nombres; un modelo de 12B
// cuenta mal) y el rechazo de lo musical (cuatro en el piso, 808 sin silencios, hats que nunca cambian, copia).
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
export const ESQUEMA = obj({
  rasgo: str, armonica: bool,
  kit: obj(Object.fromEntries(KNOBS.map(k => [k, num]))),
  melodia_instrumento: { type: 'string', enum: INSTR }, respuesta_instrumento: { type: 'string', enum: INSTR },
  textura_instrumento: { type: 'string', enum: TEXT },
  progresiones: { type: 'array', items: obj({ nombre: str, grados: { type: 'array', items: { type: 'integer', minimum: 1, maximum: 7 }, minItems: 2, maxItems: 8 } }) },
  motivos: { type: 'array', items: obj({ nombre: str, notas: str }) },
  bajos: { type: 'array', items: obj({ nombre: str, notas: str }) },
  // grillas en 4 grupos de 4 (un modelo de 12B no cuenta 16 caracteres seguidos; de a 4 sí)
  baterias: { type: 'array', items: obj({ nombre: str, bombo: grupos('[x.]'), hats: grupos('[xrt.]'), abierto: grupos('[x.]') }) },
  secciones: { type: 'array', items: obj({ nombre: { type: 'string', enum: NOMBRES }, compases: { type: 'integer', minimum: 1, maximum: 16 }, acordes: str, melodia: str,
    variacion: { type: 'string', enum: VARIAC }, respuesta: str, bajo: str, bateria: str, bateria_b: str, textura: bool,
    energia: num, final: { type: 'string', enum: FINALES } }) },
});

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

// ── Lo mecánico se repara (y se anota) ─────────────────────────────────────
const TOKEN = /^(r|-?\d+)([+-]*)(~?)\/(\d+)$/;
function ajustarLargo(notas, largo) {
  // '~2/4' (glide antes del grado) también vale: se normaliza a '2~/4'
  let toks = String(notas).trim().split(/\s+/).map(t => t.replace(/^~(r|-?\d+[+-]*)\//, '$1~/')).filter(t => TOKEN.test(t) && +t.split('/')[1] > 0)
    .map(t => ({ nota: t.split('/')[0], d: +t.split('/')[1] }));
  // si se pasa, se comprime en proporción (antes se cortaba la cola, y con ella los glides que Gemma sí escribía);
  // si aun así no entra, salen primero los silencios y después las últimas notas
  const suma = () => toks.reduce((a, t) => a + t.d, 0);
  if (suma() > largo) {
    const f = largo / suma();
    toks = toks.map(t => ({ ...t, d: Math.max(1, Math.round(t.d * f)) }));
    while (suma() > largo && toks.some(t => t.nota === 'r')) toks.splice(toks.findLastIndex(t => t.nota === 'r'), 1);
    while (suma() > largo) { const t = toks.reduce((a, b) => (b.d > a.d ? b : a)); if (t.d > 1) t.d--; else toks.pop(); }
  }
  if (suma() < largo) toks.push({ nota: 'r', d: largo - suma() });
  return toks.map(t => `${t.nota}/${t.d}`).join(' ');
}
const grilla = (s, ok) => (String(s || '').toLowerCase().replace(/\s+/g, '').replace(new RegExp(`[^${ok}]`, 'g'), '.') + '.'.repeat(16)).slice(0, 16);
const clamp01 = x => Math.min(1, Math.max(0, Number.isFinite(+x) ? +x : 0.5));

export function reparar(j, { bpm, tonalidad, compases, plan }) {
  const notas = [];
  const P = {
    bpm, tonalidad, armonica: !!j.armonica, rasgo: String(j.rasgo || '').trim(),
    kit: Object.fromEntries(KNOBS.map(k => [k, clamp01(j.kit?.[k])])),
    melodia: INSTR.includes(j.melodia_instrumento) ? j.melodia_instrumento : 'campana',
    respuesta: INSTR.includes(j.respuesta_instrumento) ? j.respuesta_instrumento : 'pluck',
    textura: TEXT.includes(j.textura_instrumento) ? j.textura_instrumento : 'pad',
    progresiones: {}, motivos: {}, bajos: {}, baterias: {}, secciones: [],
  };
  for (const p of j.progresiones || []) {
    const g = (Array.isArray(p.grados) ? p.grados : String(p.grados).split(/\s+/)).map(Number).filter(x => x >= 1 && x <= 7);
    if (g.length) P.progresiones[p.nombre] = g.join(' ');
  }
  for (const m of j.motivos || []) { const a = ajustarLargo(m.notas, 32); if (a !== String(m.notas).trim()) notas.push(`motivo ${m.nombre}: largo ajustado a 2 compases`); P.motivos[m.nombre] = a; }
  for (const b of j.bajos || []) { const a = ajustarLargo(b.notas, 16); if (a !== String(b.notas).trim()) notas.push(`bajo ${b.nombre}: largo ajustado a 1 compás`); P.bajos[b.nombre] = a; }
  for (const d of j.baterias || []) P.baterias[d.nombre] = { bombo: grilla(d.bombo, 'x'), hats: grilla(d.hats, 'xrt'), abierto: grilla(d.abierto, 'x') };
  const ref = (tabla, n) => (n && n in tabla ? n : null);
  for (const s of j.secciones || []) {
    let c = Math.max(2, Math.round((+s.compases || 4) / 2) * 2);
    let e = Math.min(5, Math.max(1, Math.round(+s.energia || 3)));
    if (s.nombre === 'chorus') e = Math.max(e, 4);
    if (['intro', 'outro'].includes(s.nombre)) e = Math.min(e, 2);
    P.secciones.push({ nombre: s.nombre, compases: c, acordes: ref(P.progresiones, s.acordes) || Object.keys(P.progresiones)[0],
      melodia: ref(P.motivos, s.melodia), variacion: VARIAC.includes(s.variacion) ? s.variacion : 'normal', respuesta: ref(P.motivos, s.respuesta),
      bajo: ref(P.bajos, s.bajo), bateria: ref(P.baterias, s.bateria), bateria_b: ref(P.baterias, s.bateria_b), textura: !!s.textura, energia: e,
      final: FINALES.includes(s.final) ? s.final : 'nada' });
  }
  // espacio para el rapero: en los versos, como mucho la respuesta (regla de arreglo, se repara sola)
  for (const s of P.secciones) if (s.nombre === 'verse' && s.melodia && s.respuesta) { s.melodia = null; notas.push('verso: sin melodía (lugar para el rap)'); }
  // que se distingan las partes (Juan, 2026-10-31: "no se distinguen las partes de la canción"): el estribillo lleva la
  // melodía y la textura, y la sección que lo precede termina con una transición (corte o redoble, alternados)
  const m1 = Object.keys(P.motivos)[0];
  let alterna = 0;
  P.secciones.forEach((s, i) => {
    if (s.nombre === 'chorus') {
      if (!s.melodia && m1) { s.melodia = m1; notas.push('estribillo: con melodía'); }
      s.textura = true;
      const prev = P.secciones[i - 1];
      if (prev && prev.final === 'nada') { prev.final = alterna++ % 2 ? 'redoble' : 'corte'; notas.push(`${prev.nombre} → estribillo: ${prev.final}`); }
    }
  });
  // compases: si siguió las secciones del plan pero sumó mal, valen los del plan; si la diferencia es chica, se ajusta el outro
  let total = P.secciones.reduce((a, s) => a + s.compases, 0);
  if (total !== compases && plan && plan.length === P.secciones.length && plan.every((p, i) => p.nombre === P.secciones[i].nombre)) {
    P.secciones.forEach((s, i) => { s.compases = plan[i].compases; });
    notas.push(`compases del plan (sumaba ${total})`); total = compases;
  }
  const dif = compases - total;
  if (dif && Math.abs(dif) <= 6 && P.secciones.length) {
    const s = P.secciones.findLast(x => x.nombre === 'outro') || P.secciones.at(-1);
    s.compases = Math.max(2, s.compases + dif); notas.push(`${s.nombre}: ${dif > 0 ? '+' : ''}${dif} compases para llegar a ${compases}`);
  }
  return { P, notas };
}

// ── Lo musical se rechaza (con el motivo exacto, para que Gemma lo corrija) ──
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
export function criticar(P, { compases, slug }) {
  const err = [], S = P.secciones;
  if (!S.length) return ['no sections'];
  if (!S.some(s => s.nombre === 'chorus')) err.push('there is no chorus section');
  const total = S.reduce((a, s) => a + s.compases, 0);
  if (Math.abs(total - compases) > 1) err.push(`the sections add up to ${total} bars; they must add up to exactly ${compases}`);
  if (!Object.keys(P.progresiones).length) err.push('no valid progression (degrees 1–7)');
  if (Object.keys(P.motivos).length < 2) err.push('write at least two motifs (a call for melodia and a response for respuesta)');
  for (const [n, m] of Object.entries(P.motivos)) if (grados(m).length < 3) err.push(`motif ${n} has fewer than 3 notes`);
  const bajos = Object.values(P.bajos);
  if (!bajos.length) err.push('no 808 line (bajos)');
  else {
    if (!bajos.some(b => /(^|\s)r\//.test(b))) err.push('the 808 never rests: add rests (r) so it breathes');
    if (!bajos.some(b => b.includes('~'))) err.push('no glide (~) anywhere in the 808: add one into an accent');
  }
  const bats = Object.entries(P.baterias);
  for (const [n, d] of bats) {
    if ([0, 4, 8, 12].every(i => d.bombo[i] === 'x')) err.push(`drum ${n}: four-on-the-floor kick is pop, not trap`);
    if (!d.bombo.includes('x')) err.push(`drum ${n}: no kick at all`);
  }
  if (new Set(bats.map(([, d]) => d.hats)).size < 2) err.push('the hi-hat grid never changes: write at least two different hats patterns');
  if (!bats.some(([, d]) => /[rt]/.test(d.hats))) err.push('no hi-hat roll (r) or triplet (t) anywhere');
  for (const s of S) {
    if (s.nombre === 'chorus' && !s.bateria) err.push('a chorus has no drums');
    if (s.nombre === 'chorus' && !s.bajo) err.push('a chorus has no 808');
    if (s.compases >= 8 && s.bateria && (!s.bateria_b || P.baterias[s.bateria_b]?.hats === P.baterias[s.bateria]?.hats))
      err.push(`the ${s.nombre} of ${s.compases} bars keeps the same hats all along: set bateria_b with a different hats grid`);
  }
  const batVerso = new Set(S.filter(s => s.nombre === 'verse').flatMap(s => [s.bateria, s.bateria_b]).filter(Boolean));
  const igual = (a, b) => P.baterias[a] && P.baterias[b] && P.baterias[a].bombo === P.baterias[b].bombo && P.baterias[a].hats === P.baterias[b].hats;
  if (S.some(s => s.nombre === 'chorus' && s.bateria && [...batVerso].some(v => v === s.bateria || igual(v, s.bateria))))
    err.push('the chorus uses the same drums as the verse: the chorus needs its own drum grid so the parts are clearly different');
  const fin = S.filter(s => s.final !== 'nada').map(s => s.final);
  for (const f of new Set(fin)) if (fin.filter(x => x === f).length > 2) err.push(`"${f}" used ${fin.filter(x => x === f).length} times: each device at most twice`);
  if (!S.some(s => s.melodia && s.variacion !== 'normal')) err.push('the melody never transforms (variacion): the distinctive trait needs it');
  // originalidad: nada del material de partituras anteriores (el encargo ya no trae fragmentos de ejemplo: Gemma los copiaba)
  for (const a of anteriores(slug)) {
    for (const [n, m] of Object.entries(P.motivos)) for (const [n2, m2] of Object.entries(a.motivos || {}))
      if (parecido(grados(m), grados(m2)) > 0.7) err.push(`motif ${n} is too similar to motif ${n2} of the earlier song "${a.slug}": write a new one`);
    for (const [n, p] of Object.entries(P.progresiones)) for (const p2 of Object.values(a.progresiones || {}))
      if (p === p2 && p.split(' ').length >= 4) err.push(`progression ${n} (${p}) is the same as in "${a.slug}"`);
  }
  return [...new Set(err)];
}

// Resumen de las partituras anteriores para el encargo (que suene distinto: instrumentos y kit)
export function resumenAnteriores(slug) {
  const a = anteriores(slug).slice(-6);
  return a.length ? a.map(x => `"${x.slug}": ${x.melodia}/${x.respuesta}/${x.textura}, kit ${Object.entries(x.kit).map(([k, v]) => `${k} ${v}`).join(', ')}`).join('; ') : 'none yet';
}

export async function pedirPartitura(tema, { compases, plan, correcciones = '' }) {
  const base = fs.readFileSync(path.join(ROOT, 'scripts/beats/thrive-partitura.md'), 'utf8')
    .replace('{{PLAN}}', plan.map(s => `${s.nombre} ${s.compases}`).join(', '))
    .replace('{{TITULO}}', tema.titulo).replace('{{CONCEPTO}}', tema.concepto).replace('{{RASGO}}', tema.rasgo)
    .replace('{{CAPTION}}', tema.captionInstrumental).replace('{{BPM}}', tema.bpm).replace('{{TONALIDAD}}', tema.tonalidad)
    .replace('{{COMPASES}}', compases).replace('{{DURACION}}', tema.duracion).replace('{{ESTRUCTURA}}', tema.estructura.join(', '))
    .replace('{{ANTERIORES}}', resumenAnteriores(tema.slug)).replace('{{CORRECCIONES}}', correcciones);
  const r = await ollama(base, { esquema: ESQUEMA, temperatura: 0.85, contexto: 12288, mantener: true, timeoutMin: 40 });
  return { j: JSON.parse(r.texto), segundos: r.segundos, tokens: r.tokens, tokensEncargo: r.tokensEncargo, encargo: base };
}

// Retoques puntuales (31/10): con la partitura entera y la lista de errores, Gemma devolvía la misma partitura 6 vueltas
// seguidas. Una pregunta chica por elemento ("esta línea de 808, con un glide") la resuelve. Lo que escribe sigue siendo suyo.
const lineaEsq = { type: 'object', properties: { notas: { type: 'string' } }, required: ['notas'] };
const hatsEsq = { type: 'object', properties: { hats: grupos('[xrt.]') }, required: ['hats'] };
async function preguntar(texto, esquema) {
  const r = await ollama(texto, { esquema, temperatura: 0.8, contexto: 4096, mantener: true, timeoutMin: 15 });
  return JSON.parse(r.texto);
}
export async function retocar(P, err, tema, log = () => {}) {
  const ctx = `Trap beat for "${tema.titulo}" (${tema.bpm} BPM, ${tema.tonalidad}): ${tema.captionInstrumental}.`;
  const hechos = [];
  if (err.some(e => /no glide/.test(e))) {
    for (const [n, b] of Object.entries(P.bajos)) {
      const j = await preguntar(`${ctx}\nThis is one bar of the 808 line (tokens DEGREE/LENGTH in sixteenths, lengths add up to 16, r = rest, degree counted from the chord root, 1+ = octave up):\n${b}\nRewrite it so it glides into ONE accent: put ~ right after the degree of the note it slides into (for example 5~/2 or 1+~/3). Keep the rests so it breathes. Lengths must still add up to 16. Answer JSON {"notas": "..."}.`, lineaEsq);
      const nueva = ajustarLargo(j.notas, 16);
      if (nueva.includes('~')) { P.bajos[n] = nueva; hechos.push(`808 ${n} con glide: ${nueva}`); break; }
    }
  }
  const sinCambio = err.some(e => /never changes|keeps the same hats|no hi-hat roll/.test(e));
  if (sinCambio) {
    const fila = h => h.match(/.{4}/g).join(' ');
    const falta = P.secciones.filter(s => s.compases >= 8 && s.bateria && (!s.bateria_b || P.baterias[s.bateria_b]?.hats === P.baterias[s.bateria]?.hats)).map(s => s.bateria);
    const usadas = [...new Set(falta.length ? falta : P.secciones.map(s => s.bateria).filter(Boolean))];
    for (const n of usadas) {
      const d = P.baterias[n];
      const j = await preguntar(`${ctx}\nThis is the hi-hat grid of one bar, 4 groups of 4 sixteenths (x hit, . nothing):\n${fila(d.hats)}\nWrite a VARIATION for the second half of each section: keep the feel, change the pattern, and add a fill with a 1/32 roll (r) and/or a triplet (t) — trap hats. Answer JSON {"hats": "xxxx xxxx xxxx xxxx"} with your own pattern.`, hatsEsq);
      const h = grilla(j.hats, 'xrt');
      if (h !== d.hats && /[rt]/.test(h)) {
        P.baterias[`${n}_b`] = { ...d, hats: h };
        for (const s of P.secciones) if (s.bateria === n && s.compases >= 8) s.bateria_b = `${n}_b`;
        hechos.push(`hats ${n}_b: ${fila(h)}`);
      }
    }
  }
  if (err.some(e => /chorus uses the same drums/.test(e))) {
    const coros = P.secciones.filter(s => s.nombre === 'chorus' && s.bateria), d = P.baterias[coros[0]?.bateria];
    if (d) {
      const fila = h => h.match(/.{4}/g).join(' ');
      const esq = { type: 'object', properties: { bombo: grupos('[x.]'), hats: grupos('[xrt.]') }, required: ['bombo', 'hats'] };
      const j = await preguntar(`${ctx}\nThe verse drums of one bar (4 groups of 4 sixteenths; the clap is already on beat 3):\nkick ${fila(d.bombo)}\nhats ${fila(d.hats)}\nWrite the CHORUS drums: clearly bigger and different from the verse so the listener feels the chorus arrive — a busier kick that pushes the 808 and hats with more motion (1/32 rolls r, triplets t). Not four-on-the-floor. Answer JSON {"bombo": "....", "hats": "...."} in 4 groups of 4.`, esq);
      const nb = { bombo: grilla(j.bombo, 'x'), hats: grilla(j.hats, 'xrt'), abierto: d.abierto };
      if (nb.bombo.includes('x') && !(nb.bombo === d.bombo && nb.hats === d.hats) && ![0, 4, 8, 12].every(i => nb.bombo[i] === 'x')) {
        P.baterias.estribillo = nb; P.baterias.estribillo_b = { ...nb, hats: d.hats === nb.hats ? nb.hats : nb.hats.slice(0, 12) + 'rrtt' };
        for (const s of coros) { s.bateria = 'estribillo'; s.bateria_b = 'estribillo_b'; }
        hechos.push(`batería del estribillo: ${fila(nb.bombo)} / ${fila(nb.hats)}`);
      }
    }
  }
  if (hechos.length) log(`    retoques de Gemma: ${hechos.join(' · ')}`);
  return hechos.length > 0;
}

export function guardarPartitura(slug, P) {
  fs.mkdirSync(DIR_PARTITURAS, { recursive: true });
  fs.writeFileSync(path.join(DIR_PARTITURAS, `${slug}.json`), JSON.stringify(P, null, 2) + '\n');
}
