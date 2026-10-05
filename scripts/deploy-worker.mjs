#!/usr/bin/env node
// Despliega top-secret-worker.js en Cloudflare (Worker `top-secret-proxy`) sin wrangler.
// Uso: node scripts/deploy-worker.mjs      (credenciales desde .env o variables de entorno)
// También lo corre la GitHub Action .github/workflows/deploy-worker.yml al pushear cambios del Worker.
//
// IMPORTANTE: el deploy tiene que declarar los bindings KV (TS_KV) y R2 (MEDIA_BUCKET) — un deploy
// sin R2 dejó todas las imágenes del sitio en 500 (incidente 2026-09-28). Los secretos del Worker
// (ADMIN_PIN, etc.) se conservan con keep_bindings.
import fs from 'fs';
import path from 'path';
import { need, ROOT, WORKER_BASE } from './lib/env.mjs';

const ACCOUNT = need('CF_ACCOUNT_ID');
const KV_ID = need('KV_NAMESPACE_ID');
const headers = { 'X-Auth-Email': need('CF_EMAIL'), 'X-Auth-Key': need('CF_API_KEY') };

const metadata = {
  main_module: 'top-secret-worker.js',
  compatibility_date: '2026-04-01',
  keep_bindings: ['secret_text'],
  bindings: [
    { type: 'kv_namespace', name: 'TS_KV', namespace_id: KV_ID },
    { type: 'r2_bucket', name: 'MEDIA_BUCKET', bucket_name: process.env.R2_BUCKET || 'top-secret-media' },
    // Para la placa de convocatoria (Browser Rendering); el token va como secreto CF_BR_TOKEN.
    { type: 'plain_text', name: 'CF_ACCOUNT_ID', text: ACCOUNT },
  ],
};
const form = new FormData();
form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
form.append('top-secret-worker.js', new Blob([fs.readFileSync(path.join(ROOT, 'top-secret-worker.js'))], { type: 'application/javascript+module' }), 'top-secret-worker.js');

const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/top-secret-proxy`, { method: 'PUT', headers, body: form });
const json = await res.json();
if (!json.success) { console.error('Deploy falló:', JSON.stringify(json.errors)); process.exit(1); }
console.log('Worker desplegado.');

// Verificación: /media tiene que seguir respondiendo (si falla, faltó el binding R2).
await new Promise(r => setTimeout(r, 4000));
const check = await fetch(`${WORKER_BASE}/media/logos/rebrand/favicon-64.png`);
console.log('/media ->', check.status);
if (check.status !== 200) { console.error('ATENCIÓN: /media no responde 200 — revisar bindings.'); process.exit(1); }
