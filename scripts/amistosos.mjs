#!/usr/bin/env node
/**
 * Bot de amistosos (semi-automático) sobre el WhatsApp PERSONAL de Juan, vinculado como un
 * dispositivo más (whatsapp-web.js, sesión en scripts/.wa-personal/, gitignored). No tiene nada
 * que ver con el bot de Losinno (otro número, otra sesión).
 *
 *   node scripts/amistosos.mjs            corre hasta llenar los horarios o hasta las 23:45 ART
 *   node scripts/amistosos.mjs --prueba   no manda nada a terceros ni carga en el sitio: solo avisa a Juan
 *   --horarios 23:00,23:20                buscar solo esos horarios (por defecto 22:40, 23:00, 23:20, 23:40)
 *   --auto                                le escribe solo a los equipos reconocidos (sin esperar la aprobación de Juan)
 * Nombres mal escritos: scripts/lib/equipos-match.mjs + scripts/amistosos-alias.json. Cuando Juan corrige
 * un equipo ("A Chacarita"), el bot recuerda ese número de teléfono → equipo en fuentes/amistosos/aprendidos.json.
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
import { buscarEquipo as matchEquipo } from './lib/equipos-match.mjs';
import { buscarEscudo } from './lib/escudos.mjs';

const { Client, LocalAuth } = wweb;
const PRUEBA = process.argv.includes('--prueba');
const AUTO = process.argv.includes('--auto');
const TODOS = ['22:40', '23:00', '23:20', '23:40'];
const hArg = process.argv.indexOf('--horarios');
const SLOTS = hArg > 0 ? process.argv[hArg + 1].split(',').map(h => h.trim().replace('.', ':').padStart(5, '0')) : TODOS;
if (SLOTS.some(h => !/^\d{2}:\d{2}$/.test(h))) { console.error('Horarios inválidos:', SLOTS.join(', ')); process.exit(1); }
const GRUPO = /amistosos.*vpn/i;
const PIDE = /(amistos|busc|disponib|libre|rival|jugar|partido|\bhoy\b|\bx\s*1\b|\b\d{1,2}[:.]\d{2}\b|\b2[23]\s*(hs|h)\b)/i;
const SI = /\b(dale+|s[ií]+|ok+|oka|okey|de una|va|vamos|listo|joya|perfecto|confirm\w*|hecho|obvio|genial|bueno|buen[ií]simo|claro|seguro)\b|👍|🤝|✅|💪|👌|🔥/i;
const NO = /\b(no|nop|imposible|ocupad|ya tenemos|ya conseguimos|otro d[ií]a|mañana|no podemos)\b|❌|👎/i;
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
const letra = n => String.fromCharCode(65 + (n % 26)) + (n >= 26 ? Math.floor(n / 26) : '');
const ocupados = () => new Set([...Object.keys(st.confirmados), ...Object.values(st.pedidos).filter(p => p.estado === 'ofrecido').map(p => p.slot)]);
const libre = () => SLOTS.find(s => !ocupados().has(s)) || null;

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
  EQUIPOS = [...out, ...(ALIAS.extras || [])];
  log(`equipos cargados: ${out.filter(e => e.div === 'Primera').length} de Primera, ${out.filter(e => e.div === 'Segunda').length} de Segunda`);
}
function buscarEquipo(texto, autor) {
  if (autor && APR.autores[autor]) { const n = APR.autores[autor]; return { ...(EQUIPOS.find(e => e.nombre === n) || { nombre: n, div: '?', logo: null }), score: 1, via: 'conocido' }; }
  return matchEquipo(texto, EQUIPOS, { ...ALIAS.alias, ...APR.alias });
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
async function leerOcupadosDelSitio() {
  let partidos = null;
  try {
    const { chromium } = await import('playwright');
    const b = await chromium.launch({ executablePath: CHROME });
    const pg = await b.newPage();
    await pg.goto('https://enohcaid.github.io/top-secret/convocatoria.html?vista&t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
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
let yo = null, grupoId = null;

client.on('qr', async qr => {
  const png = path.join(DIR, 'qr-vincular.png');
  await QRCode.toFile(png, qr, { width: 420, margin: 2 });
  log('Escaneá el QR con tu celular: WhatsApp → Dispositivos vinculados → Vincular un dispositivo. Imagen:', png);
  if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', png]);
});
client.on('authenticated', () => log('sesión autenticada'));
client.on('auth_failure', m => log('fallo de autenticación:', m));
client.on('disconnected', r => { log('desconectado:', r); process.exit(1); });

async function avisar(texto) { await client.sendMessage(yo, texto); }

client.on('ready', async () => {
  yo = client.info.wid._serialized;
  log('conectado como', client.info.pushname, yo, PRUEBA ? '(MODO PRUEBA)' : '');
  // No se usa getChats(): con muchos chats falla en whatsapp-web.js. El grupo se reconoce por el
  // nombre cuando llega su primer mensaje (ver esGrupoAmistosos).
  await cargarEquipos();
  await leerOcupadosDelSitio();
  if (!libre()) {
    log('todos los horarios de hoy ya están ocupados' + (PRUEBA ? ' — en prueba igual aviso los pedidos para ver la detección' : ''));
    if (!PRUEBA) {
      await avisar(`🕵️ Hoy no hace falta buscar amistosos: los horarios ya están cubiertos.\n${SLOTS.map(s => `${s} ${st.confirmados[s]}`).join('\n')}`);
      setTimeout(() => process.exit(0), 3000); return;
    }
  }
  await avisar(`🕵️ *Bot de amistosos activo*${PRUEBA ? ' (prueba)' : ''}${AUTO ? ' (automático)' : ''}\nHorarios: ${SLOTS.map(s => st.confirmados[s] ? `~${s}~ ${st.confirmados[s]}` : s).join(' · ')}\nTe aviso cada pedido del grupo con una letra. Respondé acá: *A* (ofrecer), *A 23:20*, *A no*, *A ok*, o *estado*.`);
});

// Mensajes nuevos (de otros y míos).
client.on('message_create', async msg => {
  try {
    if (!yo) return;
    // 1) Comandos de Juan en su chat consigo mismo.
    if (msg.fromMe && msg.to === yo && !msg.body.startsWith('🕵️') && !/^(📣|✅|💬|⚠️|📋)/.test(msg.body)) return comando(msg.body.trim());
    if (msg.fromMe) return;
    // 2) Pedidos en el grupo.
    if (msg.from.endsWith('@g.us') && await esGrupoAmistosos(msg)) return pedidoGrupo(msg);
    // 3) Respuestas por privado de equipos a los que les ofrecimos.
    if (!msg.from.endsWith('@g.us')) return respuestaPrivada(msg);
  } catch (e) { log('error:', e.message); }
});

const gruposVistos = {};
async function esGrupoAmistosos(msg) {
  if (grupoId) return msg.from === grupoId;
  if (msg.from in gruposVistos) return gruposVistos[msg.from];
  let nombre = '';
  try { nombre = (await msg.getChat()).name || ''; } catch (e) {}
  gruposVistos[msg.from] = GRUPO.test(nombre);
  if (gruposVistos[msg.from]) { grupoId = msg.from; log('grupo encontrado:', nombre); }
  return gruposVistos[msg.from];
}

async function pedidoGrupo(msg) {
  if (!PIDE.test(msg.body)) return;
  if (!libre() && !PRUEBA) return;
  const contacto = await msg.getContact();
  const autor = msg.author || msg.from;
  if (Object.values(st.pedidos).some(p => p.autor === autor && p.estado !== 'descartado')) return;   // ya lo tenemos
  const nombreContacto = contacto.pushname || contacto.name || '';
  const eq = buscarEquipo(msg.body + ' ' + nombreContacto, autor);
  const id = letra(st.siguiente++);
  st.pedidos[id] = { autor, contacto: nombreContacto, texto: msg.body.slice(0, 300), equipo: eq && !eq.dudoso ? { nombre: eq.nombre, div: eq.div, logo: eq.logo } : null, estado: 'nuevo', ts: Date.now() };
  const hp = (msg.body.match(/\b(2[23])[:.]([0-5]\d)\b/) || [])[0];
  if (hp && SLOTS.includes(hp.replace('.', ':')) && !ocupados().has(hp.replace('.', ':'))) st.pedidos[id].horaPedida = hp.replace('.', ':');
  save();
  log(`pedido ${id}:`, nombreContacto, '→', eq ? `${eq.nombre} (${eq.div})` : 'equipo sin identificar');
  await avisar(`📣 *Pedido ${id}* — ${eq?.dudoso ? `¿${eq.dudoso.join(' o ')}?` : eq ? `*${eq.nombre}* (${eq.div})` : '_equipo sin identificar_'}\n${nombreContacto ? `De: ${nombreContacto}\n` : ''}“${msg.body.slice(0, 200)}”\n\n${libre() ? `Le ofrezco *${st.pedidos[id].horaPedida || libre()}*${st.pedidos[id].horaPedida ? ' (la que pidió)' : ''}.` : '_Sin horarios libres hoy: solo para ver la detección._'} Respondé *${id}* para mandar, *${id} 23:20* para otro horario${eq && !eq.dudoso ? '' : `, *${id} <equipo>* para definir el equipo`}, o *${id} no*.`);
  if (AUTO && eq && !eq.dudoso && eq.div !== '?') await ofrecer(id, null, null);
}

async function ofrecer(id, slot, equipoTxt) {
  const p = st.pedidos[id];
  if (!p) return avisar(`⚠️ No existe el pedido ${id}.`);
  if (equipoTxt) {
    const eq = matchEquipo(equipoTxt, EQUIPOS, { ...ALIAS.alias, ...APR.alias });
    p.equipo = eq ? { nombre: eq.nombre, div: eq.div, logo: eq.logo } : { nombre: equipoTxt, div: '?', logo: null };
    APR.autores[p.autor] = p.equipo.nombre;                           // la próxima vez lo reconoce por el número
    if (p.contacto) APR.alias[p.contacto.toLowerCase()] = p.equipo.nombre;
    guardarAprendido();
  }
  if (!p.equipo) return avisar(`⚠️ ${id}: decime qué equipo es (*${id} <equipo>*).`);
  slot = slot || (p.estado === 'ofrecido' ? p.slot : (p.horaPedida && !ocupados().has(p.horaPedida) ? p.horaPedida : libre()));
  if (!slot) return avisar('⚠️ Ya no quedan horarios libres.');
  if (ocupados().has(slot) && p.slot !== slot) return avisar(`⚠️ ${slot} ya está tomado u ofrecido. Libres: ${SLOTS.filter(s => !ocupados().has(s)).join(', ') || 'ninguno'}.`);
  const texto = `Buenas, soy de Top Secret, jugamos a las ${slot} hs?`;
  if (PRUEBA) log(`[prueba] no se envía a ${p.contacto}: ${texto}`);
  else await client.sendMessage(p.autor, texto);
  Object.assign(p, { estado: 'ofrecido', slot, ofrecidoTs: Date.now() });
  save();
  await avisar(`✅ ${id}: le escribí a ${p.contacto || p.equipo.nombre} (${p.equipo.nombre}) → “${texto}”${PRUEBA ? ' _(prueba: no enviado)_' : ''}`);
}

async function confirmar(id, slot) {
  const p = st.pedidos[id];
  if (!p || !p.equipo) return avisar(`⚠️ ${id}: no hay pedido con equipo definido.`);
  p.slot = slot || p.slot || libre();
  if (!p.slot) return avisar('⚠️ No quedan horarios libres.');
  if (st.confirmados[p.slot] && st.confirmados[p.slot] !== p.equipo.nombre) return avisar(`⚠️ ${p.slot} ya está confirmado con ${st.confirmados[p.slot]}.`);
  const ok = await cargarEnSitio(p);
  p.estado = 'confirmado'; st.confirmados[p.slot] = p.equipo.nombre; save();
  await avisar(`✅ *Amistoso confirmado*: Top Secret vs *${p.equipo.nombre}* a las *${p.slot}*.${ok ? ' Cargado en el calendario y la convocatoria.' : ' ⚠️ No pude cargarlo en el sitio: agregalo a mano.'}\nQuedan: ${SLOTS.filter(s => !st.confirmados[s]).join(', ') || 'ninguno 🎉'}`);
  if (SLOTS.every(s => st.confirmados[s])) { await avisar('🎉 Los 4 horarios están cubiertos. Apago el bot.'); setTimeout(() => process.exit(0), 3000); }
}

async function respuestaPrivada(msg) {
  const [id, p] = Object.entries(st.pedidos).find(([, p]) => p.estado === 'ofrecido' && p.autor === msg.from) || [];
  if (!p) return;
  const txt = msg.body || '';
  const otraHora = (txt.match(/\b(\d{1,2})[:.](\d{2})\b/) || [])[0];
  if (SI.test(txt) && !NO.test(txt) && (!otraHora || otraHora.replace('.', ':') === p.slot)) {
    log(`${id}: respuesta positiva de ${p.equipo.nombre}: ${txt}`);
    return confirmar(id);
  }
  if (NO.test(txt) && !SI.test(txt)) {
    p.estado = 'rechazado'; save();
    return avisar(`💬 ${id} *${p.equipo.nombre}* dijo que no: “${txt.slice(0, 200)}”. Libero ${p.slot}.`);
  }
  await avisar(`💬 ${id} *${p.equipo.nombre}* respondió: “${txt.slice(0, 250)}”\nSi confirma, respondé *${id} ok* (o *${id} ok 23:20* si es otro horario). Si no, *${id} no*.`);
}

async function comando(body) {
  const m = body.match(/^([A-Z]{1,2}\d?)\b\s*(.*)$/i);
  if (/^estado$/i.test(body)) {
    const lista = Object.entries(st.pedidos).filter(([, p]) => p.estado !== 'descartado').map(([id, p]) => `${id} ${p.equipo ? p.equipo.nombre : '?'} — ${p.estado}${p.slot ? ' ' + p.slot : ''}`);
    return avisar(`📋 Horarios: ${SLOTS.map(s => `${s} ${st.confirmados[s] ? '✅ ' + st.confirmados[s] : (ocupados().has(s) ? '⏳' : 'libre')}`).join(' · ')}\n${lista.join('\n') || 'Sin pedidos.'}`);
  }
  if (!m || !st.pedidos[m[1].toUpperCase()]) return;
  const id = m[1].toUpperCase(), resto = m[2].trim();
  const hora = (resto.match(/\b(\d{1,2})[:.](\d{2})\b/) || [])[0]?.replace('.', ':');
  if (hora && !SLOTS.includes(hora)) return avisar(`⚠️ ${hora} no es uno de los horarios (${SLOTS.join(', ')}).`);
  if (/^no\b/i.test(resto)) { st.pedidos[id].estado = 'descartado'; save(); return avisar(`🗑️ ${id} descartado.`); }
  if (/^ok\b/i.test(resto)) return confirmar(id, hora);
  const equipoTxt = resto.replace(/\b\d{1,2}[:.]\d{2}\b/, '').trim();
  return ofrecer(id, hora, equipoTxt || null);
}

// Corte automático a las 23:45 ART.
setInterval(() => { if (horaArt() >= '23:45') { log('23:45: fin del día, apago.'); process.exit(0); } }, 60000);
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
