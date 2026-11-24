// Control de datos antes de publicar: fixture y escudos (torneos-datos.js) + plantel (plantel-datos.js) + seed_matches.
//   node scripts/control-datos.mjs            → OK, o un error por línea (sale con código 1)
//   node scripts/control-datos.mjs --aceptar  → acepta un cambio intencional de nombre de rival ya anotado
// El índice de RAW es la clave de Firestore (edits/suspended/results): control-datos.lock.json recuerda liga y rival
// de cada índice y frena cualquier reordenamiento o borrado. Agregar al final se acepta solo.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r/g, '');
const LOCK = path.join(ROOT, 'scripts', 'control-datos.lock.json');
const err = [];
await import('../torneos-datos.js');
await import('../plantel-datos.js');
const { SEED_MATCHES } = await import('../seed_matches.js');
const { RAW, cabeceras, vpugBadge, e11Badge } = globalThis.TSTorneos;
const { ROSTER_T4, paraConvocatoria } = globalThis.TSPlantel;
const LIGAS = ['VPN', 'VPUG', '11x11'];
const T4 = '2026-09-28';

// ── Formato de texto que leen el Worker y noticia-diaria.mjs ──
const txt = leer('torneos-datos.js'), ini = txt.indexOf('const RAW = ['), bloque = txt.slice(ini, txt.indexOf('\n];', ini));
const lineas = bloque.split('\n').filter(l => l.trim().startsWith('{'));
if (lineas.length !== RAW.length) err.push(`torneos-datos.js: ${RAW.length} partidos pero ${lineas.length} líneas (tiene que ser uno por línea)`);
if (cabeceras.length !== RAW.length) err.push('torneos-datos.js: las cabeceras "// ══ … ══" no cuadran con los partidos');

// ── Índices ──
const clave = m => `${m.league}|${m.rival}`, actual = RAW.map(clave);
const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : [];
if (!process.argv.includes('--aceptar')) {
  if (actual.length < lock.length) err.push(`RAW perdió partidos (${lock.length} → ${actual.length}): corre los índices de Firestore`);
  lock.forEach((k, i) => { if (actual[i] && actual[i] !== k) err.push(`RAW[${i}] era "${k}" y ahora es "${actual[i]}" (si solo cambió el nombre: --aceptar)`); });
}

// ── Partidos ──
const vistos = new Map();
RAW.forEach((m, i) => {
  if (m.free) return;
  const q = `RAW[${i}] ${m.date} ${m.rival}`;
  if (!/^\d{4}-\d\d-\d\d$/.test(m.date) || isNaN(Date.parse(m.date))) err.push(`${q}: fecha inválida`);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.time)) err.push(`${q}: hora inválida "${m.time}"`);
  if (!LIGAS.includes(m.league)) err.push(`${q}: liga "${m.league}"`);
  if (typeof m.isHome !== 'boolean') err.push(`${q}: falta isHome`);
  if (m.date <= T4) return;
  const h = `${m.date} ${m.time}`;
  if (vistos.has(h)) err.push(`${q}: mismo día y hora que ${vistos.get(h)}`);
  vistos.set(h, m.rival);
  if (m.league === 'VPUG' && !vpugBadge(m.rival)) err.push(`${q}: sin escudo en VPUG_T*_BADGES`);
  if (m.league === '11x11' && !e11Badge(m.rival)) err.push(`${q}: sin escudo en E11_T*_BADGES`);
});

// ── Resultados contra el fixture (mismo día y liga, rival casi igual pero no idéntico) ──
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
for (const s of SEED_MATCHES.filter(x => x.date > T4))
  for (const m of RAW.filter(x => x.date === s.date && x.league === s.league))
    if (m.rival !== s.rival && norm(m.rival) === norm(s.rival)) err.push(`seed_matches ${s.date}: "${s.rival}" ≠ fixture "${m.rival}"`);

// ── Plantel ──
const dup = (xs, que) => xs.filter((x, i) => xs.indexOf(x) !== i).forEach(x => err.push(`plantel: ${que} repetido: ${x}`));
dup(ROSTER_T4.map(p => p.key), 'gamertag');
dup(ROSTER_T4.map(p => p.num), 'dorsal');
dup(ROSTER_T4.filter(p => p.conv).map(p => p.conv.n), 'orden de convocatoria');
if (paraConvocatoria().some(p => !p.pos || !p.num)) err.push('plantel: conv sin pos o sin dorsal');

// ── Versión de caché igual en todas las páginas ──
const raiz = fs.readdirSync(ROOT).filter(f => /\.(html|js)$/.test(f));
for (const a of ['layout.js', 'torneos-datos.js', 'plantel-datos.js']) {
  const vs = new Set(raiz.flatMap(f => [...leer(f).matchAll(new RegExp(a.replace('.', '\\.') + '\\?v=(\\w+)', 'g'))].map(m => m[1])));
  if (vs.size > 1) err.push(`${a}: versiones ?v= distintas: ${[...vs].join(', ')}`);
}

if (err.length) { console.log(err.join('\n')); process.exitCode = 1; }
else { if (JSON.stringify(lock) !== JSON.stringify(actual)) fs.writeFileSync(LOCK, JSON.stringify(actual, null, 0).replace(/","/g, '",\n"') + '\n'); console.log('OK'); }
