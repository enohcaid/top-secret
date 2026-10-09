// Vigía del vivo de Twitch (topsecretfc): mira la transmisión a 1 cuadro/segundo y deja
//   - goles: cada cambio en los números del marcador de FC27 (recorte + cuadro completo + hora del stream)
//   - reporte: cada pantalla de estadísticas post-partido (Resumen/Eventos/Rendimiento...) en 720p + su OCR
//   - grabación del vivo y, al terminar, un clip por cada gol nuestro + datos.json borrador para
//     scripts/goles/compilado.cjs (la grabación queda como fuentes/goles/v<clave>/source.mp4)
// Salida: fuentes/vivo/<fecha>-<id>/ (gitignored). Al terminar escribe resumen.md.
//
//   node scripts/vigia-vivo.mjs                 -> si topsecretfc está en vivo, lo vigila hasta que corte
//   node scripts/vigia-vivo.mjs --vod <id>      -> corre lo mismo sobre un VOD (prueba/calibración)
//   node scripts/vigia-vivo.mjs --solo-clips <carpeta>  -> rehace los clips de una sesión ya vigilada
//   opciones: --sin-grabar (sin clips), --hasta HH:MM (corte en vivo, default 00:30)
//
// watch-regen.ps1 lo lanza solo lunes a jueves 22:30-00:30 si el canal está en vivo; un lock evita
// dos vigías a la vez. A la hora de --hasta se corta aunque la transmisión siga.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync, readFileSync, unlinkSync, readdirSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { SB_CAJA, SB_NUM, SB_RECORTE, hayMarcador, crearDetector } from './lib/marcador.mjs';

sharp.cache(false);

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const YTDLP = path.join(ROOT, 'node_modules/yt-dlp-exec/bin/yt-dlp.exe');
const CANAL = 'topsecretfc';
const W = 1280, H = 720, FRAME = W * H * 3;
const LOCK = path.join(ROOT, 'fuentes/vivo/.vigia.lock');

// Marcador FC27 (720p): recortes y detector de goles en scripts/lib/marcador.mjs
// (probarlo sobre una grabación: node scripts/probar-marcador.mjs <video>)
const PESTANAS = ['resumen', 'posesión', 'posesion', 'tiros', 'pases', 'defensa', 'eventos', 'portería', 'porteria'];

const args = process.argv.slice(2);
const vodId = args.includes('--vod') ? args[args.indexOf('--vod') + 1].replace(/^v/, '') : null;
const grabar = !args.includes('--sin-grabar');
const soloClips = args.includes('--solo-clips') ? path.resolve(args[args.indexOf('--solo-clips') + 1]) : null;
const hasta = args.includes('--hasta') ? args[args.indexOf('--hasta') + 1] : '00:30';

// Próxima ocurrencia de HH:MM (hora local de la PC = ART)
function msHasta(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const fin = new Date(); fin.setHours(h, m, 0, 0);
  if (fin <= new Date()) fin.setDate(fin.getDate() + 1);
  return fin - new Date();
}

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
const AUSENCIA_PARTIDO = 90; // s sin marcador = el próximo que aparezca es otro partido

// ── Clips de goles ───────────────────────────────────────────────────────────
// En FC27 online no hay repetición: gol → festejo (cortes de cámara, ~5 s) → saque del medio. El marcador
// cambia en el momento del gol o recién con el saque, según el caso. El clip termina justo antes del primer
// corte de cámara entre 14 s antes y 4 s después del cambio (= arranca el festejo; medido hasta +2,4 s) y empieza
// 15 s antes (criterio de scripts/goles/README.md). Sin corte (gol sin festejo, pasa directo al saque con una
// transición suave) el marcador cambió con el gol: fin = cambio + 0,3 s. Escena (VOD 2893092714, 60 fps): juego <= 0,02; corte al festejo 0,27.
function ff(argsFf) {
  return new Promise((res, rej) => {
    const p = spawn(ffmpeg, ['-hide_banner', ...argsFf], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', d => { err += d; });
    p.on('exit', c => c === 0 ? res(err) : rej(new Error(err.split('\n').slice(-3).join(' '))));
  });
}

async function cortesDeCamara(src, desde, dur) {
  const log = await ff(['-ss', String(desde), '-t', String(dur), '-i', src, '-an',
    '-vf', "scale=320:-2,select='gt(scene,0.12)',showinfo", '-f', 'null', '-']);
  return [...log.matchAll(/pts_time:([\d.]+)/g)].map(m => desde + Number(m[1]));
}

// El contador de cuadros del vigía puede quedar unos segundos corrido respecto de la grabación
// (medido: ~6 s en el VOD 2893092714; también hay reconexiones en vivo). Por eso cada gol se
// re-ubica en source.mp4: se busca el cambio de cifras del marcador a 4 fps en [seg-10, seg+25], con el mismo
// detector que en vivo (mediana de 5 cuadros = 1,25 s; sostenido 8 cuadros = 2 s).
async function cambioEnGrabacion(src, seg) {
  const desde = Math.max(0, seg - 10), FPS = 4;
  const R = { x: SB_CAJA.left, y: SB_CAJA.top, w: SB_NUM.left + SB_NUM.width - SB_CAJA.left, h: SB_NUM.top + SB_NUM.height - SB_CAJA.top };
  const buf = await new Promise((res, rej) => {
    const p = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', String(desde), '-t', '35', '-i', src, '-an',
      '-vf', `fps=${FPS},scale=${W}:${H},crop=${R.w}:${R.h}:${R.x}:${R.y},format=gray`, '-f', 'rawvideo', 'pipe:1'],
      { stdio: ['ignore', 'pipe', 'inherit'] });
    const parts = []; p.stdout.on('data', d => parts.push(d));
    p.on('exit', c => c === 0 ? res(Buffer.concat(parts)) : rej(new Error('ffmpeg alineando')));
  });
  const n = R.w * R.h, det = crearDetector({ sostener: 8 });
  for (let o = 0, i = 0, vistos = 0; o + n <= buf.length; o += n, i++) {
    const f = buf.subarray(o, o + n);
    const sub = (x, y, w, h) => { const out = new Uint8Array(w * h); for (let j = 0; j < h; j++) out.set(f.subarray((y + j) * R.w + x, (y + j) * R.w + x + w), j * w); return out; };
    const caja = sub(0, 0, SB_CAJA.width, SB_CAJA.height);
    if (!hayMarcador(caja)) continue;
    const ev = det.paso(sub(SB_NUM.left - R.x, SB_NUM.top - R.y, SB_NUM.width, SB_NUM.height), caja, desde + i / FPS);
    if (++vistos === 5) det.asentar();
    if (ev) return ev.seg;
  }
  return null;
}

// Si las siglas se leyeron recién en un gol posterior del mismo partido, los goles anteriores quedaron
// "¿de quién?" (aFavor null): se completan con la fila de TOP que se supo después.
const leerEventos = OUT => {
  const ev = existsSync(path.join(OUT, 'eventos.jsonl'))
    ? readFileSync(path.join(OUT, 'eventos.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
  const filaTop = {}; let partido = 0;
  for (const e of ev) { if (e.tipo === 'partido') partido = e.n; e._partido = partido; if (e.tipo === 'equipos') filaTop[partido] = e.filaTop; }
  for (const e of ev) {
    const ft = filaTop[e._partido];
    if (e.tipo === 'gol' && e.aFavor == null && e.fila != null && ft != null) e.aFavor = e.fila === ft;
    delete e._partido;
  }
  return ev;
};

async function armarClips(OUT, clave) {
  const recDir = path.join(OUT, 'rec');
  const golesTop = leerEventos(OUT).filter(e => e.tipo === 'gol' && e.aFavor !== false);
  const GDIR = path.join(ROOT, 'fuentes/goles', 'v' + clave);
  const src = path.join(GDIR, 'source.mp4');
  mkdirSync(GDIR, { recursive: true });
  if (!existsSync(src)) {
    const ts = existsSync(recDir) ? readdirSync(recDir).filter(f => f.endsWith('.ts')).sort() : [];
    if (!ts.length) { console.log('Sin grabación: no hay clips.'); return []; }
    const lista = path.join(recDir, 'lista.txt');
    writeFileSync(lista, ts.map(f => `file '${path.join(recDir, f).replace(/\\/g, '/')}'`).join('\n'));
    await ff(['-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', '-y', src]);
    for (const f of [...ts, 'lista.txt']) try { unlinkSync(path.join(recDir, f)); } catch {}
  }
  const clips = [];
  for (const g of golesTop) {
    const cambio = await cambioEnGrabacion(src, g.seg).catch(e => { console.error('alinear:', e.message); return null; }) ?? g.seg;
    const cortes = (await cortesDeCamara(src, Math.max(0, cambio - 14), 18));
    const fin = +(cortes.length ? cortes[0] - 0.1 : cambio + 0.3).toFixed(2);
    const inicio = +Math.max(0, fin - 15).toFixed(2);
    const archivo = path.join(OUT, 'goles', `gol-${String(g.n).padStart(2, '0')}.mp4`);
    await ff(['-loglevel', 'error', '-ss', String(inicio), '-t', String(+(fin - inicio).toFixed(2)), '-i', src,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', '-y', archivo]);
    clips.push({ ...g, inicio, fin, porCorte: cortes.length > 0, archivo });
    console.log(`clip gol #${g.n}: ${hms(inicio)} → ${hms(fin)}${cortes.length ? '' : ' (sin festejo: termina en el cambio de marcador)'}`);
  }
  // Borrador para el compilado: completar minuto, goleador, número, rival y escudo (ver README de goles)
  const fecha = clave.startsWith('vivo-') ? clave.slice(5) : hoyArt();
  writeFileSync(path.join(GDIR, 'datos.json'), JSON.stringify({
    _ayuda: 'Borrador del vigía. Completar marcador/rival/escudoRival/minuto/goleador/numero (pantalla Eventos del reporte) y revisar inicio/fin. Ver scripts/goles/README.md.',
    vod: clave, fecha, etiqueta: '', titulo: '', hudTopRightHasta: 100,
    goles: clips.map(c => ({ inicio: c.inicio, fin: c.fin, marcador: '', rival: c.rival || '', escudoRival: '',
      minuto: '', goleador: '', numero: '', _hora: hms(c.seg), _porCorte: c.porCorte })),
  }, null, 2));
  return clips;
}

async function main() {
  if (soloClips) {
    const clave = path.basename(soloClips).replace(/^vod-/, '').replace(/^(\d{4}-\d{2}-\d{2})-.*/, 'vivo-$1');
    await armarClips(soloClips, clave);
    return;
  }
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
  const det = crearDetector();
  let ultimoMarcador = -1e9, inicioMarcador = 0, partidos = 0;
  let filaTop = null, rival = '', archivoPartido = '', recortePartido = false;
  // ¿En qué fila del marcador está TOP? (el OCR lee bien las siglas ampliadas, no las cifras)
  const leerEquipos = async png => {
    const lineas = ((await ocr.leer(png)).lines || []).filter(l => /^[A-Z0-9]{3}/.test(l.text) && l.y < 130);
    const top = lineas.find(l => /^TOP/.test(l.text));
    if (!top) return false;
    filaTop = top.y < 65 ? 0 : 1;
    rival = lineas.find(l => l !== top)?.text.slice(0, 3) || rival;
    return true;
  };
  let ultimoReporte = '';
  let reportes = 0, goles = 0;
  let trabajando = Promise.resolve();

  const procesar = async raw => {
    const seg = t++;
    // 1) Marcador
    const caja = await gris(raw, SB_CAJA);
    const enJuego = hayMarcador(caja);
    if (enJuego) {
      const img = () => sharp(raw, { raw: { width: W, height: H, channels: 3 } });
      if (seg - ultimoMarcador > AUSENCIA_PARTIDO) {
        // vuelve el marcador tras un rato largo: arranca (o sigue tras el entretiempo) un partido
        det.reiniciar(); partidos++; inicioMarcador = seg; recortePartido = false;
        const nombre = `partido-${String(partidos).padStart(2, '0')}-${hms(seg).replace(/:/g, '')}`;
        filaTop = null;
        archivoPartido = path.join(OUT, 'goles', `${nombre}-marcador.png`);
        log('partido', { n: partidos, seg, hora: hms(seg) });
        console.log(`[${hms(seg)}] marcador en pantalla (partido/tiempo #${partidos})`);
      }
      ultimoMarcador = seg;
      // el detector descarta cuadros borrosos/rotos y exige que cambie una sola fila, sostenido (lib/marcador.mjs)
      const ev = det.paso(await gris(raw, SB_NUM), caja, seg);
      // el marcador entra con animación: lo de los primeros 5 s queda como resultado y siglas de partida
      if (seg - inicioMarcador >= 5 && !det.asentado) det.asentar();
      if (seg - inicioMarcador >= 6 && !recortePartido) {
        // ya quieto: recorte del partido + qué fila es TOP y siglas del rival
        recortePartido = true;
        await img().extract(SB_RECORTE).resize(450).png().toFile(archivoPartido);
        if (await leerEquipos(archivoPartido)) {
          log('equipos', { n: partidos, seg, hora: hms(seg), filaTop, rival });
          console.log(`[${hms(seg)}]   TOP ${filaTop ? 'visitante' : 'local'} vs ${rival}`);
        }
      }
      if (ev && seg - inicioMarcador >= 5) {
        goles++;
        const ts = ev.seg, nombre = `gol-${String(goles).padStart(2, '0')}-${hms(ts).replace(/:/g, '')}`;
        const pngGol = path.join(OUT, 'goles', `${nombre}-marcador.png`);
        await img().extract(SB_RECORTE).resize(450).png().toFile(pngGol);
        if (filaTop === null && await leerEquipos(pngGol))   // reintento si al arranque no se leyó
          log('equipos', { n: partidos, seg, hora: hms(seg), filaTop, rival });
        const aFavor = filaTop === null ? null : ev.fila === filaTop;
        await img().jpeg({ quality: 88 }).toFile(path.join(OUT, 'goles', `${nombre}.jpg`));
        log('gol', { n: goles, seg: ts, hora: hms(ts), fila: ev.fila, aFavor, rival });
        console.log(`[${hms(ts)}] cambio de marcador #${goles}${aFavor === null ? '' : aFavor ? ' — GOL DE TOP' : ' — gol en contra'}`);
      }
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
  let ffmpegActual = null, cortado = false;
  if (!vodId) {
    setTimeout(() => {
      cortado = true;
      console.log(`Son las ${hasta}: corto el vigía.`);
      ffmpegActual?.kill();
    }, msHasta(hasta)).unref();
  }

  const correr = url => new Promise(res => {
    const a = ['-hide_banner', '-loglevel', 'error', '-i', url];
    if (grabar) a.push('-map', '0', '-c', 'copy', '-f', 'segment', '-segment_time', '900',
      path.join(OUT, 'rec', `${Date.now()}-%03d.ts`));
    a.push('-map', '0:v', '-vf', `fps=1,scale=${W}:${H}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1');
    const p = spawn(ffmpeg, a, { stdio: ['ignore', 'pipe', 'inherit'] });
    ffmpegActual = p;
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
    if (url && !cortado) await correr(url);
    if (vodId || cortado) break;
    if (!(await enVivo())) break;                     // cortó la transmisión
    console.log('Se cortó la lectura pero el canal sigue en vivo: reconectando…');
    await new Promise(r => setTimeout(r, 5000));
    if (intento > 30) break;
  }
  await trabajando;
  ocr.cerrar();

  const clave = vodId || `vivo-${hoyArt()}`;
  let clips = [];
  if (grabar) { try { clips = await armarClips(OUT, clave); } catch (e) { console.error('Clips:', e.message); } }

  // Resumen para revisar (y para cargar el partido / armar el compilado)
  const ev = leerEventos(OUT);
  const md = [`# Vigía ${id}`, '', `Analizado: ${hms(t)} de stream.`, '',
    '## Marcador (partidos y goles)', ...ev.filter(e => e.tipo === 'gol' || e.tipo === 'partido')
      .map(e => e.tipo === 'gol'
        ? `- ${e.hora} ${e.aFavor === false ? 'gol en contra' : e.aFavor ? '**GOL DE TOP**' : 'gol (¿de quién?)'}${e.rival ? ` vs ${e.rival}` : ''} → goles/gol-${String(e.n).padStart(2, '0')}-*`
        : `- ${e.hora} **arranca partido/tiempo**${e.rival ? ` vs ${e.rival}` : ''} → goles/partido-${String(e.n).padStart(2, '0')}-*`),
    '', '## Clips', clips.length ? `${clips.length} clips en goles/gol-NN.mp4; borrador del compilado en fuentes/goles/v${clave}/datos.json` : 'Sin clips.',
    '', '## Pantallas del reporte', ...ev.filter(e => e.tipo === 'reporte').map(e => `- ${e.hora} — ${e.titulo}`), ''];
  writeFileSync(path.join(OUT, 'resumen.md'), md.join('\n'));
  console.log(`Listo: ${goles} cambios de marcador, ${reportes} pantallas de reporte → ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
