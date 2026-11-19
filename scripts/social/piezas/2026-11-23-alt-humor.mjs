#!/usr/bin/env node
// "Tu humor durante un partido, minuto a minuto" (idea alt-humor del guion viral-guiones-2026-11-23): un gráfico de bolsa que
// se dibuja con el reloj del partido, una carita en la punta y la cámara siguiéndola; en el 89 la línea rompe el piso.
//
// Decisiones (producción sin supervisión):
//   - Sin voz: el guion aprobado lo dice ("Sin voz") y es una pieza visual al pulso; todo el chiste va en pantalla (gancho en los
//     primeros 2 s, un cartel grande por minuto, cada uno ~2 s en pantalla).
//   - Datos inventados y presentados como chiste: "índice de humor" con ▲/▼ %, marcador genérico NOSOTROS · ELLOS. Ni jugadores
//     ni resultados del club (nada de seed_matches.js), ni "Top Secret" en el marcador.
//   - Coherencia del marcador: con solo los goles del guion (34' nuestro, 89' en contra) el 90+3 no podría ser "empate". Por eso el
//     12' es "te sacan la pelota y es gol de ellos" (0-1): 34' 1-1, 89' 1-2, 90+3 2-2. Mismas escenas, la cuenta cierra.
//   - Técnica nueva: gráfico por código (plantillas/humor.html) con cámara que sigue la punta, golpes de zoom, piso que se rompe
//     con esquirlas, caritas que cambian con el humor; efectos sintetizados en cada subida y caída, sobre un tema de The Shorts.
//     Eventos al pulso del tema. Sin Facebook: no está en las redes del guion.
//
//   node scripts/social/piezas/2026-11-23-alt-humor.mjs
//     --cuadros     hoja de cuadros clave en fuentes/redes/viral/alt-humor/hoja.jpg, sin renderizar
//     --cuadro=<t>  un cuadro en cuadro.jpg
//     --placas      solo el carrusel
//     --sin-lote    renderiza todo pero no sube ni carga el lote
//     --sin-render  reusa el video base: rehace sonido y portada, sube y carga el lote
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica, infoTema, creditoTexto } from '../../lib/musica.mjs';
import { video, carrusel, archivo } from '../lib/render.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/alt-humor');
const ID = 'viral-alt-humor-2026-11-23';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [humor] ${m}`);
const flag = f => process.argv.includes(f);
fs.mkdirSync(DIR, { recursive: true });

// ── Música: los eventos caen sobre el pulso del tema ──
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
const { beat: B, inicio: musicaDesde } = pulsoDelTema(musica, 32);
const enB = s => Math.round(s / B) * B;

// ── v2 (Juan, 2026-11-18: "poco gráfica, aprovechemos para mostrar nuestros goles, las animaciones que podemos
// hacer"): el humor sigue un partido REAL, el 3-2 a San Miguel eSports por VPUG (12/11), leído del marcador de la
// grabación del vivo (fuentes/goles/vvivo-2026-11-12/source.mp4): 0-1 temprano, 1-1, 1-2 (rompe el piso), un largo
// rato abajo y la remontada 2-2 y 3-2 sobre el final. Nuestros tres goles entran como jugada real en una pantalla
// encima del gráfico, y el cierre muestra a los goleadores con sus renders. Los carteles dicen el marcador, no el
// minuto (el reloj del juego se ve en la propia jugada); el eje en minutos es aproximado a la grabación.
// Goleadores (seed_matches.js): NicoBJ_96, pepolemmo2710 y Guiidow, uno cada uno (el orden no se nombra).
const VOD = path.join(ROOT, 'fuentes/goles/vvivo-2026-11-12/source.mp4');
// [desde, largo] en la grabación: 1-1, 2-2, 3-2. Las ventanas de gol del vigía son 550-565, 1236-1251 y 1290-1305 y el
// saque del medio con los escudos aparece a los 1253 y 1306: se usan los últimos 6,5 s de cada una (el remate).
const CLIPS = [[559, 6.5], [1244.5, 6.5], [1298.5, 6.5]];
const GOLEADORES = ['NicoBJ_96', 'pepolemmo2710', 'Guiidow'];

// ── La curva del humor (minuto → humor; 0 = el piso). 'seco' = salto rápido, sin oleaje ──
const CURVA = [
  [-9, 50], [-4, 58], [0, 70], [1, 86], [4.4, 84, 'seco'], [5.6, 40], [15.4, 44, 'seco'], [16.6, 92], [20.4, 48, 'seco'], [21.6, -36],
  [50, -30], [84.4, -38, 'seco'], [85.6, 80], [89.4, 78, 'seco'], [90.6, 103], [96, 103],
];
const MIN_FIN = 90.6;
// ── Tiempos (s) de cada tramo, al pulso. Después de cada gol nuestro, ~3,6 s de jugada real ──
const T = { gancho: enB(2.2) };
const CLIP = enB(3.6);
const tE1 = enB(2.4), tB = enB(3.8), tC = tB + enB(.6), tD = enB(5.4), tE = tD + enB(.6),
  tF = tE + CLIP + enB(.4), tG = tF + enB(.6), tH = tG + enB(2.4), tI = tH + enB(.6),
  tK = tI + CLIP + enB(.4), tL = tK + enB(.6);
const TIEMPOS = [[0, -2.5], [tE1, 1], [tB, 4.4], [tC, 5.6], [tD, 15.4], [tE, 16.6], [tF, 20.4], [tG, 21.6], [tG + enB(1.2), 50], [tH, 84.4], [tI, 85.6], [tK, 89.4], [tL, MIN_FIN]];
// el instante en que la línea cruza el piso con el 1-2 (choque, sonido y temblor)
let CRASH_MIN;
{
  const k = 48 / (48 + 36), p = 1 - Math.cbrt(1 - k);   // el salto 'seco' (eOut) cruza el 0 cuando eOut(p) = k
  T.crash = tF + (tG - tF) * p; CRASH_MIN = 20.4 + (21.6 - 20.4) * p;
}
const PANTALLAS = [tE, tI, tL].map((t, i) => ({ t: t + .1, dur: CLIP + (i === 2 ? enB(.6) : 0), clip: CLIPS[i] }));
T.abre = tL + CLIP + enB(3.4);   // entre la última jugada y el cierre, la placa de goleadores
T.cierre = T.abre + enB(1.9);
const total = T.cierre + enB(3.4);
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} · total ${total.toFixed(1)} s · crash ${T.crash.toFixed(2)}`);

const EVENTOS = [
  { m: 1, t: tE1 - .05, min: '0-0', kicker: 'ARRANQUE', texto: 'Hoy ganamos seguro', lado: 'abajo', ancho: 560, pin: [-10, -36] },
  { m: 5.6, t: tC - .1, min: '0-1', kicker: 'GOL DE ELLOS', texto: 'De entrada', lado: 'arriba', ancho: 560, color: '#e5484d', zoom: .12, pin: [0, 80] },
  { m: 16.6, t: tE - .05, min: '1-1', kicker: 'GOL NUESTRO', texto: 'Volvimos', lado: 'abajo', ancho: 520, zoom: .14, pin: [-50, -36] },
  { m: 21.6, t: T.crash + .2, min: '1-2', kicker: 'GOL DE ELLOS', texto: 'Atravesaste el piso', lado: 'arriba', ancho: 640, color: '#e5484d', zoom: .2, pin: [-70, 20] },
  { m: 50, t: tG + enB(1.2), min: '1-2', kicker: 'EL SUBSUELO', texto: 'Una hora abajo', lado: 'arriba', ancho: 560, color: '#e5484d', zoom: .06 },
  { m: 85.6, t: tI - .05, min: '2-2', kicker: 'SOBRE EL FINAL', texto: 'Empatamos', lado: 'abajo', ancho: 560, zoom: .16, pin: [-60, 40] },
  { m: MIN_FIN, t: tL - .05, min: '3-2', kicker: 'GOL NUESTRO', texto: 'Lo dimos vuelta', lado: 'abajo', ancho: 620, zoom: .18, pin: [-110, 40] },
];
const ESCUDO = archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'));
const datos = {
  curva: CURVA, tiempos: TIEMPOS, minFin: MIN_FIN, crash: CRASH_MIN, T, px: 40, py: 9, rango: [-45, 108], escudo: ESCUDO,
  equipos: ['TOP SECRET', 'SAN MIGUEL'], bajadaGancho: 'Con un partido de verdad.',
  estados: [[100, 'EUFORIA'], [75, 'TODO BIEN'], [50, 'NERVIOS'], [25, 'BRONCA'], [-25, 'SUBSUELO']],
  eventos: EVENTOS,
  goles: [{ t: tC - .1, m: 5.5, nuestro: false }, { t: tE - .05, m: 16.5, nuestro: true }, { t: T.crash, m: 21.5, nuestro: false }, { t: tI - .05, m: 85.5, nuestro: true }, { t: tL - .05, m: 90.5, nuestro: true }],
  golpes: [
    { t: T.crash, dur: 1.8, txt: 'PISO ROTO', y: 1080, color: 'rgba(229,72,77,.24)', tam: 250 },
  ],
  sacudidas: [{ t: tB + .2, dur: .3, am: 8 }, { t: tE - .05, dur: .35, am: 12 }, { t: T.crash, dur: .7, am: 28 }, { t: tI - .05, dur: .35, am: 12 }, { t: tL - .05, dur: .5, am: 18 }],
  destellos: [{ t: tE - .05, color: '#E6CF85', a: .22 }, { t: T.crash, color: '#e5484d', a: .3 }, { t: tI - .05, color: '#E6CF85', a: .2 }, { t: tL - .05, color: '#E6CF85', a: .3 }],
};
// Carrusel (1080x1350): el partido entero hasta cada momento
const dPlacas = {
  ...datos,
  placas: [
    { m: MIN_FIN, titulo: ['TU HUMOR EN UN PARTIDO', 'DE CLUBS PRO'], oro: [1], pines: true, pie: ['Top Secret 3-2 San Miguel. VPUG.'], pieOro: [0] },
    { m: 1.2, min: '0-0', texto: 'Hoy ganamos seguro', sub: 'El optimismo del arranque.' },
    { m: 5.6, min: '0-1', texto: 'Gol de ellos', sub: 'De entrada. Se cae todo.', color: '#e5484d' },
    { m: 16.6, min: '1-1', texto: 'Gol nuestro', sub: 'Volvimos.' },
    { m: 22.4, min: '1-2', texto: 'Gol de ellos', sub: 'La línea atraviesa el piso.', color: '#e5484d' },
    { m: 85.6, min: '2-2', texto: 'Sobre el final', sub: 'Una hora abajo y empatamos.' },
    { m: MIN_FIN, min: '3-2', texto: 'Lo dimos vuelta', sub: 'NicoBJ_96, pepolemmo2710 y Guiidow.', pines: true, pie: ['¿En qué minuto estás vos ahora?'], pieOro: [0], escudo: true },
  ],
};

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/humor.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}
if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [];
  const M = [.1, 1, 2.2, tE1 + .3, tB + .3, tC + .4, tD - .3, tE + .1, tE + 2, tF, T.crash + .05, T.crash + .4, T.crash + 1.2, tG + 1.4, tH, tI + .2, tI + 2, tK, tL + .2, tL + 2, T.abre + .6, T.abre + 1.8, T.cierre + .2, total - .1];
  const cols = 8, cw = 240, ch = 427;
  for (const [i, t] of M.entries()) {
    await p.evaluate(t => mostrar(0, t), t);
    const buf = await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 82 });
    comp.push({ input: await sharp(buf).resize(cw, ch).toBuffer(), left: (i % cols) * cw, top: Math.floor(i / cols) * ch });
  }
  await b.close();
  await sharp({ create: { width: cols * cw, height: Math.ceil(M.length / cols) * ch, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 88 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
  process.exit(0);
}
const unCuadro = process.argv.find(a => a.startsWith('--cuadro='));
if (unCuadro) {
  const { b, p } = await abrir();
  await p.evaluate(t => mostrar(0, t), Number(unCuadro.split('=')[1]));
  await p.locator('#lienzo').screenshot({ path: path.join(DIR, 'cuadro.jpg'), type: 'jpeg', quality: 90 });
  await b.close();
  process.exit(0);
}

const slides = (await carrusel('humor.html', dPlacas, DIR, 'placa')).map(s => {
  const dest = path.join(DIR, `alt-humor-${path.basename(s)}`);
  fs.copyFileSync(s, dest);
  return dest;
});
if (flag('--placas')) { log('Listo (carrusel).'); process.exit(0); }

// ── Sonido: la música ya viene en el video base; los efectos van encima ──
function sonido(entra, sale) {
  const SR = 48000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', entra, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (audio): ' + String(r.stderr).slice(-300));
  const o = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const n = o.length >> 1;
  let h = 12345; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const fx = new Float32Array(n);
  const suma = (seg, dur, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < dur * SR && i0 + k < n; k++) if (i0 + k >= 0) fx[i0 + k] += f(k / SR); };
  const golpe = (seg, vol) => suma(seg, .6, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (48 + 60 * Math.exp(-30 * u)) * u) + .25 * Math.exp(-60 * u) * azar()));
  // subida: barrido que sube + campanita al llegar
  const sube = (seg, dur, vol) => {
    let fase = 0; suma(seg, dur, u => { fase += 2 * Math.PI * (260 + 900 * Math.pow(u / dur, 1.6)) / SR; return vol * Math.sin(Math.PI * u / dur * .5 + .1) * Math.min(1, (dur - u) / .05) * (Math.sin(fase) * .6 + Math.sin(fase * 2.01) * .25); });
    suma(seg + dur, 1.1, u => vol * .8 * Math.exp(-4.5 * u) * (Math.sin(2 * Math.PI * 1568 * u) + .5 * Math.sin(2 * Math.PI * 2349 * u)));
  };
  // caída: tono que baja con vibrato ("wah")
  const cae = (seg, dur, vol, de = 620, a = 140) => { let fase = 0; suma(seg, dur, u => { const p = u / dur; fase += 2 * Math.PI * (de + (a - de) * p) * (1 + .03 * Math.sin(u * 38)) / SR; return vol * Math.min(1, u / .03) * Math.min(1, (dur - u) / .08) * (Math.sin(fase) * .7 + .3 * Math.sign(Math.sin(fase)) * .4); }); };
  const vidrio = (seg, vol) => { let a = 0; suma(seg, 1.4, u => { a = azar(); return vol * Math.exp(-5 * u) * a * (.5 + .5 * Math.sin(2 * Math.PI * (3200 + 900 * Math.sin(u * 50)) * u)); }); };
  const hinchada = (seg, dur, vol) => { let a = 0, b = 0; suma(seg, dur, u => { a += .05 * (azar() - a); b += .004 * (azar() - b); return vol * Math.min(1, u / .2) * Math.exp(-u * .9) * (a * 2.4 + b * 6) * (1 + .15 * Math.sin(u * 19)); }); };
  const blip = (seg, vol) => suma(seg, .18, u => vol * Math.exp(-22 * u) * Math.sin(2 * Math.PI * 1100 * u));
  // trombón triste: cuatro notas que bajan
  const trombon = (seg, vol) => [[0, .32, 311], [.36, .32, 294], [.72, .32, 277], [1.08, .9, 262]].forEach(([d, dur, f]) => { let fase = 0; suma(seg + d, dur, u => { fase += 2 * Math.PI * f * (d > 1 ? 1 + .025 * Math.sin(u * 34) : 1) / SR; const env = Math.min(1, u / .04) * Math.min(1, (dur - u) / .1); return vol * env * (Math.sin(fase) * .55 + Math.sin(fase * 2) * .3 + Math.sin(fase * 3) * .15); }); });

  blip(tE1 - .05, .25); sube(.05, tE1 - .2, .12);
  cae(tB, tC - tB, .3); golpe(tC - .1, .45); blip(tC - .1, .2);
  sube(tD, tE - tD, .32); golpe(tE - .05, .8); hinchada(tE - .05, CLIP, .3);
  cae(tF, T.crash - tF, .3, 700, 120); golpe(T.crash, 1); vidrio(T.crash, .4); trombon(T.crash + .55, .22);
  blip(tG + enB(1.2) - .05, .2); cae(tG + enB(1.2), tH - tG - enB(1.2), .06, 300, 240);
  sube(tH, tI - tH, .34); golpe(tI - .05, .8); hinchada(tI - .05, CLIP, .32);
  sube(tK, tL - tK, .38); golpe(tL - .05, 1); hinchada(tL - .05, CLIP + 1, .4);
  golpe(T.abre, .5); golpe(T.cierre, .55);
  for (let k = 0; k < n; k++) { o[k * 2] += fx[k]; o[k * 2 + 1] += fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

const base = path.join(DIR, 'alt-humor-base.mp4'), mezclado = path.join(DIR, 'alt-humor-sonido.mp4'), mp4 = path.join(DIR, 'alt-humor.mp4'), jpg = path.join(DIR, 'alt-humor-portada.jpg'), fotoPortada = path.join(DIR, 'alt-humor-foto-portada.jpg');
if (!flag('--sin-render') || !fs.existsSync(base)) {
  log(`Render (${Math.round(total * 60)} cuadros a 60 fps)…`);
  await video('humor.html', datos, base, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica, musicaDesde });
}
sonido(base, mezclado);

// ── v2: las jugadas reales y la placa de goleadores, encima del gráfico ──
// Marco (pantalla con borde dorado y rótulo) y placa final: HTML con las fuentes del sitio, fotografiado con fondo
// transparente. Las jugadas: los últimos 6,5 s de cada ventana de gol del vigía, acelerados para entrar en su tramo.
const conJugadas = path.join(DIR, 'alt-humor-jugadas.mp4');
const PANT = { x: 40, y: 330, w: 1000, h: 562 };   // alto par (yuv420p no acepta impares)
async function capas() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const fuentes = '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Bebas+Neue&display=swap" rel="stylesheet">';
  const marcos = [];
  for (const [i, rot] of ['1-1 · LA JUGADA', '2-2 · LA JUGADA', '3-2 · LA JUGADA'].entries()) {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${fuentes}<style>html,body{margin:0;background:transparent}
      .m{position:absolute;left:${PANT.x - 8}px;top:${PANT.y - 8}px;width:${PANT.w + 16}px;height:${PANT.h + 16}px;box-sizing:border-box;border:8px solid #E6CF85;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.75),0 0 60px rgba(230,207,133,.35)}
      .r{position:absolute;left:${PANT.x + 24}px;top:${PANT.y + PANT.h - 30}px;background:#E6CF85;color:#0c0b09;font:800 40px 'Barlow Condensed';letter-spacing:3px;padding:8px 22px;border-radius:10px}
      .v{position:absolute;left:${PANT.x + PANT.w - 230}px;top:${PANT.y - 30}px;background:#0c0b09;color:#E6CF85;border:3px solid #E6CF85;font:700 30px 'Barlow Condensed';letter-spacing:3px;padding:6px 16px;border-radius:10px}
      </style></head><body><div class="m"></div><div class="v">VPUG · 12/11</div><div class="r">${rot}</div></body></html>`, { waitUntil: 'networkidle' });
    const f = path.join(DIR, `marco-${i + 1}.png`); await p.screenshot({ path: f, omitBackground: true }); marcos.push(f);
  }
  const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
  const jug = GOLEADORES.map(g => `<div class="j"><img src="${MEDIA}/Renders/${g}/Unica4.webp"><div class="g">${g}</div></div>`).join('');
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${fuentes}<style>html,body{margin:0;background:transparent}
    .f{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(30,26,16,.9),rgba(8,7,5,.96))}
    .k{position:absolute;top:250px;width:100%;text-align:center;color:#E6CF85;font:800 46px 'Barlow Condensed';letter-spacing:10px}
    .res{position:absolute;top:320px;width:100%;text-align:center;color:#f7f2e4;font:400 190px 'Bebas Neue';letter-spacing:4px;line-height:1}
    .res b{color:#E6CF85;font-weight:400}
    .s{position:absolute;top:530px;width:100%;text-align:center;color:rgba(247,242,228,.7);font:700 40px 'Barlow Condensed';letter-spacing:6px}
    .js{position:absolute;top:700px;left:0;right:0;display:flex;justify-content:center;gap:10px}
    .j{width:340px;text-align:center}.j img{width:340px;height:620px;object-fit:contain;object-position:bottom;filter:drop-shadow(0 20px 40px rgba(0,0,0,.8))}
    .g{margin-top:-10px;color:#E6CF85;font:800 40px 'Barlow Condensed';letter-spacing:1px}
    .p{position:absolute;top:1450px;width:100%;text-align:center;color:#f7f2e4;font:700 44px 'Barlow Condensed';letter-spacing:4px}
    </style></head><body><div class="f"></div><div class="k">REMONTADA</div><div class="res">TOP SECRET <b>3-2</b></div><div class="s">ANTE SAN MIGUEL · VPUG</div>
    <div class="js">${jug}</div><div class="p">LOS GOLES DE LA REMONTADA</div></body></html>`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
  const placa = path.join(DIR, 'placa-goleadores.png'); await p.screenshot({ path: placa, omitBackground: true });
  await b.close();
  return { marcos, placa };
}
{
  const { marcos, placa } = await capas();
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', mezclado];
  for (const [i, pa] of PANTALLAS.entries()) args.push('-ss', String(pa.clip[0]), '-t', String(pa.clip[1]), '-i', VOD, '-loop', '1', '-t', String(total), '-i', marcos[i]);
  args.push('-loop', '1', '-t', String(total), '-i', placa);
  const ult = PANTALLAS[PANTALLAS.length - 1], tPlaca = ult.t + ult.dur + .1, fPlaca = T.abre - .15;
  let f = '', prev = '0:v';
  PANTALLAS.forEach((pa, i) => {
    const vi = 1 + i * 2, mi = 2 + i * 2, vel = pa.clip[1] / pa.dur;
    f += `[${vi}:v]setpts=(PTS-STARTPTS)/${vel.toFixed(4)},fps=60,scale=${PANT.w}:${PANT.h}:force_original_aspect_ratio=increase,crop=${PANT.w}:${PANT.h},format=yuva420p,fade=in:st=0:d=0.18:alpha=1,fade=out:st=${(pa.dur - .2).toFixed(2)}:d=0.2:alpha=1,setpts=PTS+${pa.t.toFixed(3)}/TB[c${i}];`;
    f += `[${prev}][c${i}]overlay=${PANT.x}:${PANT.y}:eof_action=pass:enable='between(t,${pa.t.toFixed(3)},${(pa.t + pa.dur).toFixed(3)})'[a${i}];`;
    f += `[${mi}:v]format=rgba,fade=in:st=${pa.t.toFixed(3)}:d=0.18:alpha=1,fade=out:st=${(pa.t + pa.dur - .2).toFixed(3)}:d=0.2:alpha=1[m${i}];`;
    f += `[a${i}][m${i}]overlay=0:0:enable='between(t,${pa.t.toFixed(3)},${(pa.t + pa.dur).toFixed(3)})'[b${i}];`;
    prev = `b${i}`;
  });
  f += `[7:v]format=rgba,fade=in:st=${tPlaca.toFixed(3)}:d=0.3:alpha=1,fade=out:st=${(fPlaca - .3).toFixed(3)}:d=0.3:alpha=1[pl];[${prev}][pl]overlay=0:0:enable='between(t,${tPlaca.toFixed(3)},${fPlaca.toFixed(3)})'[v]`;
  // por archivo: en Windows el filtro largo como argumento no llega entero a ffmpeg ("Invalid argument")
  const guion = path.join(DIR, 'jugadas.filtro'); fs.writeFileSync(guion, f);
  args.push('-filter_complex_script', guion, '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '60', '-c:a', 'copy', '-movflags', '+faststart', conJugadas);
  const r = spawnSync(ffmpeg, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (jugadas): ' + (r.stderr || '').slice(-800));
  log('Jugadas y placa de goleadores encima del gráfico.');
  // Carrusel: la placa de la remontada (goleadores con sus renders) como segunda, recortada a 1080x1350
  const remontada = path.join(DIR, 'alt-humor-placa-remontada.jpg');
  await sharp(placa).extract({ left: 0, top: 180, width: 1080, height: 1350 }).flatten({ background: '#0c0b09' }).jpeg({ quality: 92 }).toFile(remontada);
  slides.splice(1, 0, remontada);
}

// Portada: el choque contra el piso del 1-2, sin textos (el título lo pone la portada)
{
  const { b, p } = await abrir();
  await p.evaluate(t => mostrar(0, t, { sinTexto: true, subir: 420 }), T.crash + .9);
  await p.locator('#lienzo').screenshot({ path: fotoPortada, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: fotoPortada, kicker: 'Tu humor en un partido', dato: '3-2', titulo: 'Lo dimos *vuelta*', foco: '50% 45%' }, jpg);
conPortada(conJugadas, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4), uSl = [];
for (const s of slides) uSl.push(await subir(s));
const uPortada = await subirPortada(jpg, 'social/viral/alt-humor-portada.jpg');
const desc = `${Math.round(total)} s · v2 (Juan: "poco gráfica, mostremos nuestros goles"): el humor sigue el 3-2 real a San Miguel eSports por VPUG (12/11), leído del marcador de la grabación del vivo · las tres jugadas de nuestros goles (1-1, 2-2, 3-2) entran reales en una pantalla con marco dorado · placa de remontada con los renders de NicoBJ_96, pepolemmo2710 y Guiidow · el piso se rompe con el 1-2 · los carteles dicen el marcador (el minuto del eje es aproximado) · sin voz · música: ${tema.titulo}. Única publicación del sábado 21 (Juan, 18/11).`;
const P = o => ({ decision: 'pendiente', protagonistas: [], descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-23', pieza: 'alt-humor' },
  publicarA: '2026-11-21T14:00:00-03:00',   // Juan, 18/11: la única publicación viral del sábado 21
  titulo: 'Tu humor durante un partido · el 3-2 a San Miguel', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Tu humor durante un partido', metodo: 'ig-reel', protagonistas: GOLEADORES,
      texto: `Tu humor durante un partido de Clubs Pro, minuto a minuto. Este fue de verdad: 0-1, 1-1, 1-2 y una hora en el subsuelo. Después NicoBJ_96, pepolemmo2710 y Guiidow lo dieron vuelta: 3-2 a San Miguel eSports por VPUG.\n\n¿En qué minuto estás vos ahora?\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · Tu humor durante un partido', metodo: 'tiktok', protagonistas: GOLEADORES,
      texto: `Una hora en el subsuelo y remontada 3-2. Goles de NicoBJ_96, pepolemmo2710 y Guiidow. ¿En qué minuto estás vos? #TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · Tu humor durante un partido', metodo: 'youtube', protagonistas: GOLEADORES,
      titulo: 'Tu humor durante un partido de Pro Clubs: remontada 3-2 | EA FC',
      texto: `0-1, 1-1, 1-2 y una hora abajo. Después NicoBJ_96, pepolemmo2710 y Guiidow lo dieron vuelta. ¿En qué minuto estás vos? #Shorts #ProClubs #EAFC` }),
    P({ id: 'x-video', red: 'x', formato: 'Video · Tu humor durante un partido', metodo: 'x-video', protagonistas: GOLEADORES,
      texto: `Tu humor en un partido real: 0-1, 1-1, 1-2, una hora abajo y remontada 3-2 a San Miguel eSports en VPUG. Goles de NicoBJ_96, pepolemmo2710 y Guiidow. #TopSecretFC` }),
    { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel · Tu humor durante un partido', decision: 'pendiente', protagonistas: GOLEADORES, metodo: 'ig-carrusel',
      descripcion: 'Ocho placas: el gráfico entero del 3-2 a San Miguel, la remontada con los renders de los tres goleadores y después cada momento del marcador (0-0, 0-1, 1-1, 1-2, 2-2, 3-2), con el cierre "¿En qué minuto estás vos ahora?". Sin música ni voz. En carrusel se guarda.',
      media: uSl.map(url => ({ tipo: 'imagen', url })), local: { slides },
      texto: `Tu humor en un partido real.\n\nDeslizá: el 3-2 a San Miguel eSports por VPUG, marcador por marcador. El optimismo del arranque, el 0-1 de entrada, el 1-1, el 1-2 que rompió el piso, una hora abajo y la remontada de NicoBJ_96, pepolemmo2710 y Guiidow.\n\n¿En qué minuto estás vos ahora? Guardalo para el próximo partido.\n\n#TopSecretFC #ProClubs #EAFC #ClubsPro` },
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
