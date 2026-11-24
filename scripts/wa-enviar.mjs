#!/usr/bin/env node
/**
 * Manda texto, fotos y videos desde el WhatsApp PERSONAL de Juan, por la vinculación del consultorio
 * (PracticeMCS/puente-wa, scripts/lib/wa-puente.mjs). Desde 2026-11-24: la sesión propia (.wa-personal) quedó sin
 * uso el 20/11. Se puede correr con el bot de amistosos prendido. El puente tiene que estar andando.
 *
 *   node scripts/wa-enviar.mjs --a 59893798044 --texto "..." foto1.png foto2.png ...
 *   node scripts/wa-enviar.mjs --a 78211505475589@lid foto.png    también acepta el id del chat
 *   node scripts/wa-enviar.mjs --grupo "Top Secret FC" video.mp4   a un grupo, por su nombre exacto
 *   --prueba      manda todo al chat "Mensaje a mí mismo" de Juan en vez de al destinatario
 *
 * El texto va primero y después cada archivo, en orden. Espera que WhatsApp confirme cada uno (ack ≥ 1).
 * Uso típico: reporte de VPUG a Angel (ver docs/conocimiento/reference_wa_enviar_reporte_angel.md).
 */
import fs from 'fs';
import path from 'path';
import { ClientePuente } from './lib/wa-puente.mjs';

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; };
const flag = n => { const i = args.indexOf(n); if (i >= 0) args.splice(i, 1); return i >= 0; };
const PRUEBA = flag('--prueba');
const destino = opt('--a');
const grupo = opt('--grupo');
const texto = opt('--texto');
const archivos = args.map(a => path.resolve(a));
const faltan = archivos.filter(a => !fs.existsSync(a));
if ((!destino && !grupo && !PRUEBA) || (!texto && !archivos.length) || faltan.length) {
  console.error(faltan.length ? `No existen: ${faltan.join(', ')}` : 'Uso: --a <teléfono> | --grupo "<nombre>" [--texto "..."] [--prueba] archivos...');
  process.exit(1);
}

const MIME = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const raros = archivos.filter(a => !MIME[path.extname(a).toLowerCase()]);
if (raros.length) { console.error(`Tipo de archivo no soportado: ${raros.join(', ')}`); process.exit(1); }

const client = new ClientePuente();
// WA_TIMEOUT (ms): límite total.
const LIMITE = +(process.env.WA_TIMEOUT || 300000);
setTimeout(() => { console.error(`WhatsApp no terminó en ${LIMITE / 60000} min.`); process.exit(1); }, LIMITE);

try {
    await client.initialize({ esperaMs: 60000 });
    let chat;
    if (PRUEBA) chat = client.info.wid._serialized;
    else if (grupo) {
      // La lista de chats tarda en cargar después de conectar: reintentar hasta 1 min.
      // Nombre exacto; si no, el único grupo cuyo nombre (sin emojis ni mayúsculas) contiene el pedido.
      // Ojo: c.isGroup no sirve en esta versión de WhatsApp Web (siempre falso); se mira id.server.
      let r;
      for (let i = 0; i < 12 && !chat; i++) {
        r = await client.pupPage.evaluate(n => {
          const norm = t => t.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
          const gs = window.require('WAWebCollections').Chat.getModelsArray().filter(c => c.id.server === 'g.us')
            .map(c => ({ id: c.id._serialized, t: (c.formattedTitle || c.name || c.groupMetadata?.subject || '').trim() }));
          const exacto = gs.find(g => g.t === n);
          const parecidos = gs.filter(g => norm(g.t).includes(norm(n)));
          return { id: exacto?.id || (parecidos.length === 1 ? parecidos[0].id : null), parecidos: parecidos.map(g => g.t) };
        }, grupo);
        chat = r.id;
        if (!chat && r.parecidos.length > 1) throw new Error(`varios grupos parecidos a "${grupo}": ${r.parecidos.join(' | ')}`);
        if (!chat) await new Promise(res => setTimeout(res, 5000));
      }
      if (!chat) throw new Error(`no encontré el grupo "${grupo}"`);
    } else {
      if (destino.includes('@')) chat = destino;
      else {
        chat = await client.pupPage.evaluate(async id => {
          const r = await window.WWebJS.enforceLidAndPnRetrieval?.(id).catch(() => null);
          if (r?.lid || r?.phone) return (r.lid || r.phone)._serialized;
          const wid = window.require('WAWebWidFactory').createWid(id);
          return (await window.require('WAWebQueryExistsJob').queryWidExists(wid))?.wid?._serialized || null;
        }, destino.replace(/D/g, '') + '@c.us');
        if (!chat) throw new Error(`${destino} no tiene WhatsApp`);
      }
    }
    console.log('Enviando a', PRUEBA ? 'mí mismo (prueba)' : grupo ? `grupo "${grupo}" (${chat})` : chat);
    // Mismo envío que PracticeMCS/scripts/whatsapp-video.mjs: WWebJS.sendMessage dentro de la página del puente.
    const mandar = (cuerpo, media) => client.pupPage.evaluate(async (to, cuerpo, media) => {
      const ch = await window.WWebJS.getChat(to, { getAsModel: false });
      if (!ch) return null;
      const msg = await window.WWebJS.sendMessage(ch, cuerpo, { ...(media ? { media } : {}), linkPreview: undefined,
        parseVCards: true, mentionedJidList: [], ignoreQuoteErrors: true, waitUntilMsgSent: false });
      return msg ? (window.WWebJS.getMessageModel(msg)?.id?._serialized || msg.__x_id?._serialized || null) : null;
    }, chat, cuerpo, media);
    const salio = async id => {
      for (let i = 0; i < 60; i++) {
        if (await client.pupPage.evaluate(id => window.require('WAWebCollections').Msg.get(id)?.ack ?? 0, id) >= 1) return true;
        await new Promise(r => setTimeout(r, 2000));
      }
      return false;
    };
    let ok = 0;
    const n = (texto ? 1 : 0) + archivos.length;
    // De a uno y en orden; si uno no sale se corta ahí, para no mandar el resto desordenado.
    for (const a of [...(texto ? [null] : []), ...archivos]) {
      const id = await mandar(a ? '' : texto, a && { mimetype: MIME[path.extname(a).toLowerCase()], data: fs.readFileSync(a).toString('base64'), filename: path.basename(a) });
      if (!id || !await salio(id)) { console.error(`No salió: ${a ? path.basename(a) : 'el texto'}`); break; }
      ok++;
      console.log('  →', a ? path.basename(a) : 'texto');
    }
    console.log(`${ok}/${n} mensajes confirmados por WhatsApp.`);
    if (ok < n) process.exitCode = 1;
  } catch (e) { console.error('Error:', e.message); process.exitCode = 1; }
await client.destroy();
process.exit();
