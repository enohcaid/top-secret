// Salud del vivo (2026-11-05: OBS quedó colgado con el proceso abierto y las redes estuvieron 5 min sin imagen; nadie lo
// detectaba porque MediaMTX y el codificador seguían vivos). Cada 15 s mira OBS por websocket, la memoria y la CPU:
//   - OBS sin avanzar (sin respuesta, reconectando, sin frames o sin bytes) 3 veces seguidas → reinicia solo OBS;
//     tres reinicios en 10 min → rearma la cadena entera.
//   - Poca memoria o muchos frames perdidos → cierra Ollama (si no tiene modelos cargados; se reabre al terminar),
//     sube la prioridad de OBS y del codificador y anota qué está consumiendo.
// Deja una línea por minuto en fuentes/redes/salud-vivo.log, los avisos en retransmitir.log y un balance al terminar.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile, spawn } from 'child_process';

const INTERVALO = 15000;
const FALLAS_PARA_REINICIAR = 3;                                  // 45 s sin avanzar
const GRACIA_ARRANQUE = 60000;                                    // lo que se le da a OBS para levantar tras (re)iniciarlo
const REINICIOS_PARA_REARMAR = 3, VENTANA_REINICIOS = 10 * 60000;
const MEMORIA_MINIMA_MB = 1500;
const PERDIDA_MAXIMA = 0.03;                                      // de los frames de un minuto
const ESPERA_ENTRE_ALERTAS = 5 * 60000;
const LOG_SALUD = path.resolve('fuentes/redes/salud-vivo.log');
const LOGS_OBS = path.join(process.env.APPDATA || '', 'obs-studio', 'logs');
const OLLAMA_APP = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama app.exe');
const ERRORES_OBS = /Reconnecting|Max audio buffering|Connection failed|encoder overload|Video stopped|Disconnected/i;

// ¿Avanzó OBS entre dos lecturas? stats/st = null si no respondió. Devuelve el motivo si está mal, o null si anda bien.
export function problemaObs(antes, ahora) {
  if (!ahora?.stats || !ahora?.st) return 'no responde';
  if (!ahora.st.outputActive) return 'no está transmitiendo';
  if (ahora.st.outputReconnecting) return 'reconectando con MediaMTX';
  if (antes?.stats && antes?.st) {
    if (ahora.stats.renderTotalFrames <= antes.stats.renderTotalFrames) return 'no renderiza frames';
    if (ahora.st.outputBytes <= antes.st.outputBytes) return 'no manda datos';
  }
  return null;
}

const correr = (exe, args, timeout = 15000) => new Promise(ok => execFile(exe, args, { timeout, windowsHide: true }, (e, out) => ok(e ? '' : String(out))));

function cpuActual() {
  const t = os.cpus().reduce((a, c) => { const x = c.times; a.ocupado += x.user + x.nice + x.sys + x.irq; a.total += x.user + x.nice + x.sys + x.irq + x.idle; return a; }, { ocupado: 0, total: 0 });
  return t;
}

// Líneas nuevas del log de OBS con errores desde la última vuelta (cambia de archivo si OBS se reinició)
function lectorLogObs() {
  let archivo = null, leido = 0;
  return () => {
    try {
      const ultimo = fs.readdirSync(LOGS_OBS).filter(f => f.endsWith('.txt')).map(f => path.join(LOGS_OBS, f))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
      if (!ultimo) return [];
      if (ultimo !== archivo) { const primero = archivo === null; archivo = ultimo; leido = primero ? fs.statSync(ultimo).size : 0; }
      const tam = fs.statSync(archivo).size;
      if (tam <= leido) return [];
      const fd = fs.openSync(archivo, 'r'), buf = Buffer.alloc(tam - leido);
      fs.readSync(fd, buf, 0, buf.length, leido); fs.closeSync(fd); leido = tam;
      return buf.toString('utf8').split(/\r?\n/).filter(l => ERRORES_OBS.test(l) && !l.includes('[obs-websocket]'));   // este mismo monitor conecta y desconecta
    } catch { return []; }
  };
}

// obs(pedido) → respuesta o null; reiniciarObs/rearmar → promesas; ocupado() = la cadena se está rearmando en otro lado
export function vigilarSalud({ obs, reiniciarObs, rearmar, ocupado = () => false, log }) {
  const inicio = Date.now();
  const leerErroresObs = lectorLogObs();
  let antes = null, fallas = 0, graciaHasta = Date.now() + GRACIA_ARRANQUE, trabajando = false;
  let reinicios = [], ultimaAlerta = 0, ollamaCerrado = false, prioridadSubida = false, arranqueAnotado = false;
  let cpuAntes = cpuActual(), minuto = null;
  const balance = { reiniciosObs: 0, rearmados: 0, memoriaMinimaMb: Infinity, frames: 0, perdidos: 0, erroresObs: 0, peorMinuto: 0 };

  const anotar = l => { try { fs.mkdirSync(path.dirname(LOG_SALUD), { recursive: true }); fs.appendFileSync(LOG_SALUD, `[${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })}] ${l}\n`); } catch {} };

  async function cerrarOllama() {
    if (ollamaCerrado || !fs.existsSync(OLLAMA_APP)) return;
    let modelos = null;
    try { modelos = (await (await fetch('http://127.0.0.1:11434/api/ps', { signal: AbortSignal.timeout(3000) })).json()).models; } catch { return; }   // no está abierto
    if (modelos?.length) return;                                  // está trabajando: no se toca
    await correr('taskkill', ['/F', '/T', '/IM', 'ollama app.exe']);
    await correr('taskkill', ['/F', '/IM', 'ollama.exe']);
    ollamaCerrado = true;
    log('Salud: cerré Ollama para liberar memoria (se reabre al terminar el vivo).');
  }
  async function subirPrioridad() {
    if (prioridadSubida) return;
    prioridadSubida = true;
    await correr('powershell', ['-NoProfile', '-Command', "Get-Process obs64,ffmpeg -ErrorAction SilentlyContinue | ForEach-Object { try { $_.PriorityClass = 'AboveNormal' } catch {} }"]);
    log('Salud: subí la prioridad de OBS y ffmpeg.');
  }
  async function alerta(motivo) {
    if (Date.now() - ultimaAlerta < ESPERA_ENTRE_ALERTAS) return;
    ultimaAlerta = Date.now();
    const top = await correr('powershell', ['-NoProfile', '-Command', "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 6 | ForEach-Object { $_.ProcessName + ' ' + [math]::Round($_.WorkingSet64/1MB) + 'MB' }"]);
    log(`Salud: ${motivo}. Lo que más memoria usa: ${top.trim().replace(/\s*\r?\n\s*/g, ', ')}`);
    await cerrarOllama();
    await subirPrioridad();
  }

  async function recuperar(motivo) {
    await cerrarOllama();                                         // un cuelgue suele venir con la memoria al límite
    const ahora = Date.now();
    reinicios = reinicios.filter(t => ahora - t < VENTANA_REINICIOS);
    if (reinicios.length >= REINICIOS_PARA_REARMAR) {
      log(`Salud: OBS sigue mal tras ${reinicios.length} reinicios (${motivo}): rearmo la cadena entera.`);
      balance.rearmados++; reinicios = [];
      await rearmar();
    } else {
      log(`Salud: OBS colgado (${motivo}): lo reinicio. Codificador y relevos siguen esperando.`);
      balance.reiniciosObs++; reinicios.push(ahora);
      await reiniciarObs();
    }
    prioridadSubida = false;                                      // los procesos nuevos arrancan en prioridad normal
    fallas = 0; antes = null; minuto = null; graciaHasta = Date.now() + GRACIA_ARRANQUE;
  }

  async function vuelta() {
    if (trabajando || ocupado()) return;
    trabajando = true;
    try {
      const memoria = Math.round(os.freemem() / 1048576);
      balance.memoriaMinimaMb = Math.min(balance.memoriaMinimaMb, memoria);
      const ahora = { stats: await obs('GetStats'), st: await obs('GetStreamStatus'), t: Date.now() };
      const problema = problemaObs(antes, ahora);
      if (Date.now() < graciaHasta) {                             // OBS arrancando: no se lo juzga, y sin avanzar no hay comparación
        antes = problema ? null : ahora;
        return;
      }
      if (problema) {
        fallas++;
        if (fallas === 1) anotar(`OBS: ${problema}`);
        if (problema === 'no está transmitiendo') await obs('StartStream');
        if (fallas >= FALLAS_PARA_REINICIAR) await recuperar(problema);
        return;                                                   // "antes" queda en la última lectura buena
      }
      if (fallas) anotar(`OBS se recuperó solo tras ${fallas} lectura(s) mala(s)`);
      fallas = 0; antes = ahora;

      if (!arranqueAnotado) {
        arranqueAnotado = true;
        log(`Salud: OBS en marcha (${ahora.stats.activeFps.toFixed(0)} fps, ${memoria} MB libres, ${(ahora.stats.renderSkippedFrames)} frames perdidos al arrancar).`);
      }
      if (memoria < MEMORIA_MINIMA_MB) await alerta(`quedan ${memoria} MB libres`);

      // Un minuto de números: frames perdidos, CPU, memoria y errores que aparecieron en el log de OBS
      minuto ||= ahora;
      if (ahora.t - minuto.t >= 60000) {
        const frames = ahora.stats.renderTotalFrames - minuto.stats.renderTotalFrames;
        const perdidos = ahora.stats.renderSkippedFrames - minuto.stats.renderSkippedFrames;
        const c = cpuActual(), cpu = Math.round(100 * (c.ocupado - cpuAntes.ocupado) / Math.max(1, c.total - cpuAntes.total)); cpuAntes = c;
        const errores = leerErroresObs();
        const pct = frames > 0 ? perdidos / frames : 0;
        balance.frames += frames; balance.perdidos += perdidos; balance.erroresObs += errores.length; balance.peorMinuto = Math.max(balance.peorMinuto, pct);
        anotar(`fps ${ahora.stats.activeFps.toFixed(1)} · perdidos ${perdidos}/${frames} (${(pct * 100).toFixed(1)}%) · render ${ahora.stats.averageFrameRenderTime.toFixed(1)} ms · CPU ${cpu}% · libres ${memoria} MB · OBS ${Math.round(ahora.stats.memoryUsage)} MB`);
        for (const l of errores.slice(0, 5)) anotar(`  OBS: ${l.slice(0, 160)}`);
        if (pct > PERDIDA_MAXIMA) await alerta(`OBS perdió ${(pct * 100).toFixed(1)}% de los frames en el último minuto`);
        minuto = ahora;
      }
    } catch (e) { anotar(`error del monitor: ${e.message?.slice(0, 160)}`); }
    finally { trabajando = false; }
  }

  const reloj = setInterval(vuelta, INTERVALO);
  return {
    async parar() {
      clearInterval(reloj);
      const pct = balance.frames ? (100 * balance.perdidos / balance.frames).toFixed(2) : '0';
      const min = Math.round((Date.now() - inicio) / 60000);
      const memoria = balance.memoriaMinimaMb === Infinity ? '?' : balance.memoriaMinimaMb;
      log(`Salud, balance de la sesión (${min} min): ${pct}% de frames perdidos (peor minuto ${(balance.peorMinuto * 100).toFixed(1)}%), mínimo ${memoria} MB libres, ${balance.reiniciosObs} reinicio(s) de OBS, ${balance.rearmados} rearmado(s), ${balance.erroresObs} error(es) en el log de OBS.`);
      if (ollamaCerrado) { try { spawn(OLLAMA_APP, [], { detached: true, stdio: 'ignore' }).unref(); log('Salud: reabrí Ollama.'); } catch {} ollamaCerrado = false; }
    },
  };
}
