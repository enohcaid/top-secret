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
const { beat: B, inicio: musicaDesde } = pulsoDelTema(musica, 26);
const enB = s => Math.round(s / B) * B;

// ── La curva del humor (minuto → humor; 0 = el piso). 'seco' = salto rápido, sin oleaje ──
const CURVA = [
  [-9, 50], [-4, 58], [0, 70], [1, 86], [11.4, 83, 'seco'], [12.6, 38], [33.4, 44, 'seco'], [34.6, 97], [45, 90], [46.5, 88], [58, 84], [60, 80],
  [80, 52], [88.4, 48, 'seco'], [89.6, -36], [92.4, -38, 'seco'], [93.6, 80], [99, 80],
];
const MIN_FIN = 93.6;
// ── Tiempos (s) de cada tramo, al pulso ──
const T = { gancho: enB(2.4) };
const tE1 = enB(2.6), tB = enB(4.6), tC = tB + enB(.7), tD = enB(7.4), tE = tD + enB(.6), tF = enB(10.2), tG = tF + enB(.6),
  tH = enB(12.6), tI = enB(13.6), tJ = tI + enB(.6), tK = enB(16.2), tL = tK + enB(.6);
const TIEMPOS = [[0, -2.5], [tE1, 1], [tB, 11.4], [tC, 12.6], [tD, 33.4], [tE, 34.6], [tF, 58], [tG, 60], [tH, 80], [tI, 88.4], [tJ, 89.6], [tK, 92.4], [tL, MIN_FIN]];
// el instante en que la línea cruza el piso (para el choque, el sonido y el temblor)
let CRASH_MIN;
{
  const k = 48 / (48 + 36), p = 1 - Math.cbrt(1 - k);   // el salto 'seco' (eOut) cruza el 0 cuando eOut(p) = k
  T.crash = tI + (tJ - tI) * p; CRASH_MIN = 88.4 + (89.6 - 88.4) * p;
}
T.abre = tL + enB(1.3);
T.cierre = T.abre + enB(1.9);
const total = T.cierre + enB(3.4);
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} · total ${total.toFixed(1)} s · crash ${T.crash.toFixed(2)}`);

const EVENTOS = [
  { m: 1, t: tE1 - .05, min: "1'", kicker: 'ARRANQUE', texto: 'Optimismo total', lado: 'abajo', ancho: 560, pin: [-10, -36] },
  { m: 12.6, t: tC - .1, min: "12'", kicker: 'PELOTA PERDIDA', texto: 'Te la sacan y es gol de ellos', lado: 'arriba', ancho: 720, color: '#e5484d', zoom: .12, pin: [0, 80] },
  { m: 34.6, t: tE - .05, min: "34'", kicker: 'GOL NUESTRO', texto: 'Sube como cohete', lado: 'abajo', ancho: 600, zoom: .18, pin: [-50, -36] },
  { m: 60, t: tG - .05, min: "60'", kicker: 'ESE COMPAÑERO', texto: 'Que no pasa la pelota', lado: 'arriba', ancho: 640, zoom: .08 },
  { m: 89.6, t: T.crash + .2, min: "89'", kicker: 'GOL EN CONTRA', texto: 'Atravesaste el piso', lado: 'arriba', ancho: 640, color: '#e5484d', zoom: .22, pin: [-70, 20] },
  { m: MIN_FIN, t: tL - .05, min: "90+3'", kicker: 'EMPATE', texto: 'Y lo festejás como un título', lado: 'abajo', ancho: 720, zoom: .16, pin: [-110, 40] },
];
const ESCUDO = archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'));
const datos = {
  curva: CURVA, tiempos: TIEMPOS, minFin: MIN_FIN, crash: CRASH_MIN, T, px: 40, py: 9, rango: [-45, 105], escudo: ESCUDO,
  estados: [[100, 'EUFORIA'], [75, 'TODO BIEN'], [50, 'NERVIOS'], [25, 'BRONCA'], [-25, 'SUBSUELO']],
  eventos: EVENTOS,
  goles: [{ t: tC - .1, m: 12.5, nuestro: false }, { t: tE - .05, m: 34.5, nuestro: true }, { t: T.crash, m: 89.5, nuestro: false }, { t: tL - .05, m: 93.5, nuestro: true }],
  golpes: [
    { t: tE - .05, dur: 1.5, txt: 'GOOOL', y: 1080, color: 'rgba(230,207,133,.22)', tam: 330 },
    { t: T.crash, dur: 1.8, txt: 'PISO ROTO', y: 1080, color: 'rgba(229,72,77,.24)', tam: 250 },
    { t: tL - .05, dur: 1.3, txt: 'REBOTE', y: 1080, color: 'rgba(230,207,133,.22)', tam: 300 },
  ],
  sacudidas: [{ t: tB + .2, dur: .3, am: 8 }, { t: tE - .05, dur: .35, am: 12 }, { t: T.crash, dur: .7, am: 28 }, { t: tL - .05, dur: .35, am: 12 }],
  destellos: [{ t: tE - .05, color: '#E6CF85', a: .22 }, { t: T.crash, color: '#e5484d', a: .3 }, { t: tL - .05, color: '#E6CF85', a: .2 }],
};
// Carrusel (1080x1350): el partido entero hasta cada minuto
const dPlacas = {
  ...datos,
  placas: [
    { m: MIN_FIN, titulo: ['TU HUMOR EN UN PARTIDO', 'DE CLUBS PRO'], oro: [1], pines: true, pie: ['El minuto 89 es real.'], pieOro: [0] },
    { m: 1.2, min: "1'", texto: 'Optimismo total', sub: 'Hoy ganamos seguro.' },
    { m: 12.6, min: "12'", texto: 'Te la sacan', sub: 'Y es gol de ellos. Se cae todo.', color: '#e5484d' },
    { m: 34.6, min: "34'", texto: 'Gol nuestro', sub: 'Sube como cohete.' },
    { m: 70, min: "60'", texto: 'Ese compañero', sub: 'Que no pasa la pelota. Baja de a poco.' },
    { m: 90.4, min: "89'", texto: 'Gol en contra', sub: 'La línea atraviesa el piso.', color: '#e5484d' },
    { m: MIN_FIN, min: "90+3'", texto: 'Empate', sub: 'Y lo festejás como un título.', pines: true, pie: ['¿En qué minuto estás vos ahora?'], pieOro: [0], escudo: true },
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
  const M = [.1, 1, 2.2, tE1 + .3, tB + .3, tC + .4, tD - .5, tE + .1, tE + .6, tF, tG + .4, tH, tI + .2, T.crash + .05, T.crash + .4, T.crash + 1.2, tK, tL + .2, tL + 1, T.abre + .6, T.abre + 1.8, T.cierre + .2, T.cierre + 1.2, total - .1];
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
  sube(tD, tE - tD, .32); golpe(tE - .05, .8); hinchada(tE - .05, 3, .32);
  blip(tG - .05, .2); cae(tG, tH - tG, .07, 380, 300);
  cae(tI, T.crash - tI, .3, 700, 120); golpe(T.crash, 1); vidrio(T.crash, .4); trombon(T.crash + .55, .22);
  sube(tK, tL - tK, .34); golpe(tL - .05, .7); hinchada(tL - .05, 3.2, .34);
  golpe(T.cierre, .55);
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

// Portada: el choque contra el piso, sin textos (el título lo pone la portada)
{
  const { b, p } = await abrir();
  await p.evaluate(t => mostrar(0, t, { sinTexto: true, subir: 420 }), T.crash + .9);
  await p.locator('#lienzo').screenshot({ path: fotoPortada, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: fotoPortada, kicker: 'Tu humor en un partido', dato: "89'", titulo: 'El minuto 89 *es real*', foco: '50% 45%' }, jpg);
conPortada(mezclado, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4), uSl = [];
for (const s of slides) uSl.push(await subir(s));
const uPortada = await subirPortada(jpg, 'social/viral/alt-humor-portada.jpg');
const desc = `${Math.round(total)} s · sin voz (guion aprobado: pieza visual al pulso, el chiste va en pantalla) · gráfico animado por código: cámara que sigue la punta, carita que cambia con el humor, piso que se rompe en el 89; efectos en cada subida y caída · datos inventados y en chiste (índice de humor, marcador NOSOTROS · ELLOS): ni jugadores ni resultados del club · el 12' suma "y es gol de ellos" para que el empate del 90+3 cierre (0-1, 1-1, 1-2, 2-2) · música: ${tema.titulo}.`;
const P = o => ({ decision: 'pendiente', protagonistas: [], descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-23', pieza: 'alt-humor' },
  titulo: 'Tu humor durante un partido, minuto a minuto', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Tu humor durante un partido', metodo: 'ig-reel',
      texto: `Tu humor durante un partido de Clubs Pro, minuto a minuto. El 89 es real.\n\n¿En qué minuto estás vos ahora?\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · Tu humor durante un partido', metodo: 'tiktok',
      texto: `Del optimismo del minuto 1 al subsuelo del 89. ¿En qué minuto estás vos? #TopSecretFC #ProClubs #EAFC #ClubsPro` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · Tu humor durante un partido', metodo: 'youtube',
      titulo: 'Tu humor durante un partido de Pro Clubs, minuto a minuto | EA FC',
      texto: `Gol nuestro, ese compañero que no pasa la pelota y el minuto 89. ¿En cuál estás vos? #Shorts #ProClubs #EAFC` }),
    P({ id: 'x-video', red: 'x', formato: 'Video · Tu humor durante un partido', metodo: 'x-video',
      texto: `Tu humor durante un partido, minuto a minuto. El 89 es real. ¿En qué minuto estás vos? #TopSecretFC` }),
    { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel · Tu humor durante un partido', decision: 'pendiente', protagonistas: [], metodo: 'ig-carrusel',
      descripcion: 'Siete placas: el gráfico entero y después minuto a minuto (1, 12, 34, 60, 89 y 90+3), con el cierre "¿En qué minuto estás vos ahora?". Sin música ni voz. Va además del Reel porque el guion aprobado pide las dos; en carrusel se guarda.',
      media: uSl.map(url => ({ tipo: 'imagen', url })), local: { slides },
      texto: `El minuto 89 es real.\n\nDeslizá: así se mueve tu humor durante un partido de Clubs Pro. Del optimismo del arranque al gol nuestro, ese compañero que no pasa la pelota, el piso roto y el empate del final.\n\n¿En qué minuto estás vos ahora? Guardalo para el próximo partido.\n\n#TopSecretFC #ProClubs #EAFC #ClubsPro` },
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
