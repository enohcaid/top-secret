// Reconocer equipos aunque estén mal escritos: "infinix", "sub21", "chaca", "IACC", "4bdo sanjorge"…
// Combina: alias conocidos, coincidencia del nombre compacto (sin espacios), y palabras parecidas
// (distancia de edición chica según el largo).

const RUIDO = new Set(['esports', 'esport', 'e', 'sports', 'sport', 'esp', 'fc', 'cf', 'club', 'de', 'la', 'el', 'los', 'las', 'del', 'gaming', 'team', 'atletico', 'at', 'ca', 'cd', 'eq', 'equipo']);

export function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/e[-\s]?sports?/g, ' esports ')
    .replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
const palabras = s => norm(s).split(' ').filter(w => w && !RUIDO.has(w));
const compacto = s => palabras(s).join('');

function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const parecida = (a, b) => {
  if (a === b) return true;
  if (/^\d+$/.test(a) || /^\d+$/.test(b)) return false;              // los números tienen que ser iguales
  const L = Math.max(a.length, b.length);
  if (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;   // abreviaturas: "chaca"
  return L >= 4 && lev(a, b) <= (L >= 8 ? 2 : 1);
};

/**
 * equipos: [{ nombre, div, logo }]; alias: { "texto alias": "Nombre oficial" }
 * Devuelve el mejor equipo con { score } (0..1) o null.
 */
export function buscarEquipo(texto, equipos, alias = {}) {
  const t = norm(texto), tc = t.replace(/ /g, ''), tw = palabras(texto);
  // 1) Alias: si el texto contiene un alias conocido, gana.
  for (const [a, nombre] of Object.entries(alias).sort((x, y) => y[0].length - x[0].length)) {
    const an = norm(a);
    if (an && (` ${t} `.includes(` ${an} `) || (an.length >= 5 && tc.includes(an.replace(/ /g, ''))))) {
      const e = equipos.find(x => x.nombre === nombre) || { nombre, div: '?', logo: null };
      return { ...e, score: 1, via: 'alias' };
    }
  }
  let mejor = null; const todos = [];
  for (const e of equipos) {
    const ew = palabras(e.nombre), ec = compacto(e.nombre);
    if (!ew.length) continue;
    let score;
    if (ec.length >= 4 && tc.includes(ec)) score = 1;                  // "sub21cf" dentro de "somossub21cf"
    else {
      const hits = ew.filter(w => tw.some(x => parecida(x, w))).length;
      score = hits / ew.length;
      if (ew.length === 1 && hits === 1 && ew[0].length < 4) score = 0.5;   // palabra única muy corta: no alcanza
    }
    if (score >= 0.5) todos.push({ ...e, score });
    if (score >= 0.66 && (!mejor || score > mejor.score)) mejor = { ...e, score };
  }
  // Empate entre equipos distintos (ej. "san jorge": 4BDO San Jorge / San Jorge de Tucuman): no adivinar.
  const empatados = todos.filter(x => mejor && x.score >= mejor.score - 0.2);
  const distintos = [...new Set(empatados.map(x => compacto(x.nombre)))];   // el mismo club en varias ligas no es duda
  if (mejor && distintos.length > 1) return { ...mejor, dudoso: [...new Set(empatados.map(x => x.nombre))] };
  return mejor;
}

/**
 * Para nombres escritos a propósito (Juan con "+ 23:40 comunicaciones cantera", "F ok <equipo>"):
 * todas las palabras escritas tienen que estar en el nombre del equipo. Así "comunicaciones cantera"
 * no cae en "Comunicaciones" (le sobra "cantera"), pero "parke" sí encuentra "Parke Avellane".
 * Si varios cumplen, gana el que no tiene palabras de más; si siguen siendo varios, es dudoso.
 */
export function buscarEquipoExacto(texto, equipos, alias = {}) {
  const t = norm(texto);
  for (const [a, nombre] of Object.entries(alias)) if (norm(a) === t) return { ...(equipos.find(x => x.nombre === nombre) || { nombre, div: '?', logo: null }), score: 1, via: 'alias' };
  const tw = palabras(texto);
  if (!tw.length) return null;
  const cubre = (a, b) => a.every(x => b.some(w => parecida(x, w)));
  const cands = equipos.filter(e => { const ew = palabras(e.nombre); return ew.length && (cubre(tw, ew) || compacto(e.nombre) === compacto(texto)); });
  const exactos = cands.filter(e => cubre(palabras(e.nombre), tw));
  const pool = exactos.length ? exactos : cands;
  const distintos = [...new Set(pool.map(e => compacto(e.nombre)))];
  if (!pool.length) return null;
  if (distintos.length > 1) return { ...pool[0], score: 0.7, dudoso: [...new Set(pool.map(e => e.nombre))] };
  return { ...pool[0], score: 1 };
}
