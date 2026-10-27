#!/usr/bin/env node
/**
 * Baja las fotos/archivos que alguien le mandó a Juan por su WhatsApp PERSONAL (misma sesión que
 * scripts/wa-enviar.mjs y scripts/amistosos.mjs: no correrlo con el bot de amistosos prendido).
 *
 *   node scripts/wa-bajar.mjs --de 59893798044 [--horas 24] [--dir fuentes/wa/recibidos]
 *
 * Lista también los textos recibidos en ese lapso. Guarda cada archivo con fecha + nombre original.
 */
import wweb from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';
import { ROOT } from './lib/env.mjs';

const { Client, LocalAuth } = wweb;
const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; };
const de = opt('--de');
const horas = +(opt('--horas') || 24);
const dir = path.resolve(ROOT, opt('--dir') || 'fuentes/wa/recibidos');
if (!de) { console.error('Uso: --de <teléfono> [--horas 24] [--dir carpeta]'); process.exit(1); }

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => p && fs.existsSync(p));
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(ROOT, 'scripts', '.wa-personal') }),
  authTimeoutMs: 120000,
  puppeteer: { headless: true, executablePath: CHROME, protocolTimeout: 180000, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
    args: ['--no-first-run', '--disable-extensions', '--disable-gpu'] },
});
client.on('qr', () => { console.error('La sesión pide QR: vincularla primero con scripts/amistosos.mjs.'); process.exit(1); });
const LIMITE = +(process.env.WA_TIMEOUT || 300000);
setTimeout(() => { console.error(`WhatsApp no terminó en ${LIMITE / 60000} min.`); process.exit(1); }, LIMITE);

client.on('ready', async () => {
  try {
    await new Promise(r => setTimeout(r, 15000));   // recién conectado, WhatsApp Web todavía sincroniza
    const desde = Math.floor(Date.now() / 1000) - horas * 3600;
    if (de === 'todos') {
      // Solo lista los archivos recibidos en cualquier chat (para encontrar por dónde llegó algo).
      const lista = await client.pupPage.evaluate(t => window.require('WAWebCollections').Msg.getModelsArray()
        .filter(m => m.t >= t && !['chat', 'revoked', 'e2e_notification', 'notification_template', 'gp2', 'ciphertext', 'protocol'].includes(m.type))
        .sort((a, b) => a.t - b.t)
        .map(m => `${new Date(m.t * 1000).toISOString()} ${m.type} ${m.id.fromMe ? 'yo' : 'recibido'} ${m.id.remote?._serialized || m.id.remote} ${m.notifyName || ''} ${m.filename || ''} ${m.mimetype || ''}`), desde);
      console.log(lista.join('\n') || 'Nada.');
      await client.destroy(); process.exit();
    }
    const id = await client.getNumberId(de.replace(/\D/g, ''));
    if (!id) throw new Error(`${de} no tiene WhatsApp`);
    // El contacto puede estar como @c.us y como @lid (getChatById rompe con @lid): se buscan los
    // mensajes recibidos de cualquiera de los dos en la colección de WhatsApp Web.
    // Se abre el chat (como en wa-enviar) para que WhatsApp Web cargue los mensajes completos, con su mediaData.
    const ids = await client.pupPage.evaluate(async cus => {
      const W = window.require('WAWebCollections');
      const ids = new Set([cus]);
      const c = W.Contact.get(cus);
      if (c?.lid) ids.add(c.lid._serialized || String(c.lid));
      for (const ct of W.Contact.getModelsArray()) if (ct.phoneNumber && (ct.phoneNumber._serialized || String(ct.phoneNumber)) === cus) ids.add(ct.id._serialized);
      const ch = W.Chat.getModelsArray().filter(ch => ids.has(ch.id._serialized)).sort((a, b) => (b.t || 0) - (a.t || 0))[0];
      if (ch) await window.require('WAWebCmd').Cmd.openChatBottom({ chat: ch });
      return [...ids];
    }, id._serialized);
    await new Promise(r => setTimeout(r, 8000));
    const msgs = await client.pupPage.evaluate((ids, t) => window.require('WAWebCollections').Msg.getModelsArray()
      .filter(m => m.t >= t && ids.includes(m.id?.remote?._serialized || String(m.id?.remote)))
      .sort((a, b) => a.t - b.t)
      .map(m => ({ id: m.id._serialized, t: m.t, yo: !!m.id.fromMe, type: m.type, body: m.type === 'chat' ? m.body : (m.caption || ''), filename: m.filename || '' })), ids, desde);
    if (!msgs.length) console.log(`Sin mensajes recibidos de ${de} en las últimas ${horas} h.`);
    fs.mkdirSync(dir, { recursive: true });
    for (const m of msgs) {
      const hora = new Date(m.t * 1000).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
      if (m.type === 'revoked') continue;
      if (m.yo || m.type === 'chat') { console.log(`[${hora}] ${m.yo ? 'Juan' : 'recibido'} ${m.type}: ${m.body}`); continue; }
      // msg.downloadMedia() de whatsapp-web.js 1.34.7 no anda con la WhatsApp Web actual (2026-10-27):
      // se usa lo mismo que la rama main de GitHub (resolveMediaBlob): bajar y leer la caché en memoria.
      const media = await client.pupPage.evaluate(async id => {
        const W = window.require('WAWebCollections');
        // Puede haber dos modelos con el mismo id (uno "invis" de tipo chat): se toma el que trae la media.
        const iguales = W.Msg.getModelsArray().filter(m => m.id._serialized === id);
        const msg = iguales.find(m => m.mediaData) || iguales[0];
        if (!msg?.mediaData) return { error: 'sin media cargada' };
        await msg.downloadMedia({ downloadEvenIfExpensive: true, rmrReason: 1, isUserInitiated: true });
        const etapa = msg.mediaData.mediaStage;
        if (etapa.includes('ERROR') || etapa === 'FETCHING') return { error: `etapa ${etapa}` };
        // Primero el blob propio del mensaje: buscar en la caché por un filehash vacío devolvía otro
        // archivo (2026-10-27 bajó un sticker en vez de la imagen).
        const fh = msg.mediaObject?.filehash || msg.filehash;
        const blob = msg.mediaObject?.mediaBlob?.forceToBlob()
          || (fh && window.require('WAWebMediaInMemoryBlobCache').InMemoryMediaBlobCache.get(fh));
        if (!blob) return { error: 'sin blob' };
        if (msg.size && Math.abs(blob.size - msg.size) > 16) return { error: `tamaño no coincide (${blob.size} vs ${msg.size})` };
        const u8 = new Uint8Array(await blob.arrayBuffer()); let bin = '';
        for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
        return { data: btoa(bin), mimetype: msg.mimetype, filename: msg.filename || '' };
      }, m.id).catch(e => ({ error: e.message }));
      if (!media?.data) { console.log(`[${hora}] ${m.type} sin bajar: ${media?.error}`); continue; }
      const ext = (media.mimetype.split('/')[1] || 'bin').split(';')[0].replace('jpeg', 'jpg');
      const nombre = `${new Date(m.t * 1000).toISOString().slice(0, 19).replace(/[:T]/g, '-')}-${(media.filename || m.filename || m.type).replace(/[^\w.\- ]/g, '_')}`;
      const archivo = path.join(dir, /\.\w+$/.test(nombre) ? nombre : `${nombre}.${ext}`);
      fs.writeFileSync(archivo, Buffer.from(media.data, 'base64'));
      console.log(`[${hora}] ${m.type}${m.body ? ` "${m.body}"` : ''} → ${path.relative(ROOT, archivo)}`);
    }
  } catch (e) { console.error('Error:', e.message); process.exitCode = 1; }
  await client.destroy();
  process.exit();
});
client.initialize();
