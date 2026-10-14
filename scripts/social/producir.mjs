#!/usr/bin/env node
// Producción automática de las ideas aprobadas (pedido de Juan, 2026-10-14): cuando Juan aprueba una idea en
// aprobar.html ("Ideas para la próxima semana"), esta PC la produce sola (imágenes, video con voz, carrusel, textos
// de cada red) y la deja en "Visto bueno final". La produce Claude Code sin supervisión con el encargo de
// scripts/social/producir-encargo.md; cada idea guarda su estado en `produccion` (se ve en aprobar.html).
//
//   node scripts/social/producir.mjs                   → lo llama watch-regen.ps1 cada minuto: si hay una idea por
//                                                        producir y nada en curso, lanza la producción en 2º plano
//   node scripts/social/producir.mjs --estado          → ideas aprobadas y su estado de producción
//   node scripts/social/producir.mjs --pausar|--reanudar
//   node scripts/social/producir.mjs --manual <lote> <idea>    → no producirla sola (se hace a mano)
//   node scripts/social/producir.mjs --reintentar <lote> <idea> → volver a ponerla en la cola
//   node scripts/social/producir.mjs --trabajar <lote> <idea>   → producirla ya, en primer plano
//
// Estados: produciendo · esperando (ChatGPT sin cupo: reintenta a las 3 h) · lista (lote nuevo para aprobar) ·
// error (reintenta una vez a la hora; después queda para revisar) · manual.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { ROOT } from '../lib/env.mjs';
import { leer, actualizarPieza, PAGINA } from './lib/aprobaciones.mjs';

const DIR = path.join(ROOT, 'fuentes/redes');
const LOCK = path.join(DIR, '.produccion.lock');
const PAUSA = path.join(DIR, '.produccion-pausada');
const LOG = path.join(ROOT, 'scripts/produccion-redes.log');
const CLAUDE = [path.join(os.homedir(), '.local/bin/claude.exe'), path.join(os.homedir(), 'AppData/Roaming/npm/claude.cmd')].find(fs.existsSync) || 'claude';
const HORA = 3600000;
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [producir] ${m}`);
fs.mkdirSync(DIR, { recursive: true });

const vivo = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const enCurso = () => { try { const pid = Number(fs.readFileSync(LOCK, 'utf8')); return pid && vivo(pid) ? pid : 0; } catch { return 0; } };
const fechaDe = l => (l.id.match(/\d{4}-\d{2}-\d{2}/) || [new Date().toISOString().slice(0, 10)])[0];

// ¿Esta idea está para producir ahora?
function toca(p, ahora) {
  if (p.decision !== 'aprobada') return false;
  const pr = p.produccion;
  if (!pr) return true;
  if (pr.estado === 'esperando') return ahora >= Date.parse(pr.reintentarDesde || 0);
  if (pr.estado === 'error') return (pr.reintentos || 0) < 2 && ahora >= Date.parse(pr.reintentarDesde || 0);
  if (pr.estado === 'produciendo') return !enCurso() && ahora - Date.parse(pr.desde || 0) > 10 * 60000;   // se cortó (reinicio de la PC)
  return false;
}
const ideas = data => data.lotes.filter(l => l.etapa === 'guion').sort((a, b) => a.creado.localeCompare(b.creado))
  .flatMap(l => l.piezas.map(p => ({ l, p })));

const [modo, loteId, ideaId] = process.argv.slice(2);

if (modo === '--estado') {
  const data = await leer();
  for (const { l, p } of ideas(data).filter(x => x.p.decision === 'aprobada')) {
    const pr = p.produccion || {};
    console.log(`${l.id} · ${p.id.padEnd(14)} ${(pr.estado || 'en cola').padEnd(12)} ${pr.lote || pr.motivo || ''}`);
  }
  console.log(fs.existsSync(PAUSA) ? 'Producción automática: PAUSADA' : 'Producción automática: activa', enCurso() ? `(produciendo, PID ${enCurso()})` : '');
} else if (modo === '--pausar') { fs.writeFileSync(PAUSA, new Date().toISOString()); log('Pausada.'); }
else if (modo === '--reanudar') { fs.rmSync(PAUSA, { force: true }); log('Reanudada.'); }
else if (modo === '--manual') { await actualizarPieza(loteId, ideaId, { produccion: { estado: 'manual', desde: new Date().toISOString() } }); log(`${loteId} · ${ideaId}: manual.`); }
else if (modo === '--reintentar') { await actualizarPieza(loteId, ideaId, { produccion: null }); log(`${loteId} · ${ideaId}: de nuevo en la cola.`); }
else if (modo === '--trabajar') await trabajar(loteId, ideaId);
else if (!fs.existsSync(PAUSA) && !enCurso()) {
  // Modo watcher: barato (una lectura de KV) y sale enseguida; la producción corre aparte.
  const data = await leer();
  const sig = ideas(data).find(({ p }) => toca(p, Date.now()));
  if (sig) {
    log(`${sig.l.id} · ${sig.p.id}: arranca la producción.`);
    const out = fs.openSync(LOG, 'a');
    spawn(process.execPath, [path.join(ROOT, 'scripts/social/producir.mjs'), '--trabajar', sig.l.id, sig.p.id],
      { cwd: ROOT, detached: true, stdio: ['ignore', out, out], windowsHide: true }).unref();
  }
}

async function trabajar(loteId, ideaId) {
  if (enCurso() && enCurso() !== process.pid) return log('Ya hay una producción en curso.');
  fs.writeFileSync(LOCK, String(process.pid));
  try {
    const data = await leer();
    const l = data.lotes.find(x => x.id === loteId), p = l?.piezas.find(x => x.id === ideaId);
    if (!p) throw new Error(`No existe la idea ${loteId} · ${ideaId}`);
    const previo = p.produccion || {};
    const loteFinal = previo.lote || `viral-${ideaId}-${fechaDe(l)}`;
    await actualizarPieza(loteId, ideaId, { produccion: { ...previo, estado: 'produciendo', desde: new Date().toISOString(), lote: loteFinal, motivo: null } });
    log(`${loteId} · ${ideaId}: produciendo → ${loteFinal}`);

    let encargo = fs.readFileSync(path.join(ROOT, 'scripts/social/producir-encargo.md'), 'utf8');
    const vars = { LOTE: loteId, IDEA: ideaId, GUION: JSON.stringify({ formato: p.formato, ...p.guion }, null, 2),
      COMENTARIOS: (p.texto || '').trim() || '(sin comentarios)', SCRIPT: `${fechaDe(l)}-${ideaId}`, CARPETA: `viral/${ideaId}`, LOTE_FINAL: loteFinal };
    for (const [k, v] of Object.entries(vars)) encargo = encargo.replaceAll(`{{${k}}}`, v);

    const r = spawnSync(CLAUDE, ['-p', '--model', 'opus', '--output-format', 'json', '--permission-mode', 'acceptEdits', '--allowedTools', 'Bash Read Write Edit Glob Grep'], {
      cwd: ROOT, input: encargo, encoding: 'utf8', timeout: 4 * HORA, maxBuffer: 64 * 1024 * 1024, shell: CLAUDE.endsWith('.cmd'),
    });
    let fin;
    try {
      const res = JSON.parse(r.stdout).result || '';
      fin = JSON.parse(res.slice(res.lastIndexOf('{"estado"'), res.lastIndexOf('}') + 1));
    } catch { fin = { estado: 'error', motivo: `Claude terminó sin respuesta válida (código ${r.status}${r.error ? ', ' + r.error.message : ''}): ${(r.stdout || r.stderr || '').slice(-300)}` }; }

    const ahora = Date.now(), base = { lote: loteFinal, hasta: new Date(ahora).toISOString() };
    if (fin.estado === 'lista') {
      await actualizarPieza(loteId, ideaId, { produccion: { ...base, estado: 'lista', resumen: fin.resumen || '' } });
      log(`${ideaId}: lista → ${loteFinal}. ${fin.resumen || ''}`);
      spawnSync('cmd', ['/c', 'start', '', PAGINA], { stdio: 'ignore' });   // a Juan se le abre aprobar.html, como con los otros lotes
    } else if (fin.estado === 'esperando-chatgpt') {
      await actualizarPieza(loteId, ideaId, { produccion: { ...base, estado: 'esperando', motivo: fin.motivo || 'ChatGPT sin cupo', reintentarDesde: new Date(ahora + 3 * HORA).toISOString() } });
      log(`${ideaId}: ChatGPT sin cupo, reintenta en 3 h.`);
    } else {
      const reintentos = (previo.reintentos || 0) + 1;
      await actualizarPieza(loteId, ideaId, { produccion: { ...base, estado: 'error', motivo: String(fin.motivo || 'error').slice(0, 500), reintentos, reintentarDesde: new Date(ahora + HORA).toISOString() } });
      log(`${ideaId}: ERROR (${reintentos}/2) ${fin.motivo}`);
    }
  } catch (e) {
    log(`ERROR ${e.message}`);
    await actualizarPieza(loteId, ideaId, { produccion: { estado: 'error', motivo: e.message.slice(0, 500), reintentos: 2 } }).catch(() => {});
  } finally { fs.rmSync(LOCK, { force: true }); }
}
