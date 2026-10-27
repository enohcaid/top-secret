#!/usr/bin/env node
/**
 * Bot de amistosos sobre el WhatsApp PERSONAL de Juan, vinculado como un
 * dispositivo más (whatsapp-web.js, sesión en scripts/.wa-personal/, gitignored). No tiene nada
 * que ver con el bot de Losinno (otro número, otra sesión).
 *
 *   node scripts/amistosos.mjs            corre hasta llenar los horarios o hasta las 22:00 ART
 *   node scripts/amistosos.mjs --prueba   no manda nada a terceros ni carga en el sitio: solo avisa a Juan
 *   --horarios 23:00,23:20                buscar solo esos horarios (por defecto 22:40, 23:00, 23:20, 23:40)
 *   --auto                                le escribe solo a los equipos reconocidos (sin esperar la aprobación de Juan)
 * Nombres mal escritos: scripts/lib/equipos-match.mjs + scripts/amistosos-alias.json. Cuando Juan corrige
 * un equipo ("A Chacarita"), el bot recuerda ese número de teléfono → equipo en fuentes/amistosos/aprendidos.json.
 *
 * Arranque (2026-10-21): la tarea lo lanza lun–jue a las 17:00. Si el calendario de hoy NO tiene partidos de liga
 * (VPN/VPUG/Espacio Gamer), busca solo en automático; si tiene, queda dormido hasta "busca amistosos".
 * desactivado.json ("desactivar") = no arranca solo nunca, hasta "activar".
 *
 * Flujo:
 * 1. Lee el grupo "Amistosos 🤝 VPN 🇦🇷". Cuando un equipo de 1ra o 2da División VPN busca amistoso,
 *    le manda a Juan (a su chat "Mensaje a mí mismo") un aviso con una letra: A, B, C…
 * 2. Juan responde en ese chat:  A            → le escribe al equipo por privado ofreciendo el
 *                                               primer horario libre ("Buenas, soy de Top Secret, jugamos a las 22:40 hs?")
 *                                A 23:20      → ofrece ese horario
 *                                A Chacarita  → corrige/define el equipo (y ofrece)
 *                                A no         → descarta el pedido
 *                                A ok [hh:mm] → da por confirmado el amistoso (si el rival respondió algo raro)
 *                                estado       → lista horarios y pedidos
 *                                apagar       → deja de buscar por hoy (sigue conectado hasta 22:00 esperando "activar")
 *                                desactivar   → idem y no vuelve a buscar los días siguientes (arranca dormido)
 *                                activar      → vuelve a buscar ya y los días siguientes
 *                                busca amistosos → busca YA y en automático por el resto del día (aunque esté
 *                                               desactivado): ofrece solo, confirma y carga; te consulta solo lo dudoso
 *                                + 23:00 Chacarita → carga un amistoso que Juan coordinó por su cuenta
 * 3. Si el rival contesta que sí ("dale", "de una", 👍…), carga el amistoso solo en el calendario
 *    (Firestore calendario/estado.custom, league 'Amistoso', con escudo) → sale en la convocatoria
 *    y en la formación exportada. Cualquier otra respuesta se la reenvía a Juan para que decida.
 */
import wweb from 'whatsapp-web.js';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { ROOT } from './lib/env.mjs';
import { buscarEquipo as matchEquipo, buscarEquipoExacto } from './lib/equipos-match.mjs';
import { buscarEscudo } from './lib/escudos.mjs';
import { leerPedido } from './lib/pedido-amistoso.mjs';
import { equiposEG } from './lib/espacio-gamer.mjs';

const { Client, LocalAuth } = wweb;
const PRUEBA = process.argv.includes('--prueba');
const AUTO = process.argv.includes('--auto');
const TODOS = ['22:40', '23:00', '23:20', '23:40'];
const hArg = process.argv.indexOf('--horarios');
const SLOTS = hArg > 0 ? process.argv[hArg + 1].split(',').map(h => h.trim().replace('.', ':').padStart(5, '0')) : TODOS;
if (SLOTS.some(h => !/^\d{2}:\d{2}$/.test(h))) { console.error('Horarios inválidos:', SLOTS.join(', ')); process.exit(1); }
const GRUPO = /amistosos.*vpn/i;
// Palabras del encabezado que no nombran a ningún equipo ("alguno disponible?", "rival x1 1ra VPN").
const RELLENO = /(^|[^\p{L}\p{N}])(alguno?s?|alguien|rival(es)?|equipo|disponibles?|libres?|x\s*1|ida|vuelta|prioridad|divisi[oó]n|1ra|2da|3ra|4ta|primera|segunda|vpn|vpug|11x11|ya|por favor|porfa|gente|che|buenas|hola|somos|tenemos|quiere|quieren|juega|juegan|jugamos|partido|sala|hs|hrs)(?![\p{L}\p{N}])/giu;
const PIDE = /(amistos|busc|disponib|libre|rival|jugar|partido|\bhoy\b|\bx\s*1\b|\b\d{1,2}[:.]\d{2}\b|\b2[23]\s*(hs|h)\b)/i;
// Palabras sueltas sin \b (con tildes falla: "sí"). Si hay DUDA, la respuesta va a Juan aunque tenga
// un sí: "ok dejame ver", "bueno, pregunto y te digo" no confirman nada.
const SI = /(^|[^\p{L}])(dale+|(s[ií]+)+|ok+|oka|okey|de una|va|vamos|listo|joya|perfecto|confirm\p{L}*|hecho|obvio|genial|buen[ií]simo|claro|seguro|anotado)(?!\p{L})|👍|🤝|✅|💪|👌|🔥/iu;
const NO = /(^|[^\p{L}])((no+)+|nop|imposible|ocupad\p{L}*|ya (tengo|tenemos|tienen|consegu[ií]\p{L}*|cerr[eé]\p{L}*|cerramos|arregl[eé]\p{L}*|arreglamos|estamos|est[aá] (cubierto|completo|lleno))|consegu[ií]\p{L}* (rival|equipo|otro)|completos?|cubiertos?|otro d[ií]a|mañana|no podemos)(?!\p{L})|❌|👎/iu;
const DUDA = /d[eé]j[aá]me|te (aviso|confirmo|digo|escribo)|pregunt|consult|(^|[^\p{L}])veo(?!\p{L})|a ver|despu[eé]s|en un rato|m[aá]s tarde|ahora vemos|no s[eé]|capaz|quiz[aá]s|tal vez|\?/iu;
const LIGAS = [[2119, 6409, 'Primera'], [2127, 6410, 'Segunda']];
const FS_DOC = 'projects/top-secret-fc/databases/(default)/documents/calendario/estado';
const TZ = 'America/Argentina/Buenos_Aires';

const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const horaArt = () => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
const log = (...a) => console.log(horaArt(), ...a);

// ── Estado del día ──────────────────────────────────────────────────────────
const DIR = path.join(ROOT, 'fuentes', 'amistosos');
fs.mkdirSync(DIR, { recursive: true });
const STATE_FILE = path.join(DIR, `${hoy()}.json`);
const st = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
  : { fecha: hoy(), confirmados: {}, pedidos: {}, siguiente: 0 };   // confirmados: slot → equipo
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
// Equipos que hoy ya dijeron que no (Juan, 2026-10-21): no se les vuelve a escribir en el día, aunque
// vuelvan a publicar o escriba otro del mismo equipo. Clave = nombre del equipo y contacto.
st.rechazaron = st.rechazaron || {};
for (const p of Object.values(st.pedidos)) if (p.estado === 'rechazado' || (p.estado === 'descartado' && p.respondio))
  for (const k of [p.equipo?.nombre, p.autor, p.autorTel].filter(Boolean)) st.rechazaron[k] = st.rechazaron[k] || { motivo: 'rechazó antes hoy' };
function registrarRechazo(p, motivo) {
  for (const k of [p.equipo?.nombre, p.autor, p.autorTel].filter(Boolean)) st.rechazaron[k] = { motivo: String(motivo).slice(0, 120), ts: Date.now() };
  save();
}
const yaRechazo = (...claves) => claves.filter(Boolean).map(k => st.rechazaron[k]).find(Boolean) || null;
// Automático: por --auto o porque Juan mandó "busca amistosos" hoy (queda en el estado del día: sobrevive a reinicios)
let auto = AUTO || st.auto === true;
// Una sola instancia (2026-10-21): dos bots con la misma sesión de WhatsApp se pisan. Si hay otro vivo, salgo.
const LOCK = path.join(DIR, '.bot.lock');
try { process.kill(+fs.readFileSync(LOCK, 'utf8'), 0); console.log(horaArt(), 'ya hay un bot de amistosos corriendo: salgo'); process.exit(0); } catch {}
fs.writeFileSync(LOCK, String(process.pid));
process.on('exit', () => { try { if (fs.readFileSync(LOCK, 'utf8') === String(process.pid)) fs.rmSync(LOCK); } catch {} });
// Pausa por WhatsApp: "apagar" duerme el bot hasta las 22:00; "desactivar" además deja este archivo,
// y mientras exista el bot arranca a las 17:00 dormido (conectado, sin buscar ni avisar) hasta "activar".
const OFF_FILE = path.join(DIR, 'desactivado.json');
// Arranca SIEMPRE dormido (Juan, 2026-10-21: "solo puede arrancar bajo mi comando"): busca únicamente cuando Juan manda
// "busca amistosos", y solo si hoy NO hay partidos de liga en el calendario (si hay, no busca y le dice cuáles).
let dormido = true;
let partidosHoy = [];
const hayLiga = () => partidosHoy.some(p => p.league && p.league !== 'Amistoso');
const letra = n => String.fromCharCode(65 + (n % 26)) + (n >= 26 ? Math.floor(n / 26) : '');
// Un horario al que le faltan menos de 5 min ya no se ofrece (a las 23:00 no tiene sentido ofrecer 22:40).
const minutos = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
const tarde = s => minutos(horaArt()) > minutos(s) - 5;
const ocupados = () => new Set([...Object.keys(st.confirmados), ...Object.values(st.pedidos).filter(p => p.estado === 'ofrecido').map(p => p.slot), ...SLOTS.filter(tarde)]);
const libre = () => SLOTS.find(s => !ocupados().has(s)) || null;
// Pedidos simultáneos: cada pedido nuevo reserva el horario que se le propone, así dos equipos que
// piden 22:40 a la vez no reciben el mismo; el segundo va a otro horario que tenga libre o queda en espera.
const reservados = salvo => new Set([...ocupados(), ...Object.entries(st.pedidos)
  .filter(([k, p]) => k !== salvo && p.estado === 'nuevo' && p.propuesto).map(([, p]) => p.propuesto)]);
const proponerHora = id => (st.pedidos[id].horas || SLOTS).find(h => !reservados(id).has(h)) || null;

// ── Equipos de 1ra y 2da VPN ────────────────────────────────────────────────
let EQUIPOS = [];
const ALIAS = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'amistosos-alias.json'), 'utf8'));
const APR_FILE = path.join(ROOT, 'fuentes', 'amistosos', 'aprendidos.json');
const APR = fs.existsSync(APR_FILE) ? JSON.parse(fs.readFileSync(APR_FILE, 'utf8')) : { autores: {}, alias: {} };
const guardarAprendido = () => fs.writeFileSync(APR_FILE, JSON.stringify(APR, null, 2));
const nombreSitio = n => (ALIAS.nombre_sitio || {})[n] || n;
async function cargarEquipos() {
  const out = [];
  for (const [liga, temporada, div] of LIGAS) {
    const r = await fetch(`https://www.virtualpronetwork.com/api/leagues/${liga}/table?season=${temporada}&community_id=1`);
    const j = await r.json();
    const rows = Array.isArray(j) ? j : (Object.values(j).find(Array.isArray) || []);
    for (const t of rows) {
      const team = t.team || t;
      const nombre = (team.name || t.name || '').trim();
      if (!nombre || /top secret/i.test(nombre)) continue;
      out.push({ nombre, div, logo: team.logoUrl || team.logoSmallUrl || null });
    }
  }
  // Espacio Gamer (las 4 divisiones argentinas, Juan 2026-10-21). Un equipo que está en VPN y en EG
  // con el mismo nombre queda una sola vez, con la división de VPN.
  const clave = n => n.toLowerCase().replace(/[^a-z0-9]/g, '');
  const yaEsta = new Set(out.map(e => clave(e.nombre)));
  const eg = (await equiposEG().catch(e => { log('Espacio Gamer no disponible:', e.message); return []; }))
    .filter(e => !/top secret/i.test(e.nombre) && !yaEsta.has(clave(e.nombre)));
  EQUIPOS = [...out, ...eg, ...(ALIAS.extras || [])];
  log(`equipos cargados: ${out.filter(e => e.div === 'Primera').length} de Primera, ${out.filter(e => e.div === 'Segunda').length} de Segunda, ${eg.length} de Espacio Gamer`);
}
function buscarEquipo(texto, autor) {
  if (autor && APR.autores[autor]) { const n = APR.autores[autor]; return { ...(EQUIPOS.find(e => e.nombre === n) || { nombre: n, div: '?', logo: null }), score: 1, via: 'conocido' }; }
  return matchEquipo(texto, EQUIPOS, { ...ALIAS.alias, ...APR.alias });
}

// Equipo escrito a propósito por Juan ("+ 23:40 comunicaciones cantera", "F ok <equipo>"): si no coincide
// entero con un equipo de 1ra/2da, va el nombre tal cual lo escribió (nunca uno parecido: "comunicaciones
// cantera" no es "Comunicaciones"), con el escudo del más parecido, que suele ser el mismo club.
function equipoEscrito(txt) {
  const al = { ...ALIAS.alias, ...APR.alias };
  const ex = buscarEquipoExacto(txt, EQUIPOS, al);
  if (ex?.dudoso) return { dudoso: ex.dudoso };
  if (ex) return { nombre: ex.nombre, div: ex.div, logo: ex.logo };
  const nombre = txt.trim().replace(/\s+/g, ' ').replace(/(^|\s)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
  return { nombre, div: '?', logo: matchEquipo(txt, EQUIPOS, al)?.logo || null };
}

// ── Firestore: agregar el amistoso a calendario/estado.custom (arrayUnion atómico) ─────────
function entradaAmistoso(p) {
  const f = { tipo: 'partido', date: st.fecha, time: p.slot, rival: nombreSitio(p.equipo.nombre), league: 'Amistoso', instancia: '', isHome: true };
  if (p.equipo.logo) f.badge = p.equipo.logo;
  return { mapValue: { fields: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v } : { stringValue: v }])) } };
}
// Horarios ya ocupados hoy: se leen TODOS los partidos del día con la misma lógica que la
// convocatoria (getTodayMatches: oficiales VPN/VPUG/11x11 + amistosos cargados), abriendo la
// página publicada. Un horario está ocupado si hay un partido que empieza a menos de 20 min.
// Rivales de los próximos 2 días en el calendario (Juan, 2026-10-21: no ofrecerle amistoso a quien enfrentamos mañana o
// pasado; caso InfinitX, que jugamos el jueves por Espacio Gamer). Misma fuente que la placa del vivo: placa-envivo --json.
let proximos = [];
const normEquipo = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\b(e-?sports?|esp|fc|cf|club|dep|deportivo|atl|atletico)\b/g, '').replace(/[^a-z0-9]/g, '');
function rivalProximo(nombre) {
  const a = normEquipo(nombre);
  if (a.length < 3) return null;
  return proximos.find(p => { const b = normEquipo(p.rival); return b.length >= 3 && (a === b || (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a)))); }) || null;
}
async function cargarProximos() {
  proximos = [];
  for (const d of [1, 2]) {
    const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + d * 864e5));
    // placa-envivo a veces sale con código ≠ 0 en Windows después de imprimir bien el JSON: se usa la salida igual
    const out = await new Promise(res => execFile(process.execPath, [path.join(ROOT, 'scripts', 'placa-envivo.mjs'), '--json', '--fecha', fecha], { cwd: ROOT, timeout: 60000 }, (e, so) => res(String(so || ''))));
    try { for (const p of JSON.parse(out.trim().split('\n').pop() || '[]')) if (p.liga !== 'Amistoso') proximos.push({ ...p, fecha }); } catch {}
  }
  log('rivales de los próximos 2 días:', proximos.map(p => `${p.fecha.slice(5)} ${p.rival} (${p.liga})`).join(' | ') || 'ninguno');
}
const diaDe = f => { const d = new Date(f + 'T12:00:00'); return `${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };

async function leerOcupadosDelSitio() {
  let partidos = null;
  try {
    const { chromium } = await import('playwright');
    const b = await chromium.launch({ executablePath: CHROME });
    const pg = await b.newPage();
    await pg.goto('https://topsecret.ar/convocatoria.html?vista&t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
    await pg.waitForTimeout(8000);
    partidos = await pg.evaluate(() => typeof getTodayMatches === 'function' ? getTodayMatches().map(m => ({ rival: m.rival, time: m.time, league: m.league })) : null);
    await b.close();
  } catch (e) { log('no pude leer los partidos del día desde la convocatoria:', e.message.split('\n')[0]); }
  if (!partidos) {
    // Respaldo: solo los partidos cargados a mano en Firestore.
    try {
      const d = await (await fetch('https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado')).json();
      partidos = (d.fields?.custom?.arrayValue?.values || []).map(v => v.mapValue.fields)
        .filter(x => x.date?.stringValue === st.fecha && (!x.tipo || x.tipo.stringValue === 'partido'))
        .map(x => ({ rival: x.rival?.stringValue, time: x.time?.stringValue, league: x.league?.stringValue }));
    } catch (e) { log('tampoco pude leer Firestore:', e.message); partidos = []; }
  }
  const min = t => { const [h, m] = String(t || '').split(':').map(Number); return h * 60 + m; };
  for (const slot of SLOTS) {
    if (st.confirmados[slot]) continue;
    const choca = partidos.find(p => p.time && Math.abs(min(p.time) - min(slot)) < 20);
    if (choca) st.confirmados[slot] = choca.rival + (choca.league && choca.league !== 'Amistoso' ? ' (' + choca.league + ')' : '');
  }
  save();
  partidosHoy = partidos;
  log('partidos del día:', partidos.map(p => p.time + ' ' + p.rival + ' ' + (p.league || '')).join(' | ') || 'ninguno');
}

async function cargarEnSitio(p) {
  // Sin escudo en VPN (equipo de otra liga o corregido a mano): buscarlo en VPUG y 11x11.
  if (!p.equipo.logo) { const e = await buscarEscudo(p.equipo.nombre).catch(() => null); if (e) { p.equipo.logo = e.logo; log(`escudo de ${p.equipo.nombre} tomado de ${e.fuente}`); } }
  if (PRUEBA) { log('[prueba] no se carga en el sitio:', p.equipo.nombre, p.slot); return true; }
  const r = await fetch('https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents:commit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{ transform: { document: FS_DOC, fieldTransforms: [{ fieldPath: 'custom', appendMissingElements: { values: [entradaAmistoso(p)] } }] } }] }),
  });
  if (!r.ok) { log('Firestore error', r.status, (await r.text()).slice(0, 200)); return false; }
  return true;
}

// ── WhatsApp ────────────────────────────────────────────────────────────────
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => p && fs.existsSync(p));
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(ROOT, 'scripts', '.wa-personal') }),
  authTimeoutMs: 120000,
  puppeteer: { headless: true, executablePath: CHROME, protocolTimeout: 180000, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
    args: ['--no-first-run', '--disable-extensions', '--disable-gpu'] },
});
let yo = null, yoLid = null, grupoId = null;

client.on('qr', async qr => {
  const png = path.join(DIR, 'qr-vincular.png');
  await QRCode.toFile(png, qr, { width: 420, margin: 2 });
  log('Escaneá el QR con tu celular: WhatsApp → Dispositivos vinculados → Vincular un dispositivo. Imagen:', png);
  if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', png]);
});
client.on('authenticated', () => { log('sesión autenticada'); cerrarNovedades(); });
// WhatsApp Web a veces muestra "Novedades en WhatsApp Web" con un botón Continuar: mientras está
// abierta, el bot nunca queda listo (2026-10-08 quedó colgado así). Se cierra sola durante 5 min.
async function cerrarNovedades() {
  for (let i = 0; i < 60 && !yo; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const ok = await client.pupPage.evaluate(() => {
        const d = document.querySelector('[role=dialog]') || document.body;
        if (!/novedades|what.?s new/i.test(d.innerText || '')) return false;
        const b = [...d.querySelectorAll('button,[role=button]')].find(e => /^(continuar|continue|ok|entendido)$/i.test(e.innerText.trim()));
        if (b) b.click();
        return !!b;
      });
      if (ok) log('cerré la ventana de novedades de WhatsApp Web');
    } catch (e) {}
  }
}
client.on('auth_failure', m => log('fallo de autenticación:', m));
client.on('disconnected', r => { log('desconectado:', r); process.exit(1); });

async function avisar(texto) { await client.sendMessage(yo, texto); }

// Si en 10 min no quedó listo (ventana que no se cierra, WhatsApp colgado), salir con error para que
// el vigilante (amistosos-vigilado.mjs) lo relance.
setTimeout(() => { if (!yo) { log('no quedó listo en 10 min, salgo para reintentar'); process.exit(1); } }, 600000);

client.on('ready', async () => {
  yo = client.info.wid._serialized;
  try { yoLid = await client.pupPage.evaluate(() => window.require('WAWebUserPrefsMeUser').getMaybeMeLidUser()?._serialized || null); } catch (e) {}
  log('conectado como', client.info.pushname, yo, yoLid || '(sin lid)', PRUEBA ? '(MODO PRUEBA)' : '');
  vigilarConexion();
  if (PRUEBA || AUTO || st.auto) { dormido = false; await arrancarBusqueda(); }   // --prueba / --auto, o reinicio en un día en que Juan ya lo mandó a buscar
  else log('esperando "busca amistosos"');
  await comandosAtrasados();
});

// Comandos que Juan mandó mientras el bot estaba trabado o reiniciándose (2026-10-26: "+22:40 iago" se perdió).
// Solo desde el último comando procesado hoy: en el primer arranque del día no se repite nada.
async function comandosAtrasados() {
  if (!st.ultimoComando) return;
  try {
    const msgs = await client.pupPage.evaluate((ids, desde) => ids.flatMap(id => {
      const chat = window.require('WAWebCollections').Chat.get(id);
      return (chat?.msgs.getModelsArray() || []).filter(m => m.t > desde && m.id.fromMe && m.body).map(m => ({ t: m.t, body: m.body }));
    }), [yo, yoLid].filter(Boolean), st.ultimoComando);
    const pendientes = msgs.filter(m => !esAviso(m.body)).sort((a, b) => a.t - b.t);
    for (const m of pendientes) {
      log('comando atrasado:', m.body.slice(0, 40).replace(/\n/g, ' '));
      st.ultimoComando = m.t; save();
      for (const linea of m.body.split('\n').map(l => l.trim()).filter(Boolean)) await comando(linea);
    }
  } catch (e) { log('no pude leer comandos atrasados:', e.message.split('\n')[0]); }
}

// WhatsApp Web puede quedar conectado pero sin pasar mensajes (2026-10-26: de 21:08 a 21:28 no llegó nada, ni
// comandos ni respuestas, sin error ni "desconectado"). Cada 2 min: si la página no responde o no está
// CONNECTED dos veces seguidas, sale con error
// y el vigilante (amistosos-vigilado.mjs) lo relanza; al volver lee pedidos, respuestas y comandos atrasados.
function vigilarConexion() {
  let fallos = 0;
  const conTope = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('sin respuesta')), ms))]);
  setInterval(async () => {
    let estado;
    try { estado = await conTope(client.getState(), 30000); } catch (e) { estado = e.message; }
    if (estado !== 'CONNECTED') {
      if (++fallos >= 2) { log('WhatsApp no responde o no está conectado:', estado, '— salgo para reiniciar'); process.exit(1); }
      return;
    }
    fallos = 0;
  }, 120000);
}

async function arrancarBusqueda(motivo = '') {
  // No se usa getChats()/msg.getChat(): fallan con contactos @lid en whatsapp-web.js. El grupo se
  // busca directo en las colecciones internas de WhatsApp Web (ver buscarGrupo).
  await buscarGrupo();
  await cargarEquipos();
  await leerOcupadosDelSitio();
  await cargarProximos();
  if (!libre()) {
    log('todos los horarios de hoy ya están ocupados' + (PRUEBA ? ' — en prueba igual aviso los pedidos para ver la detección' : ''));
    if (!PRUEBA) {
      await avisar(`🕵️ Hoy no hace falta buscar amistosos: los horarios ya están cubiertos.\n${SLOTS.map(s => `${s} ${st.confirmados[s]}`).join('\n')}`);
      setTimeout(() => process.exit(0), 3000); return;
    }
  }
  await avisar(`${motivo ? motivo + '\n' : ''}🕵️ *Bot de amistosos ${+process.env.AMISTOSOS_REINICIO ? 'reiniciado' : 'activo'}*${PRUEBA ? ' (prueba)' : ''}${auto ? ' (automático)' : ''}\nHorarios: ${SLOTS.map(s => st.confirmados[s] ? `~${s}~ ${st.confirmados[s]}` : s).join(' · ')}\nTe aviso cada pedido del grupo con una letra. Respondé acá: *A* (ofrecer), *A 23:20*, *A no*, *A ok*, o *estado*. Si coordinaste uno vos: *+ 23:00 Equipo*.\nPara pararlo: *apagar* (por hoy) o *desactivar* (hasta que mandes *activar*).`);
  if (!grupoId) await avisar('⚠️ No encontré el grupo de amistosos en tus chats: lo voy a reconocer cuando llegue un mensaje.');
  await revisarAtrasados();
  await revisarRespuestas();
}

// Busca el grupo por nombre en las colecciones internas de WhatsApp Web.
async function buscarGrupo() {
  try {
    const g = await client.pupPage.evaluate(src => {
      const re = new RegExp(src, 'i');
      const c = window.require('WAWebCollections').Chat.getModelsArray()
        .find(c => c.id.server === 'g.us' && re.test(c.formattedTitle || c.name || c.groupMetadata?.subject || ''));
      return c ? { id: c.id._serialized, nombre: c.formattedTitle || c.name } : null;
    }, GRUPO.source);
    if (g) { grupoId = g.id; log('grupo encontrado:', g.nombre, g.id); }
    else log('grupo no encontrado entre los chats cargados');
  } catch (e) { log('no pude buscar el grupo:', e.message.split('\n')[0]); }
}

// Pedidos que llegaron al grupo antes de que arrancara el bot (hoy desde las 12:00 ART).
async function revisarAtrasados() {
  if (!grupoId) return;
  try {
    // Con "busca amistosos": solo lo que llegó desde el comando (Juan, 2026-10-21: leía pedidos viejos del mediodía)
    const desde = Math.max(Math.floor(new Date(`${hoy()}T12:00:00-03:00`).getTime() / 1000), st.buscaDesde || 0);
    const msgs = await client.pupPage.evaluate((id, desde) => {
      const chat = window.require('WAWebCollections').Chat.get(id);
      return (chat?.msgs.getModelsArray() || []).filter(m => m.t >= desde && !m.id.fromMe && m.body)
        .map(m => ({ id: m.id._serialized || String(m.id), body: m.body, author: m.author?._serialized || m.id.participant?._serialized || '', notify: m.notifyName || m.senderObj?.pushname || '' }));
    }, grupoId, desde);
    log(`mensajes de hoy en el grupo: ${msgs.length}`);
    for (const m of msgs) await pedidoGrupo({ id: { _serialized: m.id }, body: m.body, from: grupoId, author: m.author, _data: { notifyName: m.notify } });
  } catch (e) { log('no pude leer mensajes anteriores:', e.message.split('\n')[0]); }
}

// Respuestas a ofertas que llegaron con el bot apagado (p. ej. durante un reinicio).
async function revisarRespuestas() {
  for (const p of Object.values(st.pedidos).filter(p => p.estado === 'ofrecido')) {
    try {
      const msgs = await client.pupPage.evaluate((ids, desde) => ids.flatMap(id => {
        const chat = window.require('WAWebCollections').Chat.get(id);
        return (chat?.msgs.getModelsArray() || []).filter(m => m.t >= desde && !m.id.fromMe && m.body).map(m => m.body);
      }), [p.autor, p.autorTel].filter(Boolean), Math.floor((p.ofrecidoTs || 0) / 1000));
      if (msgs.length) { log('respuesta atrasada de', p.contacto, ':', msgs.join(' / ').slice(0, 80)); await respuestaPrivada({ from: p.autor, body: msgs.join(' ') }); }
    } catch (e) { log('no pude leer el chat de', p.contacto, e.message.split('\n')[0]); }
  }
}

// Mensajes nuevos (de otros y míos).
// Mensajes que manda el bot a Juan (no son comandos)
const esAviso = b => b.startsWith('🕵️') || /^(📣|✅|💬|⚠️|📋|🗑️|🎉|⏱️|⚡|📅|🔁)/u.test(b);
client.on('message_create', async msg => {
  try {
    if (!yo) return;
    // 1) Comandos de Juan en su chat consigo mismo.
    // El chat consigo mismo puede venir como @c.us o como @lid (yoLid).
    if (msg.fromMe && (msg.to === yo || msg.to === yoLid || msg.to === msg.from) && !esAviso(msg.body)) {
      if (msg.timestamp) { st.ultimoComando = Math.max(st.ultimoComando || 0, msg.timestamp); save(); }
      // Varios comandos en un mismo mensaje, uno por línea ("B\nC no\nD no").
      for (const linea of msg.body.split('\n').map(l => l.trim()).filter(Boolean)) await comando(linea);
      return;
    }
    if (msg.fromMe || dormido) return;
    // 2) Pedidos en el grupo (después de las 22:00 ya no se buscan rivales nuevos).
    if (msg.from.endsWith('@g.us') && await esGrupoAmistosos(msg)) return cerrado ? undefined : pedidoGrupo(msg);
    // 3) Respuestas por privado de equipos a los que les ofrecimos.
    if (!msg.from.endsWith('@g.us')) return respuestaPrivada(msg);
  } catch (e) { log('error:', e.message); }
});

const gruposVistos = {};
const vistos = new Set();                                             // ids de mensajes ya procesados
async function esGrupoAmistosos(msg) {
  if (grupoId) return msg.from === grupoId;
  if (msg.from in gruposVistos) return gruposVistos[msg.from];
  let nombre = '';
  try {
    nombre = await client.pupPage.evaluate(id => {
      const c = window.require('WAWebCollections').Chat.get(id);
      return c ? (c.formattedTitle || c.name || c.groupMetadata?.subject || '') : '';
    }, msg.from);
  } catch (e) { log('no pude leer el nombre del grupo', msg.from, e.message.split('\n')[0]); }
  if (!nombre) return false;                                           // no cachear un fallo
  gruposVistos[msg.from] = GRUPO.test(nombre);
  if (gruposVistos[msg.from]) { grupoId = msg.from; log('grupo encontrado:', nombre); }
  return gruposVistos[msg.from];
}

async function pedidoGrupo(msg) {
  // Sin id (algunas lecturas del grupo no lo traen) se identifica por autor + texto
  const mid = msg.id?._serialized || `${msg.author || msg.from}|${String(msg.body).slice(0, 80)}`;
  // Los ids también quedan en el estado del día: al reiniciar, revisarAtrasados relee el grupo y sin esto
  // volvía a ofrecerle a un pedido ya atendido (2026-10-26: a Argentinos Jrs, que ya jugaba 23:00, dos veces).
  st.vistos = st.vistos || [];
  if (mid && (vistos.has(mid) || st.vistos.includes(mid))) return;
  if (mid) { vistos.add(mid); st.vistos.push(mid); save(); }
  if (st.buscaDesde && msg.timestamp && msg.timestamp < st.buscaDesde) return;   // anterior a "busca amistosos"
  if (!PIDE.test(msg.body)) { log('mensaje del grupo sin pedido:', msg.body.slice(0, 60).replace(/\n/g, ' ')); return; }
  if (!libre() && !PRUEBA) return;
  let contacto = {};
  try { contacto = await msg.getContact(); } catch (e) {}
  if (!contacto.pushname && !contacto.name) contacto = { pushname: msg._data?.notifyName || '' };
  const autor = msg.author || msg.from;
  if (Object.values(st.pedidos).some(p => p.autor === autor && p.estado !== 'descartado')) return;   // ya lo tenemos
  const nombreContacto = contacto.pushname || contacto.name || '';
  const breve = msg.body.slice(0, 50).replace(/\n/g, ' ');
  // El equipo sale del encabezado del pedido, nunca de las líneas de horario (ahí están los rivales
  // que ya tiene agendados: "22:40 vs instituto senior").
  const { equipoTxt, horas } = leerPedido(msg.body);
  // Si el encabezado nombra un equipo, manda ese nombre: nunca se cambia por el del contacto ni por
  // el equipo aprendido de ese número ("Cuervo" ofreciendo a CADU no es San Lorenzo).
  const nombraEquipo = equipoTxt.replace(RELLENO, ' ').replace(/[^\p{L}]/gu, '').length >= 3;
  let eq = nombraEquipo ? buscarEquipo(equipoTxt) : buscarEquipo(nombreContacto, autor);
  // Nombra un equipo que no está en VPN 1ra/2da ni en Espacio Gamer, o no dice equipo ni horarios → no se
  // ignora: se le consulta a Juan (división sin identificar = nunca va solo). No dice equipo pero sí
  // horarios ("23 / 23.40") → se le pregunta al rival cuál es.
  if (!eq && (nombraEquipo || !horas.length)) {
    log('pedido sin división identificada, consulto a Juan:', nombraEquipo ? equipoTxt : nombreContacto, '|', breve);
    eq = nombraEquipo ? equipoEscrito(equipoTxt) : { nombre: nombreContacto || 'sin nombre', div: '?', logo: null };
    if (eq.dudoso) eq = { nombre: equipoTxt.trim(), div: '?', logo: null };
  }
  // Ya nos dijo que no hoy (ese equipo o ese contacto): ni se le ofrece ni se avisa de nuevo
  const rech = yaRechazo(eq && !eq.dudoso ? eq.nombre : null, autor, msg.author);
  if (rech) { log('pedido ignorado (hoy ya nos rechazó):', eq?.nombre || nombreContacto, '|', breve); return; }
  // Rival de los próximos 2 días en el calendario: no se le ofrece amistoso
  // Ya tenemos amistoso con ese equipo hoy: no se le ofrece otro horario
  const yaJuega = eq && !eq.dudoso && Object.entries(st.confirmados).find(([, n]) => n.toLowerCase() === eq.nombre.toLowerCase());
  if (yaJuega) { log(`pedido ignorado (ya jugamos ${yaJuega[0]}):`, eq.nombre, '|', breve); return; }
  const prox = eq && !eq.dudoso ? rivalProximo(eq.nombre) : null;
  if (prox) {
    log(`pedido ignorado (rival del ${prox.fecha}):`, eq.nombre, '|', breve);
    return avisar(`📅 Pedido de *${eq.nombre}*: jugamos contra ellos el *${diaDe(prox.fecha)}* a las ${prox.hora} (${prox.liga}), no le ofrezco amistoso.`);
  }
  const preguntar = !eq;
  // Si el pedido lista horarios, solo sirven los que tiene libres y nosotros también.
  const susLibres = horas.length ? horas.filter(h => h.libre).map(h => h.hora).filter(h => SLOTS.includes(h) && !ocupados().has(h)) : null;
  if (susLibres && !susLibres.length) { log('pedido ignorado (sin horarios libres en común):', eq?.nombre || nombreContacto, '|', breve); return; }
  const id = letra(st.siguiente++);
  st.pedidos[id] = { autor, contacto: nombreContacto, texto: msg.body.slice(0, 300), equipo: eq && !eq.dudoso ? { nombre: eq.nombre, div: eq.div, logo: eq.logo } : null, estado: 'nuevo', ts: Date.now() };
  if (preguntar) st.pedidos[id].preguntar = true;
  const p = st.pedidos[id];
  if (susLibres) p.horas = susLibres;
  p.propuesto = proponerHora(id);
  save();
  log(`pedido ${id}:`, nombreContacto, '→', eq ? `${eq.nombre} (${eq.div})` : 'equipo sin identificar', p.propuesto ? `propongo ${p.propuesto}` : 'en espera');
  const susHoras = p.horas ? (p.horas.length === 1 ? 'la única que tiene libre' : `tiene libres ${p.horas.join(', ')}`) : '';
  const corrida = p.propuesto && (p.horas || SLOTS.filter(s => !ocupados().has(s)))[0] !== p.propuesto ? `; ${(p.horas || SLOTS.filter(s => !ocupados().has(s)))[0]} ya se la propuse a otro pedido` : '';
  const oferta = p.propuesto ? `Le ofrezco *${p.propuesto}*${susHoras || corrida ? ` (${[susHoras, corrida.slice(2)].filter(Boolean).join('; ')})` : ''}.`
    : `_En espera_: ${p.horas ? `sus horarios (${p.horas.join(', ')})` : 'los horarios libres'} ya están propuestos a otros pedidos. Si se libera alguno, se lo ofrezco.`;
  const vaSolo = auto && p.propuesto && (preguntar || (eq && !eq.dudoso && eq.div !== '?'));
  if (vaSolo) await avisar(`📣 *Pedido ${id}* — ${preguntar ? 'equipo sin nombre (se lo pregunto)' : `*${eq.nombre}* (${eq.div})`}
“${msg.body.slice(0, 160)}”
⚡ Le ofrezco *${p.propuesto}* automáticamente. Si querés frenarlo: *${id} no*.`);
  else await avisar(`📣 *Pedido ${id}* — ${preguntar ? '_no dice qué equipo es: se lo pregunto al ofrecerle_' : eq.dudoso ? `¿${eq.dudoso.join(' o ')}?` : eq.div === '?' ? `*${eq.nombre}* _(no lo encuentro en VPN ni en Espacio Gamer: ¿le ofrezco?)_` : `*${eq.nombre}* (${eq.div})`}\n${nombreContacto ? `De: ${nombreContacto}\n` : ''}“${msg.body.slice(0, 200)}”\n\n${oferta} Respondé *${id}* para mandar, *${id} 23:20* para otro horario${eq?.dudoso ? `, *${id} <equipo>* para definir el equipo` : ''}, o *${id} no*.`);
  if (auto && p.propuesto && (preguntar || (!eq.dudoso && eq.div !== '?'))) await ofrecer(id, null, null);
}

// Cuando cambian los horarios (se ofrece, confirma, rechaza o descarta algo), revisa los pedidos que
// esperan: el que tenía propuesto un horario que ya no está, pasa a otro libre; el que estaba en espera,
// toma el que se liberó. En --auto se lo ofrece solo; si no, le avisa a Juan.
async function reacomodar() {
  for (const [id, p] of Object.entries(st.pedidos).filter(([, p]) => p.estado === 'nuevo' && !p.manual).sort((a, b) => a[1].ts - b[1].ts)) {
    if (p.propuesto && !reservados(id).has(p.propuesto)) continue;
    const antes = p.propuesto, nueva = proponerHora(id);
    if (nueva === antes) continue;
    p.propuesto = nueva; save();
    log(`${id}: propuesta ${antes || 'en espera'} → ${nueva || 'en espera'}`);
    if (auto && nueva && (p.preguntar || (p.equipo && p.equipo.div !== '?'))) { await ofrecer(id, null, null); continue; }
    await avisar(nueva ? `📣 *${id}* ${p.equipo?.nombre || ''}: ${antes ? `${antes} ya no está libre` : 'se liberó un horario'}, ahora le ofrezco *${nueva}*. Respondé *${id}* para mandar o *${id} no*.`
      : `📣 *${id}* ${p.equipo?.nombre || ''}: ${antes} ya no está libre y no le queda otro de sus horarios. Queda en espera.`);
  }
}

// Antes de escribirle solo a alguien, se lee su chat privado de hoy (Juan, 2026-10-21): si ya le
// ofrecimos (el bot o Juan desde el celular) y dijo que no, o no contestó, no se le vuelve a escribir.
async function hablamosHoy(p) {
  const desde = Date.parse(`${st.fecha}T00:00:00-03:00`) / 1000;
  let msgs = [];
  for (const cid of [p.autor, p.autorTel].filter(Boolean)) {
    try {
      const chat = await client.getChatById(cid);
      msgs = (await chat.fetchMessages({ limit: 40 })).filter(m => m.timestamp >= desde && m.body);
      if (msgs.length) break;
    } catch (e) {}
  }
  const i = msgs.findIndex(m => m.fromMe && /jugamos|amistoso|top secret|\b\d{1,2}[:.]\d{2}\b/i.test(m.body));
  if (i < 0) return null;
  const resp = msgs.slice(i + 1).filter(m => !m.fromMe).map(m => m.body).join('\n');
  if (!resp) return { motivo: 'hoy ya le ofrecimos y no contestó' };
  if (NO.test(resp) && !SI.test(resp)) return { motivo: `hoy ya nos dijo que no: “${resp.slice(0, 80)}”`, rechazo: true };
  return { motivo: `hoy ya hablamos: “${resp.slice(0, 80)}”` };
}

// manual = lo pidió Juan con un comando ("B", "B 23hs"): ahí manda él y se escribe igual.
async function ofrecer(id, slot, equipoTxt, manual = false) {
  const p = st.pedidos[id];
  if (!p) return avisar(`⚠️ No existe el pedido ${id}.`);
  if (!manual && p.estado === 'nuevo') {
    const previo = yaRechazo(p.equipo?.nombre, p.autor, p.autorTel) || await hablamosHoy(p);
    if (previo) {
      if (previo.rechazo) registrarRechazo(p, previo.motivo);
      p.estado = 'descartado'; save();
      log(`${id}: no le escribo (${previo.motivo})`);
      await avisar(`🚫 ${id} ${p.equipo?.nombre || p.contacto || ''}: no le escribo, ${previo.motivo}. Si igual querés: *${id}*.`);
      return reacomodar();
    }
  }
  if (equipoTxt) {
    const eq = equipoEscrito(equipoTxt);
    if (eq.dudoso) return avisar(`⚠️ ¿${eq.dudoso.join(' o ')}? Mandá el nombre más completo: *${id} <equipo>*.`);
    p.equipo = eq;
    APR.autores[p.autor] = p.equipo.nombre;                           // la próxima vez lo reconoce por el número
    if (p.contacto) APR.alias[p.contacto.toLowerCase()] = p.equipo.nombre;
    guardarAprendido();
  }
  if (equipoTxt && p.estado === 'ofrecido' && !slot) return avisar(`📋 ${id}: equipo *${p.equipo.nombre}*. Si confirma, respondé *${id} ok*.`);
  if (!p.equipo && !p.preguntar) return avisar(`⚠️ ${id}: decime qué equipo es (*${id} <equipo>*).`);
  slot = slot || (p.estado === 'ofrecido' ? p.slot : (p.propuesto && !reservados(id).has(p.propuesto) ? p.propuesto : proponerHora(id)));
  if (!slot && p.horas) return avisar(`⚠️ ${id}: sus horarios (${p.horas.join(', ')}) ya están tomados o propuestos a otro pedido. Si querés otro: *${id} 23:40*.`);
  if (!slot) return avisar('⚠️ Ya no quedan horarios libres.');
  if (ocupados().has(slot) && p.slot !== slot) return avisar(`⚠️ ${slot} ya está tomado u ofrecido. Libres: ${SLOTS.filter(s => !ocupados().has(s)).join(', ') || 'ninguno'}.`);
  const texto = `Buenas, soy de Top Secret, jugamos a las ${slot} hs?${p.equipo ? '' : ' Qué equipo son?'}`;
  if (PRUEBA) log(`[prueba] no se envía a ${p.contacto}: ${texto}`);
  else await client.sendMessage(p.autor, texto);
  Object.assign(p, { estado: 'ofrecido', slot, ofrecidoTs: Date.now() });
  // El mismo contacto puede contestar como @lid o con su número @c.us: se guardan los dos.
  if (p.autor && !p.autorTel) try { p.autorTel = await client.pupPage.evaluate(id => window.require('WAWebCollections').Contact.get(id)?.phoneNumber?._serialized || null, p.autor); } catch (e) {}
  save();
  await avisar(`✅ ${id}: le escribí a ${p.contacto || p.equipo?.nombre || 'el contacto'}${p.equipo ? ` (${p.equipo.nombre})` : ''} → “${texto}”${PRUEBA ? ' _(prueba: no enviado)_' : ''}`);
  await reacomodar();
}

// rival = true cuando confirma el bot por la respuesta del rival: si quedó cargado, le contesta "Anotado".
async function confirmar(id, slot, rival = false) {
  const p = st.pedidos[id];
  if (!p || !p.equipo) return avisar(`⚠️ ${id}: no hay pedido con equipo definido.`);
  p.slot = slot || p.slot || libre();
  if (!p.slot) return avisar('⚠️ No quedan horarios libres.');
  if (st.confirmados[p.slot] && st.confirmados[p.slot] !== p.equipo.nombre) return avisar(`⚠️ ${p.slot} ya está confirmado con ${st.confirmados[p.slot]}.`);
  const ok = await cargarEnSitio(p);
  p.estado = 'confirmado'; st.confirmados[p.slot] = p.equipo.nombre; save();
  let anotado = '';
  if (rival && ok) {
    const texto = `Anotado, ${p.slot} 👍`;
    if (PRUEBA) { log(`[prueba] no se envía a ${p.contacto}: ${texto}`); anotado = ' _(prueba: “Anotado” no enviado)_'; }
    else {
      try { await client.sendMessage(p.autor, texto); anotado = ` Le contesté “${texto}”.`; }
      catch (e) { log('no pude mandar el anotado:', e.message.split('\n')[0]); anotado = ' ⚠️ No le pude contestar “Anotado”: escribile vos.'; }
    }
  }
  await avisar(`✅ *Amistoso confirmado*: Top Secret vs *${p.equipo.nombre}* a las *${p.slot}*.${ok ? ' Cargado en el calendario y la convocatoria.' : ' ⚠️ No pude cargarlo en el sitio: agregalo a mano (al rival no le contesté).'}${anotado}\nQuedan: ${SLOTS.filter(s => !st.confirmados[s]).join(', ') || 'ninguno 🎉'}`);
  await reacomodar();
  if (SLOTS.every(s => st.confirmados[s])) { await avisar('🎉 Los 4 horarios están cubiertos. Apago el bot.'); setTimeout(() => process.exit(0), 3000); }
}

async function respuestaPrivada(msg) {
  const [id, p] = Object.entries(st.pedidos).find(([, p]) => ['ofrecido', 'vencido'].includes(p.estado) && (p.autor === msg.from || p.autorTel === msg.from)) || [];
  if (!p) {
    if (msg.from !== 'status@broadcast' && Object.values(st.pedidos).some(p => p.estado === 'ofrecido')) log('privado de', msg.from, 'sin oferta pendiente');   // sin el texto: es un chat privado
    return;
  }
  const txt = msg.body || '';
  if (!txt.trim() || (msg.type && msg.type !== 'chat')) {
    const que = { ptt: 'un audio', audio: 'un audio', sticker: 'un sticker', image: 'una imagen', video: 'un video' }[msg.type] || 'algo que no es texto';
    return avisar(`💬 ${id} ${p.equipo?.nombre || p.contacto || ''} mandó ${que}: fijate en el chat. Si confirma, *${id} ok*; si no, *${id} no*.`);
  }
  // La gente contesta en varios mensajes seguidos ("amigo" / "ya conseguí"): se juntan los que llegan
  // con menos de 20 s entre uno y otro, y se evalúan juntos.
  const b = juntando[id] || (juntando[id] = { txts: [] });
  b.txts.push(txt);
  clearTimeout(b.timer);
  b.timer = setTimeout(() => { delete juntando[id]; evaluarRespuesta(id, b.txts.join('\n')).catch(e => log('error:', e.message)); }, 20000);
}
const juntando = {};

// Horarios que nombra una respuesta ("23:40", "11.40", "23hs", "a las 23"), en formato de SLOTS.
// Un número suelto solo cuenta si es 21–23 ("somos 11" no es un horario).
function horasEn(txt) {
  const out = [];
  for (const m of txt.matchAll(/(?<![\d:.])(\d{1,2})(?:[:.](\d{2}))?\s*(hs|hrs|h)?(?![\d:.])/gi)) {
    let h = +m[1];
    if (!m[2] && !m[3] && !(h >= 21 && h <= 23)) continue;
    if (h < 12) h += 12;
    const hora = `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
    if (!out.includes(hora)) out.push(hora);
  }
  return out;
}
// Horarios que este pedido puede tomar: ni confirmados, ni pasados, ni ofrecidos/propuestos a otro pedido.
function libresPara(id) {
  const otros = new Set([...Object.keys(st.confirmados), ...SLOTS.filter(tarde), ...Object.entries(st.pedidos).filter(([k]) => k !== id)
    .map(([, q]) => q.estado === 'ofrecido' ? q.slot : q.estado === 'nuevo' ? q.propuesto : null).filter(Boolean)]);
  return SLOTS.filter(h => !otros.has(h));
}
// "No" al amistoso entero (ya consiguieron, otro día): no se repregunta. Cualquier otro "no" puede ser
// solo al horario: se le pregunta una vez por el siguiente libre (Juan, 2026-10-21).
const NO_DEFINITIVO = /ya (tengo|tenemos|tienen|consegu\p{L}*|cerr\p{L}*|arregl\p{L}*|estamos|est[aá] (cubierto|completo|lleno))|consegu[ií]\p{L}* (rival|equipo|otro)|completos?|cubiertos?|otro d[ií]a|mañana|hoy no|no (jugamos|vamos a jugar|hay equipo|llegamos|juntamos|somos)/iu;
const NO_HORA = /(esa|ese|a esa) (hora|horario)|m[aá]s (tarde|temprano)|antes|otro horario|otra hora/iu;
function horaComando(txt) {
  for (const m of txt.matchAll(/(?<![\d:.])(\d{1,2})(?:[:.](\d{2}))?\s*(hs|hrs|h)?(?![\d:.\p{L}])/giu)) {
    let h = +m[1]; if (h < 12) h += 12;
    const hora = `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
    if (!m[2] && !m[3] && !SLOTS.includes(hora)) continue;   // "sub 21" es un equipo, no un horario
    return { hora, sinHora: (txt.slice(0, m.index) + ' ' + txt.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim() };
  }
  return { hora: null, sinHora: txt };
}
// Juan: "B preguntale qué tiene libre" (o "preguntale…" sin letra, con una sola oferta abierta)
async function preguntarLibre(id) {
  const p = st.pedidos[id];
  if (!p || !['ofrecido', 'vencido', 'nuevo'].includes(p.estado)) return avisar(`⚠️ ${id}: no hay oferta abierta.`);
  const libres = libresPara(id);
  if (!libres.length) return avisar('⚠️ No nos queda ningún horario libre.');
  const texto = `Qué horario tienen libre? Nosotros tenemos ${libres.join(', ')}`;
  await mandarAlRival(p, texto);
  Object.assign(p, { estado: 'ofrecido', slot: libres.includes(p.slot) ? p.slot : libres[0], repregunta: true, ofrecidoTs: Date.now() });
  save();
  await avisar(`✅ ${id}: le pregunté a ${p.equipo?.nombre || p.contacto} → “${texto}”${PRUEBA ? ' _(prueba: no enviado)_' : ''}`);
  return reacomodar();
}
async function mandarAlRival(p, texto) {
  if (PRUEBA) return log(`[prueba] no se envía a ${p.contacto}: ${texto}`);
  await client.sendMessage(p.autor, texto);
}

async function evaluarRespuesta(id, txt) {
  const p = st.pedidos[id];
  if (!p || !['ofrecido', 'vencido'].includes(p.estado)) return;
  log(`${id}: llegó la respuesta del rival`);
  p.respondio = true; save();
  // Pedido sin equipo: la respuesta a "Qué equipo son?" trae el nombre.
  if (!p.equipo) {
    const eq = matchEquipo(txt, EQUIPOS, { ...ALIAS.alias, ...APR.alias });
    if (eq && !eq.dudoso) {
      p.equipo = { nombre: eq.nombre, div: eq.div, logo: eq.logo }; save();
      APR.autores[p.autor] = eq.nombre; guardarAprendido();
      log(`${id}: el contacto es de ${eq.nombre} (${eq.div})`);
      // resultó ser un rival de los próximos 2 días: no se confirma solo, decide Juan
      const prox = rivalProximo(eq.nombre);
      if (prox) return avisar(`📅 ${id} resultó ser *${eq.nombre}*, que jugamos el *${diaDe(prox.fecha)}* (${prox.liga}). No lo confirmo solo: *${id} ok* si igual querés jugar, *${id} no* si no.`);
    }
  }
  const quien = p.equipo ? `*${p.equipo.nombre}*` : `${p.contacto || 'el contacto'} _(equipo sin reconocer)_`;
  if (p.estado === 'vencido') {
    const libreAun = !reservados(id).has(p.slot);
    return avisar(`💬 ${id} ${quien} respondió tarde (ya había liberado ${p.slot}): “${txt.slice(0, 200)}”\n${libreAun ? `${p.slot} sigue libre: si confirma, *${id} ok${p.equipo ? '' : ' <equipo>'}*.` : `${p.slot} ya está tomado: si querés otro, *${id} ok 23:40${p.equipo ? '' : ' <equipo>'}*.`} Si no, *${id} no*.`);
  }
  // Negociación de horario (en automático y con el equipo conocido; si no, decide Juan como siempre)
  if (auto && p.equipo && !NO_DEFINITIVO.test(txt)) {
    const libres = libresPara(id);
    const propuesta = horasEn(txt).find(h => h !== p.slot);
    const dijoNo = NO.test(txt) || NO_HORA.test(txt);
    // Propone otro horario ("23:40?", "dale pero 23:20") y lo tenemos libre → se confirma ese
    if (propuesta && !dijoNo && libres.includes(propuesta)) {
      log(`${id}: ${p.equipo.nombre} propone ${propuesta} (libre): confirmo`);
      return confirmar(id, propuesta, true);
    }
    // Propone uno que no tenemos, o rechaza el horario: una sola repregunta con lo que nos queda
    if ((propuesta || (dijoNo && !SI.test(txt))) && !p.repregunta) {
      const otros = libres.filter(h => h !== p.slot && h !== propuesta);
      if (otros.length) {
        const sig = (propuesta ? null : otros.find(h => minutos(h) > minutos(p.slot))) || otros[0];
        const texto = propuesta && !dijoNo
          ? `A las ${propuesta} no tenemos, nos queda ${otros.join(', ')}. Les sirve alguno?`
          : `Y a las ${sig}? Si no, qué horario tienen libre? (tenemos ${otros.join(', ')})`;
        await mandarAlRival(p, texto);
        const antes = p.slot;
        Object.assign(p, { slot: propuesta && !dijoNo ? null : sig, repregunta: true, ofrecidoTs: Date.now() });
        if (!p.slot) p.slot = otros[0];   // se reserva uno mientras contesta
        save();
        log(`${id}: no le sirve ${propuesta ? `(propone ${propuesta})` : antes}, repregunto: ${texto}`);
        await avisar(`🔁 ${id} *${p.equipo.nombre}*: “${txt.slice(0, 150)}” → le pregunté “${texto}”${PRUEBA ? ' _(prueba: no enviado)_' : ''}. Si querés cortarlo: *${id} no*.`);
        return reacomodar();
      }
    }
  }
  const otraHora = (txt.match(/\b(\d{1,2})[:.](\d{2})(?!\d)/) || [])[0];
  if (SI.test(txt) && !NO.test(txt) && !DUDA.test(txt) && (!otraHora || otraHora.replace('.', ':') === p.slot)) {
    if (!p.equipo) return avisar(`💬 ${id} ${quien} dijo que sí: “${txt.slice(0, 200)}”\nNo sé qué equipo es: respondé *${id} ok <equipo>* para confirmarlo, o *${id} no*.`);
    log(`${id}: respuesta positiva de ${p.equipo.nombre}: ${txt}`);
    return confirmar(id, null, true);
  }
  if (NO.test(txt) && !SI.test(txt) && !DUDA.test(txt)) {
    p.estado = 'rechazado'; registrarRechazo(p, txt);
    await avisar(`💬 ${id} ${quien} dijo que no: “${txt.slice(0, 200)}”. Libero ${p.slot}.`);
    return reacomodar();
  }
  await avisar(`💬 ${id} ${quien} respondió: “${txt.slice(0, 250)}”\nSi confirma, respondé *${id} ok${p.equipo ? '' : ' <equipo>'}* (o *${id} ok 23:20* si es otro horario). Si no, *${id} no*.`);
}

async function comando(body) {
  log('comando:', body.slice(0, 40));
  if (/^(apagar|desactivar)$/i.test(body)) {
    const siempre = /^desactivar$/i.test(body);
    if (siempre) fs.writeFileSync(OFF_FILE, JSON.stringify({ desde: new Date().toISOString() }));
    dormido = true;
    log(siempre ? 'desactivado por WhatsApp' : 'apagado por hoy por WhatsApp');
    return avisar(siempre
      ? '🕵️ *Bot de amistosos desactivado.* No arranca solo hasta que mandes *activar* (o *busca amistosos* para un día puntual; escucha lunes a jueves de 17:00 a 22:00).'
      : '🕵️ *Bot de amistosos apagado por hoy.* Mañana arranca solo a las 17:00. Si querés que vuelva hoy, mandá *activar*.');
  }
  // "busca amistosos": arranca YA en automático por el resto del día (pedido de Juan, 2026-10-21)
  if (/^(busc[aá](r|me|nos)?|conseguime|conseguinos)\s+(amistosos?|rivales?)\b/i.test(body)) {
    // solo los días sin partidos de liga en el calendario
    await leerOcupadosDelSitio();
    if (hayLiga()) {
      const liga = partidosHoy.filter(p => p.league && p.league !== 'Amistoso').map(p => `${p.time} ${p.rival} (${p.league === '11x11' ? 'Espacio Gamer' : p.league})`);
      log('busca amistosos: hoy hay liga, no busco');
      return avisar(`📅 Hoy hay partidos de liga, no busco amistosos:\n${liga.join('\n')}`);
    }
    auto = true; st.auto = true; if (!st.buscaDesde) st.buscaDesde = Math.floor(Date.now() / 1000); save();
    log('busca amistosos: modo automático por hoy, con los pedidos que lleguen desde ahora');
    if (dormido) { dormido = false; return arrancarBusqueda(); }       // el aviso de arranque ya dice "(automático)"
    await avisar('⚡ *Modo automático por hoy.* Ofrezco solo a los equipos reconocidos, cargo los que confirman y te consulto solo lo dudoso. Para frenarlo: *apagar*.');
    for (const [id, p] of Object.entries(st.pedidos).filter(([, p]) => p.estado === 'nuevo' && !p.manual && p.propuesto && p.ts >= st.buscaDesde * 1000 && (p.preguntar || (p.equipo && p.equipo.div !== '?'))))
      await ofrecer(id, null, null);
    return;
  }
  if (/^(activar|prender)$/i.test(body)) {
    const estaba = dormido || fs.existsSync(OFF_FILE);
    fs.rmSync(OFF_FILE, { force: true });
    if (!dormido) return avisar(estaba ? '🕵️ Listo: vuelve a arrancar solo (lunes a jueves desde las 17:00, los días sin partidos de liga). Hoy ya estaba buscando.' : '🕵️ El bot ya está activo.');
    dormido = false;
    log('activado por WhatsApp');
    return arrancarBusqueda();
  }
  if (dormido) {
    if (/^estado$/i.test(body)) return avisar(`🕵️ Bot ${fs.existsSync(OFF_FILE) ? 'desactivado' : 'apagado por hoy'}. Mandá *busca amistosos* para que busque en automático (o *activar* para el modo con tu aprobación).`);
    return;
  }
  const m = body.match(/^([A-Z]{1,2}\d?)\b\s*(.*)$/i);
  // Amistoso que coordinó Juan por su cuenta: "+ 23:00 Chacarita" (o "agregar 23:00 Chacarita").
  const man = body.match(/^(?:\+|agregar)\s*(\d{1,2})[:.](\d{2})\s+(.+)$/i);
  if (man) {
    const hora = `${man[1].padStart(2, '0')}:${man[2]}`, txt = man[3].trim();
    const eq = equipoEscrito(txt);
    if (eq.dudoso) return avisar(`⚠️ ¿${eq.dudoso.join(' o ')}? Mandá el nombre más completo: *+ ${hora} <equipo>*.`);
    const id = letra(st.siguiente++);
    st.pedidos[id] = { autor: '', contacto: '', texto: body, manual: true, estado: 'nuevo', ts: Date.now(),
      equipo: eq };
    save();
    await confirmar(id, hora);
    // Fuera de los horarios fijos: ocupa el horario fijo que quede a menos de 20 min.
    const min = t => { const [h, mm] = t.split(':').map(Number); return h * 60 + mm; };
    for (const s of SLOTS) if (s !== hora && !st.confirmados[s] && Math.abs(min(s) - min(hora)) < 20) st.confirmados[s] = st.pedidos[id].equipo.nombre;
    save();
    return reacomodar();
  }
  if (/^estado$/i.test(body)) {
    const lista = Object.entries(st.pedidos).filter(([, p]) => p.estado !== 'descartado').map(([id, p]) => `${id} ${p.equipo ? p.equipo.nombre : '?'} — ${p.estado}${p.slot ? ' ' + p.slot : ''}`);
    return avisar(`📋 Horarios: ${SLOTS.map(s => `${s} ${st.confirmados[s] ? '✅ ' + st.confirmados[s] : (ocupados().has(s) ? '⏳' : 'libre')}`).join(' · ')}\n${lista.join('\n') || 'Sin pedidos.'}`);
  }
  if (/^pregunt/i.test(body)) {
    const abiertos = Object.entries(st.pedidos).filter(([, p]) => ['ofrecido', 'vencido'].includes(p.estado)).sort((a, b) => b[1].ofrecidoTs - a[1].ofrecidoTs);
    if (abiertos.length !== 1) return avisar(abiertos.length ? `⚠️ ¿A cuál? ${abiertos.map(([k, p]) => `*${k} preguntale* (${p.equipo?.nombre || p.contacto})`).join(', ')}` : '⚠️ No hay ofertas abiertas.');
    return preguntarLibre(abiertos[0][0]);
  }
  if (!m || !st.pedidos[m[1].toUpperCase()]) return;
  const id = m[1].toUpperCase(), resto = m[2].trim();
  // horario en cualquier forma ("23:40", "11.40", "23hs"); un número suelto ("b 23") solo si es uno de los horarios
  const { hora, sinHora } = horaComando(resto);
  if (hora && !SLOTS.includes(hora)) return avisar(`⚠️ ${hora} no es uno de los horarios (${SLOTS.join(', ')}).`);
  // "B preguntale qué tiene libre": le pregunta al rival qué horario tiene, con los que nos quedan
  if (/^pregunt/i.test(resto)) return preguntarLibre(id);
  if (/^no\b/i.test(resto)) {
    // descartado después de que el rival contestó = rechazo: no se le vuelve a escribir hoy
    if (st.pedidos[id].respondio) registrarRechazo(st.pedidos[id], 'Juan lo descartó después de su respuesta');
    st.pedidos[id].estado = 'descartado'; save(); await avisar(`🗑️ ${id} descartado.`); return reacomodar(); }
  if (/^ok\b/i.test(resto)) {
    // "F ok Los Pibes" / "F ok 23:40 Los Pibes": define el equipo y confirma.
    const eqTxt = sinHora.replace(/^ok\b/i, '').trim();
    if (eqTxt) {
      const p = st.pedidos[id], eq = equipoEscrito(eqTxt);
      if (eq.dudoso) return avisar(`⚠️ ¿${eq.dudoso.join(' o ')}? Mandá el nombre más completo: *${id} ok <equipo>*.`);
      p.equipo = eq;
      if (p.autor) { APR.autores[p.autor] = p.equipo.nombre; guardarAprendido(); }
      save();
    }
    return confirmar(id, hora);
  }
  const equipoTxt = sinHora.trim();
  return ofrecer(id, hora, equipoTxt || null, true);
}

// Corte automático a las 22:00 ART (pedido de Juan 2026-10-13: la búsqueda es de 17 a 22).
// Desde las 22:00 no toma pedidos nuevos del grupo, pero sigue atendiendo los comandos de Juan ("+23:40 Lizzard CF")
// y las respuestas a ofertas abiertas hasta las 23:45 (2026-10-21: a las 22:06 Juan pasó un amistoso y el bot ya se había apagado).
let cerrado = false;
setInterval(() => {
  const h = horaArt();
  if (h >= '23:45') { log('23:45: fin del día, apago.'); process.exit(0); }
  if (h >= '22:00' && !cerrado) { cerrado = true; log('22:00: no busco más pedidos; sigo atendiendo comandos y respuestas hasta las 23:45.'); }
  if (!dormido) vencerOfertas().catch(e => log('error:', e.message));
}, 60000);

// Oferta sin respuesta en 30 min: se libera el horario para otro pedido. Si el rival contesta
// después, el aviso a Juan dice que llegó tarde (ver respuestaPrivada).
const VENCE_MIN = 30;
async function vencerOfertas() {
  const vencidos = Object.entries(st.pedidos).filter(([, p]) => p.estado === 'ofrecido' && (Date.now() - (p.ofrecidoTs || 0) > VENCE_MIN * 60000 || tarde(p.slot)));
  if (!vencidos.length) return;
  for (const [id, p] of vencidos) {
    p.estado = 'vencido'; save();
    const motivo = tarde(p.slot) ? `no contestó y ya es la hora de ${p.slot}` : `no contestó en ${VENCE_MIN} min: libero *${p.slot}*`;
    log(`${id}: ${motivo.replace(/\*/g, '')}`);
    await avisar(`⏱️ ${id} ${p.equipo?.nombre || p.contacto || ''} ${motivo}.`);
  }
  await reacomodar();
}
process.on('SIGINT', async () => { try { await client.destroy(); } catch {} process.exit(0); });

// Al recuperar la sesión, WhatsApp Web a veces recarga la página mientras se inyecta el bot
// ("Execution context was destroyed"): reintentar el arranque.
async function iniciar(intento = 1) {
  log('iniciando WhatsApp personal', PRUEBA ? '(MODO PRUEBA)' : '', intento > 1 ? '— intento ' + intento : '');
  try { await client.initialize(); }
  catch (e) {
    if (intento >= 4) { log('no pude iniciar WhatsApp:', e.message.split('\n')[0]); process.exit(1); }
    log('falló el arranque (' + e.message.split('\n')[0].slice(0, 80) + '), reintento en 5 s');
    try { await client.destroy(); } catch {}
    await new Promise(r => setTimeout(r, 5000));
    return iniciar(intento + 1);
  }
}
process.on('unhandledRejection', e => log('error no manejado:', String(e && e.message || e).split('\n')[0]));
iniciar();
