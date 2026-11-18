#!/usr/bin/env node
// "Qué es Clubs Pro, en 30 segundos" (idea mar-explicado del guion viral-guiones-2026-11-23): infografía animada por código.
// Cancha vista desde arriba → aparecen los once con su joystick → se mueven los once a la vez, cada uno atado a su joystick →
// la cancha se aleja y queda dentro de la tabla real de VPUG → reloj de la jornada → "y todo se transmite en vivo".
//
// Decisiones (producción sin supervisión):
//   - Los once: el equipo que le ganó 1-0 a INSTITUTO CANT por VPUG el 17/11 (seed_matches.js, posiciones de la web de VPUG).
//     Guiidow y Huber236 figuran los dos como LD: Guiidow va de carrilero derecho y Huber236 del izquierdo.
//   - La jugada: ilustrativa, con ese once (no se afirma que sea el gol del 1-0).
//     El gol no se pudo identificar con certeza en el video del vivo del 17/11 (el marcador del HUD no muestra al rival), así que
//     en pantalla dice "JUGADA ILUSTRATIVA". El GOL no lleva nombres. En el vivo, el gol de TOP al 32' (HUD rival "ZZZ") es una
//     jugada de área tras un centro, y el festejo parece de Alexisraies23: no coincide con la web de VPUG (gol de pepolemmo2710), así
//     que no se usa como fuente de la jugada.
//   - La tabla: la de VPUG Primera tal cual la da la liga (Worker /vpug-table-primera), guardada en caché al 18/11, con sus zonas
//     reales (PLAYOFF y DESCENSO). VPUG Primera no tiene ascenso, así que la voz dice "playoff" y "descenso" (lo que se ve).
//   - "Hasta tres partidos por noche" del guion no es exacto (el 17/11 hubo cuatro): se dice "noches de tres partidos".
//   - Voz de Elena (explica); los jugadores no se nombran en la voz, los gamertags van en pantalla. Música de The Shorts.
//
//   node scripts/social/piezas/2026-11-23-mar-explicado.mjs
//     --previa      solo mide la voz y muestra los tiempos
//     --cuadros     hoja de cuadros clave en fuentes/redes/viral/mar-explicado/hoja.jpg, sin renderizar
//     --cuadro=<t>  un cuadro en cuadro.jpg
//     --placas      solo el carrusel
//     --sin-lote    renderiza todo pero no sube ni carga el lote
//     --sin-render  reusa el video base: rehace voz y portada, sube y carga el lote
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
import { narracion, agregarVoz } from '../lib/voz.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';
import { SEED_MATCHES } from '../../../seed_matches.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/mar-explicado');
const ID = 'viral-mar-explicado-2026-11-23';
const WORKER = 'https://top-secret-proxy.juan-c-m-1985.workers.dev';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [explicado] ${m}`);
const flag = f => process.argv.includes(f);
fs.mkdirSync(DIR, { recursive: true });

// ── Los once (partido real) y su ubicación en la cancha (x 0..68, y 0..105; atacamos hacia arriba) ──
const PARTIDO = SEED_MATCHES.find(m => m.date === '2026-11-17' && m.rival === 'INSTITUTO CANT');
if (!PARTIDO || PARTIDO.players.length !== 11) throw new Error('No encuentro el 1-0 a INSTITUTO CANT del 17/11 con sus once.');
const GOLEADOR = PARTIDO.players.find(p => p.goals)?.matched, ASISTIDOR = PARTIDO.players.find(p => p.assists)?.matched;
if (GOLEADOR !== 'pepolemmo2710' || ASISTIDOR !== 'davidelapaternal') throw new Error(`Cambió el gol del 17/11: ${GOLEADOR} / ${ASISTIDOR}`);
// recorrido: [u (0..1 de la jugada), x, y]
const ONCE = [
  { gt: 'adri_cai', pos: 'PO', num: 32, k: [[0, 34, 99], [1, 34, 90]] },
  { gt: 'Cabers14', pos: 'DFC', num: 5, k: [[0, 21, 86], [.25, 22, 80], [1, 22, 66]] },
  { gt: 'Alexisraies23', pos: 'DFC', num: 3, k: [[0, 34, 88], [1, 34, 70]] },
  { gt: 'endiabladorojo66', pos: 'DFC', num: 66, k: [[0, 47, 86], [1, 46, 68]] },
  { gt: 'Huber236', pos: 'LI', num: 8, k: [[0, 7, 70], [1, 8, 46]] },
  { gt: 'Guiidow', pos: 'LD', num: 20, k: [[0, 61, 70], [.5, 63, 52], [1, 64, 36]] },
  { gt: 'Juan_Martinez4', pos: 'MC', num: 6, k: [[0, 27, 66], [.25, 26, 62], [1, 28, 44]] },
  { gt: 'davidelapaternal', pos: 'MC', num: 34, k: [[0, 41, 62], [.42, 40, 50], [.7, 41, 30], [1, 42, 26]] },
  { gt: 'nikileo527', pos: 'EI', num: 10, k: [[0, 12, 42], [.6, 13, 28], [1, 15, 16]] },
  { gt: 'NicoBJ_96', pos: 'DC', num: 9, k: [[0, 34, 36], [.6, 30, 20], [1, 27, 11]] },
  { gt: 'pepolemmo2710', pos: 'ED', num: 15, k: [[0, 56, 42], [.55, 55, 30], [.82, 46, 14], [1, 44, 9]] },
];
// la pelota: Cabers14 → Juan_Martinez4 → davidelapaternal (conduce) → pepolemmo2710 → gol
const PELOTA = [[0, 22, 84], [.16, 22, 80], [.3, 26, 63], [.38, 26, 62], [.5, 40, 49], [.72, 41, 31], [.86, 46, 15], [.92, 46, 14], [1, 36, -1]];
const TIENE = [[0, 'Cabers14'], [.3, 'Juan_Martinez4'], [.5, 'davidelapaternal'], [.86, 'pepolemmo2710'], [.93, null]];

// ── Caras: el recorte de la cabeza de cada render T4 (Frente4), cacheado ──
async function cara(gt) {
  const f = path.join(DIR, 'caras', `${gt}.png`);
  if (fs.existsSync(f)) return f;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const src = path.join(ROOT, 'Renders', gt, 'Frente4.png');
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const A = (x, y) => data[(y * info.width + x) * 4 + 3];
  let top = 0; for (; top < info.height; top++) { let n = 0; for (let x = 0; x < info.width; x += 2) if (A(x, top) > 128) n++; if (n > 3) break; }
  // la cabeza: el ancho del alfa en la franja de 8 % debajo de lo más alto
  const hasta = top + Math.round(info.height * .085);
  let x0 = info.width, x1 = 0;
  for (let y = top; y < hasta; y++) for (let x = 0; x < info.width; x++) if (A(x, y) > 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  const cx = (x0 + x1) / 2, lado = Math.round(info.height * .12), cy = top + lado * .46;
  const left = Math.max(0, Math.round(cx - lado / 2)), tp = Math.max(0, Math.round(cy - lado / 2));
  await sharp(src).extract({ left, top: tp, width: Math.min(lado, info.width - left), height: Math.min(lado, info.height - tp) }).resize(240, 240).png().toFile(f);
  return f;
}
for (const j of ONCE) j.cara = archivo(await cara(j.gt));

// ── La tabla real de VPUG Primera (caché) con sus escudos ──
const jsTabla = path.join(DIR, 'tabla-vpug.json');
if (!fs.existsSync(jsTabla)) {
  const r = await fetch(`${WORKER}/vpug-table-primera`);
  if (!r.ok) throw new Error('No pude leer la tabla de VPUG: ' + r.status);
  const t = await r.json();
  fs.mkdirSync(path.join(DIR, 'escudos'), { recursive: true });
  for (const [i, e] of t.teams.entries()) {
    const dest = path.join(DIR, 'escudos', `${i + 1}.png`);
    try { const b = Buffer.from(await (await fetch(e.logo)).arrayBuffer()); await sharp(b).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(dest); e.local = dest; } catch { e.local = null; }
  }
  t.guardada = '2026-11-18';
  fs.writeFileSync(jsTabla, JSON.stringify(t, null, 1));
}
const TABLA = JSON.parse(fs.readFileSync(jsTabla, 'utf8'));
const filas = TABLA.teams.map(e => ({ pos: e.pos, nombre: e.name, pj: e.gp, pts: e.pts, zona: e.zona, escudo: e.local && fs.existsSync(e.local) ? archivo(e.local) : null, nuestro: /top\s*secret/i.test(e.name) }));
if (!filas.some(f => f.nuestro)) throw new Error('Top Secret no está en la tabla de VPUG');

// ── Voz: una frase por escena; la duración de cada escena sale de su frase ──
const GUION = [
  { id: 'a', texto: 'Esto es Clubs Pro: once personas, y cada una maneja a un solo jugador.' },
  { id: 'b', texto: 'Atacamos y se mueven los once a la vez. Nadie maneja a dos.' },
  { id: 'c', texto: 'Y no es un amistoso: tres ligas, con fechas y tabla. Arriba, playoff. Abajo, descenso.' },
  { id: 'd', texto: 'De lunes a jueves, de diez y media a doce y media, y hay noches de tres partidos.' },
  { id: 'e', texto: 'Y todo se transmite en vivo.' },
];
const previa = narracion(GUION.map(g => ({ en: 0, texto: g.texto })), DIR);
const dur = Object.fromEntries(GUION.map((g, i) => [g.id, previa[i].dur]));
log('Voz: ' + Object.entries(dur).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ') + ` · total habla ${Object.values(dur).reduce((a, b) => a + b, 0).toFixed(1)} s`);
const T = { a: .15 };
T.b = T.a + dur.a + .35;
T.c = T.b + dur.b + .45;
T.d = T.c + dur.c + .4;
T.e = T.d + dur.d + .35;
T.cierre = T.e;
const total = T.e + dur.e + 1.8;
const pistas = narracion(GUION.map(g => ({ en: T[g.id] + (g.id === 'a' ? 0 : .05), texto: g.texto })), DIR);
// momentos que salen de las palabras
const palabra = (i, re) => (pistas[i].palabras.find(p => re.test(p.w)) || pistas[i].palabras[0]).t;
T.ligas = palabra(2, /^tres$/i) - .1;
T.tabla = palabra(2, /^tabla/i) - .1;
T.arriba = palabra(2, /^arriba/i) - .05;
T.abajo = palabra(2, /^abajo/i) - .05;
T.lunes = palabra(3, /^lunes/i) - .1;
T.diez = palabra(3, /^diez/i) - .1;
T.noches = palabra(3, /^noches/i) - .1;
T.vivo = palabra(4, /^vivo/i) - .15;
// la jugada ocupa la frase b; el gol cae antes del zoom
T.jugada = T.b + .15;
T.finJugada = T.c - .9;
T.aparece = 2.0; T.paso = .26;   // los once entran uno por uno, después del gancho
log(`total ${total.toFixed(1)} s · ` + Object.entries(T).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' '));
if (flag('--previa')) process.exit(0);
if (total > 34) throw new Error(`Dura ${total.toFixed(1)} s: acortar la voz.`);

const frases = pistas.map((p, i) => ({ en: p.en, fin: i + 1 < pistas.length ? Math.min(pistas[i + 1].en - .02, p.en + p.dur + .5) : p.en + p.dur + .9, palabras: p.palabras }));
const LIGAS = [
  { nombre: 'VPN', logo: archivo(path.join(ROOT, 'logos/VPN logo.png')) },
  { nombre: 'VPUG', logo: archivo(path.join(ROOT, 'logos/VPUG logo 2026.png')) },
  { nombre: 'ESPACIO GAMER', logo: archivo(path.join(ROOT, 'logos/Espacio Gamer logo.png')) },
];
const ESCUDO = archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'));
const datos = {
  T, total, once: ONCE, pelota: PELOTA, tiene: TIENE, filas, ligas: LIGAS, escudo: ESCUDO, frases,
  recreacion: 'JUGADA ILUSTRATIVA · EL ONCE DEL 1-0 A INSTITUTO CANT · VPUG', gol: { sub: '' },
  tablaTitulo: 'VPUG · PRIMERA · TABLA AL 18/11',
};
const dPlacas = {
  ...datos,
  placas: [
    { tipo: 'portada' },
    { tipo: 'joysticks' },
    { tipo: 'ligas' },
    { tipo: 'tabla' },
    { tipo: 'reloj' },
  ],
};

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/explicado.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}
if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [];
  const M = [.1, .8, 1.6, 2.6, T.b + .3, T.jugada + .2, (T.jugada + T.finJugada) / 2, T.finJugada - .3, T.c + .2, T.c + .7, T.ligas + .5, T.tabla + .6, T.arriba + .5, T.abajo + .6, T.d + .3, T.diez + .8, T.noches + .6, T.e + .2, T.vivo + .6, total - .3];
  const cols = 5, cw = 270, ch = 480;
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

const slides = (await carrusel('explicado.html', dPlacas, DIR, 'placa')).map(s => {
  const dest = path.join(DIR, `mar-explicado-${path.basename(s)}`);
  fs.copyFileSync(s, dest);
  return dest;
});
if (flag('--placas')) { log('Listo (carrusel).'); process.exit(0); }

// ── Video: base con música → voz → efectos → portada ──
const musica = await elegirMusica(ID);
const tema = infoTema(musica);
const base = path.join(DIR, 'mar-explicado-base.mp4'), conVoz = path.join(DIR, 'mar-explicado-voz.mp4'), mezclado = path.join(DIR, 'mar-explicado-sonido.mp4');
const mp4 = path.join(DIR, 'mar-explicado.mp4'), jpg = path.join(DIR, 'mar-explicado-portada.jpg'), fotoPortada = path.join(DIR, 'mar-explicado-foto-portada.jpg');
if (!flag('--sin-render') || !fs.existsSync(base)) {
  log(`Render (${Math.round(total * 60)} cuadros a 60 fps) · tema ${tema.titulo}…`);
  await video('explicado.html', datos, base, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica });
}
agregarVoz(base, pistas, conVoz);

// efectos sintetizados, suaves: un clic por jugador que aparece, un soplido en el zoom, golpes en las ligas y el cierre
function efectos(entra, sale) {
  const SR = 48000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', entra, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (audio): ' + String(r.stderr).slice(-300));
  const o = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const n = o.length >> 1, fx = new Float32Array(n);
  let h = 777; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const suma = (seg, d, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < d * SR && i0 + k < n; k++) if (i0 + k >= 0) fx[i0 + k] += f(k / SR); };
  const blip = (seg, vol, fr = 1100) => suma(seg, .16, u => vol * Math.exp(-24 * u) * Math.sin(2 * Math.PI * fr * u));
  const golpe = (seg, vol) => suma(seg, .5, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (50 + 60 * Math.exp(-30 * u)) * u) + .2 * Math.exp(-60 * u) * azar()));
  const soplido = (seg, d, vol) => { let a = 0; suma(seg, d, u => { a += .08 * (azar() - a); return vol * Math.sin(Math.PI * u / d) * a * 3; }); };
  const tic = (seg, vol) => suma(seg, .04, u => vol * Math.exp(-120 * u) * azar());
  ONCE.forEach((_, i) => blip(T.aparece + .1 + i * T.paso, .1, 900 + i * 45));
  soplido(T.c - .1, 1.1, .18); golpe(T.ligas + .1, .4);
  [0, 1, 2].forEach(i => blip(T.ligas + .1 + i * .18, .12, 700 + i * 200));
  blip(T.arriba, .12, 1400); blip(T.abajo, .12, 500);
  for (let k = 0; k < 14; k++) tic(T.diez + k * .1, .12);
  [0, 1, 2].forEach(i => blip(T.noches + .1 + i * .2, .14, 1000 + i * 150));
  golpe(T.vivo, .55);
  for (let k = 0; k < n; k++) { o[k * 2] += fx[k]; o[k * 2 + 1] += fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}
efectos(conVoz, mezclado);

// Portada: la cancha con los once y sus joysticks, sin textos
{
  const { b, p } = await abrir();
  await p.evaluate(t => mostrar(0, t, { sinTexto: true }), T.jugada + .1);
  await p.locator('#lienzo').screenshot({ path: fotoPortada, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: fotoPortada, kicker: 'Clubs Pro en 30 segundos', dato: '11', titulo: 'Once personas, *una pelota*', foco: '50% 40%' }, jpg);
conPortada(mezclado, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = `${WORKER}/media`, v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4), uSl = [];
for (const s of slides) uSl.push(await subir(s));
const uPortada = await subirPortada(jpg, 'social/viral/mar-explicado-portada.jpg');
const once = ONCE.map(j => j.gt);
const desc = `${Math.round(total)} s · con voz (Elena: explica qué es Clubs Pro; los jugadores no se nombran en la voz, los gamertags van en pantalla) · infografía animada por código: cancha desde arriba con los renders T4 como fichas, cada una atada a su joystick; la cancha se aleja y queda dentro de la tabla real de VPUG Primera (al 18/11, con sus zonas reales de playoff y descenso); reloj de la jornada 22:30 a 00:30 · los once son los del 1-0 a INSTITUTO CANT por VPUG del 17/11 y la jugada es ILUSTRATIVA (lo dice en pantalla; el GOL no lleva nombres). Ojo, para que decidas: en el video del vivo del 17/11 el gol de TOP al 32' (rival "ZZZ" en el HUD) es una jugada de área tras un centro y el festejo parece de Alexisraies23, mientras la web de VPUG da gol de pepolemmo2710 con pase de davidelapaternal (eso es lo que dicen los textos) · "hasta tres partidos por noche" del guion cambió a "noches de tres partidos" (el 17/11 hubo cuatro) · música: ${tema.titulo}.`;
const P = o => ({ decision: 'pendiente', protagonistas: once, descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-23', pieza: 'mar-explicado' },
  titulo: 'Qué es Clubs Pro, en 30 segundos', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Qué es Clubs Pro', metodo: 'ig-reel',
      texto: `Once personas, once jugadores, una sola pelota. Así es Clubs Pro y así juega Top Secret: tres ligas con fechas y tabla, de lunes a jueves y todo en vivo.\n\nEn la cancha, el once que le ganó 1-0 a INSTITUTO CANT por VPUG (gol de pepolemmo2710).\n\n#TopSecretFC #ProClubs #EAFC #ClubsPro` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · Qué es Clubs Pro', metodo: 'tiktok',
      texto: `Clubs Pro en 30 segundos: once personas, cada una con un solo jugador. Tres ligas con tabla, y en VPUG hay playoff y descenso. El once: el del 1-0 a INSTITUTO CANT, gol de pepolemmo2710. #TopSecretFC #ProClubs #EAFC #ClubsPro` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · Qué es Clubs Pro', metodo: 'youtube',
      titulo: 'Qué es Pro Clubs, en 30 segundos | EA FC',
      texto: `Once personas, cada una maneja a un solo jugador, y se juega por tabla en tres ligas. Así juega Top Secret, de lunes a jueves y en vivo. En la cancha, el once del 1-0 a INSTITUTO CANT (gol de pepolemmo2710). #Shorts #ProClubs #EAFC` }),
    { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel · Qué es Clubs Pro', decision: 'pendiente', protagonistas: once, metodo: 'ig-carrusel',
      descripcion: 'Cinco placas: la cancha con los once (jugada ilustrativa), cada uno atado a su joystick, las tres ligas, la tabla real de VPUG Primera al 18/11 y la jornada (lunes a jueves, 22:30 a 00:30, todo en vivo). Sin música ni voz. Va además del Reel porque el guion aprobado pide las dos.',
      media: uSl.map(url => ({ tipo: 'imagen', url })), local: { slides },
      texto: `¿Qué es Clubs Pro? Deslizá.\n\nOnce personas, once jugadores, una sola pelota: cada uno maneja a uno solo. Y no es un amistoso: tres ligas (VPN, VPUG y Espacio Gamer), cada una con fechas y tabla; en VPUG, arriba el playoff y abajo el descenso.\n\nTop Secret juega de lunes a jueves, de 22:30 a 00:30, y todo se transmite en vivo. En la cancha, el once que le ganó 1-0 a INSTITUTO CANT (gol de pepolemmo2710).\n\n#TopSecretFC #ProClubs #EAFC #ClubsPro` },
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
