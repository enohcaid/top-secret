// Cliente de WhatsApp que usa la vinculación del consultorio (PracticeMCS/puente-wa) en vez de una sesión propia
// (Juan, 2026-11-20: "que el bot de amistosos conecte a través de la vinculación con consultorio, es el mismo número.
// Cuando necesite al bot lo vinculo por ahí"). Imita la parte de whatsapp-web.js que usa amistosos.mjs:
//   on('ready'|'message_create'|'disconnected'), initialize(), info.wid/pushname, pupPage.evaluate(fn, ...args),
//   sendMessage(to, texto), getState(), getChatById(id).fetchMessages({limit}), msg.getContact(), destroy().
// El puente escucha solo en 127.0.0.1 con una clave que renueva en cada arranque (puente-wa/.local.json).
import fs from 'fs';
import path from 'path';
import http from 'http';
import { EventEmitter } from 'events';

const DIR_PUENTE = process.env.PUENTE_WA_DIR || 'D:/proyectos/PracticeMCS/puente-wa';

export class PuenteNoDisponible extends Error {
  constructor(motivo, desvinculado = false) { super(motivo); this.desvinculado = desvinculado; }
}

export class ClientePuente extends EventEmitter {
  constructor() {
    super();
    this.info = null;
    this.pupPage = { evaluate: (fn, ...args) => this._pedir('/evaluar', { fn: fn.toString(), args }).then(r => r.r) };
    this._sse = null;
  }
  _acceso() {
    try { return JSON.parse(fs.readFileSync(path.join(DIR_PUENTE, '.local.json'), 'utf8')); }
    catch { throw new PuenteNoDisponible('el puente de WhatsApp del consultorio no está corriendo'); }
  }
  async _pedir(ruta, cuerpo = {}, ms = 120000) {
    const { puerto, clave } = this._acceso();
    let r;
    try {
      r = await fetch(`http://127.0.0.1:${puerto}${ruta}`, { method: 'POST', headers: { 'x-local': clave, 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo), signal: AbortSignal.timeout(ms) });
    } catch (e) { throw new PuenteNoDisponible('el puente de WhatsApp del consultorio no responde (' + e.message + ')'); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 409) throw new PuenteNoDisponible(j.error === 'desvinculado' ? 'WhatsApp desvinculado en el consultorio' : 'WhatsApp todavía conectándose', j.error === 'desvinculado');
    if (!r.ok) throw new Error(j.error || `puente ${ruta}: ${r.status}`);
    return j;
  }
  // Espera hasta `esperaMs` a que el puente esté listo (puede estar arrancando con la PC). Desvinculado = error al toque.
  async initialize({ esperaMs = 180000 } = {}) {
    const hasta = Date.now() + esperaMs;
    let info;
    for (;;) {
      try {
        info = await this._pedir('/info', {}, 15000);
        if (info.desvinculado) throw new PuenteNoDisponible('WhatsApp desvinculado en el consultorio', true);
        if (info.listo) break;
      } catch (e) { if (e.desvinculado || Date.now() > hasta) throw e; }
      if (Date.now() > hasta) throw new PuenteNoDisponible('WhatsApp del consultorio no quedó listo');
      await new Promise(r => setTimeout(r, 5000));
    }
    this.info = { wid: { _serialized: info.wid }, pushname: info.pushname };
    await this._escuchar();
    this.emit('ready');
  }
  _escuchar() {
    const { puerto, clave } = this._acceso();
    return new Promise((ok, mal) => {
      const req = http.get({ host: '127.0.0.1', port: puerto, path: '/eventos', headers: { 'x-local': clave } }, res => {
        if (res.statusCode !== 200) { mal(new PuenteNoDisponible('eventos: ' + res.statusCode)); return; }
        this._sse = req;
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', c => {
          buf += c;
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const bloque = buf.slice(0, i); buf = buf.slice(i + 2);
            const linea = bloque.split('\n').find(l => l.startsWith('data: '));
            if (!linea) continue;
            try { this.emit('message_create', this._mensaje(JSON.parse(linea.slice(6)))); } catch {}
          }
        });
        res.on('end', () => { if (this._sse) this.emit('disconnected', 'el puente cortó la conexión'); });
        ok();
      });
      req.on('error', e => { if (this._sse) this.emit('disconnected', e.message); else mal(new PuenteNoDisponible(e.message)); });
    });
  }
  _mensaje(m) {
    m.getContact = () => this._pedir('/contacto', { wid: m.author || m.from });
    return m;
  }
  async sendMessage(to, texto) { return { id: { _serialized: (await this._pedir('/enviar', { to, texto })).id } }; }
  async getState() { return (await this._pedir('/estado', {}, 30000)).estado; }
  async getChatById(chat) {
    return { fetchMessages: async ({ limit = 40 } = {}) => (await this._pedir('/mensajes', { chat, limit })).msgs.map(m => this._mensaje(m)) };
  }
  async destroy() { const s = this._sse; this._sse = null; try { s?.destroy(); } catch {} }
}
