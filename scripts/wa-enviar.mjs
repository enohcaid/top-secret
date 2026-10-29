#!/usr/bin/env node
/**
 * Manda texto y fotos desde el WhatsApp PERSONAL de Juan (misma sesión que scripts/amistosos.mjs,
 * scripts/.wa-personal/). No correrlo mientras el bot de amistosos está prendido: comparten sesión.
 *
 *   node scripts/wa-enviar.mjs --a 59893798044 --texto "..." foto1.png foto2.png ...
 *   node scripts/wa-enviar.mjs --grupo "Top Secret FC" video.mp4   a un grupo, por su nombre exacto
 *   --prueba      manda todo al chat "Mensaje a mí mismo" de Juan en vez de al destinatario
 *
 * Las fotos van todas juntas en un solo envío, después del texto.
 *
 * Uso típico: reporte de VPUG a Angel (ver docs/conocimiento/project_vpug_t4_pretemporada.md).
 */
import wweb from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';
import { ROOT } from './lib/env.mjs';

const { Client, LocalAuth } = wweb;
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
  console.error(faltan.length ? `No existen: ${faltan.join(', ')}` : 'Uso: --a <teléfono> | --grupo "<nombre>" [--texto "..."] [--prueba] [--pie-archivo] archivos...');
  process.exit(1);
}

const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(p => p && fs.existsSync(p));
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(ROOT, 'scripts', '.wa-personal') }),
  authTimeoutMs: 120000,
  puppeteer: { headless: true, executablePath: CHROME, protocolTimeout: 180000, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false,
    args: ['--no-first-run', '--disable-extensions', '--disable-gpu'] },
});
client.on('qr', () => { console.error('La sesión pide QR: vincularla primero con scripts/amistosos.mjs.'); process.exit(1); });
// WA_TIMEOUT (ms) para darle más margen cuando la sesión tarda en sincronizar (2026-10-26 no llegó en 5 min).
const LIMITE = +(process.env.WA_TIMEOUT || 300000);
setTimeout(() => { console.error(`WhatsApp no terminó en ${LIMITE / 60000} min.`); process.exit(1); }, LIMITE);

client.on('ready', async () => {
  try {
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
      const id = await client.getNumberId(destino.replace(/\D/g, ''));
      if (!id) throw new Error(`${destino} no tiene WhatsApp`);
      chat = id._serialized;
    }
    console.log('Enviando a', PRUEBA ? 'mí mismo (prueba)' : grupo ? `grupo "${grupo}" (${chat})` : chat);
    await new Promise(r => setTimeout(r, 15000));   // recién conectado, WhatsApp Web todavía sincroniza
    const desde = Math.floor(Date.now() / 1000) - 5;
    // whatsapp-web.js 1.34 a veces tira "Data passed to getter must include an id" al leer el mensaje
    // ya enviado (2026-10-13): el envío sale igual. Se tolera y al final se verifica en la colección.
    const enviar = async (contenido, o) => {
      try { await client.sendMessage(chat, contenido, { sendSeen: false, ...o }); }
      catch (e) { if (!/must include an id/.test(e.message)) throw e; }
    };
    let n = 0;
    if (texto) { await enviar(texto); n++; }
    // Fotos: client.sendMessage con MessageMedia no crea el mensaje (1.34.7, 2026-10-13), así que se
    // adjuntan por la interfaz de WhatsApp Web como lo haría una persona: abrir chat → Adjuntar →
    // "Fotos y videos" → enviar. Todas juntas en un solo envío (sin texto por foto).
    if (archivos.length) {
      const p = client.pupPage;
      await p.setViewport({ width: 1400, height: 900 });
      await p.evaluate(async id => {
        const C = window.require('WAWebCollections').Chat;
        const ch = C.get(id) || await window.require('WAWebFindChatAction').findOrCreateLatestChat(window.require('WAWebWidFactory').createWid(id)).then(r => r.chat);
        await window.require('WAWebCmd').Cmd.openChatBottom({ chat: ch });
      }, chat);
      await new Promise(r => setTimeout(r, 2500));
      await p.click('footer [aria-label="Adjuntar"]');
      await new Promise(r => setTimeout(r, 1500));
      // Ojo: el <input type=file accept="image/*"> que está en la página es el de "Nuevo sticker"
      // (2026-10-13 así salieron stickers en vez de fotos). Hay que hacer click en "Fotos y videos"
      // y tomar el selector de archivos que abre ese ítem.
      // El texto del ítem cambia (con/sin tilde, "Fotos y videos" / "Fotos y vídeos" / "Photos & videos"):
      // se busca por patrón y, si no aparece, se listan las opciones del menú para diagnosticar.
      const item = await p.evaluateHandle(() => {
        const el = [...document.querySelectorAll('li, [role=button], [role=menuitem], div, span')]
          .find(e => e.childElementCount <= 3 && /^(fotos\s*(y|&)\s*v[ií]deos|photos\s*(&|and)\s*videos)$/i.test((e.innerText || '').trim()));
        return el ? (el.closest('li,[role=button],[role=menuitem]') || el) : null;
      });
      if (!item.asElement()) {
        const opciones = await p.evaluate(() => [...document.querySelectorAll('[role=menuitem], [role=application] li, li')]
          .map(e => (e.innerText || '').trim()).filter(Boolean).slice(0, 15));
        throw new Error(`no encontré "Fotos y videos" en el menú Adjuntar (opciones: ${opciones.join(' | ') || 'ninguna'})`);
      }
      const [selector] = await Promise.all([p.waitForFileChooser({ timeout: 15000 }), item.asElement().click()]);
      if (!selector.isMultiple() && archivos.length > 1) throw new Error('el selector de "Fotos y videos" no acepta varios archivos');
      await selector.accept(archivos);
      await new Promise(r => setTimeout(r, 3000 + 1500 * archivos.length));
      // El botón cambió de forma más de una vez (2026-10-22 ya no tenía data-icon "send"): se prueba por ícono,
      // por etiqueta y, si no aparece, Enter (en la vista previa también envía). El ack de abajo confirma igual.
      const boton = await p.evaluateHandle(() => {
        const el = document.querySelector('[data-icon*="send"]')
          || [...document.querySelectorAll('[aria-label]')].find(e => /^(enviar|send)$/i.test(e.getAttribute('aria-label').trim()));
        return el?.closest('[role=button],button,div[tabindex]') || el || null;
      });
      if (boton.asElement()) await boton.asElement().click();
      else {
        await p.screenshot({ path: path.join(ROOT, 'fuentes', 'wa-enviar-sin-boton.png') }).catch(() => {});
        console.warn('  sin botón de enviar visible (captura en fuentes/wa-enviar-sin-boton.png): pruebo con Enter');
        await p.keyboard.press('Enter');
      }
      n += archivos.length;
      archivos.forEach(a => console.log('  →', path.basename(a)));
    }
    // Esperar a que todos tengan al menos ack 1 (salieron del teléfono/servidor), hasta 3 min
    let ok = 0;
    for (let i = 0; i < 36; i++) {
      ok = await client.pupPage.evaluate(t => window.require('WAWebCollections').Msg.getModelsArray()
        .filter(m => m.id?.fromMe && m.t >= t && m.ack >= 1 && ['chat', 'image', 'video'].includes(m.type)).length, desde);
      if (ok >= n) break;
      await new Promise(r => setTimeout(r, 5000));
    }
    console.log(`${ok}/${n} mensajes confirmados por WhatsApp.`);
    if (ok < n) process.exitCode = 1;
  } catch (e) { console.error('Error:', e.message); process.exitCode = 1; }
  await client.destroy();
  process.exit();
});
client.initialize();
