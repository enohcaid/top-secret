// Lotes de aprobación (KV `aprobaciones` del Worker, el mismo que lee aprobar.html). La PC los escribe por la
// API de Cloudflare (credenciales del .env); la página solo cambia decisión y texto vía el Worker.
import { need } from '../../lib/env.mjs';

const KV = k => `https://api.cloudflare.com/client/v4/accounts/${need('CF_ACCOUNT_ID')}/storage/kv/namespaces/${need('KV_NAMESPACE_ID')}/values/${k}`;
const AUTH = () => ({ 'X-Auth-Email': need('CF_EMAIL'), 'X-Auth-Key': need('CF_API_KEY') });
export const PAGINA = 'https://enohcaid.github.io/top-secret/aprobar.html';

export async function leerKV(clave, porDefecto) {
  const r = await fetch(KV(clave), { headers: AUTH() });
  if (r.status === 404) return porDefecto;
  if (!r.ok) throw new Error(`KV ${clave}: ${r.status}`);
  return r.json();
}
export async function guardarKV(clave, valor) {
  const r = await fetch(KV(clave), { method: 'PUT', headers: { ...AUTH(), 'Content-Type': 'application/json' }, body: JSON.stringify(valor) });
  if (!r.ok) throw new Error(`KV PUT ${clave}: ${r.status} ${await r.text()}`);
}

export const leer = () => leerKV('aprobaciones', { lotes: [] });

// Agrega (o reemplaza, si ya existe con ese id) un lote. Se guardan como mucho los últimos 15.
export async function agregarLote(lote) {
  const data = await leer();
  data.lotes = [lote, ...data.lotes.filter(l => l.id !== lote.id)].slice(0, 15);
  await guardarKV('aprobaciones', data);
}

// Cambia campos de una pieza releyendo justo antes (Juan puede estar aprobando otras piezas al mismo tiempo).
export async function actualizarPieza(loteId, piezaId, cambios) {
  const data = await leer();
  const p = data.lotes.find(l => l.id === loteId)?.piezas.find(x => x.id === piezaId);
  if (!p) return null;
  Object.assign(p, cambios);
  await guardarKV('aprobaciones', data);
  return p;
}
