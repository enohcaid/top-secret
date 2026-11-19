#!/usr/bin/env node
// "Un partido entero en 30 segundos" (idea jue-partido30 del guion viral-guiones-2026-11-23): la grabación completa de un
// partido real, acelerada; cada gol frena de golpe a velocidad real (rampa suave antes y después), se ve la jugada y
// vuelve a acelerar. Reloj del partido y marcador propios arriba; resultado grande y cierre al final.
//
// Decisiones (producción sin supervisión):
//   - Partido: Top Secret 3-3 SF Drysdale, Espacio Gamer, 22/10 (seed_matches.js). El guion pedía "2 o 3 goles y un final
//     interesante"; este tiene 6, pero el final es el mejor de la temporada (1-3 abajo, 2-3 en el 87 y 3-3 de tijera en el
//     90+), la grabación es limpia (vivo de YouTube de RS32-DaniStone, sin overlay) y los goleadores y minutos están
//     confirmados. Seis frenazos también le dan más sentido al "¿cuántos contaste?". El 3-2 a San Miguel ya lo usó alt-humor.
//   - El partido dura 30,0 s en pantalla (pitazo inicial → pitazo final; el reloj del video lo muestra) y después van el
//     resultado y el cierre (~6 s). Para que entre, lo rápido va a ~x80 (no x20 como decía el guion: a x20 el partido solo
//     dura 48 s) con cuadros mezclados (estela, no estroboscopio); los primeros segundos van a ~x15 para que el gancho se lea
//     antes del primer frenazo. A velocidad real: ~1,4 s los goles de ellos (el remate) y ~3 s los nuestros (la jugada).
//   - Rampa: pasos geométricos de 0,1 s (x80 → x1 en 0,4 s), cada paso un segmento a velocidad constante, encodeado y
//     cacheado en fuentes/redes/viral/jue-partido30/seg/ y unido con concat.
//   - HUD de FC27 recortado (su marcador muestra el escudo de Chelsea del kit del juego): marcador propio con el Clean dorado
//     y el escudo de SF Drysdale (el mismo de Suda eSports, mapa de calendario.html). El marcador sube cuando la pelota entra.
//     El reloj grande es el del juego: tabla leída del marcador de FC27 cada ~10 s, interpolada.
//   - El entretiempo se corta (solo menús y vestuario) con un cartel ENTRETIEMPO.
//   - Cierre: "Esto fue un partido. Esa noche jugamos tres." (22/10: SF Drysdale, Los Picantes e InfinitX, seed_matches.js);
//     no "esta semana", porque el lote no tiene fecha fija de publicación.
//   - Sin voz (pieza visual al pulso, como dice el guion). La música marca los frenazos: cada gol cae en un pulso del tema,
//     la música baja y se apaga en lo real; efectos sintetizados (frenada de cinta, golpe, hinchada, acelerón, silbato).
//   - Redes: Reel, TikTok, Short y X (las del guion). Sin carrusel ni Facebook.
//
//   node scripts/social/piezas/2026-11-23-jue-partido30.mjs
//     --cuadros     hoja de cuadros clave en fuentes/redes/viral/jue-partido30/hoja.jpg (renderiza si hace falta)
//     --sin-lote    renderiza todo pero no sube ni carga el lote
//     --sin-render  reusa el video base: rehace la portada, sube y carga el lote
import fs from 'fs';
import path from 'path';
import { spawnSync, spawn } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica, infoTema, creditoTexto, rotuloEntrada } from '../../lib/musica.mjs';
import { archivo } from '../lib/render.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/jue-partido30');
const SEG = path.join(DIR, 'seg');
const ID = 'viral-jue-partido30-2026-11-23';
const VOD = path.join(ROOT, 'fuentes/goles/vvivo-2026-10-22/source.mp4');
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [partido30] ${m}`);
const flag = f => process.argv.includes(f);
fs.mkdirSync(SEG, { recursive: true });
const FPS = 30, PARTIDO = 30;   // el partido ocupa 30,0 s

// ── La grabación (segundos del VOD), revisada cuadro a cuadro a 10 fps ──
const INICIO = 1141, MEDIO = [1597.5, 1656], FINAL = 2162;   // pitazo inicial (reloj 00:00), entretiempo cortado, pitazo final
// a-b: tramo a velocidad real; g: la pelota entra (ahí sube el marcador). Minutos de seed_matches.js.
const GOLES = [
  { a: 1176.2, b: 1177.5, g: 1177.2, nuestro: false, min: "4'" },
  { a: 1379.0, b: 1381.7, g: 1381.2, nuestro: true, min: "24'", quien: 'Cabers14', detalle: "24' · DE CABEZA" },
  { a: 1521.4, b: 1522.8, g: 1522.5, nuestro: false, min: "40'" },
  { a: 1802.6, b: 1804.0, g: 1803.7, nuestro: false, min: "58'" },
  { a: 2087.6, b: 2090.5, g: 2090.1, nuestro: true, min: "87'", quien: 'Lautavester7', detalle: "87' · EL DESCUENTO" },
  { a: 2124.8, b: 2128.0, g: 2127.5, nuestro: true, min: "90+'", quien: 'Lautavester7', detalle: "90+ · DE TIJERA" },
];
// Reloj de FC27 leído en la grabación: [segundo del VOD, mm:ss del juego]
const RELOJ = [[1141, '00:00'], [1144, '00:00'], [1150, '00:46'], [1160, '02:01'], [1170, '03:17'], [1177.3, '04:00'], [1180, '04:02'], [1190, '05:01'],
  [1200, '06:17'], [1210, '06:46'], [1220, '08:02'], [1240, '10:33'], [1260, '13:04'], [1280, '15:28'], [1300, '17:24'], [1320, '19:55'],
  [1340, '20:38'], [1360, '22:16'], [1381.2, '23:58'], [1390, '24:07'], [1410, '25:52'], [1430, '28:23'], [1450, '30:54'], [1470, '33:25'],
  [1490, '35:57'], [1500, '37:12'], [1520, '39:16'], [1522.5, '39:29'], [1530, '40:03'], [1550, '42:30'], [1570, '43:57'], [1590, '45:44'], [1597.5, '46:40'],
  [1656, '45:00'], [1664, '45:00'], [1670, '45:45'], [1680, '46:34'], [1700, '47:39'], [1720, '50:10'], [1740, '52:41'], [1760, '55:12'], [1780, '57:44'],
  [1790, '58:11'], [1800, '58:21'], [1803.7, '58:35'], [1810, '58:42'], [1820, '58:54'], [1830, '60:09'], [1850, '62:40'], [1870, '63:57'],
  [1890, '66:28'], [1910, '69:00'], [1930, '71:31'], [1950, '74:02'], [1970, '74:43'], [1990, '76:26'], [2000, '77:28'], [2020, '79:59'],
  [2040, '82:30'], [2060, '85:02'], [2080, '85:51'], [2090.1, '87:06'], [2100, '87:42'], [2120, '89:38'], [2127.5, '90:17'], [2140, '90:29'],
  [2150, '91:03'], [2162, '92:10']].map(([s, m]) => [s, +m.split(':')[0] * 60 + +m.split(':')[1]]);

// ── Música: cada gol cae sobre un pulso del tema ──
function pulsoDelTema(mp3, largo) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', '11025', '-f', 's16le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
  const M = 110, en = new Float32Array(Math.floor(pcm.length / M));
  for (let i = 0; i < en.length; i++) { let s = 0; for (let j = 0; j < M; j++) s += Math.abs(pcm[i * M + j]); en[i] = s / M; }
  const flujo = en.map((v, i) => i ? Math.max(0, v - en[i - 1]) : 0);
  const V = Math.round(largo * 100);
  let suma = 0, mejor = -1, desde = 0;
  for (let i = 0; i < en.length; i++) { suma += en[i]; if (i >= V) suma -= en[i - V]; if (i >= V && suma > mejor) { mejor = suma; desde = i - V + 1; } }
  const a = flujo.subarray(desde, desde + V);
  let lag = 60, top = -1;
  for (let l = 35; l <= 86; l++) { let c = 0; for (let i = l; i < a.length; i++) c += a[i] * a[i - l]; if (c > top) { top = c; lag = l; } }
  let fase = 0, fTop = -1;
  for (let f = 0; f < lag; f++) { let c = 0; for (let i = f; i < a.length; i += lag) c += a[i]; if (c > fTop) { fTop = c; fase = f; } }
  return { beat: lag / 100, inicio: (desde + fase) / 100 };
}
const musica = await elegirMusica(ID);
const tema = infoTema(musica);
const { beat: B, inicio: musicaDesde } = pulsoDelTema(musica, 40);

// ── Línea de tiempo: piezas a velocidad constante {a, b, n cuadros} ──
const PASOS = 4;   // rampa: 4 pasos de 3 cuadros (0,4 s)
const rampa = (V, sube) => { const v = []; for (let k = 0; k < PASOS; k++) v.push(Math.pow(V, (PASOS - k) / (PASOS + 1))); return sube ? v.reverse() : v; };
const fuenteRampa = V => rampa(V).reduce((s, v) => s + v * 3 / FPS, 0);
const ARRANQUE = 66;   // cuadros del primer tramo (bajo el gancho)
function plan(V, ajustes = []) {
  const piezas = [];
  // arranque: velocidad propia (punto fijo: la rampa depende de ella)
  let V0 = 15;
  for (let i = 0; i < 20; i++) V0 = (GOLES[0].a - fuenteRampa(V0) - INICIO) / (ARRANQUE / FPS);
  let s = INICIO;
  const rapido = (hasta, n, tag) => {
    if (hasta <= MEDIO[0] || s >= MEDIO[1]) { piezas.push({ a: s, b: hasta, n, tag }); s = hasta; return; }
    const l1 = MEDIO[0] - s, l2 = hasta - MEDIO[1], n1 = Math.max(1, Math.round(n * l1 / (l1 + l2)));
    piezas.push({ a: s, b: MEDIO[0], n: n1, tag }, { a: MEDIO[1], b: hasta, n: Math.max(1, n - n1), tag, medio: true }); s = hasta;
  };
  const conRampa = (vs) => { for (const v of vs) { piezas.push({ a: s, b: s + v * 3 / FPS, n: 3, tag: 'rampa' }); s += v * 3 / FPS; } };
  GOLES.forEach((go, i) => {
    const Vin = i === 0 ? V0 : V;
    const desde = go.a - fuenteRampa(Vin);
    if (i === 0) rapido(desde, ARRANQUE, 'arranque');
    else {
      const largo = desde - s - (s < MEDIO[0] && desde > MEDIO[1] ? MEDIO[1] - MEDIO[0] : 0);
      rapido(desde, Math.max(3, Math.round(largo / V * FPS) + (ajustes[i] || 0)), 'rapido');
    }
    conRampa(rampa(Vin, false));
    const n = Math.round((go.b - go.a) * FPS);
    piezas.push({ a: go.a, b: go.a + n / FPS, n, tag: 'real', gol: i }); s = go.a + n / FPS;
    conRampa(rampa(V, true));
  });
  rapido(FINAL, Math.max(3, Math.round((FINAL - s) / V * FPS) + (ajustes[GOLES.length] || 0)), 'final');
  return piezas;
}
const total = ps => ps.reduce((s, p) => s + p.n, 0);
let lo = 10, hi = 400;
for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; total(plan(m)) > PARTIDO * FPS ? (lo = m) : (hi = m); }
const V = (lo + hi) / 2;
// cada gol sobre un pulso: corro el tramo rápido anterior; el último tramo cierra los 30,0 s
const ajustes = [];
for (let i = 1; i < GOLES.length; i++) {
  const ps = plan(V, ajustes);
  let t = 0; for (const p of ps) { if (p.gol === i) break; t += p.n; }
  const tg = t / FPS + (GOLES[i].g - GOLES[i].a), objetivo = Math.round(tg / B) * B;
  ajustes[i] = Math.round((objetivo - tg) * FPS);
}
ajustes[GOLES.length] = 0;
ajustes[GOLES.length] = PARTIDO * FPS - total(plan(V, ajustes));
const PIEZAS = plan(V, ajustes);
if (total(PIEZAS) !== PARTIDO * FPS) throw new Error('la línea de tiempo no cierra en 30 s: ' + total(PIEZAS));

// por cuadro: [segundo del VOD, velocidad]; tiempos de salida de cada gol
const CUADROS = [], VENTANAS = [];
let tMedio = 0;
{
  let f = 0;
  for (const p of PIEZAS) {
    const k = (p.b - p.a) * FPS / p.n;
    if (p.medio) tMedio = f / FPS;
    if (p.tag === 'real') { VENTANAS.push([f / FPS, (f + p.n) / FPS]); GOLES[p.gol].t = f / FPS + (GOLES[p.gol].g - p.a); }
    for (let j = 0; j < p.n; j++) CUADROS.push([+(p.a + (j + .5) / p.n * (p.b - p.a)).toFixed(2), +k.toFixed(2)]);
    f += p.n;
  }
}
const rapidos = PIEZAS.filter(p => p.tag === 'rapido' || p.tag === 'final').map(p => ((p.b - p.a) * FPS / p.n).toFixed(0));
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} · V≈x${V.toFixed(0)} (tramos ${rapidos.join(', ')}) · ${PIEZAS.length} piezas · goles en ${GOLES.map(g => g.t.toFixed(2)).join(', ')}`);

const T_FIN = PARTIDO, T_CIERRE = T_FIN + 3.6, TOTAL = T_CIERRE + 3.0;
const ESCUDO = archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'));
const ESC_RIVAL = `${MEDIA}/logos/escudos-eg/suda-esports.webp`;
const datos = {
  cuadros: CUADROS, reloj: RELOJ, medio: MEDIO, tMedio, tFin: T_FIN, tCierre: T_CIERRE, tGancho: 2.3, ventanas: VENTANAS,
  escudo: ESCUDO, escudoRival: ESC_RIVAL, rival: 'SF Drysdale', rivalCorto: 'SF<br>DRYSDALE',
  goles: GOLES.map(g => ({
    t: g.t, nuestro: g.nuestro, dur: (g.nuestro ? 2.1 : 1.3),
    kicker: g.nuestro ? 'GOL DE TOP SECRET' : 'GOL DE SF DRYSDALE', quien: g.nuestro ? g.quien : g.min, detalle: g.nuestro ? g.detalle : '',
    foto: g.nuestro ? `${MEDIA}/Renders/${g.quien}/Unica4.webp` : null,
  })),
  fin: { kicker: 'FINAL · ESPACIO GAMER · 22/10', res: '3 <b>-</b> 3', goles: 'Perdíamos 1-3.<br><b>Cabers14</b> 24\' · <b>Lautavester7</b> 87\' · <b>Lautavester7</b> 90+, de tijera' },
  cierre: ['Esto fue un partido.', 'Esa noche jugamos tres.', '¿Cuántos frenazos contaste?'],
};

// ── 1. La grabación con su velocidad (segmentos cacheados) ──
function segmento(p) {
  const k = (p.b - p.a) * FPS / p.n;
  const f = path.join(SEG, `${p.a.toFixed(3)}-${p.b.toFixed(3)}-${p.n}.mp4`);
  if (fs.existsSync(f)) return f;
  const mezcla = k > 12 ? ',fps=240,tmix=frames=8' : k > 3 ? `,fps=120,tmix=frames=${Math.min(4, Math.round(k))}` : '';
  const vf = `crop=1134:577:73:95,scale=1080:550:flags=lanczos,setsar=1,setpts=(PTS-STARTPTS)/${k.toFixed(5)}${mezcla},fps=${FPS}`;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', p.a.toFixed(3), '-t', (p.b - p.a + 1).toFixed(3), '-i', VOD, '-an', '-vf', vf,
    '-frames:v', String(p.n), '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), f + '.tmp.mp4'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg (segmento): ' + r.stderr.slice(-400));
  fs.renameSync(f + '.tmp.mp4', f);
  return f;
}
const tira = path.join(DIR, 'tira.mp4');
{
  log('Segmentos de la grabación…');
  const lista = PIEZAS.map(segmento);
  const txt = path.join(DIR, 'tira.txt');
  fs.writeFileSync(txt, lista.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', txt, '-c', 'copy', tira], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg (concat): ' + r.stderr.slice(-400));
}

// ── 2. Sonido: el tema + efectos, todo sintetizado acá ──
function sonido(salida) {
  const SR = 48000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', musicaDesde.toFixed(3), '-t', TOTAL.toFixed(3), '-i', musica, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (música): ' + String(r.stderr).slice(-300));
  const m = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const n = Math.round(TOTAL * SR), o = new Float32Array(n * 2);
  // la música baja y se oscurece en lo real (y en las rampas que llevan a eso)
  const env = t => {
    let g = 0;
    for (const [a, b] of VENTANAS) g = Math.max(g, Math.min(Math.min(1, Math.max(0, (t - (a - .4)) / .4)), Math.min(1, Math.max(0, ((b + .4) - t) / .4))));
    return g;
  };
  let lpL = 0, lpR = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, e = env(t), L = m[i * 2] || 0, R = m[i * 2 + 1] || 0;
    const al = .02 + .98 * (1 - e) ** 3;   // pasabajos: de abierto a ~150 Hz
    lpL += al * (L - lpL); lpR += al * (R - lpR);
    const vol = (1 - .6 * e) * Math.min(1, t / .3) * Math.min(1, (TOTAL - t) / 1.2);
    o[i * 2] = vol * lpL; o[i * 2 + 1] = vol * lpR;
  }
  let h = 12345; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const fx = new Float32Array(n);
  const suma = (seg, dur, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < dur * SR && i0 + k < n; k++) if (i0 + k >= 0) fx[i0 + k] += f(k / SR); };
  const golpe = (seg, vol) => suma(seg, .6, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (48 + 60 * Math.exp(-30 * u)) * u) + .25 * Math.exp(-60 * u) * azar()));
  // frenada de cinta: tono + ruido que caen
  const frena = (seg, dur, vol) => { let fase = 0, a = 0; suma(seg, dur, u => { const p = u / dur; fase += 2 * Math.PI * (900 * Math.pow(.08, p)) / SR; a += .2 * (azar() - a); return vol * Math.min(1, u / .02) * (1 - p) * (Math.sin(fase) * .5 + Math.sign(Math.sin(fase)) * .15 + a * .6); }); };
  const acelera = (seg, dur, vol) => { let fase = 0, a = 0; suma(seg, dur, u => { const p = u / dur; fase += 2 * Math.PI * (140 * Math.pow(9, p)) / SR; a += .3 * (azar() - a); return vol * p * Math.min(1, (dur - u) / .05) * (Math.sin(fase) * .45 + a * .7); }); };
  const hinchada = (seg, dur, vol) => { let a = 0, b = 0; suma(seg, dur, u => { a += .05 * (azar() - a); b += .004 * (azar() - b); return vol * Math.min(1, u / .15) * Math.exp(-u * 1.1) * (a * 2.4 + b * 6) * (1 + .15 * Math.sin(u * 19)); }); };
  const lamento = (seg, vol) => { let fase = 0; suma(seg, .9, u => { fase += 2 * Math.PI * (220 - 90 * u) / SR; return vol * Math.min(1, u / .05) * Math.exp(-2.5 * u) * (Math.sin(fase) * .6 + Math.sin(fase * 2) * .2); }); };
  const silbato = (seg, dur, vol) => { let fase = 0; suma(seg, dur, u => { fase += 2 * Math.PI * 2900 / SR; return vol * Math.min(1, u / .02) * Math.min(1, (dur - u) / .04) * Math.sin(fase) * (.75 + .25 * Math.sin(2 * Math.PI * 32 * u)); }); };
  silbato(.05, .5, .12);
  for (const [i, [a, b]] of VENTANAS.entries()) {
    const go = GOLES[i];
    frena(a - .4, .42, .3);
    if (go.nuestro) { golpe(go.t, .9); hinchada(go.t, 2.4, .42); } else { golpe(go.t, .5); lamento(go.t + .05, .2); }
    acelera(b, .4, .22);
  }
  silbato(T_FIN - .9, .22, .14); silbato(T_FIN - .55, .22, .14); silbato(T_FIN - .2, .8, .16);
  golpe(T_FIN + .05, .7); golpe(T_CIERRE + .05, .55); golpe(T_CIERRE + .75, .45);
  for (let k = 0; k < n; k++) { o[k * 2] += fx[k]; o[k * 2 + 1] += fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  fs.writeFileSync(salida, Buffer.from(o.buffer));
}

// ── 3. La capa de arriba (plantillas/partido30.html) y el armado final ──
async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/partido30.html')));
  await p.evaluate(d => pintar(d), datos);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  // precarga de las fotos de los goleadores
  await p.evaluate(fs => Promise.all(fs.map(src => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = src; }))), [...new Set(datos.goles.filter(g => g.foto).map(g => g.foto))]);
  return { b, p };
}
const base = path.join(DIR, 'jue-partido30-base.mp4'), mp4 = path.join(DIR, 'jue-partido30.mp4'), jpg = path.join(DIR, 'jue-partido30-portada.jpg'), fotoPortada = path.join(DIR, 'foto-portada.jpg');
if (!flag('--sin-render') || !fs.existsSync(base)) {
  const crudo = path.join(DIR, 'sonido.f32');
  sonido(crudo);
  const rot = await rotuloEntrada(musica, 1080, 1920, TOTAL);
  const fc = `[0:v]tpad=stop_mode=clone:stop_duration=${(TOTAL - PARTIDO + .5).toFixed(2)},split[a][b];[a]scale=-2:1920,crop=1080:1920,boxblur=26:2,eq=brightness=-0.2:saturation=0.75,setsar=1[bg];`
    + `[bg][b]overlay=0:800,setsar=1[base];[base][1:v]overlay=0:0[o1];[o1][3:v]overlay=0:0:eof_action=pass,format=yuv420p[v]`;
  // la capa se guarda cuadro a cuadro (por tubo, ffmpeg cortaba el video en el cuadro 909)
  const CAPA = path.join(DIR, 'capa');
  fs.rmSync(CAPA, { recursive: true, force: true }); fs.mkdirSync(CAPA);
  const { b, p } = await abrir();
  const N = Math.round(TOTAL * FPS);
  log(`Capa: ${N} cuadros…`);
  for (let f = 0; f < N; f++) {
    await p.evaluate(t => mostrar(0, t), f / FPS);
    await p.locator('#lienzo').screenshot({ path: path.join(CAPA, String(f).padStart(4, '0') + '.png'), type: 'png', omitBackground: true });
  }
  await b.close();
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', tira, '-framerate', String(FPS), '-start_number', '0', '-i', path.join(CAPA, '%04d.png'),
    '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', crudo, ...rot,
    '-filter_complex', fc, '-map', '[v]', '-map', '2:a', '-t', TOTAL.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', base], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true }); fs.rmSync(CAPA, { recursive: true, force: true });
  if (r.status !== 0) throw new Error('ffmpeg (armado): ' + (r.stderr || '').slice(-800));
  log('Video base: ' + base);
}

if (flag('--cuadros')) {
  const M = [.5, 1.5, 2.6, ...GOLES.flatMap(g => [g.t - .8, g.t + .1, g.t + .9]), tMedio, PARTIDO - .3, T_FIN + 1.5, T_CIERRE + 2];
  const cols = 6, cw = 270, ch = 480, comp = [];
  for (const [i, t] of M.entries()) {
    const f = path.join(DIR, `c${i}.jpg`);
    spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', t.toFixed(3), '-i', base, '-frames:v', '1', f]);
    comp.push({ input: await sharp(f).resize(cw, ch).toBuffer(), left: (i % cols) * cw, top: Math.floor(i / cols) * ch });
    fs.rmSync(f);
  }
  await sharp({ create: { width: cols * cw, height: Math.ceil(M.length / cols) * ch, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 88 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
  process.exit(0);
}

// ── 4. Portada: la placa del 3-3 con los dos escudos ──
{
  const g6 = GOLES[GOLES.length - 1];
  // la placa del resultado recién asentada (antes de que entren los goleadores), sin la franja del rótulo del tema
  spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', (T_FIN + .55).toFixed(3), '-i', base, '-frames:v', '1', '-vf', 'crop=1080:1750:0:170', '-q:v', '2', fotoPortada]);
}
await portada({ imagen: fotoPortada, kicker: 'Un partido entero', titulo: '90 minutos en *30 segundos*', foco: '50% 20%' }, jpg);
conPortada(base, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── 5. Lote ──
const v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4);
const uPortada = await subirPortada(jpg, 'social/viral/jue-partido30-portada.jpg');
const PROTAS = ['Cabers14', 'Lautavester7'];
const desc = `${Math.round(TOTAL)} s · el 3-3 real a SF Drysdale en Espacio Gamer (22/10), de la grabación del vivo, del pitazo inicial al final en 30,0 s (el reloj del video lo muestra) · lo rápido a ~x${Math.round(V)} con estela, cada uno de los 6 goles frena a velocidad real con rampa (los nuestros ~3 s, los de ellos ~1,4 s) y vuelve a acelerar · reloj del partido (el de FC27, leído de la grabación) y marcador propios con el escudo correcto (el HUD del juego, con el escudo de Chelsea del kit, queda recortado) · goleadores en pantalla con su render: Cabers14 y Lautavester7 ×2 · entretiempo cortado · resultado grande y cierre "Esto fue un partido. Esa noche jugamos tres." · 6 goles y no 2-3 como decía el guion: es el mejor final de la temporada · sin voz (pieza visual) · música: ${tema.titulo}, los goles caen en el pulso y la música se apaga en cada frenazo.`;
const P = o => ({ decision: 'pendiente', protagonistas: PROTAS, descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-23', pieza: 'jue-partido30' },
  titulo: 'Un partido entero en 30 segundos · el 3-3 a SF Drysdale', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Un partido entero en 30 segundos', metodo: 'ig-reel',
      texto: `Un partido entero en 30 segundos. Cuando hay gol, el video frena.\n\nPerdíamos 1-3 con SF Drysdale en Espacio Gamer: Cabers14 de cabeza, Lautavester7 en el 87 y otra vez Lautavester7, de tijera en el 90+.\n\n¿Cuántos frenazos contaste?\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · Un partido entero en 30 segundos', metodo: 'tiktok',
      texto: `90 minutos en 30 segundos y cada gol frena el video. El último es de Lautavester7, de tijera en el 90+. ¿Cuántos contaste? #TopSecretFC #ProClubs #EAFC #ClubsPro` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · Un partido entero en 30 segundos', metodo: 'youtube',
      titulo: 'Un partido entero de Pro Clubs en 30 segundos: del 1-3 al 3-3 | EA FC',
      texto: `Cuando hay gol, el video frena. Cabers14 y dos de Lautavester7, el último de tijera en el 90+, para el 3-3 a SF Drysdale. #Shorts #ProClubs #EAFC` }),
    P({ id: 'x-video', red: 'x', formato: 'Video · Un partido entero en 30 segundos', metodo: 'x-video',
      texto: `90 minutos en 30 segundos: cuando hay gol, el video frena. Perdíamos 1-3 con SF Drysdale en Espacio Gamer y Lautavester7 lo empató de tijera en el 90+. ¿Cuántos contaste? #TopSecretFC` }),
  ],
};
let avisos = 0;
for (const p of lote.piezas) {
  const final = p.musica ? { ...p, texto: `${p.texto}\n\n${creditoTexto(p.musica)}` } : p;
  for (const r of revisarPieza(final, lote)) { avisos++; log(`  aviso ${p.id}: ${r.msg}`); }
}
if (avisos) throw new Error(`${avisos} avisos del revisor: corregir antes de cargar el lote.`);
await agregarLote(lote);
log('Listo: ' + uVid);
process.exit(0);
