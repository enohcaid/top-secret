// Lee el indicador de "Uso de la IA" de Canva (Configuración → Facturación) desde el Chrome CDP
// y lleva un registro de cuánto consume cada generación (fuentes/canva-uso.csv + R2 _fuentes/canva-uso.csv).
import fs from 'fs';
import path from 'path';
import { ROOT } from './env.mjs';
import { putFile, getFile } from './r2.mjs';

export const LOG = path.join(ROOT, 'fuentes', 'canva-uso.csv');
const R2_LOG = '_fuentes/canva-uso.csv';

// { usado: 36, reset: '2 oct' } — abre y cierra su propia pestaña.
export async function leerUso(ctx) {
  const p = await ctx.newPage();
  try {
    await p.goto('https://www.canva.com/settings/billing-and-teams', { waitUntil: 'domcontentloaded', timeout: 60000 });
    for (let i = 0; i < 20; i++) {
      await p.waitForTimeout(1500);
      const t = await p.evaluate(() => document.body.innerText);
      const m = t.match(/(\d+(?:[.,]\d+)?)\s*%\s*usado/i);
      if (m) {
        const r = t.match(/restablecer el\s+([^\n·]+)/i);
        return { usado: parseFloat(m[1].replace(',', '.')), reset: r ? r[1].trim() : '' };
      }
    }
    return null;
  } finally { await p.close().catch(() => {}); }
}

async function syncDown() {
  if (fs.existsSync(LOG)) return;
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  try { await getFile(R2_LOG, LOG); } catch { fs.writeFileSync(LOG, 'fecha,herramienta,archivo,uso_antes,uso_despues,consumo\n'); }
}

export async function registrar(herramienta, archivo, antes, despues) {
  await syncDown();
  const consumo = antes != null && despues != null ? +(despues - antes).toFixed(2) : '';
  fs.appendFileSync(LOG, [new Date().toISOString(), herramienta, path.basename(archivo), antes ?? '', despues ?? '', consumo].join(',') + '\n');
  try { await putFile(LOG, R2_LOG, 'text/csv'); } catch { /* el registro local alcanza */ }
  return consumo;
}

// Promedio medido por herramienta (solo filas con consumo > 0 medido).
export async function promedio(herramienta) {
  await syncDown();
  const rows = fs.readFileSync(LOG, 'utf8').trim().split('\n').slice(1).map(l => l.split(','))
    .filter(r => r[1] === herramienta && r[5] !== '' && +r[5] >= 0);
  if (!rows.length) return null;
  return { n: rows.length, media: rows.reduce((s, r) => s + +r[5], 0) / rows.length };
}
