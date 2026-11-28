#!/usr/bin/env node
// "Decidí en 3 segundos" (idea jue-decidi del guion viral-guiones-2026-11-30): tres jugadas reales del vivo que se congelan
// justo antes de la decisión (desaturado + zoom lento al que tiene la pelota), tres botones y una cuenta de 3 s con un tic por
// segundo; en cero los botones se traban y la jugada sigue: lo que hizo nuestro jugador y cómo terminó. Cierre: "¿Cuántas
// acertaste? 3 de 3 = convocado".
//
// Decisiones (producción sin supervisión):
//   - El guion pedía tres jugadas de noviembre que terminen distinto (una buena decisión, una mala, una dudosa). Las grabaciones
//     del vigía (fuentes/goles/vvivo-*) solo guardan goles: se revisaron las ventanas de 11/11, 12/11, 16/11, 17/11 y 18/11 y
//     no hay una jugada nuestra perdida o atajada que se lea clara. Quedan tres goles con TRES DECISIONES DISTINTAS (tiro, pase,
//     gambeta al arquero): el juego sigue siendo "adiviná qué hizo".
//   - Jugada 1 = Lautavester7 en el 87' del 3-3 a SF Drysdale (22/10, Espacio Gamer; reloj del juego 87:03, perdíamos 1-3):
//     recibe en el área y le pega rasante, 2-3. Es lo más cerca del "minuto 89" del gancho que está grabado limpio. No es de
//     noviembre; la tijera del 90+ de ese partido no se usa porque ya sale (con la respuesta) en "Cosas que solo entendés…".
//   - Jugada 2 = pepolemmo2710 en el borde del área, pase al medio y gol de Cabers14 (16/11, VPN, ante Instituto Reserva; la
//     asistencia figura en seed_matches.js, web de VPN).
//   - Jugada 3 = mano a mano de NicoBJ_96, gambetea al arquero y la empuja (18/11, VPN, ante Dalmine Esports; etiqueta del juego
//     sobre el que define). Es la escena "¿cruzás o la picás?" del guion.
//   - Sin voz (lo pide el guion: es un juego para contestar). Audio del vivo descartado (puede traer voces de la transmisión):
//     música + tic por segundo, golpe al congelar, traba en cero, hinchada en cada gol, todo sintetizado.
//   - La cuenta dura 3 segundos de verdad (lo promete el título); solo los cortes de escena caen cerca del pulso del tema.
//
//   node scripts/social/piezas/2026-11-30-jue-decidi.mjs
//     --cuadros       hoja de cuadros clave en fuentes/redes/viral/jue-decidi/hoja.jpg, sin renderizar
//     --cuadro=n,t    un cuadro suelto en fuentes/redes/viral/jue-decidi/cuadro.jpg
//     --sin-lote      renderiza todo pero no sube ni carga el lote
//     --sin-render    reusa el video base: rehace sonido y portada, sube y carga el lote
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica, infoTema, creditoTexto } from '../../lib/musica.mjs';
import { video, archivo } from '../lib/render.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/jue-decidi');
const ID = 'viral-jue-decidi-2026-11-30';
const K = 1.5, FPS = 60;   // cuadros a 1920x1080 (1,5 veces el video de 720p), a los 60 fps de la grabación
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [decidi] ${m}`);
const flag = f => process.argv.includes(f);
fs.mkdirSync(DIR, { recursive: true });

// Jugadas (segundos de source.mp4). desde → congela: la previa a velocidad normal; congela → fin: la revelación, con
// lento = tramo a la mitad de velocidad; golEn = segundo en que entra la pelota; foco = el que decide (px de 1280x720);
// cam = [segundo, centro x] de la franja.
const JUGADAS = [
  { noche: '2026-10-22', desde: 2087.0, congela: 2089.4, fin: 2091.4, lento: [2089.45, 2090.5], golEn: 2090.2,
    foco: [360, 280], zoom: 330, anilloDy: 10, cy: 380, ancho: 540, cam: [[2087.0, 470], [2089.4, 320], [2090.0, 230], [2091.4, 220]],
    kicker: 'JUGADA 1 · MINUTO 87 · PERDEMOS 1-3', pregunta: '¿Pase, tiro<br>o gambeta?',
    opciones: ['PASE', 'TIRO', 'GAMBETA'], correcta: 1, autor: 'Lautavester7', hizo: 'TIRO RASANTE',
    gol: "GOL<small>2-3 EN EL 87'</small>", contexto: 'Espacio Gamer · ante SF Drysdale' },
  { noche: '2026-11-17', desde: 3899.0, congela: 3901.25, fin: 3905.3, lento: [3903.2, 3904.5], golEn: 3904.15,
    foco: [717, 470], zoom: 330, anilloDy: 0, cy: 380, ancho: 540, cam: [[3899.0, 820], [3901.25, 800], [3904.2, 830]],
    kicker: 'JUGADA 2 · BORDE DEL ÁREA', pregunta: '¿Pase, tiro<br>o gambeta?',
    opciones: ['PASE', 'TIRO', 'GAMBETA'], correcta: 0, autor: 'pepolemmo2710', hizo: 'PASE AL MEDIO',
    gol: 'GOL<small class="gt">de Cabers14</small>', contexto: 'VPN · ante Instituto Reserva' },
  // v2 (Juan, 28/11): se congelaba en 2888,0, con la gambeta de NicoBJ_96 ya hecha. Ahora la decisión es la del
  // pasador, Juan_Martinez4: recibe en 2886,25, la tiene en 2886,5 y en 2886,75 ya salió el pase al área.
  { noche: '2026-11-18', desde: 2884.6, congela: 2886.55, fin: 2891.6, lento: [2888.4, 2890.8], golEn: 2890.47,
    foco: [745, 258], zoom: 330, anilloDy: 10, cy: 380, ancho: 540, cam: [[2884.6, 760], [2886.55, 760], [2887.6, 880], [2888.4, 930], [2891.6, 960]],
    kicker: 'JUGADA 3 · CONTRAGOLPE', pregunta: '¿Pase, tiro<br>o gambeta?',
    opciones: ['TIRO', 'GAMBETA', 'PASE'], correcta: 2, autor: 'Juan_Martinez4', hizo: 'PASE AL ÁREA',
    gol: 'GOL<small class="gt">de NicoBJ_96</small>', contexto: 'VPN · ante Dalmine Esports' },
];
function extraer(J, i) {
  const d = path.join(DIR, 'cuadros', `j${i}`), marca = path.join(d, `listo-${J.desde}-${J.fin}`);
  if (!fs.existsSync(marca)) {
    fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(J.desde), '-i', path.join(ROOT, `fuentes/goles/vvivo-${J.noche}/source.mp4`),
      '-t', String(J.fin - J.desde + .6), '-an', '-vf', `fps=${FPS},scale=${1280 * K}:${720 * K}:flags=lanczos,unsharp=5:5:0.6:5:5:0`, '-q:v', '3', path.join(d, '%04d.jpg')], { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
    fs.writeFileSync(marca, '');
  }
  return { ...J, dir: archivo(d), n: fs.readdirSync(d).filter(f => /^\d+\.jpg$/.test(f)).length };
}
const jugadas = JUGADAS.map(extraer);
const PROTAS = [...new Set(['Lautavester7', 'pepolemmo2710', 'Cabers14', 'Juan_Martinez4', 'NicoBJ_96'])];

// ── Música ──
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

// ── Escenas ──
const durRevela = J => (J.lento[0] - J.congela) + 2 * (J.lento[1] - J.lento[0]) + (J.fin - J.lento[1]);
const CUENTA = 3, CIERRE = Math.max(1, Math.round(3.6 / B)) * B;
const escenas = [];
jugadas.forEach((J, j) => escenas.push({ n: 3 * j, dur: J.congela - J.desde }, { n: 3 * j + 1, dur: CUENTA }, { n: 3 * j + 2, dur: durRevela(J) }));
escenas.push({ n: 9, dur: CIERRE });
const INI = escenas.map((_, i) => escenas.slice(0, i).reduce((s, e) => s + e.dur, 0));
const total = escenas.reduce((s, e) => s + e.dur, 0);

const datos = {
  K, fps: FPS, jugadas,
  escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  textos: {
    titulo: 'Decidí en *3 segundos*',
    gancho: 'Elegí antes de que siga',
    cierre: ['¿Cuántas<br>acertaste?', '3 de 3 = convocado'],
  },
};
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} s · total ${total.toFixed(1)} s · cuadros ${jugadas.map(j => j.n).join(' ')}`);

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/decidi.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}
if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [];
  const M = [];
  jugadas.forEach((J, j) => {
    const r = durRevela(J), g = (J.lento[0] - J.congela) + 2 * (J.golEn - J.lento[0]);
    M.push([3 * j, .1], [3 * j, (J.congela - J.desde) - .1], [3 * j + 1, .3], [3 * j + 1, 1.5], [3 * j + 1, 2.95], [3 * j + 2, .3], [3 * j + 2, g - .4], [3 * j + 2, Math.min(r - .05, g + .4)]);
  });
  M.push([9, .3], [9, CIERRE - .1]);
  const cols = 9, cw = 240, ch = 427;
  for (const [i, [n, t]] of M.entries()) {
    await p.evaluate(([n, t]) => mostrar(n, t), [n, t]);
    const buf = await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 80 });
    comp.push({ input: await sharp(buf).resize(cw, ch).toBuffer(), left: (i % cols) * cw, top: Math.floor(i / cols) * ch });
  }
  await b.close();
  await sharp({ create: { width: cols * cw, height: Math.ceil(M.length / cols) * ch, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 86 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
  process.exit(0);
}
const unCuadro = process.argv.find(a => a.startsWith('--cuadro='));
if (unCuadro) {
  const [n, t] = unCuadro.split('=')[1].split(',').map(Number);
  const { b, p } = await abrir();
  await p.evaluate(([n, t]) => mostrar(n, t), [n, t]);
  await p.locator('#lienzo').screenshot({ path: path.join(DIR, 'cuadro.jpg'), type: 'jpeg', quality: 90 });
  await b.close();
  process.exit(0);
}

// ── Sonido: la música del render + efectos sintetizados ──
function sonido(entra, sale) {
  const SR = 48000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', entra, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (audio): ' + String(r.stderr).slice(-300));
  const o = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const n = o.length >> 1;
  let h = 12345; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const fx = new Float32Array(n);
  const suma = (seg, dur, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < dur * SR && i0 + k < n; k++) if (i0 + k >= 0) fx[i0 + k] += f(k / SR); };
  const tic = (seg, agudo, vol) => suma(seg, .09, u => vol * Math.exp(-70 * u) * Math.sin(2 * Math.PI * (agudo ? 1500 : 1050) * u));
  const golpe = (seg, vol) => suma(seg, .6, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (48 + 60 * Math.exp(-30 * u)) * u) + .25 * Math.exp(-60 * u) * azar()));
  const barrido = (seg, dur, vol) => { let a = 0; suma(seg, dur, u => { a += .08 * (azar() - a); return vol * Math.pow(Math.sin(Math.PI * u / dur), 2) * a * 3; }); };
  const traba = (seg, vol) => suma(seg, .14, u => vol * Math.exp(-28 * u) * (Math.sin(2 * Math.PI * 220 * u) + .5 * Math.sign(Math.sin(2 * Math.PI * 110 * u))));
  const hinchada = (seg, dur, vol) => { let a = 0, b = 0; suma(seg, dur, u => { a += .05 * (azar() - a); b += .004 * (azar() - b); return vol * Math.min(1, u / .2) * Math.exp(-u * 1.1) * (a * 2.4 + b * 6) * (1 + .15 * Math.sin(u * 19)); }); };
  const duck = new Float32Array(n).fill(1);
  const bajar = (a, b, g) => { for (let k = Math.round(a * SR); k < Math.min(n, b * SR); k++) duck[k] = Math.min(duck[k], g); };
  golpe(.03, .5);
  jugadas.forEach((J, j) => {
    const ini = INI[3 * j], ic = INI[3 * j + 1], ir = INI[3 * j + 2];
    if (j) { barrido(ini - .1, .35, .35); golpe(ini, .45); }
    // congelado: golpe, la música baja, un tic por segundo (el último más agudo) y la traba en cero
    golpe(ic, .7); barrido(ic - .08, .3, .3); bajar(ic, ir, .45);
    for (let s = 0; s < CUENTA; s++) tic(ic + s, s === CUENTA - 1, s === CUENTA - 1 ? .36 : .26);
    traba(ic + 2.85, .32);
    // sigue la jugada; gol con hinchada
    golpe(ir, .4);
    const g = ir + (J.lento[0] - J.congela) + 2 * (J.golEn - J.lento[0]);
    golpe(g, .75); hinchada(g, 3, .3);
  });
  golpe(INI[9] + .05, .5);
  const suave = 2400; let g = 1;
  for (let k = 0; k < n; k++) { g += (duck[k] - g) / suave; o[k * 2] = o[k * 2] * g * .8 + fx[k]; o[k * 2 + 1] = o[k * 2 + 1] * g * .8 + fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

const base = path.join(DIR, 'decidi-base.mp4'), mezclado = path.join(DIR, 'decidi-sonido.mp4'), mp4 = path.join(DIR, 'decidi.mp4'), jpg = path.join(DIR, 'decidi-portada.jpg'), foto = path.join(DIR, 'decidi-foto-portada.jpg');
if (!flag('--sin-render') || !fs.existsSync(base)) {
  log(`Render (${Math.round(total * 30)} cuadros)…`);
  await video('decidi.html', datos, base, { escenas, fps: 30, musica, musicaDesde });
}
sonido(base, mezclado);

// Portada: Juan_Martinez4 congelado antes del pase (desaturado y con el anillo), sin textos
{
  const { b, p } = await abrir();
  await p.evaluate(async () => { await mostrar(7, 2.0); for (const s of ['#kicker', '#pregunta', '#reloj', '#botones', '#tiempo']) document.querySelector(s).style.display = 'none'; });
  await p.locator('#lienzo').screenshot({ path: foto, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: foto, kicker: 'Jugadas reales · elegí vos', titulo: 'Decidí en *3 segundos*', dato: '3"', foco: '50% 45%' }, jpg);
conPortada(mezclado, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
await putFile(mp4, 'social/viral/decidi.mp4');
const uVid = `${MEDIA}/social/viral/decidi.mp4?v=${v}`;
const uPortada = await subirPortada(jpg, 'social/viral/decidi-portada.jpg');
const desc = `${Math.round(total)} s · sin voz (es un juego para contestar, como pide el guion) · tres jugadas reales del vivo que se congelan antes de la decisión (desaturado, zoom lento y anillo dorado al que tiene la pelota), tres botones y cuenta real de 3 s con un tic por segundo; en cero se traban y la jugada sigue con lo que hizo y el gol · 1 Lautavester7 en el 87' con 1-3 abajo, tiro rasante para el 2-3 ante SF Drysdale (22/10, Espacio Gamer: no es de noviembre; es lo más cerca del "minuto 89" del gancho grabado limpio, y la tijera del 90+ no se usó porque ya sale con la respuesta en "Cosas que solo entendés…") · 2 pase de pepolemmo2710 para el gol de Cabers14 (16/11, VPN, Instituto Reserva) · 3 pase al área de Juan_Martinez4 y gol de NicoBJ_96, que gambetea al arquero (18/11, VPN, Dalmine Esports; v2: congela antes del pase, no después de la gambeta) · el guion pedía una buena, una mala y una dudosa: las grabaciones del vigía solo guardan goles, así que son tres goles con tres decisiones distintas (tiro, pase, gambeta) · audio del vivo descartado: música + efectos sintetizados · música: ${tema.titulo}.`;
const pieza = o => ({ decision: 'pendiente', protagonistas: PROTAS, descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-30', pieza: 'jue-decidi' },
  titulo: 'Decidí en 3 segundos', piezas: [
    pieza({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Decidí en 3 segundos', metodo: 'ig-reel',
      texto: `Tres jugadas reales, tres segundos para elegir cada una. ¿Pase, tiro o gambeta?

La de Lautavester7 en el 87 con el partido 1-3, la de pepolemmo2710 en el borde del área y el pase de Juan_Martinez4 para NicoBJ_96.

¿Cuántas acertaste de las tres? Contestá con el número.

#TopSecretFC #ProClubs #EAFC` }),
    pieza({ id: 'tiktok', red: 'tiktok', formato: 'Video · Decidí en 3 segundos', metodo: 'tiktok',
      texto: `Minuto 87, perdés 1-3 y tenés tres segundos: ¿pase, tiro o gambeta? Lautavester7, pepolemmo2710 y Juan_Martinez4 ya eligieron. ¿Cuántas acertaste? #TopSecretFC #ProClubs #EAFC` }),
    pieza({ id: 'yt-short', red: 'youtube', formato: 'Short · Decidí en 3 segundos', metodo: 'youtube',
      titulo: 'Decidí en 3 segundos: ¿pase, tiro o gambeta? | Pro Clubs',
      texto: `Tres jugadas reales de Top Secret que se congelan justo antes de la decisión. Elegí antes de que siga y mirá qué hicieron Lautavester7, pepolemmo2710 y Juan_Martinez4. ¿Cuántas acertaste? #Shorts #ProClubs #EAFC` }),
    pieza({ id: 'x-video', red: 'x', formato: 'Video · Decidí en 3 segundos', metodo: 'x-video',
      texto: `Decidí en 3 segundos: pase, tiro o gambeta. Tres jugadas reales, con Lautavester7 en el 87, pepolemmo2710 en el borde del área y Juan_Martinez4 de contragolpe. ¿Cuántas acertaste de las tres? #TopSecretFC` }),
  ],
};
let avisos = 0;
for (const p of lote.piezas) {
  const final = { ...p, texto: `${p.texto}\n\n${creditoTexto(p.musica)}` };
  for (const r of revisarPieza(final, lote)) { avisos++; log(`  aviso ${p.id}: ${r.msg}`); }
}
if (avisos) throw new Error(`${avisos} avisos del revisor: corregir antes de cargar el lote.`);
await agregarLote(lote);
log('Listo: ' + uVid);
process.exit(0);
