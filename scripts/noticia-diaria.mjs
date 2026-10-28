#!/usr/bin/env node
// Noticia diaria del sitio, en la PC del club (Juan, 2026-10-26: "pasá la noticia diaria al esquema liviano y asegurate
// que corra todos los días sí o sí"). Reemplaza a la rutina en la nube trig_01Kz9ev31E5WfSN2mkVrHq7a (Opus 5.5 en modo
// agente, prompt de 45K caracteres), desactivada el mismo día.
//
//   node scripts/noticia-diaria.mjs              → la nota de hoy, si todavía no hay
//   node scripts/noticia-diaria.mjs --forzar     → la reescribe aunque ya exista (botón "regenerar" del sitio)
//   node scripts/noticia-diaria.mjs --prueba     → escribe la nota en pruebas/noticia-diaria.json, no toca Firestore
//
// 1. Junta los datos con código (nada que el modelo tenga que buscar ni calcular): seed_matches.js, el calendario
//    de Firestore (fixture, resultados), la tabla de Espacio Gamer (/eg-table), ausencias, reclutas, el historial de la
//    sección (ángulos, protagonistas, tomas, jugador de la semana), titulares de la Selección y feriados.
// 2. Claude escribe la nota en UNA llamada liviana (scripts/lib/ia.mjs, encargo scripts/noticia-diaria-encargo.md).
// 3. El código controla lo que antes se le pedía al agente (largo, gamertags, ligas, días de semana, doble sentido,
//    formato, imageBrief) y, si algo falla, se lo devuelve para que lo corrija. Si Claude no está disponible, escribe
//    el modelo local. Si después de todo quedan avisos, la nota se guarda igual con `avisos` (Juan la revisa antes de
//    publicar): sin nota no queda ningún día.
// 4. Guarda news/draft y actualiza recent_topics, featured_players_history, injury_cover_stories y
//    player_of_week_history. Tarea "TopSecretFC-NoticiaDiaria" (06:00, reintentos 06:30, 07:30 y 09:00). Log: scripts/noticia-diaria.log
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ROOT, loadEnv } from './lib/env.mjs';
import { claude, ollama, guardarEjemplo } from './lib/ia.mjs';
import { styleFromBrief } from './generate-image-chatgpt.mjs';

loadEnv();
const argv = process.argv.slice(2);
const FORZAR = argv.includes('--forzar'), PRUEBA = argv.includes('--prueba');
const FS = 'https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/';
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const MEDIA = `${WORKER}/media/`;
const TZ = 'America/Argentina/Buenos_Aires';
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: TZ })} [noticia] ${m}`);

const HOY = argv.includes('--fecha') ? argv[argv.indexOf('--fecha') + 1] : new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
const sumar = (f, d) => new Date(Date.parse(f + 'T12:00:00Z') + d * 86400000).toISOString().slice(0, 10);
const dia = f => new Date(f + 'T12:00:00-03:00').toLocaleDateString('es-AR', { weekday: 'long', timeZone: TZ });
const AYER = sumar(HOY, -1);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dateLabel = f => { const [y, m, d] = f.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; };

// ── Firestore (REST, sin auth: las colecciones news/calendario/reclutamiento tienen lectura abierta) ──────────
const val = v => v == null ? null : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? Number(v.integerValue)
  : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null
  : 'arrayValue' in v ? (v.arrayValue.values || []).map(val)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)])) : null;
const aFS = x => x == null ? { nullValue: null } : typeof x === 'string' ? { stringValue: x } : typeof x === 'boolean' ? { booleanValue: x }
  : typeof x === 'number' ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x })
  : Array.isArray(x) ? { arrayValue: { values: x.map(aFS) } } : { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, v]) => [k, aFS(v)])) } };
async function leerDoc(ruta) {
  const r = await fetch(FS + ruta, { signal: AbortSignal.timeout(20000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Firestore ${ruta}: ${r.status}`);
  return Object.fromEntries(Object.entries((await r.json()).fields || {}).map(([k, v]) => [k, val(v)]));
}
async function escribirDoc(ruta, campos) {
  const r = await fetch(FS + ruta, { method: 'PATCH', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, aFS(v)])) }), signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Firestore PATCH ${ruta}: ${r.status} ${(await r.text()).slice(0, 200)}`);
}
const intentar = async (fn, def = null) => { try { return await fn(); } catch (e) { log(`  (dato no disponible: ${e.message})`); return def; } };

// ── 0. ¿Ya hay nota hoy? ─────────────────────────────────────────────────────
const draftDoc = await intentar(() => leerDoc('news/draft'));
const draftHoy = draftDoc?.data ? JSON.parse(draftDoc.data) : null;
const topicos = (await intentar(() => leerDoc('news/recent_topics')))?.entries || [];
if (!FORZAR && !PRUEBA) {
  // un borrador sin título (el 28/10 se guardó uno vacío del modelo local) no cuenta: se reescribe
  if (draftHoy?.date === HOY && draftHoy.title) { log(`Ya hay borrador de hoy: "${draftHoy.title}".`); process.exit(0); }
  if (topicos[0]?.date === HOY && topicos[0].title) { log(`La nota de hoy ya se escribió ("${topicos[0].title}").`); process.exit(0); }
}

// ── 1. Datos ─────────────────────────────────────────────────────────────────
log(`Juntando datos para ${HOY} (${dia(HOY)})…`);
const { SEED_MATCHES } = await import(pathToFileURL(path.join(ROOT, 'seed_matches.js')).href + `?t=${Date.now()}`);
const { ROSTER_T4 } = await import(pathToFileURL(path.join(ROOT, 'roster.js')).href);
const PLANTEL = ROSTER_T4.map(r => r.key);
const LIGA = l => l === '11x11' ? 'Espacio Gamer' : l;
const oficial = l => ['VPN', 'VPUG', '11x11'].includes(l);

const partidos = SEED_MATCHES.filter(m => m.date >= '2026-09-29').slice(-14).map(m => {
  const [gf, gc] = String(m.match_result).split('-').map(Number);
  return { fecha: m.date, dia: dia(m.date), liga: LIGA(m.league), torneo: m.torneo || null, rival: m.rival, local: m.isHome ?? null,
    resultado: `${gf}-${gc}`, res: gf > gc ? 'victoria' : gf < gc ? 'derrota' : 'empate', notas: (m.notes || '').replace(/cargado autom[^.]*\.|falta completar[^.]*\./gi, '').trim().slice(0, 400) || null,
    jugadores: (m.players || []).filter(p => p.matched || PLANTEL.includes(p.name)).map(p => ({ gt: p.matched || p.name, pos: p.played_pos || null,
      goles: p.goals || 0, asist: p.assists || 0, nota: p.rating ?? null })) };
});

const cal = await intentar(() => leerDoc('calendario/estado'), {});
const custom = (cal.custom || []).map((c, i) => {
  const k = `c${i}`, e = cal.edits?.[k] || {}, s = cal.suspended?.[k];
  return { ...c, ...e, date: s?.newDate || e.date || c.date, resultado: cal.results?.[k] || null };
}).filter(c => (c.tipo || 'partido') === 'partido');
const fixture = custom.filter(c => c.date >= HOY && oficial(c.league)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 8)
  .map(c => ({ fecha: c.date, dia: dia(c.date), hora: c.time, liga: LIGA(c.league), instancia: c.instancia || null, rival: c.rival, local: c.isHome ?? null }));
const partidosHoy = fixture.filter(f => f.fecha === HOY);

// Resultado obligatorio: partidos oficiales de ayer (o de hoy, si ya se jugaron de madrugada) en seed_matches o el calendario
const jugadosRecientes = partidos.filter(p => p.fecha >= AYER && oficial(SEED_MATCHES.find(m => m.date === p.fecha && m.rival === p.rival)?.league));
for (const c of custom.filter(c => c.date === AYER && oficial(c.league))) {
  if (!jugadosRecientes.some(p => p.fecha === c.date && p.rival === c.rival))
    jugadosRecientes.push({ fecha: c.date, dia: dia(c.date), liga: LIGA(c.league), rival: c.rival, local: c.isHome ?? null,
      resultado: c.resultado ? `${c.resultado[0]}-${c.resultado[1]}` : 'sin resultado cargado', jugadores: [], notas: 'Solo figura en el calendario: sin goleadores cargados.' });
}

const tablaEG = await intentar(async () => (await (await fetch(`${WORKER}/eg-table`, { signal: AbortSignal.timeout(30000) })).json())
  .map((t, i) => ({ pos: i + 1, equipo: t.name, pj: t.gp, g: t.w, e: t.d, p: t.l, gf: t.gf, gc: t.gc, pts: t.pts })));

const conv = await intentar(() => leerDoc('convocatoria/state'), {});
const coberturas = (await intentar(() => leerDoc('news/injury_cover_stories')))?.players || {};
const bajas = Object.entries(conv.availability || {}).filter(([gt, a]) => PLANTEL.includes(gt) && ['black', 'red'].includes(a?.status)).map(([gt, a]) => {
  const realKey = `${a.note || ''}|${a.returnDate || ''}`;
  return { gt, estado: a.status === 'black' ? 'baja' : 'ausente hoy', regreso: a.returnDate === '9999-12-31' ? 'indefinido' : a.returnDate || null,
    lesion: a.status === 'black' && coberturas[gt]?.realKey === realKey ? coberturas[gt].fakeInjury : null, realKey };
});

const reclutas = await intentar(async () => {
  const r = await (await fetch(FS + 'reclutamiento?pageSize=50', { signal: AbortSignal.timeout(20000) })).json();
  const docs = (r.documents || []).map(d => Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)])));
  return { en_evaluacion: docs.filter(d => ['pendiente', 'en_revision'].includes(d.estado)).map(d => d.posicion || d.puesto || null), aprobados_recientes: docs.filter(d => d.estado === 'aprobado').length };
}, null);

const destacados = (await intentar(() => leerDoc('news/featured_players_history')))?.entries || [];
const estilos = (await intentar(() => leerDoc('news/image_style_history')))?.entries || [];
const premios = (await intentar(() => leerDoc('news/player_of_week_history')))?.winners || [];
const eventos = ((await intentar(() => leerDoc('news/events_log')))?.events || []).filter(e => (e.date || '') >= sumar(HOY, -7));

// Selección / fútbol internacional: titulares de las últimas 36 h (Google News RSS)
const futbolExterno = await intentar(async () => {
  const q = encodeURIComponent('"Selección Argentina" OR "final" Champions OR Libertadores when:1d');
  const xml = await (await fetch(`https://news.google.com/rss/search?q=${q}&hl=es-419&gl=AR&ceid=AR:es-419`, { signal: AbortSignal.timeout(20000) })).text();
  return [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>/g)].slice(0, 8)
    .map(m => `${new Date(m[2]).toLocaleDateString('sv-SE', { timeZone: TZ })} · ${m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')}`);
}, []);

function feriado(f) {
  const [y, m, d] = f.split('-').map(Number);
  const nLunes = (mes, n) => { const p = new Date(Date.UTC(y, mes - 1, 1)).getUTCDay(); return 1 + ((8 - p) % 7) + (n - 1) * 7; };
  const fijos = { '1-1': 'Año Nuevo', '3-24': 'Día de la Memoria', '4-2': 'Malvinas', '5-1': 'Día del Trabajador', '5-25': 'Revolución de Mayo',
    '6-20': 'Día de la Bandera', '7-9': 'Día de la Independencia', '12-8': 'Inmaculada Concepción', '12-25': 'Navidad' };
  if (fijos[`${m}-${d}`]) return fijos[`${m}-${d}`];
  if (m === 8 && d === nLunes(8, 3)) return 'Paso a la Inmortalidad de San Martín';
  if (m === 10 && d === nLunes(10, 2)) return 'Día de la Diversidad Cultural';
  if (m === 11 && d === nLunes(11, 4)) return 'Día de la Soberanía Nacional';
  return null;
}

const LUGAR = { TUNEL: 'túnel', VESTUARIO: 'vestuario', ESTADIO_NOCHE: 'estadio / cancha de noche', ACCION_PARTIDO: 'acción en la cancha', CAMPANA_ESTUDIO: 'estudio', RETRATO_EDITORIAL: 'retrato' };
const diaHoy = new Date(HOY + 'T12:00:00-03:00').getUTCDay();   // 0 domingo … 6 sábado
const DATOS = {
  hoy: HOY, dia: dia(HOY),
  prioridad: { resultado_obligatorio: jugadosRecientes, partidos_hoy: partidosHoy, feriado: feriado(HOY), es_domingo: diaHoy === 0 },
  partidos_de_la_temporada: partidos, proximos_partidos: fixture,
  tabla_espacio_gamer: tablaEG,
  plantel: ROSTER_T4.map(r => ({ gt: r.key, dorsal: r.num, puesto: r.posn })),
  bajas: bajas.map(({ realKey, ...b }) => b), reclutas, eventos_ultimos_7_dias: eventos,
  notas_recientes: topicos.slice(0, 5),
  protagonistas_recientes: [...new Set(destacados.filter(e => e.date >= sumar(HOY, -7)).map(e => e.player))],
  tomas_recientes: estilos.filter(e => e.toma).slice(0, 3).map(e => e.toma),
  // Juan, 2026-10-27: "si noto algo repetido ya no sirve" (el 26 y el 27 salió el equipo en el túnel). Lugar de la foto
  // de cada día reciente + la escena que se pidió: la de hoy tiene que ser otra cosa.
  escenas_recientes: estilos.filter(e => e.date >= sumar(HOY, -7) && e.date < HOY).map(e => `${e.date}: ${LUGAR[e.style] || e.style}`),
  imagenes_recientes: topicos.filter(t => t.escena && t.date < HOY).slice(0, 5).map(t => `${t.date}: ${t.escena}`),
  premio_ultimos_30_dias: premios.filter(w => w.date >= sumar(HOY, -30)).map(w => w.player),
  futbol_externo: futbolExterno,
};

// Sábado sin partido ayer ni hoy: no hay nota (el resumen semanal lo publica otro proceso, decisión del 2026-10-09)
if (diaHoy === 6 && !jugadosRecientes.length && !partidosHoy.length && !FORZAR) { log('Sábado sin partidos: no hay nota (sale el resumen semanal).'); process.exit(0); }

// ── 2. Escritura ─────────────────────────────────────────────────────────────
const reglasExtra = fs.readFileSync(path.join(ROOT, 'docs/conocimiento/reglas-noticia-diaria.md'), 'utf8').replace(/^# .*\n+/, '').replace(/^La noticia diaria la escribe[^\n]*\n+/m, '');
const encargo = fs.readFileSync(path.join(ROOT, 'scripts/noticia-diaria-encargo.md'), 'utf8')
  .replace('{{HOY}}', HOY).replace('{{DIA}}', dia(HOY)).replace('{{REGLAS_EXTRA}}', reglasExtra).replace('{{SABADO}}', '')
  .replace('{{DATOS}}', JSON.stringify(DATOS, null, 1));

// Controles: lo que antes el agente tenía que verificar a mano
const exJugadores = [...new Set(SEED_MATCHES.flatMap(m => (m.players || []).map(p => p.matched)).filter(g => g && !PLANTEL.includes(g)))]
  .filter(g => g.length > 4 && !PLANTEL.some(p => p.toLowerCase() === g.toLowerCase()));
const TOMAS = ['FESTEJO_GOL', 'ACCION_GOL', 'PITAZO_FINAL', 'SALUDO_HINCHADA', 'TUNEL_VUELTA', 'VESTUARIO_FESTEJO', 'FIGURA_RETRATO'];
const plano = s => String(s).replace(/<[^>]+>/g, '');
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function controlar(n) {
  const err = [];
  for (const k of ['angulo', 'category', 'title', 'excerpt', 'body', 'shareCaption', 'shareCaptions', 'imageBrief']) if (!n[k]) err.push(`falta "${k}"`);
  if (err.length) return err;
  if (!Array.isArray(n.body)) return ['"body" tiene que ser una lista'];
  const parrafos = n.body.filter(b => typeof b === 'string');
  if (parrafos.length < 3 || parrafos.length > 6) err.push(`el cuerpo tiene ${parrafos.length} párrafos (van de 3 a 6)`);
  if (!n.body[1]?.specs) err.push('el segundo elemento del cuerpo tiene que ser {"specs": …}');
  if (n.body.filter(b => b?.quote).length > 1) err.push('más de una cita');
  for (const b of n.body.filter(b => b && typeof b === 'object')) {
    const extra = Object.keys(b).filter(k => !['specs', 'h', 'quote', 'by', 'pair', 'caption'].includes(k));
    if (extra.length) err.push(`bloque no permitido: ${extra.join(', ')}`);
    for (const u of b.pair || []) { const g = (u.match(/plantel-t4\/(.+)\.webp$/) || [])[1]; if (!u.startsWith(MEDIA + 'logos/noticias/plantel-t4/') || !PLANTEL.includes(g)) err.push(`foto inválida en pair: ${u}`); }
  }
  const textos = [n.title, ...n.body.map(b => typeof b === 'string' ? b : [b.h, b.quote, ...(b.specs || []).map(s => s[1])].filter(Boolean).join(' '))].map(plano);
  const largo = textos.join('').length;
  if (largo > 2100) err.push(`la nota tiene ${largo} caracteres (máximo 2100): recortá`);
  const todo = [n.title, n.excerpt, ...textos, n.shareCaption, ...Object.values(n.shareCaptions || {})].map(plano).join('\n');
  for (const g of exJugadores) if (new RegExp(`\\b${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(todo)) err.push(`"${g}" no está en el plantel actual`);
  for (const p of n.protagonistas || []) if (!PLANTEL.includes(p)) err.push(`protagonista "${p}" no es un gamertag del plantel`);
  const liga = todo.match(/\b(?:la|el|del|al)\s+(?:VPN|VPUG|11x11|Espacio Gamer)\b|\b(?:VPN|VPUG|Espacio Gamer)\s+T\d\b|\b11x11\b|\bT[1-4]\b|\b(?:VPN|VPUG|Espacio Gamer)\s+(?:gan|perd|empat|cay)/i);
  if (liga) err.push(`ligas: "${liga[0]}" (sin artículo, sin sufijo de temporada, la de esta temporada es Espacio Gamer, el sujeto es el club)`);
  const ds = todo.match(/\b(?:la|se la)\s+(?:pone|puso|mete|metió|mandó adentro|dio|empujó|clavó)\b/i);
  if (ds) err.push(`posible doble sentido: "${ds[0]}"`);
  for (const m of todo.matchAll(/\b(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\s+(\d{1,2})\/(\d{1,2})\b/gi)) {
    const f = `${HOY.slice(0, 4)}-${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if (DIAS[new Date(f + 'T12:00:00-03:00').getUTCDay()] !== m[1].toLowerCase()) err.push(`"${m[0]}": el ${m[2]}/${m[3]} es ${dia(f)}`);
  }
  if (/\p{Extended_Pictographic}/u.test(textos.join(''))) err.push('emojis en el cuerpo');
  if (plano(n.imageBrief).length > 300) err.push(`imageBrief de ${plano(n.imageBrief).length} caracteres (máximo 300)`);
  if (!/cancha de noche|estadio|t[úu]nel|vestuario|estudio/i.test(n.imageBrief)) err.push('el imageBrief no nombra el lugar (cancha de noche, estadio, túnel, vestuario o estudio)');
  if (n.toma && !TOMAS.includes(n.toma)) err.push(`toma "${n.toma}" no existe`);
  const estiloHoy = styleFromBrief({ imageBrief: n.imageBrief })?.id;
  const usados = estilos.filter(e => e.date >= sumar(HOY, -3) && e.date < HOY).map(e => e.style);
  if (estiloHoy && usados.includes(estiloHoy)) err.push(`la foto vuelve a ser en ${LUGAR[estiloHoy] || estiloHoy}, que ya se usó en los últimos 3 días (${[...new Set(usados.map(u => LUGAR[u] || u))].join(', ')}): elegí otro lugar y otra composición`);
  if (n.toma && DATOS.tomas_recientes.includes(n.toma)) err.push(`toma "${n.toma}" repetida (recientes: ${DATOS.tomas_recientes.join(', ')})`);
  if (String(n.shareCaption).length > 280) err.push('shareCaption de más de 280 caracteres');
  if (jugadosRecientes.length && n.angulo !== 'RESULTADO') err.push('ayer hubo partidos oficiales: la nota tiene que ser RESULTADO');
  if (!jugadosRecientes.length && partidosHoy.length && n.angulo !== 'PREVIA') err.push('hoy hay partido: la nota tiene que ser PREVIA');
  if (n.angulo === 'PREMIO_INTERNO' && diaHoy !== 0) err.push('PREMIO_INTERNO es solo los domingos');
  return err;
}

const sacar = t => JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
let mejor = null;
const motores = [['claude', 3], ['local', 2]];
escribir: for (const [motor, vueltas] of motores) {
  let pedido = encargo;
  for (let i = 1; i <= vueltas; i++) {
    try {
      log(`Escribiendo (${motor === 'claude' ? 'Claude' : 'modelo local'}, vuelta ${i})…`);
      const texto = motor === 'claude' ? claude(pedido) : (await ollama(pedido, { json: true, temperatura: 0.7 })).texto;
      const n = sacar(texto);
      if (n.sin_nota) { log('El modelo dice que hoy no corresponde nota.'); process.exit(0); }
      const err = controlar(n);
      if (!mejor || err.length < mejor.err.length) mejor = { n, err, motor };
      if (!err.length) { if (motor === 'claude' && i === 1) guardarEjemplo('noticia-diaria', encargo, JSON.stringify(n)); break escribir; }
      log(`  a corregir: ${err.join(' · ')}${err.some(e => e.startsWith('falta "')) ? ` (claves recibidas: ${Object.keys(n).join(', ') || 'ninguna'})` : ''}`);
      pedido = `${encargo}\n\n## Tu respuesta anterior\n${JSON.stringify(n)}\n\n## Corregí esto y devolvé el JSON completo de nuevo\n- ${err.join('\n- ')}`;
    } catch (e) {
      log(`  ${motor}: ${e.message.slice(0, 300)}`);
      if (/out of extra usage|usage limit|fetch failed|ECONNREFUSED|ENOENT/i.test(e.message)) break;
    }
  }
}
// Con avisos de estilo la nota se guarda (Juan la revisa); sin título/cuerpo no: es un borrador vacío que encima
// frenaba los reintentos del día (28/10, "undefined").
const incompleta = mejor?.err.some(e => /^falta "|^"body" tiene/.test(e));
if (!mejor || incompleta) { log(`ERROR: ningún motor pudo escribir la nota${incompleta ? ` (la mejor vino incompleta: ${mejor.err.join(' · ')})` : ''}. Se reintenta en el próximo horario de la tarea.`); process.exit(1); }
const { n, err, motor } = mejor;

// ── 3. Guardado ──────────────────────────────────────────────────────────────
const draft = { id: `auto-${HOY}`, generatedAt: new Date().toISOString(), category: n.category, title: n.title, date: HOY, dateLabel: dateLabel(HOY),
  excerpt: n.excerpt, body: n.body, shareCaption: n.shareCaption, shareCaptions: n.shareCaptions, imageBrief: n.imageBrief, toma: n.toma || null,
  imagePost: null, imageStory: null, image: null, canvaDesignId: null, canvaStoryDesignId: null, status: 'draft',
  escritoPor: motor === 'claude' ? 'claude-opus' : 'local', ...(err.length ? { avisos: err } : {}) };
if (PRUEBA) {
  fs.mkdirSync(path.join(ROOT, 'pruebas'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'pruebas/noticia-diaria.json'), JSON.stringify({ angulo: n.angulo, protagonistas: n.protagonistas, ...draft }, null, 2));
  log(`PRUEBA: "${n.title}" (${n.angulo}, ${motor}) → pruebas/noticia-diaria.json${err.length ? ' · avisos: ' + err.join(' · ') : ''}`);
  process.exit(0);
}
await escribirDoc('news/draft', { data: JSON.stringify(draft) });
const conHoy = (lista, nuevos, max) => [...nuevos, ...lista.filter(e => e.date !== HOY)].slice(0, max);
await escribirDoc('news/recent_topics', { entries: conHoy(topicos, [{ date: HOY, angle: n.angulo, title: n.title, escena: n.imageBrief }], 5) });
if (n.protagonistas?.length) await escribirDoc('news/featured_players_history', { entries: conHoy(destacados, n.protagonistas.filter(p => PLANTEL.includes(p)).map(player => ({ player, date: HOY })), 40) });
const cobertura = {};
for (const b of bajas.filter(b => b.estado === 'baja')) {
  const lesion = b.lesion || n.lesiones?.[b.gt];
  if (lesion) cobertura[b.gt] = { fakeInjury: lesion, realKey: b.realKey };
}
await escribirDoc('news/injury_cover_stories', { players: cobertura });
if (n.angulo === 'PREMIO_INTERNO' && PLANTEL.includes(n.premio)) await escribirDoc('news/player_of_week_history', { winners: [{ player: n.premio, date: HOY }, ...premios.filter(w => w.date >= sumar(HOY, -35))] });
log(`✓ Borrador de hoy: "${n.title}" (${n.angulo}, ${motor === 'claude' ? 'Claude' : 'modelo local'})${err.length ? ' · AVISOS: ' + err.join(' · ') : ''}`);

// Imágenes: la tarea de las 06:10 espera el borrador hasta las 06:55. Si la nota salió después (un reintento), se lanzan
// acá. Con --forzar no: el botón "regenerar" (watch-regen.ps1) genera las imágenes él mismo.
const ahora = new Date().toLocaleTimeString('sv-SE', { timeZone: TZ, hour12: false }).slice(0, 5);
if (!FORZAR && ahora > '06:55') {
  const { spawn } = await import('child_process');
  spawn('wscript.exe', [path.join(ROOT, 'scripts', 'run-daily-images-hidden.vbs')], { detached: true, stdio: 'ignore' }).unref();
  log('Imágenes lanzadas (run-daily-images).');
}
