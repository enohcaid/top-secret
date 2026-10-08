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
import { buscarEquipo as matchEquipo } from './lib/equipos-match.mjs';
import { buscarEscudo } from './lib/escudos.mjs';
import { leerPedido } from './lib/pedido-amistoso.mjs';

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

client.on('ready', async () => {
  yo = client.info.wid._serialized;
  try { yoLid = await client.pupPage.evaluate(() => window.require('WAWebUserPrefsMeUser').getMaybeMeLidUser()?._serialized || null); } catch (e) {}
  log('conectado como', client.info.pushname, yo, yoLid || '(sin lid)', PRUEBA ? '(MODO PRUEBA)' : '');
  // No se usa getChats()/msg.getChat(): fallan con contactos @lid en whatsapp-web.js. El grupo se
  // busca directo en las colecciones internas de WhatsApp Web (ver buscarGrupo).
  await buscarGrupo();
  await cargarEquipos();
  await leerOcupadosDelSitio();
  if (!libre()) {
    log('todos los horarios de hoy ya están ocupados' + (PRUEBA ? ' — en prueba igual aviso los pedidos para ver la detección' : ''));
    if (!PRUEBA) {
      await avisar(`🕵️ Hoy no hace falta buscar amistosos: los horarios ya están cubiertos.\n${SLOTS.map(s => `${s} ${st.confirmados[s]}`).join('\n')}`);
      setTimeout(() => process.exit(0), 3000); return;
    }
  }
  await avisar(`🕵️ *Bot de amistosos activo*${PRUEBA ? ' (prueba)' : ''}${AUTO ? ' (automático)' : ''}\nHorarios: ${SLOTS.map(s => st.confirmados[s] ? `~${s}~ ${st.confirmados[s]}` : s).join(' · ')}\nTe aviso cada pedido del grupo con una letra. Respondé acá: *A* (ofrecer), *A 23:20*, *A no*, *A ok*, o *estado*. Si coordinaste uno vos: *+ 23:00 Equipo*.`);
  if (!grupoId) await avisar('⚠️ No encontré el grupo de amistosos en tus chats: lo voy a reconocer cuando llegue un mensaje.');
  await revisarAtrasados();
  await revisarRespuestas();
});

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
    const desde = Math.floor(new Date(`${hoy()}T12:00:00-03:00`).getTime() / 1000);
    const msgs = await client.pupPage.evaluate((id, desde) => {
      const chat = window.require('WAWebCollections').Chat.get(id);
      return (chat?.msgs.getModelsArray() || []).filter(m => m.t >= desde && !m.id.fromMe && m.body)
        .map(m => ({ id: m.id._serialized, body: m.body, author: m.author?._serialized || m.id.participant?._serialized || '', notify: m.notifyName || m.senderObj?.pushname || '' }));
    }, grupoId, desde);
    log(`mensajes de hoy en el grupo: ${msgs.length}`);
    for (const m of msgs) await pedidoGrupo({ id: { _serialized: m.id }, body: m.body, from: grupoId, author: m.author, _data: { notifyName: m.notify } });
  } catch (e) { log('no pude leer mensajes anteriores:', e.message.split('\n')[0]); }
}

// Respuestas a ofertas que llegaron con el bot apagado (p. ej. durante un reinicio).
async function revisarRespuestas() {
  for (const p of Object.values(st.pedidos).filter(p => p.estado === 'ofrecido')) {
    try {
      const msgs = await client.pupPage.evaluate((id, desde) => {
        const chat = window.require('WAWebCollections').Chat.get(id);
        return (chat?.msgs.getModelsArray() || []).filter(m => m.t >= desde && !m.id.fromMe && m.body).map(m => m.body);
      }, p.autor, Math.floor((p.ofrecidoTs || 0) / 1000));
      if (msgs.length) { log('respuesta atrasada de', p.contacto, ':', msgs.join(' / ').slice(0, 80)); await respuestaPrivada({ from: p.autor, body: msgs.join(' ') }); }
    } catch (e) { log('no pude leer el chat de', p.contacto, e.message.split('\n')[0]); }
  }
}

// Mensajes nuevos (de otros y míos).
client.on('message_create', async msg => {
  try {
    if (!yo) return;
    // 1) Comandos de Juan en su chat consigo mismo.
    // El chat consigo mismo puede venir como @c.us o como @lid (yoLid).
    if (msg.fromMe && (msg.to === yo || msg.to === yoLid || msg.to === msg.from) && !msg.body.startsWith('🕵️') && !/^(📣|✅|💬|⚠️|📋|🗑️|🎉|⏱️)/u.test(msg.body)) {
      // Varios comandos en un mismo mensaje, uno por línea ("B\nC no\nD no").
      for (const linea of msg.body.split('\n').map(l => l.trim()).filter(Boolean)) await comando(linea);
      return;
    }
    if (msg.fromMe) return;
    // 2) Pedidos en el grupo.
    if (msg.from.endsWith('@g.us') && await esGrupoAmistosos(msg)) return pedidoGrupo(msg);
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
  const mid = msg.id?._serialized;
  if (mid && vistos.has(mid)) return;
  if (mid) vistos.add(mid);
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
  const eq = buscarEquipo(equipoTxt || nombreContacto, autor) || (equipoTxt && nombreContacto ? buscarEquipo(nombreContacto) : null);
  // Nombra un equipo que no es de 1ra/2da → se ignora. No dice equipo pero sí horarios ("23 / 23.40") → se le pregunta cuál es.
  if (!eq && (equipoTxt || !horas.length)) { log('pedido ignorado (equipo fuera de 1ra/2da o sin identificar):', equipoTxt || nombreContacto, '|', breve); return; }
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
  await avisar(`📣 *Pedido ${id}* — ${preguntar ? '_no dice qué equipo es: se lo pregunto al ofrecerle_' : eq.dudoso ? `¿${eq.dudoso.join(' o ')}?` : `*${eq.nombre}* (${eq.div})`}\n${nombreContacto ? `De: ${nombreContacto}\n` : ''}“${msg.body.slice(0, 200)}”\n\n${oferta} Respondé *${id}* para mandar, *${id} 23:20* para otro horario${eq?.dudoso ? `, *${id} <equipo>* para definir el equipo` : ''}, o *${id} no*.`);
  if (AUTO && p.propuesto && (preguntar || (!eq.dudoso && eq.div !== '?'))) await ofrecer(id, null, null);
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
    if (AUTO && nueva && (p.preguntar || (p.equipo && p.equipo.div !== '?'))) { await ofrecer(id, null, null); continue; }
    await avisar(nueva ? `📣 *${id}* ${p.equipo?.nombre || ''}: ${antes ? `${antes} ya no está libre` : 'se liberó un horario'}, ahora le ofrezco *${nueva}*. Respondé *${id}* para mandar o *${id} no*.`
      : `📣 *${id}* ${p.equipo?.nombre || ''}: ${antes} ya no está libre y no le queda otro de sus horarios. Queda en espera.`);
  }
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
  const [id, p] = Object.entries(st.pedidos).find(([, p]) => ['ofrecido', 'vencido'].includes(p.estado) && p.autor === msg.from) || [];
  if (!p) { return; }
  const txt = msg.body || '';
  // Pedido sin equipo: la respuesta a "Qué equipo son?" trae el nombre.
  if (!p.equipo) {
    const eq = matchEquipo(txt, EQUIPOS, { ...ALIAS.alias, ...APR.alias });
    if (eq && !eq.dudoso) {
      p.equipo = { nombre: eq.nombre, div: eq.div, logo: eq.logo }; save();
      APR.autores[p.autor] = eq.nombre; guardarAprendido();
      log(`${id}: el contacto es de ${eq.nombre} (${eq.div})`);
    }
  }
  const quien = p.equipo ? `*${p.equipo.nombre}*` : `${p.contacto || 'el contacto'} _(equipo sin reconocer)_`;
  if (p.estado === 'vencido') {
    const libreAun = !reservados(id).has(p.slot);
    return avisar(`💬 ${id} ${quien} respondió tarde (ya había liberado ${p.slot}): “${txt.slice(0, 200)}”\n${libreAun ? `${p.slot} sigue libre: si confirma, *${id} ok${p.equipo ? '' : ' <equipo>'}*.` : `${p.slot} ya está tomado: si querés otro, *${id} ok 23:40${p.equipo ? '' : ' <equipo>'}*.`} Si no, *${id} no*.`);
  }
  const otraHora = (txt.match(/\b(\d{1,2})[:.](\d{2})(?!\d)/) || [])[0];
  if (SI.test(txt) && !NO.test(txt) && (!otraHora || otraHora.replace('.', ':') === p.slot)) {
    if (!p.equipo) return avisar(`💬 ${id} ${quien} dijo que sí: “${txt.slice(0, 200)}”\nNo sé qué equipo es: respondé *${id} ok <equipo>* para confirmarlo, o *${id} no*.`);
    log(`${id}: respuesta positiva de ${p.equipo.nombre}: ${txt}`);
    return confirmar(id, null, true);
  }
  if (NO.test(txt) && !SI.test(txt)) {
    p.estado = 'rechazado'; save();
    await avisar(`💬 ${id} ${quien} dijo que no: “${txt.slice(0, 200)}”. Libero ${p.slot}.`);
    return reacomodar();
  }
  await avisar(`💬 ${id} ${quien} respondió: “${txt.slice(0, 250)}”\nSi confirma, respondé *${id} ok${p.equipo ? '' : ' <equipo>'}* (o *${id} ok 23:20* si es otro horario). Si no, *${id} no*.`);
}

async function comando(body) {
  log('comando:', body.slice(0, 40));
  const m = body.match(/^([A-Z]{1,2}\d?)\b\s*(.*)$/i);
  // Amistoso que coordinó Juan por su cuenta: "+ 23:00 Chacarita" (o "agregar 23:00 Chacarita").
  const man = body.match(/^(?:\+|agregar)\s*(\d{1,2})[:.](\d{2})\s+(.+)$/i);
  if (man) {
    const hora = `${man[1].padStart(2, '0')}:${man[2]}`, txt = man[3].trim();
    const eq = matchEquipo(txt, EQUIPOS, { ...ALIAS.alias, ...APR.alias });
    if (eq?.dudoso) return avisar(`⚠️ ¿${eq.dudoso.join(' o ')}? Mandá el nombre más completo: *+ ${hora} <equipo>*.`);
    const id = letra(st.siguiente++);
    st.pedidos[id] = { autor: '', contacto: '', texto: body, manual: true, estado: 'nuevo', ts: Date.now(),
      equipo: eq ? { nombre: eq.nombre, div: eq.div, logo: eq.logo } : { nombre: txt, div: '?', logo: null } };
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
  if (!m || !st.pedidos[m[1].toUpperCase()]) return;
  const id = m[1].toUpperCase(), resto = m[2].trim();
  const hora = (resto.match(/\b(\d{1,2})[:.](\d{2})\b/) || [])[0]?.replace('.', ':');
  if (hora && !SLOTS.includes(hora)) return avisar(`⚠️ ${hora} no es uno de los horarios (${SLOTS.join(', ')}).`);
  if (/^no\b/i.test(resto)) { st.pedidos[id].estado = 'descartado'; save(); await avisar(`🗑️ ${id} descartado.`); return reacomodar(); }
  if (/^ok\b/i.test(resto)) {
    // "F ok Los Pibes" / "F ok 23:40 Los Pibes": define el equipo y confirma.
    const eqTxt = resto.replace(/^ok\b/i, '').replace(/\b\d{1,2}[:.]\d{2}\b/, '').trim();
    if (eqTxt) {
      const p = st.pedidos[id], eq = matchEquipo(eqTxt, EQUIPOS, { ...ALIAS.alias, ...APR.alias });
      p.equipo = eq && !eq.dudoso ? { nombre: eq.nombre, div: eq.div, logo: eq.logo } : { nombre: eqTxt, div: '?', logo: null };
      if (p.autor) { APR.autores[p.autor] = p.equipo.nombre; guardarAprendido(); }
      save();
    }
    return confirmar(id, hora);
  }
  const equipoTxt = resto.replace(/\b\d{1,2}[:.]\d{2}\b/, '').trim();
  return ofrecer(id, hora, equipoTxt || null);
}

// Corte automático a las 23:45 ART.
setInterval(() => { if (horaArt() >= '23:45') { log('23:45: fin del día, apago.'); process.exit(0); } vencerOfertas().catch(e => log('error:', e.message)); }, 60000);

// Oferta sin respuesta en 30 min: se libera el horario para otro pedido. Si el rival contesta
// después, el aviso a Juan dice que llegó tarde (ver respuestaPrivada).
const VENCE_MIN = 30;
async function vencerOfertas() {
  const vencidos = Object.entries(st.pedidos).filter(([, p]) => p.estado === 'ofrecido' && Date.now() - (p.ofrecidoTs || 0) > VENCE_MIN * 60000);
  if (!vencidos.length) return;
  for (const [id, p] of vencidos) {
    p.estado = 'vencido'; save();
    log(`${id}: sin respuesta en ${VENCE_MIN} min, libero ${p.slot}`);
    await avisar(`⏱️ ${id} ${p.equipo?.nombre || p.contacto || ''} no contestó en ${VENCE_MIN} min: libero *${p.slot}*.`);
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
