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
// fragmentos de sintaxis del encargo: si aparecen como material, es copia
const FRAGMENTOS = ['3/2 r/6', '1/3 r/1'];

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
  const orden = ['verse', 'chorus', 'bridge', 'pre-chorus'];
  for (let vuelta = 0; dif && vuelta < 40; vuelta++) {
    const s = plan.filter(x => x.nombre === orden[vuelta % orden.length])[Math.floor(vuelta / orden.length) % 2] ||
      plan.find(x => x.nombre === orden[vuelta % orden.length]);
    if (!s) continue;
    const paso = Math.sign(dif) * Math.min(Math.abs(dif), 4);
    if (s.compases + paso >= 2 && s.compases + paso <= 16) { s.compases += paso; dif -= paso; }
  }
  if (dif) plan.at(-1).compases = Math.max(1, plan.at(-1).compases + dif);
  return plan;
}

// ── Lo mecánico se repara (y se anota) ─────────────────────────────────────
const TOKEN = /^(r|-?\d+)([+-]*)(~?)\/(\d+)$/;
function ajustarLargo(notas, largo) {
  // '~2/4' (glide antes del grado) también vale: se normaliza a '2~/4'
  const toks = String(notas).trim().split(/\s+/).map(t => t.replace(/^~(r|-?\d+[+-]*)\//, '$1~/')).filter(t => TOKEN.test(t) && +t.split('/')[1] > 0);
  const out = []; let p = 0;
  for (const t of toks) {
    const d = +t.split('/')[1];
    if (p + d > largo) { if (largo - p > 0) out.push(t.replace(/\/\d+$/, `/${largo - p}`)); p = largo; break; }
    out.push(t); p += d;
  }
  if (p < largo) out.push(`r/${largo - p}`);
  return out.join(' ');
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
  if (S.filter(s => s.nombre === 'verse').some(s => s.melodia && s.respuesta)) err.push('a verse has melodia AND respuesta: leave room for the rapper (at most the respuesta)');
  const fin = S.filter(s => s.final !== 'nada').map(s => s.final);
  for (const f of new Set(fin)) if (fin.filter(x => x === f).length > 2) err.push(`"${f}" used ${fin.filter(x => x === f).length} times: each device at most twice`);
  if (!S.some(s => s.melodia && s.variacion !== 'normal')) err.push('the melody never transforms (variacion): the distinctive trait needs it');
  // originalidad: ni los fragmentos del encargo ni el material de partituras anteriores
  const todo = [...Object.values(P.motivos), ...Object.values(P.bajos)].join(' ');
  for (const f of FRAGMENTOS) if (todo.includes(f)) err.push(`"${f}" is the syntax fragment from the brief: invent your own material`);
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

export function guardarPartitura(slug, P) {
  fs.mkdirSync(DIR_PARTITURAS, { recursive: true });
  fs.writeFileSync(path.join(DIR_PARTITURAS, `${slug}.json`), JSON.stringify(P, null, 2) + '\n');
}
