// Cliente mínimo de obs-websocket v5 (127.0.0.1:4455, clave OBS_WS_PASSWORD de .env).
//   const obs = await conectarObs(); const r = await obs.pedir('GetStreamStatus'); obs.cerrar();
// CLI: node scripts/stream/obs-ws.mjs <Request> ['{json}']
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import { loadEnv } from '../lib/env.mjs';

loadEnv();
const sha = s => crypto.createHash('sha256').update(s).digest('base64');

export function conectarObs({ puerto = 4455, timeout = 8000 } = {}) {
  return new Promise((ok, mal) => {
    const ws = new WebSocket(`ws://127.0.0.1:${puerto}`);
    const pend = new Map(); let n = 0;
    const t = setTimeout(() => { ws.close(); mal(new Error('OBS no responde en el WebSocket')); }, timeout);
    ws.onerror = () => { clearTimeout(t); mal(new Error('No se pudo conectar a OBS')); };
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.op === 0) {                                          // Hello → Identify
        const a = m.d.authentication;
        const d = { rpcVersion: 1, eventSubscriptions: 0 };
        if (a) d.authentication = sha(sha((process.env.OBS_WS_PASSWORD || '') + a.salt) + a.challenge);
        ws.send(JSON.stringify({ op: 1, d }));
      } else if (m.op === 2) {                                   // Identified
        clearTimeout(t);
        ok({
          pedir: (requestType, requestData = {}) => new Promise((res, rej) => {
            const requestId = String(++n); pend.set(requestId, { res, rej });
            ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
          }),
          cerrar: () => ws.close(),
        });
      } else if (m.op === 7) {
        const p = pend.get(m.d.requestId); pend.delete(m.d.requestId);
        if (m.d.requestStatus.result) p.res(m.d.responseData || {}); else p.rej(new Error(`${m.d.requestType}: ${m.d.requestStatus.comment || m.d.requestStatus.code}`));
      }
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const obs = await conectarObs();
  try { console.log(JSON.stringify(await obs.pedir(process.argv[2], process.argv[3] ? JSON.parse(process.argv[3]) : {}), null, 1).slice(0, 4000)); }
  finally { obs.cerrar(); }
}
