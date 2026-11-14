#!/usr/bin/env node
// Completa goleadores y asistentes de los partidos del seed que tienen goles sin autor (pedido de Juan, 2026-11-14:
// "en las páginas de las ligas siempre están los autores de los goles y los asistentes"). Lo corre retransmitir.mjs
// al terminar la noche, después de cargar-partidos-ea.mjs.
//   node scripts/completar-goleadores.mjs                       → muestra qué completaría
//   node scripts/completar-goleadores.mjs --aplicar [--commit]  → escribe seed_matches.js (y commitea + pushea)
//   --desde YYYY-MM-DD (default: 10 días atrás) · --seed <copia.js> (pruebas) · --sin-vigia (no lee los videos)
//
// Orden de fuentes:
//   1. Página de la liga. VPN: api.virtualpronetwork.com/matches/{id} (evento 1 = gol, 2 = asistencia; ids de
//      /vpn-results del Worker). Espacio Gamer: espaciogamer.cl/partido/?partido_id=N (tabla de jugadores con
//      goles/asist.; ids del fixture). VPUG: la API pide sesión de usuario → si el Chrome del pipeline no tiene el
//      token, avisa y sigue (el formato del detalle todavía no se vio).
//   2. Ficha del gol del vivo: después de cada gol el juego muestra una tarjeta con el nombre del goleador (abajo a la
//      izquierda). Se busca en la grabación del vigía (fuentes/goles/vvivo-<fecha>/source.mp4) y se lee con el OCR de
//      Windows. Los nombres son los del juego ("ELI", "NICOBJ 96"): se resuelven solo contra los jugadores del partido.
// Reglas:
//   · Las dos ligas heredan de EA cuando nadie reporta a mano: si EA vino corrupto, la página también (el 1-1 con
//     Misky Mayu, 11/11: la web de VPN solo tiene el gol del rival). Por eso la liga se usa solo si sus goles suman
//     nuestro resultado; si no, decide la ficha del vivo (si sus goles suman el resultado).
//   · Si la liga y las fichas del vivo no coinciden en los goleadores → "REVISAR A MANO", no se escribe nada.
//   · Solo toca partidos con goles sin autor; nunca baja goles/asistencias ya cargados.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const oa = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SEED = oa('--seed') ? path.resolve(oa('--seed')) : path.join(ROOT, 'seed_matches.js');
const APLICAR = process.argv.includes('--aplicar'), COMMIT = process.argv.includes('--commit'), SIN_VIGIA = process.argv.includes('--sin-vigia');
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const UA = { 'User-Agent': 'Mozilla/5.0 (TopSecretFC site)' };
const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
const DESDE = oa('--desde') || new Date(Date.parse(hoy) - 10 * 864e5).toISOString().slice(0, 10);
const log = m => console.log(`[goleadores] ${m}`);

const { SEED_MATCHES } = await import(pathToFileURL(SEED).href + '?t=' + Date.now());
const { ROSTER_T4 } = await import(pathToFileURL(path.join(ROOT, 'roster.js')).href);
const ROSTER = ROSTER_T4.map(r => r.key);
const plano = s => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
const delPlantel = n => ROSTER.find(g => plano(g) === plano(n)) || null;   // "elianja20" → "Elianja20"
const traer = async (url, opt = {}) => { try { const r = await fetch(url, { signal: AbortSignal.timeout(40000), ...opt }); return r.ok ? r : null; } catch { return null; } };
const golesDe = m => Number(String(m.match_result).split('-')[0]);
const conAutor = m => (m.players || []).reduce((a, p) => a + (p.goals || 0), 0);
// Goleadores sacados de la ficha del vivo porque la liga todavía tenía lo de EA: la liga siempre termina cargando lo
// correcto (pide corregirlo, a veces tarda — Juan, 2026-11-14), así que estos se vuelven a mirar hasta que la liga los
// confirme (o los corrija: lo de la liga manda) durante 30 días.
const PROVISORIO = 'GOLEADORES PROVISORIOS (ficha del vivo): falta que la liga los cargue.';
const esProvisorio = m => String(m.notes || '').includes(PROVISORIO);
const DESDE_PROV = new Date(Date.parse(hoy) - 30 * 864e5).toISOString().slice(0, 10);

const pendientes = SEED_MATCHES.filter(m => ['VPN', '11x11', 'VPUG'].includes(m.league)
  && ((m.date >= DESDE && golesDe(m) > conAutor(m)) || (m.date >= DESDE_PROV && esProvisorio(m))));
if (!pendientes.length) log(`Sin goles sin autor desde ${DESDE} ni provisorios desde ${DESDE_PROV}.`);

// ── 1. Ligas ─────────────────────────────────────────────────────────────────
const mismoClub = (a, b) => { const x = plano(a), y = plano(b); return !!x && !!y && (x === y || x.startsWith(y.slice(0, 10)) || y.startsWith(x.slice(0, 10))); };
const TS_VPN = 28524;
let vpnLista = null;
async function ligaVPN(m) {
  vpnLista ??= await (await traer(`${WORKER}/vpn-results`))?.json().catch(() => null) || [];
  const x = vpnLista.find(v => v.date === m.date && mismoClub(v.rival, m.rival));
  if (!x) return null;
  const d = await (await traer(`https://api.virtualpronetwork.com/matches/${x.id}`))?.json().catch(() => null);
  if (!d) return null;
  const lado = d.match.team1 === TS_VPN ? 'home' : 'away';
  const nom = Object.fromEntries((d.players?.[lado] || []).map(p => [p.uid, p.player?.identity]));
  const goles = {}, asist = {};
  for (const [uid, evs] of Object.entries(d.events?.[lado] || {})) for (const e of evs) {
    const n = nom[uid] || String(uid);
    if (e.eid === 1) goles[n] = (goles[n] || 0) + 1;
    if (e.eid === 2) asist[n] = (asist[n] || 0) + 1;
  }
  return { fuente: `web de VPN (partido ${x.id})`, goles, asist };
}

let egFixture = null;
async function ligaEG(m) {
  if (!egFixture) {
    egFixture = [];
    const EG = 'https://espaciogamer.cl';
    const page = await (await traer(EG + '/division/challengers-2-espacio-gamer-argentina/fixture/', { headers: UA }))?.text();
    const nonce = page?.match(/egRankingsData\s*=\s*\{[^}]*"nonce":"([a-f0-9]+)"/)?.[1], div = page?.match(/data-division-id="(\d+)"/)?.[1], temp = page?.match(/data-temporada-id="(\d+)"/)?.[1];
    if (!nonce || !div || !temp) { log('Espacio Gamer: no encontré el fixture (¿cambió la página?)'); return null; }
    const aj = await (await traer(EG + '/wp-admin/admin-ajax.php', { method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'eg_obtener_ranking', nonce, metrica: 'fixture', division_id: div, temporada_id: temp, limite: '500', club_destacado: '0' }) }))?.json().catch(() => null);
    const html = aj?.data?.html || '';
    for (const a of html.matchAll(/<a class="eg-fx-partido[^"]*"[^>]*partido_id=(\d+)[^>]*>([\s\S]*?)<\/a>/g)) {
      const noms = [...a[2].matchAll(/eg-fx-nom">([^<]+)/g)].map(x => x[1].replace(/&amp;/g, '&').trim());
      if (noms.some(n => /top secret/i.test(n))) egFixture.push({ id: a[1], rival: noms.find(n => !/top secret/i.test(n)) });
    }
  }
  const cand = egFixture.filter(f => mismoClub(f.rival, m.rival));
  for (const f of cand) {
    const t = await (await traer(`https://espaciogamer.cl/partido/?partido_id=${f.id}`, { headers: UA }))?.text();
    if (!t) continue;
    const [, mm, dd] = m.date.split('-').map(Number);
    if (!new RegExp(`\\b${dd} de \\p{L}+, ${m.date.slice(0, 4)}`, 'u').test(t) || !t.includes(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][mm - 1])) continue;
    // Tabla de jugadores de Top Secret: la sección cuyo título es "Top Secret FC".
    const sec = t.split('<section class="eg-pt-equipo">').find(s => /eg-pt-eq-tit">[\s\S]*?Top Secret FC\s*<\/h2>/.test(s));
    if (!sec) continue;
    const goles = {}, asist = {};
    for (const fila of sec.split('<tr>').slice(2)) {
      // Nombre = texto del link sin el avatar (img o inicial en un span) ni la etiqueta MVP.
      const n = (fila.match(/eg-celda-jugador-link">([\s\S]*?)<\/a>/)?.[1] || '').replace(/<span[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
      const tds = [...fila.matchAll(/<td>(\d+|—)<\/td>/g)].map(x => x[1]);
      if (!n || tds.length < 2) continue;
      if (+tds[0]) goles[n] = +tds[0];
      if (+tds[1]) asist[n] = +tds[1];
    }
    return { fuente: `espaciogamer.cl (partido ${f.id})`, goles, asist };
  }
  return null;
}

let avisoVPUG = false;
async function ligaVPUG() {
  if (!avisoVPUG) log('VPUG: la API pide sesión de usuario y el detalle de partido todavía no está cableado — se usa solo la ficha del vivo.');
  avisoVPUG = true;
  return null;
}

// ── 2. Fichas del gol en la grabación del vigía ──────────────────────────────
const sesiones = fecha => fs.existsSync(path.join(ROOT, 'fuentes/vivo')) ? fs.readdirSync(path.join(ROOT, 'fuentes/vivo')).filter(d => d.startsWith(fecha + '-')) : [];
// Siglas del marcador ("MYM", "DVP", "ALB") contra el nombre del rival: letras en orden dentro del nombre.
const siglasDe = (sig, rival) => { const r = plano(rival).toUpperCase(); let i = 0; for (const c of sig.toUpperCase()) { i = r.indexOf(c, i); if (i < 0) return false; i++; } return r[0] === sig[0].toUpperCase(); };
let ocrN = 0;
function ocr(archivos) {
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts/lib/ocr-windows.ps1'), ...archivos], { encoding: 'utf8', maxBuffer: 1 << 26 });
  return (r.stdout || '').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
// Nombre del juego → gamertag, solo entre los jugadores de ese partido (o el plantel, si el partido no tiene planilla).
function resolverNombre(txt, m) {
  const t = plano(txt);
  if (t.length < 2) return null;
  const cand = new Map();
  const base = (m.players || []).length ? m.players : ROSTER.map(g => ({ name: g, matched: g }));
  for (const p of base) for (const n of [p.matched, p.name]) { const k = plano(n); if (k && (k === t || k.startsWith(t) || t.startsWith(k))) cand.set(p.matched || p.name, true); }
  if (cand.size !== 1) { const otros = ROSTER.filter(g => { const k = plano(g); return k === t || k.startsWith(t); }); if (!cand.size && otros.length === 1) return otros[0]; }
  return cand.size === 1 ? [...cand.keys()][0] : null;
}
function fichasVivo(m) {
  if (SIN_VIGIA) return null;
  const ffmpeg = require('ffmpeg-static');
  for (const s of sesiones(m.date)) {
    const evs = fs.readFileSync(path.join(ROOT, 'fuentes/vivo', s, 'eventos.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    const nuestros = evs.filter(e => e.tipo === 'gol' && e.aFavor && e.rival && siglasDe(e.rival, m.rival));
    if (!nuestros.length) continue;
    const src = path.join(ROOT, 'fuentes/goles', `vvivo-${m.date}`, 'source.mp4');
    if (!fs.existsSync(src)) { log(`  ${m.rival}: no está la grabación ${path.relative(ROOT, src)}`); return null; }
    const goles = {}; let leidos = 0;
    for (const g of nuestros) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ficha-'));
      // La ficha sale con el festejo, unos segundos después del cambio de marcador: 30 s a 2 cuadros/s, solo la zona del nombre.
      spawnSync(ffmpeg, ['-v', 'error', '-ss', String(Math.max(0, g.seg - 4)), '-i', src, '-t', '30', '-vf', 'fps=2,crop=134:45:64:600,scale=536:-1,format=gray,negate', path.join(dir, 'n%02d.png')]);
      const lect = ocr(fs.readdirSync(dir).map(f => path.join(dir, f)));
      ocrN += lect.length;
      fs.rmSync(dir, { recursive: true, force: true });
      const votos = {};
      for (const l of lect) for (const ln of l.lines || []) { const gt = resolverNombre(ln.text, m); if (gt) votos[gt] = (votos[gt] || 0) + 1; }
      const [mejor] = Object.entries(votos).sort((a, b) => b[1] - a[1]);
      if (mejor && mejor[1] >= 2 || (mejor && Object.keys(votos).length === 1)) { goles[mejor[0]] = (goles[mejor[0]] || 0) + 1; leidos++; }
    }
    return { fuente: `ficha del gol en la grabación del vivo (${leidos}/${nuestros.length})`, goles, asist: {}, completos: leidos === nuestros.length };
  }
  return null;
}

// ── Decidir ──────────────────────────────────────────────────────────────────
const suma = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const aPlantel = o => { const r = {}; for (const [n, v] of Object.entries(o || {})) { const g = delPlantel(n); if (!g) return null; r[g] = (r[g] || 0) + v; } return r; };
const igual = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
const cambios = [];
for (const m of pendientes) {
  const meta = golesDe(m);
  const liga = m.league === 'VPN' ? await ligaVPN(m) : m.league === '11x11' ? await ligaEG(m) : await ligaVPUG(m);
  const ligaG = liga && aPlantel(liga.goles), ligaA = liga && aPlantel(liga.asist);
  if (liga && (!ligaG || !ligaA)) log(`  ${m.date} ${m.rival}: la liga nombra a alguien que no está en el plantel T4 (${JSON.stringify({ ...liga.goles, ...liga.asist })})`);
  const ligaOk = ligaG && ligaA && suma(ligaG) === meta;
  const yaG = Object.fromEntries((m.players || []).filter(p => p.goals).map(p => [p.matched || p.name, p.goals]));
  // Provisorio de una noche anterior: solo se mira la liga. Cuando la liga ya lo tiene completo, manda lo de la liga.
  if (esProvisorio(m)) {
    if (!ligaOk) { log(`${m.date} ${m.rival}: la liga todavía no cargó los goleadores (${liga ? `${suma(ligaG || {})}/${meta}` : 'sin datos'}); quedan los de la ficha del vivo`); continue; }
    if (!igual(ligaG, yaG)) log(`${m.date} ${m.rival}: la liga corrigió la ficha del vivo — ficha ${JSON.stringify(yaG)}, liga ${JSON.stringify(ligaG)} (queda lo de la liga)`);
    cambios.push({ m, goles: ligaG, asist: ligaA, fuente: liga.fuente, exacto: true });
    log(`${m.date} ${m.rival} ${m.match_result} → confirmado por la liga: goles ${JSON.stringify(ligaG)} · asist ${JSON.stringify(ligaA)}`);
    continue;
  }
  const vivo = fichasVivo(m);
  const vivoOk = vivo && suma(vivo.goles) === meta;
  let goles, asist, fuente, provisorio = false;
  if (ligaOk) {
    if (vivo && suma(vivo.goles) && !Object.entries(vivo.goles).every(([g, n]) => (ligaG[g] || 0) >= n))
      log(`${m.date} ${m.rival}: la ficha del vivo leyó ${JSON.stringify(vivo.goles)} y la liga dice ${JSON.stringify(ligaG)} (queda lo de la liga)`);
    goles = ligaG; asist = ligaA; fuente = liga.fuente + (vivo && suma(vivo.goles) ? ' + ficha del gol del vivo' : '');
  }
  else if (vivoOk) { goles = vivo.goles; asist = {}; provisorio = true; fuente = vivo.fuente + (liga ? `; ${liga.fuente} todavía con ${suma(ligaG || {})}/${meta} goles` : ''); }
  else { log(`REVISAR A MANO ${m.date} ${m.rival} ${m.match_result}: liga ${liga ? `${suma(ligaG || {})}/${meta}` : 'sin datos'}, vivo ${vivo ? `${suma(vivo.goles)}/${meta}` : 'sin datos'}`); continue; }
  // Nunca bajar lo ya cargado: si ya hay goles que la fuente no trae, no cierra → revisar.
  if (Object.entries(yaG).some(([g, n]) => (goles[g] || 0) < n)) { log(`REVISAR A MANO ${m.date} ${m.rival}: lo cargado ${JSON.stringify(yaG)} no coincide con ${JSON.stringify(goles)}`); continue; }
  cambios.push({ m, goles, asist, fuente, provisorio });
  log(`${m.date} ${m.rival} ${m.match_result} → goles ${JSON.stringify(goles)} · asist ${JSON.stringify(asist)} · ${fuente}${provisorio ? ' · PROVISORIO hasta que cargue la liga' : ''}`);
}
if (ocrN) log(`(${ocrN} cuadros leídos con OCR)`);
if (!cambios.length || !APLICAR) { if (cambios.length) log('Sin --aplicar: no se escribe nada.'); }
else {
  let src = fs.readFileSync(SEED, 'utf8');
  const crlf = src.includes('\r\n'); src = src.replace(/\r\n/g, '\n');
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const { m, goles, asist, fuente, provisorio, exacto } of cambios) {
    const ini = src.search(new RegExp(`\\{rival:'${esc(m.rival.replace(/'/g, "\\'"))}', league:'${m.league}', date:'${m.date}'`));
    if (ini < 0) { log(`No encuentro la entrada de ${m.rival} ${m.date} en el seed: queda sin escribir`); continue; }
    const pi = src.indexOf('players:[', ini), fin = src.indexOf(']}', pi);
    let bloque = src.slice(ini, fin);
    const tocados = new Set();
    bloque = bloque.replace(/\{name:'[^']*', matched:'([^']*)'[^\n]*\}/g, (linea, gt) => {
      // exacto (confirmación de la liga): goles y asistencias quedan como los dice la liga, también para el resto.
      if (exacto) { tocados.add(gt); return linea.replace(/goals:\d+/, `goals:${goles[gt] || 0}`).replace(/assists:\d+/, `assists:${asist[gt] || 0}`); }
      if (!(gt in goles) && !(gt in asist)) return linea;
      tocados.add(gt);
      return linea.replace(/goals:\d+/, `goals:${Math.max(goles[gt] || 0, +(linea.match(/goals:(\d+)/)?.[1] || 0))}`)
        .replace(/assists:\d+/, `assists:${Math.max(asist[gt] || 0, +(linea.match(/assists:(\d+)/)?.[1] || 0))}`);
    });
    const nuevos = [...new Set([...Object.keys(goles), ...Object.keys(asist)])].filter(g => !tocados.has(g))
      .map(g => `    {name:'${g}', matched:'${g}', rating:null, goals:${goles[g] || 0}, assists:${asist[g] || 0}},\n`).join('');
    if (nuevos) bloque = bloque.replace(/players:\[\s*$/, 'players:[\n').replace(/\n?\s*$/, '\n') + nuevos + '  ';
    const quien = Object.entries(goles).map(([g, n]) => g + (n > 1 ? ` x${n}` : '')).join(', ');
    const nota = exacto ? ` Confirmado por ${fuente}: goleadores ${quien}${Object.keys(asist).length ? `; asistencias: ${Object.keys(asist).join(', ')}` : ''}.`
      : ` Goleadores: ${quien}${Object.keys(asist).length ? `; asistencias: ${Object.keys(asist).join(', ')}` : ''} (${fuente}; completar-goleadores.mjs).${provisorio ? ' ' + PROVISORIO : ''}`;
    bloque = bloque.replace(/notes:'((?:[^'\\]|\\.)*)'/, (x, n) => `notes:'${(exacto ? n.replace(' ' + PROVISORIO, '').replace(PROVISORIO, '') : n)}${nota.replace(/'/g, "\\'")}'`);
    src = src.slice(0, ini) + bloque + src.slice(fin);
  }
  if (crlf) src = src.replace(/\n/g, '\r\n');
  fs.writeFileSync(SEED, src);
  const { SEED_MATCHES: chequeo } = await import(pathToFileURL(SEED).href + '?t=' + Date.now() + 1);   // que siga siendo JS válido
  log(`seed: ${cambios.length} partido(s) completado(s) (total ${chequeo.length} partidos).`);
  if (COMMIT && !oa('--seed')) {
    const git = (...a) => execFileSync('git', a, { cwd: ROOT, stdio: 'inherit' });
    git('add', path.relative(ROOT, SEED));
    git('commit', '-q', '-m', `feat: goleadores completados desde las ligas / el vivo (${cambios.map(c => `${c.m.rival} ${c.m.date}`).join(', ')})\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`);
    git('push', '-q');
  }
}
