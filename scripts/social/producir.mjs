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
// No arranca lunes a jueves de 21:00 a 00:45 (vivo): lo aprobado en ese rato espera y empieza después.
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
// No arrancar una producción (render y ChatGPT, pesados) cerca del vivo: lunes a jueves desde las 21:00 hasta las 00:45.
function cercaDelVivo(d = new Date()) {
  const min = d.getHours() * 60 + d.getMinutes(), dia = d.getDay();
  return (dia >= 1 && dia <= 4 && min >= 21 * 60) || (dia >= 2 && dia <= 5 && min < 45);
}

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
else if (!fs.existsSync(PAUSA) && !enCurso() && !cercaDelVivo()) {
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

async function conReintento(fn, veces = 3) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= veces) throw e;
      await new Promise(r => setTimeout(r, 3000 * i));
    }
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
    if (fs.existsSync(path.join(ROOT, `scripts/social/piezas/${vars.SCRIPT}.mjs`)))
      encargo += `\n\n## Ya hubo un intento anterior\nExisten scripts/social/piezas/${vars.SCRIPT}.mjs y fuentes/redes/${vars.CARPETA}/. Retomá desde ahí lo que esté bien, sin rehacerlo ni gastar imágenes de nuevo.\n`;

    // Modelo por nombre completo: el alias de este Claude Code puede apuntar a uno viejo (ver scripts/lib/ia.mjs).
    const correr = () => spawnSync(CLAUDE, ['-p', '--model', 'claude-opus-5-5', '--output-format', 'json', '--permission-mode', 'acceptEdits', '--allowedTools', 'Bash Read Write Edit Glob Grep'], {
      cwd: ROOT, input: encargo, encoding: 'utf8', timeout: 4 * HORA, maxBuffer: 64 * 1024 * 1024, shell: CLAUDE.endsWith('.cmd'), windowsHide: true,
    });
    let r = correr();
    // El claude.exe no se autoactualiza en modo -p (la noticia del 28/10 cayó por eso): se actualiza una vez y se reintenta.
    if (/does not support this model|or newer is required|claude update/i.test(`${r.stdout || ''}${r.stderr || ''}`.slice(0, 2000))) {
      log('Claude Code desactualizado: corriendo "claude update"…');
      spawnSync(CLAUDE, ['update'], { encoding: 'utf8', timeout: 5 * 60000, shell: CLAUDE.endsWith('.cmd'), windowsHide: true });
      r = correr();
    }
    let fin;
    try {
      const j = JSON.parse(r.stdout), res = j.result || '';
      // Sin cupo, Claude "responde" igual con el aviso como texto ("You've hit your 5-hour limit", 2026-11-06): se espera
      // como con ChatGPT, no gasta un reintento.
      if (j.api_error_status === 429 || (res.length < 400 && /usage limit|out of (extra )?usage|hit your .*limit|limit (will )?reset|rate limit/i.test(res))) fin = { estado: 'esperando-chatgpt', motivo: `Claude sin cupo: ${res.slice(0, 200)}` };
      else fin = JSON.parse(res.slice(res.lastIndexOf('{"estado"'), res.lastIndexOf('}') + 1));
    } catch {
      fin = { estado: 'error', motivo: r.error?.code === 'ETIMEDOUT' ? 'Pasaron las 4 horas sin terminar'
        : `Claude terminó sin respuesta válida (código ${r.status}${r.error ? ', ' + r.error.message : ''}): ${(r.stdout || r.stderr || '').slice(-300)}` };
    }

    // spawnSync bloquea horas y la conexión que quedó abierta vence: el primer fetch de después falla con "fetch failed"
    // y pisaba como error una pieza ya producida (2026-11-06, 5 ideas). Se reintenta, y lo que manda es que el lote exista.
    const ahora = Date.now(), base = { lote: loteFinal, hasta: new Date(ahora).toISOString() };
    if (fin.estado !== 'lista' && (await conReintento(leer)).lotes.some(x => x.id === loteFinal)) fin = { estado: 'lista', resumen: 'El lote quedó cargado aunque el proceso no terminó de responder.' };
    if (fin.estado === 'lista') {
      await conReintento(() => actualizarPieza(loteId, ideaId, { produccion: { ...base, estado: 'lista', resumen: fin.resumen || '' } }));
      log(`${ideaId}: lista → ${loteFinal}. ${fin.resumen || ''}`);
      spawnSync('cmd', ['/c', 'start', '', PAGINA], { stdio: 'ignore' });   // a Juan se le abre aprobar.html, como con los otros lotes
    } else if (fin.estado === 'esperando-chatgpt') {
      await conReintento(() => actualizarPieza(loteId, ideaId, { produccion: { ...base, estado: 'esperando', motivo: fin.motivo || 'ChatGPT sin cupo', reintentarDesde: new Date(ahora + 3 * HORA).toISOString() } }));
      log(`${ideaId}: ${fin.motivo || 'ChatGPT sin cupo'}. Reintenta en 3 h.`);
    } else {
      const reintentos = (previo.reintentos || 0) + 1;
      await conReintento(() => actualizarPieza(loteId, ideaId, { produccion: { ...base, estado: 'error', motivo: String(fin.motivo || 'error').slice(0, 500), reintentos, reintentarDesde: new Date(ahora + HORA).toISOString() } }));
      log(`${ideaId}: ERROR (${reintentos}/2) ${fin.motivo}`);
    }
  } catch (e) {
    log(`ERROR ${e.message}`);
    await actualizarPieza(loteId, ideaId, { produccion: { estado: 'error', motivo: e.message.slice(0, 500), reintentos: 2 } }).catch(() => {});
  } finally { fs.rmSync(LOCK, { force: true }); }
}
