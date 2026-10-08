// Vigía del vivo de Twitch (topsecretfc): mira la transmisión a 1 cuadro/segundo y deja
//   - goles: cada cambio en los números del marcador de FC27 (recorte + cuadro completo + hora del stream)
//   - reporte: cada pantalla de estadísticas post-partido (Resumen/Eventos/Rendimiento...) en 720p + su OCR
//   - grabación del vivo en segmentos .ts (para cortar clips sin bajar el VOD)
// Salida: fuentes/vivo/<fecha>-<id>/ (gitignored). Al terminar escribe resumen.md.
//
//   node scripts/vigia-vivo.mjs                 -> si topsecretfc está en vivo, lo vigila hasta que corte
//   node scripts/vigia-vivo.mjs --vod <id>      -> corre lo mismo sobre un VOD (prueba/calibración)
//   opciones: --sin-grabar
//
// watch-regen.ps1 lo lanza cada minuto si el canal está en vivo; un lock evita dos vigías a la vez.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

sharp.cache(false);

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const YTDLP = path.join(ROOT, 'node_modules/yt-dlp-exec/bin/yt-dlp.exe');
const CANAL = 'topsecretfc';
const W = 1280, H = 720, FRAME = W * H * 3;
const LOCK = path.join(ROOT, 'fuentes/vivo/.vigia.lock');

// Marcador FC27 (720p): caja blanca arriba a la izquierda, números en la columna derecha.
const SB_CAJA = { left: 103, top: 38, width: 60, height: 36 };   // letras sobre blanco: presencia del marcador
const SB_NUM  = { left: 166, top: 40, width: 26, height: 32 };   // las dos cifras (local arriba, visita abajo)
const SB_RECORTE = { left: 60, top: 30, width: 150, height: 66 }; // lo que se guarda como evidencia
const PESTANAS = ['resumen', 'posesión', 'posesion', 'tiros', 'pases', 'defensa', 'eventos', 'portería', 'porteria'];

const args = process.argv.slice(2);
const vodId = args.includes('--vod') ? args[args.indexOf('--vod') + 1].replace(/^v/, '') : null;
const grabar = !args.includes('--sin-grabar') && !vodId;

async function enVivo() {
  const r = await fetch('https://gql.twitch.tv/gql', {
    method: 'POST', headers: { 'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko' },
    body: JSON.stringify({ query: `query{user(login:"${CANAL}"){stream{id createdAt title}}}` }),
  });
  return (await r.json())?.data?.user?.stream ?? null;
}

function hlsUrl() {
  const src = vodId ? `https://www.twitch.tv/videos/${vodId}` : `https://www.twitch.tv/${CANAL}`;
  return execFileSync(YTDLP, ['--no-update', '-g', '-f', 'best[height<=720]/best', src], { encoding: 'utf8' }).trim().split('\n')[0];
}

const hms = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const hoyArt = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

function lockOk() {
  if (vodId) return true;
  mkdirSync(path.dirname(LOCK), { recursive: true });
  if (existsSync(LOCK)) {
    const pid = Number(readFileSync(LOCK, 'utf8'));
    try { process.kill(pid, 0); return false; } catch { /* lock viejo */ }
  }
  writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => { try { if (readFileSync(LOCK, 'utf8') === String(process.pid)) unlinkSync(LOCK); } catch {} });
  return true;
}

// OCR nativo de Windows como proceso persistente (una ruta por línea → una línea JSON)
function ocrServer() {
  const p = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'scripts/lib/ocr-windows.ps1')],
    { stdio: ['pipe', 'pipe', 'inherit'] });
  const rl = readline.createInterface({ input: p.stdout });
  const cola = [];
  rl.on('line', l => { const r = cola.shift(); if (!r) return; try { r(JSON.parse(l)); } catch { r({ lines: [] }); } });
  return {
    leer: file => new Promise(res => { cola.push(res); p.stdin.write(file + '\n'); }),
    cerrar: () => p.stdin.end(),
  };
}

async function gris(raw, reg) {
  return sharp(raw, { raw: { width: W, height: H, channels: 3 } }).extract(reg).greyscale().raw().toBuffer();
}
const frac = (buf, f) => buf.reduce((n, v) => n + f(v), 0) / buf.length;
// Marcador presente: caja mayormente blanca pero con letras oscuras (descarta pantallas blancas)
const hayMarcador = caja => frac(caja, v => v > 200) > 0.45 && frac(caja, v => v < 80) > 0.05;
// Cifras binarizadas por fila (local / visita); cambio = XOR/unión de píxeles oscuros.
// Calibrado 2026-10-08 sobre el VOD 2893092714: ruido <= 0.09, de 2 a 3 = 0.23.
const filas = num => [num.subarray(0, num.length / 2), num.subarray(num.length / 2)].map(r => Uint8Array.from(r, v => v < 110));
const difer = (A, B) => Math.max(...A.map((a, k) => {
  let x = 0, u = 0; for (let i = 0; i < a.length; i++) { x += a[i] ^ B[k][i]; u += a[i] | B[k][i]; }
  return x / Math.max(u, 1);
}));
const UMBRAL = 0.16, AUSENCIA_PARTIDO = 90; // s sin marcador = el próximo que aparezca es otro partido

async function main() {
  let stream = null;
  if (!vodId) {
    stream = await enVivo();
    if (!stream) { console.log('topsecretfc no está en vivo.'); return; }
  }
  if (!lockOk()) { console.log('Ya hay un vigía corriendo.'); return; }

  const id = vodId ? `vod-${vodId}` : `${hoyArt()}-${stream.id}`;
  const OUT = path.join(ROOT, 'fuentes/vivo', id);
  for (const d of ['goles', 'reporte', 'rec', 'tmp']) mkdirSync(path.join(OUT, d), { recursive: true });
  const log = (tipo, datos) => appendFileSync(path.join(OUT, 'eventos.jsonl'), JSON.stringify({ tipo, ...datos }) + '\n');
  console.log(`Vigía → ${OUT}`);

  const ocr = ocrServer();
  let t = 0;                 // segundos de stream analizados en esta sesión
  let base = null;           // números del marcador "estables"
  let candidato = null, candN = 0;
  let ultimoMarcador = -1e9, inicioMarcador = 0, partidos = 0;
  let ultimoReporte = '';
  let reportes = 0, goles = 0;
  let trabajando = Promise.resolve();

  const procesar = async raw => {
    const seg = t++;
    // 1) Marcador
    const caja = await gris(raw, SB_CAJA);
    const enJuego = hayMarcador(caja);
    if (enJuego) {
      const num = filas(await gris(raw, SB_NUM));
      const img = () => sharp(raw, { raw: { width: W, height: H, channels: 3 } });
      if (seg - ultimoMarcador > AUSENCIA_PARTIDO) {
        // vuelve el marcador tras un rato largo: arranca (o sigue tras el entretiempo) un partido
        base = num; candidato = null; candN = 0; partidos++; inicioMarcador = seg;
        const nombre = `partido-${String(partidos).padStart(2, '0')}-${hms(seg).replace(/:/g, '')}`;
        await img().extract(SB_RECORTE).resize(450).png().toFile(path.join(OUT, 'goles', `${nombre}-marcador.png`));
        log('partido', { n: partidos, seg, hora: hms(seg) });
        console.log(`[${hms(seg)}] marcador en pantalla (partido/tiempo #${partidos})`);
      } else if (seg - inicioMarcador < 5) {
        base = num;   // el marcador recién entra con animación: se asienta antes de comparar
      } else if (difer(num, base) > UMBRAL) {
        // cambio sostenido 3 s = gol (descarta animaciones y repeticiones)
        if (candidato && difer(num, candidato) < UMBRAL) candN++; else { candidato = num; candN = 1; }
        if (candN >= 3) {
          base = candidato; candidato = null; candN = 0; goles++;
          const ts = seg - 2, nombre = `gol-${String(goles).padStart(2, '0')}-${hms(ts).replace(/:/g, '')}`;
          await img().extract(SB_RECORTE).resize(450).png().toFile(path.join(OUT, 'goles', `${nombre}-marcador.png`));
          await img().jpeg({ quality: 88 }).toFile(path.join(OUT, 'goles', `${nombre}.jpg`));
          log('gol', { n: goles, seg: ts, hora: hms(ts) });
          console.log(`[${hms(ts)}] cambio de marcador #${goles}`);
        }
      } else { candidato = null; candN = 0; }
      ultimoMarcador = seg;
    }
    // 2) Pantallas del reporte: OCR cada 2 s, solo fuera de juego (sin marcador en pantalla)
    if (seg % 2 === 0 && !enJuego) {
      const tmp = path.join(OUT, 'tmp', `f${seg}.jpg`);   // nombre único: el OCR puede tener el anterior abierto
      await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 92 }).toFile(tmp);
      const r = await ocr.leer(tmp);
      try { unlinkSync(tmp); } catch {}
      const textos = (r.lines || []).map(l => l.text);
      const bajo = textos.join(' ').toLowerCase();
      const tabs = PESTANAS.filter(p => bajo.includes(p)).length;
      if (tabs >= 3) {
        const firma = textos.slice().sort().join('|');
        const previo = new Set(ultimoReporte.split('|'));
        const comunes = textos.filter(x => previo.has(x)).length;
        if (comunes / Math.max(textos.length, 1) < 0.85) {   // pantalla nueva (otra pestaña / otro jugador)
          reportes++; ultimoReporte = firma;
          const nombre = `reporte-${String(reportes).padStart(3, '0')}-${hms(seg).replace(/:/g, '')}`;
          await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).png().toFile(path.join(OUT, 'reporte', `${nombre}.png`));
          writeFileSync(path.join(OUT, 'reporte', `${nombre}.json`), JSON.stringify(r.lines, null, 1));
          log('reporte', { n: reportes, seg, hora: hms(seg), titulo: textos.slice(0, 4).join(' · ') });
          console.log(`[${hms(seg)}] pantalla de reporte #${reportes}: ${textos.slice(0, 3).join(' · ')}`);
        }
      }
    }
  };

  // ffmpeg: 1 cuadro/s crudo por stdout (+ grabación copiada en segmentos)
  const correr = url => new Promise(res => {
    const a = ['-hide_banner', '-loglevel', 'error', '-i', url];
    if (grabar) a.push('-map', '0', '-c', 'copy', '-f', 'segment', '-segment_time', '900',
      path.join(OUT, 'rec', `${Date.now()}-%03d.ts`));
    a.push('-map', '0:v', '-vf', `fps=1,scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1');
    const p = spawn(ffmpeg, a, { stdio: ['ignore', 'pipe', 'inherit'] });
    let pend = Buffer.alloc(0);
    p.stdout.on('data', chunk => {
      pend = Buffer.concat([pend, chunk]);
      while (pend.length >= FRAME) {
        const raw = Buffer.from(pend.subarray(0, FRAME)); pend = pend.subarray(FRAME);
        trabajando = trabajando.then(() => procesar(raw)).catch(e => console.error('cuadro:', e.message));
      }
    });
    p.on('exit', res);
  });

  for (let intento = 0; ; intento++) {
    let url;
    try { url = hlsUrl(); } catch (e) { console.error('No pude obtener el stream:', e.message.split('\n')[0]); }
    if (url) await correr(url);
    if (vodId) break;
    if (!(await enVivo())) break;                     // cortó la transmisión
    console.log('Se cortó la lectura pero el canal sigue en vivo: reconectando…');
    await new Promise(r => setTimeout(r, 5000));
    if (intento > 30) break;
  }
  await trabajando;
  ocr.cerrar();

  // Resumen para revisar (y para cargar el partido / cortar clips)
  const ev = existsSync(path.join(OUT, 'eventos.jsonl'))
    ? readFileSync(path.join(OUT, 'eventos.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  const md = [`# Vigía ${id}`, '', `Analizado: ${hms(t)} de stream.`, '',
    '## Marcador (partidos y goles)', ...ev.filter(e => e.tipo === 'gol' || e.tipo === 'partido')
      .map(e => e.tipo === 'gol' ? `- ${e.hora} gol → goles/gol-${String(e.n).padStart(2, '0')}-*` : `- ${e.hora} **arranca partido/tiempo** → goles/partido-${String(e.n).padStart(2, '0')}-*`),
    '', '## Pantallas del reporte', ...ev.filter(e => e.tipo === 'reporte').map(e => `- ${e.hora} — ${e.titulo}`), ''];
  writeFileSync(path.join(OUT, 'resumen.md'), md.join('\n'));
  console.log(`Listo: ${goles} cambios de marcador, ${reportes} pantallas de reporte → ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
