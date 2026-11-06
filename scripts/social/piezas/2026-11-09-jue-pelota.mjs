#!/usr/bin/env node
// "¿Dónde está la pelota?" (idea jue-pelota del guion viral-guiones-2026-11-09): cuadro real congelado y sin la pelota,
// cuatro círculos y cuenta regresiva; en la revelación la pelota vuelve y la imagen arranca desde ese mismo cuadro hasta el gol.
//
// Decisiones (producción sin supervisión):
//   - Fuente: el vivo del 22/10 en el YouTube de RS32-DaniStone (fuentes/goles/vvivo-2026-10-22/source.mp4), la única noche
//     con goles identificados sin el overlay de topsecretfc tapando la cancha. Goleadores y minutos: seed_matches.js.
//   - Se borra todo lo que delata la pelota: ella, su sombra, la etiqueta con el nombre (la lleva el del balón) y la marca
//     amarilla del juego donde va a caer. Los triángulos sobre los jugadores quedan: los tienen todos.
//   - El orden va por dificultad: pelota al piso entre dos (NicoBJ_96), centro en el aire (Cabers14), y la tijera de
//     Lautavester7 con los cuatro círculos sobre el mismo recorrido, que además cierra con el empate del último minuto.
//   - La jugada del gancho es una cuarta (InfinitX, 51'), para no regalar la respuesta de ninguna ronda.
//   - Sin voz (lo pide el guion: se juega leyendo). El video fuente no tiene audio: los efectos se sintetizan.
//   - Sin Facebook: no está en las redes del guion.
//
//   node scripts/social/piezas/2026-11-09-jue-pelota.mjs
//     --solo-fuentes    baja los cuadros y borra la pelota, sin renderizar
//     --cuadros         hoja de cuadros clave en fuentes/redes/viral/jue-pelota/hoja.jpg, sin renderizar
//     --sin-lote        renderiza todo pero no sube ni carga el lote
//     --sin-render      reusa el video base: rehace sonido y portada, sube y carga el lote
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

const DIR = path.join(ROOT, 'fuentes/redes/viral/jue-pelota');
const FUENTE = path.join(ROOT, 'fuentes/goles/vvivo-2026-10-22/source.mp4');
const ID = 'viral-jue-pelota-2026-11-09';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [pelota] ${m}`);
const flag = f => process.argv.includes(f);

// Coordenadas en píxeles del video original (1280x720). mapa: [segundo de pantalla, segundo de la jugada], para frenar en
// el remate; golEn: segundo de pantalla en que entra. cam: [segundo de la jugada, centro x].
const HOOK = { id: 'h', desde: 4630, largo: .05, f0: 1, pelota: [741, 359], base: [720, 380],
  borrar: [{ e: [741, 360, 11, 9], d: [18, -6] }] };
const RONDAS = [
  { id: 'r1', desde: 2619.35, largo: 6.6, f0: 1, pelota: [720, 321], base: [700, 380], radio: 26, ok: 'C', nivel: 'FÁCIL',
    anillos: [[640, 318], [690, 262], [726, 316], [795, 305]], foco: [[676, 320], [745, 330]], pistas: ['¿QUIÉN ACABA DE PEGARLE?', '¿QUIÉN ESPERA EL PASE?'],
    borrar: [{ e: [718, 322, 10, 8], d: [0, -24] }, { r: [643, 234, 680, 244], d: [0, -11] }, { r: [680, 234, 692, 244], d: [0, -13] }, { r: [693, 227, 709, 244], d: [17, 0] }], triangulo: [693.5, 230.5, 703.5, 230.5, 698.5, 240],
    mapa: [[0, 0], [.7, .7], [2.2, 1.7], [4.6, 4.1]], golEn: 1.9, cam: [[0, 700], [.7, 770], [1.1, 860], [1.5, 930], [2.3, 930], [4.1, 860]],
    gt: 'NicoBJ_96', linea: "14' · 1-0 a Los Picantes<br>Espacio Gamer" },
  { id: 'r2', desde: 1380.5, largo: 6.6, f0: 1, pelota: [888, 191], base: [885, 380], radio: 26, ok: 'A', nivel: 'MEDIA',
    anillos: [[884, 186], [820, 205], [958, 290], [905, 290]], foco: [[885, 320], [932, 320]], pistas: ['¿PARA DÓNDE MIRAN?', '¿QUÉ MIRA EL ARQUERO?'],
    borrar: [{ e: [888, 191, 8, 8], d: [-20, -2] }, { r: [930, 356, 950, 368], d: [0, 18], amarillo: true }],
    mapa: [[0, 0], [1.4, .42], [1.8, .7], [4.6, 3.5]], golEn: 1.3, cam: [[0, 885], [1, 885], [2.2, 830], [3.5, 770]],
    gt: 'Cabers14', linea: "24' · de cabeza · 1-1 con SF Drysdale<br>Espacio Gamer" },
  { id: 'r3', desde: 2124.65, largo: 6.6, f0: 4, pelota: [329, 237], base: [320, 380], radio: 22, ok: 'B', nivel: 'IMPOSIBLE',
    anillos: [[390, 245], [324, 232], [272, 243], [340, 282]], foco: [[415, 320], [252, 320]], pistas: ['¿QUÉ ACABA DE HACER?', '¿EL ARQUERO LLEGA?'],
    borrar: [{ e: [329, 237, 8, 8], d: [-28, 2] }, { e: [332, 270, 12, 7], d: [-22, 0] }, { r: [388, 169, 455, 181], d: [0, -14] }],
    mapa: [[0, 0], [1.4, .4], [1.9, .8], [4.6, 3.5]], golEn: .9, cam: [[0, 320], [.6, 310], [1.5, 350], [3.5, 410]],
    gt: 'Lautavester7', linea: "90+' · de tijera · 3-3 con SF Drysdale<br>Espacio Gamer" },
];

// ── Fuentes: los cuadros de cada jugada (al doble, con un poco de nitidez) y el cuadro de arranque sin la pelota ──
function cuadrosDe(j) {
  const d = path.join(DIR, j.id);
  if (fs.existsSync(path.join(d, '0001.jpg'))) return d;
  fs.mkdirSync(d, { recursive: true });
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(j.desde), '-i', FUENTE, '-t', String(j.largo),
    '-vf', 'scale=2560:1440:flags=lanczos,unsharp=5:5:0.7:5:5:0', '-q:v', '3', path.join(d, '%04d.jpg')], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  return d;
}

// Clona pasto encima, con el borde difuminado. Cada parche: e=[x,y,rx,ry] o r=[x0,y0,x1,y1], d=[dx,dy] de dónde sale el
// pasto (a lo largo de la misma franja de corte), y amarillo=true para tocar solo los píxeles de la marca del juego.
async function borrar(j) {
  const d = path.join(DIR, j.id), n = String(j.f0).padStart(4, '0');
  const orig = path.join(d, `${n}.jpg`), sal = path.join(d, 'borrada.jpg');
  const { data, info } = await sharp(orig).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data), W = info.width, H = info.height, F = 3;
  for (const p of j.borrar) {
    const caja = p.e ? [p.e[0] - p.e[2], p.e[1] - p.e[3], p.e[0] + p.e[2], p.e[1] + p.e[3]] : p.r;
    const [x0, y0, x1, y1] = caja.map(v => Math.round(v * 2));
    for (let y = Math.max(0, y0 - F); y < Math.min(H, y1 + F); y++) for (let x = Math.max(0, x0 - F); x < Math.min(W, x1 + F); x++) {
      let a;
      if (p.e) {
        const q = Math.hypot((x / 2 - p.e[0]) / p.e[2], (y / 2 - p.e[1]) / p.e[3]);
        a = Math.max(0, Math.min(1, (1.25 - q) / .35));
      } else {
        const dd = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        a = Math.max(0, Math.min(1, (dd + F) / (2 * F)));
      }
      const i = (y * W + x) * 3;
      if (p.amarillo) {
        let mas = false;
        for (let oy = -3; oy <= 3 && !mas; oy++) for (let ox = -3; ox <= 3 && !mas; ox++) {
          const k = ((y + oy) * W + x + ox) * 3;
          if (data[k] > 150 && data[k + 1] > 150 && data[k + 2] < 120) mas = true;
        }
        if (!mas) a = 0;
      }
      if (a <= 0) continue;
      const k = ((y + p.d[1] * 2) * W + x + p.d[0] * 2) * 3;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] * (1 - a) + data[k + c] * a);
    }
  }
  let img = sharp(out, { raw: { width: W, height: H, channels: 3 } });
  if (j.triangulo) {   // el triángulo pegado a la etiqueta se borra con ella y se vuelve a dibujar
    const q = j.triangulo.map(v => v * 2).join(' ');
    img = sharp(await img.composite([{ input: Buffer.from(`<svg width="${W}" height="${H}"><polygon points="${q}" fill="#f4f6ee" stroke="#20261c" stroke-width="2.4" stroke-linejoin="round"/></svg>`) }]).png().toBuffer());
  }
  await img.jpeg({ quality: 96 }).toFile(sal);
  return { original: orig, borrada: sal };
}

fs.mkdirSync(DIR, { recursive: true });
for (const j of [HOOK, ...RONDAS]) { cuadrosDe(j); Object.assign(j, await borrar(j)); log(`  ${j.id}: sin pelota ✓`); }
if (flag('--solo-fuentes')) { log('Listo (solo fuentes).'); process.exit(0); }

// ── Música y tiempos: todo cae sobre el pulso del tema ──
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
const { beat: B, inicio } = pulsoDelTema(musica, 48);
const enPulsos = s => Math.max(1, Math.round(s / B)) * B;
// El gancho promete 5 segundos: la cuenta dura eso de verdad y entra justa en una cantidad entera de pulsos (la revelación cae sobre el pulso)
const T = { hook: enPulsos(3.2), hookBorra: .85, titulo: enPulsos(.9), tick: enPulsos(5) / 5, revela: enPulsos(1.1), cierre: enPulsos(4.4) };
for (const r of RONDAS) r.durJugada = enPulsos(r.mapa.at(-1)[0]);
const durRonda = r => T.titulo + 5 * T.tick + T.revela + r.durJugada;
const total = T.hook + RONDAS.reduce((s, r) => s + durRonda(r), 0) + T.cierre;
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} s (${Math.round(60 / B)} BPM) · tick ${T.tick.toFixed(2)} s · total ${total.toFixed(1)} s`);
if (T.tick < .85 || T.tick > 1.25) log(`  ojo: el tick da ${T.tick.toFixed(2)} s, lejos del segundo que promete el gancho`);

const renderLocal = gt => { const w = path.join(ROOT, `Renders/${gt}/Brazos4.webp`); return archivo(fs.existsSync(w) ? w : path.join(ROOT, `Renders/${gt}/Brazos4.png`)); };
const ultimoCuadro = id => fs.readdirSync(path.join(DIR, id)).filter(f => /^\d+\.jpg$/.test(f)).length;
const datos = {
  T, pregunta: '¿DÓNDE ESTÁ LA PELOTA?',
  gancho: ['BORRAMOS<br>LA PELOTA', 'SI JUGÁS HACE AÑOS,<br>LA ENCONTRÁS<br>EN 5 SEGUNDOS'],
  cierre: ['¿CUÁNTAS<br>SACASTE?', 'Mandáselo al que dice<br>que lo ve todo.'],
  escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  hook: { original: archivo(HOOK.original), borrada: archivo(HOOK.borrada), pelota: HOOK.pelota, base: HOOK.base },
  rondas: RONDAS.map(r => ({ ...r, dir: archivo(path.join(DIR, r.id)), original: archivo(r.original), borrada: archivo(r.borrada), ultimo: ultimoCuadro(r.id), render: renderLocal(r.gt) })),
};
const escenas = [{ n: 0, dur: T.hook }, ...RONDAS.map((r, i) => ({ n: i + 1, dur: durRonda(r) })), { n: RONDAS.length + 1, dur: T.cierre }];

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/pelota.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}

if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [], M = [];
  M.push([0, .3], [0, 1.2], [0, 2.4]);
  for (const [i, r] of RONDAS.entries()) {
    const base = T.titulo + 5 * T.tick;
    M.push([i + 1, T.titulo * .55], [i + 1, T.titulo + T.tick * .6], [i + 1, T.titulo + T.tick * 2], [i + 1, T.titulo + T.tick * 3.3], [i + 1, base + .3], [i + 1, base + T.revela + .3], [i + 1, base + T.revela + r.golEn - .1], [i + 1, base + T.revela + r.golEn + .9], [i + 1, base + T.revela + r.durJugada - .1]);
  }
  M.push([4, .6], [4, T.cierre - .2]);
  const cols = 8, cw = 240, ch = 427;
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

// ── Sonido: la música del render + efectos sintetizados (el video fuente no tiene audio) ──
function sonido(entra, sale) {
  const SR = 48000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', entra, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (audio): ' + String(r.stderr).slice(-300));
  const o = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const n = o.length >> 1;
  let h = 12345; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const fx = new Float32Array(n);
  const suma = (seg, dur, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < dur * SR && i0 + k < n; k++) fx[i0 + k] += f(k / SR); };
  const tick = (seg, agudo, vol) => suma(seg, .09, u => vol * Math.exp(-70 * u) * Math.sin(2 * Math.PI * (agudo ? 1500 : 1050) * u));
  const golpe = (seg, vol) => suma(seg, .6, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (48 + 60 * Math.exp(-30 * u)) * u) + .25 * Math.exp(-60 * u) * azar()));
  const barrido = (seg, dur, vol) => { let a = 0; suma(seg, dur, u => { a += .08 * (azar() - a); return vol * Math.pow(Math.sin(Math.PI * u / dur), 2) * a * 3; }); };
  const subida = (seg, dur, vol) => { let a = 0; suma(seg, dur, u => { const p = u / dur; a += (.02 + .3 * p * p) * (azar() - a); return vol * p * p * a; }); };
  const hinchada = (seg, dur, vol) => { let a = 0, b = 0; suma(seg, dur, u => { a += .05 * (azar() - a); b += .004 * (azar() - b); return vol * Math.min(1, u / .2) * Math.exp(-u * 1.1) * (a * 2.4 + b * 6) * (1 + .15 * Math.sin(u * 19)); }); };
  const duck = new Float32Array(n).fill(1);   // la música baja antes de la revelación, para que el golpe pegue
  const bajar = (a, b, g) => { for (let k = Math.round(a * SR); k < Math.min(n, b * SR); k++) duck[k] = Math.min(duck[k], g); };
  barrido(T.hookBorra - .08, .4, .5); golpe(T.hookBorra, .55);
  let s = T.hook;
  for (const ron of RONDAS) {
    golpe(s + .1, .5); barrido(s, .36, .35);
    const c = s + T.titulo, rev = c + 5 * T.tick;
    for (let i = 0; i < 5; i++) tick(c + i * T.tick, i >= 3, i >= 3 ? .34 : .24);
    subida(rev - T.tick * 1.4, T.tick * 1.4, .55);
    bajar(rev - T.tick, rev, .35);
    golpe(rev, .85); barrido(rev - .05, .4, .4);
    const gol = rev + T.revela + ron.golEn;
    golpe(gol, .7); hinchada(gol, Math.min(ron.durJugada - ron.golEn, 3.2), .34);
    s += durRonda(ron);
  }
  golpe(s + .05, .45);
  const suave = 2400; let g = 1;   // solo baja la música, no los efectos
  for (let k = 0; k < n; k++) { g += (duck[k] - g) / suave; o[k * 2] = o[k * 2] * g * .8 + fx[k]; o[k * 2 + 1] = o[k * 2 + 1] * g * .8 + fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

const base = path.join(DIR, 'pelota-base.mp4'), mezclado = path.join(DIR, 'pelota-sonido.mp4'), mp4 = path.join(DIR, 'pelota.mp4'), jpg = path.join(DIR, 'pelota-portada.jpg'), fotoPortada = path.join(DIR, 'pelota-foto-portada.jpg');
if (!flag('--sin-render')) {
  log(`Render (${Math.round(total * 60)} cuadros a 60 fps)…`);
  await video('pelota.html', datos, base, { escenas, fps: 60, desenfoque: true, musica, musicaDesde: inicio });
}
sonido(base, mezclado);

// Portada: la jugada de la ronda 2 ya sin la pelota, con los cuatro círculos
{
  const { b, p } = await abrir();
  await p.evaluate(([n, t]) => mostrar(n, t, { sinTexto: true }), [2, T.titulo + T.tick * .9]);
  await p.evaluate(() => { for (const s of ['#ronda', '#titulo', '#pista', '#cuenta']) document.querySelector(s).style.display = 'none'; document.querySelector('#abajo').style.display = 'none'; });
  await p.locator('#lienzo').screenshot({ path: fotoPortada, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: fotoPortada, kicker: 'Tres jugadas reales', titulo: '¿Dónde está *la pelota*?', dato: '5"', foco: '50% 22%' }, jpg);
conPortada(mezclado, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
await putFile(mp4, 'social/viral/pelota.mp4');
const uVid = `${MEDIA}/social/viral/pelota.mp4?v=${Date.now().toString(36)}`;
const uPortada = await subirPortada(jpg, 'social/viral/pelota-portada.jpg');
const GOLEADORES = RONDAS.map(r => r.gt);
const desc = `${Math.round(total)} s · sin voz (se juega leyendo, como pide el guion) · tres jugadas reales del vivo del 22/10 en Espacio Gamer: la pelota, su sombra, la etiqueta con el nombre y la marca amarilla del juego se borraron cuadro por cuadro; en la revelación la imagen arranca desde ese mismo cuadro hasta el gol · cuenta real de ${(5 * T.tick).toFixed(1)} s al pulso · el video fuente no tiene audio: efectos sintetizados · música: ${tema.titulo}.`;
const pieza = o => ({ decision: 'pendiente', protagonistas: GOLEADORES, descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-09', pieza: 'jue-pelota' },
  titulo: '¿Dónde está la pelota?', piezas: [
    pieza({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Juego de tres rondas', metodo: 'ig-reel',
      texto: `Borramos la pelota de tres jugadas reales. Cinco segundos por ronda.\n\nTerminan en goles de NicoBJ_96, Cabers14 y Lautavester7, y la última es la más difícil.\n\n¿Cuántas sacaste? Sin mentir.\n\n#TopSecretFC #ProClubs #EAFC` }),
    pieza({ id: 'tiktok', red: 'tiktok', formato: 'Video · Juego de tres rondas', metodo: 'tiktok',
      texto: `Sacamos la pelota y te dejamos 5 segundos. La tercera, la de Lautavester7, no la saca nadie. Mandáselo al que dice que lo ve todo. #TopSecretFC #ProClubs #EAFC` }),
    pieza({ id: 'yt-short', red: 'youtube', formato: 'Short · Juego de tres rondas', metodo: 'youtube',
      titulo: '¿Dónde está la pelota? Tres jugadas reales de Top Secret FC en Pro Clubs',
      texto: `Tres jugadas de Espacio Gamer sin la pelota y 5 segundos para encontrarla. Goles de NicoBJ_96, Cabers14 y Lautavester7. #Shorts #ProClubs #EAFC` }),
    pieza({ id: 'x-video', red: 'x', formato: 'Video · Juego de tres rondas', metodo: 'x-video',
      texto: `Tres jugadas reales, sin la pelota. Goles de NicoBJ_96, Cabers14 y Lautavester7 en Espacio Gamer. ¿Cuántas sacaste? Sin mentir. #TopSecretFC` }),
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
