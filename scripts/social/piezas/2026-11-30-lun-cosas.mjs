#!/usr/bin/env node
// "Cosas que solo entendés si jugás Clubs Pro" (idea lun-cosas del guion viral-guiones-2026-11-30): lista numerada de cinco
// situaciones que se escribe sola sobre jugadas reales del vivo, una por punto, con los cortes al pulso del tema.
//
// Decisiones (producción sin supervisión):
//   - Todas las imágenes salen de la grabación del 22/10 (fuentes/goles/vvivo-2026-10-22, vivo de YouTube de RS32-DaniStone,
//     limpia y sin audio): esa noche están el 3-3 a SF Drysdale con la tijera de Lautavester7 en el 90+ y el 1-0 a InfinitX
//     (23:30, gol de Lautavester7), el partido más tarde de la noche (seed_matches.js).
//   - Las jugadas son reales pero no "prueban" cada chiste: 1 = un ataque de SF Drysdale contra nuestro arco (no hay en las
//     grabaciones un defensor atajando; el texto queda genérico), 2 = una jugada nuestra en ataque, 3 = una jugada en el área
//     de ellos (no hay un córner corto grabado con cámara limpia; se buscó en el 3-3), 4 = la tijera del 3-3 en el 90+, que
//     se congela 1 s antes del remate (el lag lo pone la edición, la música se corta de verdad y vuelve donde quedó) y
//     después entra el gol, 5 = el pitazo final del 1-0 a InfinitX. "00:30" es el chiste genérico: ese partido arrancó a las
//     23:30 y los textos no dicen que se ganó a esa hora.
//   - La franja recorta el HUD de FC27 (su marcador lleva el escudo del kit del juego y abajo van los nombres de los
//     jugadores): nadie del plantel queda señalado en los chistes 1 a 3. El resultado final va en una placa propia con el
//     Clean dorado y el escudo de InfinitX. Gamertag solo donde es verdad y bueno: Lautavester7 (tijera y gol del 1-0).
//   - Sin voz: lo pide el guion (lista visual al pulso, para mandar por privado). Teclas sintetizadas mientras se escribe,
//     golpe en cada corte, silbato en el final.
//   - Redes: Reel, TikTok, Short y carrusel de Instagram (las del guion). Carrusel con las reglas del 26/11: portada →
//     clave → 5 ideas → resumen → acción (9 imágenes).
//
//   node scripts/social/piezas/2026-11-30-lun-cosas.mjs
//     --cuadros     hoja de cuadros clave en fuentes/redes/viral/lun-cosas/hoja.jpg, sin renderizar
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
import { controlarCarrusel } from '../../lib/reglas-redes.mjs';
import { video, carrusel, archivo } from '../lib/render.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/lun-cosas');
const VOD = path.join(ROOT, 'fuentes/goles/vvivo-2026-10-22/source.mp4');
const ID = 'viral-lun-cosas-2026-11-30';
const K = 1.5, FPS = 30;   // cuadros a 1920x1080 (1,5 veces el video de 720p)
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [cosas] ${m}`);
const flag = f => process.argv.includes(f);
fs.mkdirSync(DIR, { recursive: true });

// ── Música: los cortes caen sobre el pulso del tema ──
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
const { beat: B, inicio: musicaDesde } = pulsoDelTema(musica, 30);
const enB = s => Math.max(1, Math.round(s / B)) * B;

// ── Tiempos (s), al pulso ──
const CPS = 34;   // letras por segundo del texto que se escribe solo
const T = { gancho: enB(3.8), punto: enB(3.6), lag: enB(2.0), traba: enB(1.0), tras: enB(2.0), final: enB(4.2), cierre: enB(3.8), escribe: .25, g2: 1.0 };
T.p4 = T.lag + T.traba + T.tras;
const DURS = [T.gancho, T.punto, T.punto, T.punto, T.p4, T.final, T.cierre];
const INI = DURS.map((_, i) => DURS.slice(0, i).reduce((s, d) => s + d, 0));
const total = DURS.reduce((s, d) => s + d, 0);
T.nums = [0, 1, 2, 3, 4].map(i => .9 + i * B);

// ── Tramos del vivo del 22/10 (segundo de source.mp4, largo, centro de la franja en px de 1280x720) ──
const TIJERA = 2127.0;   // un instante antes del remate de la tijera (la pelota entra a los 2127,5)
const TRAMOS = {
  gancho: { desde: 1377.8, largo: T.gancho, cx: 640 },                          // el 1-1 de cabeza de Cabers14
  p1: { desde: 1168.6, largo: T.punto, cx: 300 },                               // ataque de SF Drysdale contra nuestro arco
  p2: { desde: 1919.0, largo: T.punto, cx: 640 },                               // jugada nuestra en ataque
  p3: { desde: 1929.0, largo: T.punto, cx: 900 },                               // en el área de ellos
  p4: { desde: TIJERA - T.lag, largo: T.lag + T.tras, cx: 360 },               // la tijera del 3-3 en el 90+
  p5: { desde: 5038.0, largo: T.final, cx: 640, cy: 290 },                      // pitazo final del 1-0 a InfinitX
};
function extraer(id) {
  const tr = TRAMOS[id], d = path.join(DIR, 'cuadros', id), marca = path.join(d, `listo-${tr.desde}-${tr.largo.toFixed(3)}`);
  if (!fs.existsSync(marca)) {
    fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true });
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(tr.desde), '-i', VOD, '-t', String(tr.largo + .2), '-an',
      '-vf', `fps=${FPS},scale=${1280 * K}:${720 * K}:flags=lanczos,unsharp=5:5:0.6:5:5:0`, '-q:v', '3', path.join(d, '%04d.jpg')], { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
    fs.writeFileSync(marca, '');
  }
  return { ...tr, dir: archivo(d), n: fs.readdirSync(d).filter(f => /^\d+\.jpg$/.test(f)).length };
}
const tramos = Object.fromEntries(Object.keys(TRAMOS).map(k => [k, extraer(k)]));

// escudo de InfinitX (el de calendario/datos del vivo), local para que el render no dependa de la red
const escRival = path.join(DIR, 'escudo-infinitx.png');
if (!fs.existsSync(escRival)) {
  const r = await fetch('https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184001-vrqhkmuma0.png');
  if (!r.ok) throw new Error('escudo de InfinitX: HTTP ' + r.status);
  await sharp(Buffer.from(await r.arrayBuffer())).png().toFile(escRival);
}

const PROTA = 'Lautavester7';
const PUNTOS = [
  { texto: 'Se cae el arquero y alguien tiene que ir al arco.' },
  { texto: 'El que pide la pelota por el audio y después no la devuelve.' },
  { texto: 'El córner corto que nadie pidió.' },
  { texto: 'El lag justo en el minuto 90.', chip: "90'", lag: [T.lag, T.traba], tag: [T.lag + T.traba + .75, `${PROTA} · 90+ · de tijera`] },
  { texto: 'Ganar a las 00:30 y no poder dormir.', final: 1.05 },
];
const datos = {
  K, fps: FPS, T, cps: CPS, tramos, puntos: PUNTOS,
  escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  final: { escudoRival: archivo(escRival), local: 'INFINITX', visita: 'TOP SECRET', res: '0-1', sub: `Espacio Gamer · gol de ${PROTA}` },
  textos: {
    kicker: 'COSAS QUE SOLO ENTENDÉS SI JUGÁS CLUBS PRO',
    gancho: ['Si entendés las cinco, jugás *Clubs Pro*', 'Si entendés tres, mandáselo al que te hizo jugar.'],
    cierre: ['¿Cuántas te *pasaron*?', 'Contestá con el número.'],
  },
};
// Carrusel: portada → clave → 5 ideas → resumen → acción (scripts/lib/reglas-redes.mjs)
const IDEAS = [
  { tipo: 'idea', n: 1, tramo: 'p1', s: 2.4, titulo: 'Se cae el *arquero*', texto: 'Alguien tiene que ir al arco. Nunca es el que se ofreció.' },
  { tipo: 'idea', n: 2, tramo: 'p2', s: 1.6, titulo: 'El que pide la *pelota*', texto: 'La pide a los gritos por el audio. Cuando le llega, no la devuelve más.' },
  { tipo: 'idea', n: 3, tramo: 'p3', s: 1.6, titulo: 'El córner corto que *nadie pidió*', texto: 'Todos en el área esperando el centro. Él toca corto y vuelve a empezar.' },
  { tipo: 'idea', n: 4, tramo: 'p4', s: T.lag, titulo: 'El lag en el *minuto 90*', texto: `La imagen se traba justo en la última. Esta vez volvió a tiempo: tijera de ${PROTA} para el 3-3.` },
  { tipo: 'idea', n: 5, tramo: 'p5', s: 2.2, titulo: 'Ganar a las *00:30*', texto: 'Termina el partido y el sueño no viene. En la imagen: 1-0 a InfinitX en Espacio Gamer.' },
];
const PLACAS = [
  { tipo: 'portada', tramo: 'p4', s: T.lag, kicker: '¿CUÁNTAS TE PASARON?', titulo: 'Cosas que solo entendés si jugás *Clubs Pro*', texto: 'Cinco. Con jugadas de nuestro vivo.' },
  { tipo: 'clave', titulo: 'Si entendés las cinco, *jugás Clubs Pro*', texto: 'Si entendés tres, mandáselo al que te hizo jugar.' },
  ...IDEAS,
  { tipo: 'resumen', titulo: 'Las *cinco*', items: ['Se cae el arquero y alguien va al arco', 'El que pide la pelota y no la devuelve', 'El córner corto que nadie pidió', 'El lag justo en el minuto 90', 'Ganar a las 00:30 y no dormir'] },
  { tipo: 'cta', kicker: '¿CUÁNTAS TE PASARON?', titulo: 'Contestá con el *número*', texto: 'Del 1 al 5. Sin mentir.' },
];
{
  const err = controlarCarrusel(PLACAS.slice(1).map(p => ({ ...p, titulo: p.titulo.replace(/\*/g, '') })));
  if (err.length) throw new Error('carrusel: ' + err.join(' · '));
}
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} s · total ${total.toFixed(1)} s · cuadros ${Object.entries(tramos).map(([k, v]) => `${k} ${v.n}`).join(' ')}`);

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/cosas.html')));
  await p.evaluate(d => pintar(d, 'story'), datos);
  return { b, p };
}
if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [];
  const M = [[0, .1], [0, .5], [0, 2.6], [1, .2], [1, 2.4], [2, 2.6], [3, 2.6], [4, 1.0], [4, T.lag + .3], [4, T.lag + T.traba + .9], [5, .5], [5, 1.6], [5, 3.6], [6, .3], [6, 2.6], [6, T.cierre - .1]];
  const cols = 8, cw = 270, ch = 480;
  for (const [i, [n, t]] of M.entries()) {
    await p.evaluate(([n, t]) => mostrar(n, t), [n, t]);
    const buf = await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 82 });
    comp.push({ input: await sharp(buf).resize(cw, ch).toBuffer(), left: (i % cols) * cw, top: Math.floor(i / cols) * ch });
  }
  await b.close();
  await sharp({ create: { width: cols * cw, height: Math.ceil(M.length / cols) * ch, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 88 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
  process.exit(0);
}

const slides = (await carrusel('cosas.html', { ...datos, placas: PLACAS }, DIR, 'placa')).map(s => {
  const dest = path.join(DIR, `lun-cosas-${path.basename(s)}`);
  fs.copyFileSync(s, dest); fs.rmSync(s);
  return dest;
});
if (flag('--placas')) { log('Listo (carrusel).'); process.exit(0); }

// ── Sonido: el tema con el corte real del lag (vuelve donde quedó) + efectos sintetizados ──
function sonido(entra, sale) {
  const SR = 48000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', musicaDesde.toFixed(3), '-i', musica, '-t', String(total + 1), '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (música): ' + String(r.stderr).slice(-300));
  const m = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const n = Math.round(total * SR), o = new Float32Array(n * 2);
  const corta = INI[4] + T.lag, vuelve = corta + T.traba;
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    if (s >= corta && s < vuelve) continue;
    const src = s < corta ? k : k - Math.round(T.traba * SR);
    if (src * 2 + 1 >= m.length) break;
    let g = .85 * Math.min(1, s / .3) * Math.min(1, (total - s) / 1.2);
    if (s >= vuelve) g *= Math.min(1, (s - vuelve) / .04);   // sin chasquido al volver
    if (s < corta) g *= Math.min(1, (corta - s) / .01);
    o[k * 2] = m[src * 2] * g; o[k * 2 + 1] = m[src * 2 + 1] * g;
  }
  let h = 12345; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const fx = new Float32Array(n);
  const suma = (seg, dur, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < dur * SR && i0 + k < n; k++) if (i0 + k >= 0) fx[i0 + k] += f(k / SR); };
  const golpe = (seg, vol) => suma(seg, .6, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (48 + 60 * Math.exp(-30 * u)) * u) + .25 * Math.exp(-60 * u) * azar()));
  const tecla = (seg, vol) => { let a = 0; suma(seg, .03, u => { const x = azar(); const y = x - a; a = x; return vol * Math.exp(-180 * u) * y; }); };
  const blip = (seg, vol, f = 1100) => suma(seg, .18, u => vol * Math.exp(-22 * u) * Math.sin(2 * Math.PI * f * u));
  const traba = (seg, vol) => suma(seg, .09, u => vol * Math.sign(Math.sin(2 * Math.PI * 180 * u)) * (.6 + .4 * azar()) * Math.min(1, (.09 - u) / .02));
  const silbato = (seg, vol) => [[0, .16], [.22, .16], [.44, .75]].forEach(([d, dur]) => { let fase = 0; suma(seg + d, dur, u => { fase += 2 * Math.PI * 2950 * (1 + .02 * Math.sin(u * 2 * Math.PI * 34)) / SR; return vol * Math.min(1, u / .015) * Math.min(1, (dur - u) / .04) * (Math.sin(fase) * .8 + .2 * azar()); }); });
  const escribe = (ini, texto, desde) => [...texto].forEach((c, i) => { if (c !== ' ') tecla(ini + desde + i / CPS, .07); });

  INI.forEach((t0, i) => golpe(t0, i ? .55 : .7));
  escribe(INI[0], datos.textos.gancho[1], T.g2);
  PUNTOS.forEach((p, i) => escribe(INI[i + 1], p.texto, T.escribe));
  traba(corta, .25);
  golpe(INI[4] + PUNTOS[3].tag[0] - .75, .5);
  silbato(INI[5] + PUNTOS[4].final - .05, .2);
  T.nums.forEach((t, i) => blip(INI[6] + t, .18, 880 + i * 110));
  for (let k = 0; k < n; k++) { o[k * 2] += fx[k]; o[k * 2 + 1] += fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

const base = path.join(DIR, 'lun-cosas-base.mp4'), mezclado = path.join(DIR, 'lun-cosas-sonido.mp4'), mp4 = path.join(DIR, 'lun-cosas.mp4'), jpg = path.join(DIR, 'lun-cosas-portada.jpg'), foto = path.join(DIR, 'lun-cosas-foto-portada.jpg');
if (!flag('--sin-render') || !fs.existsSync(base)) {
  log(`Render (${Math.round(total * FPS)} cuadros)…`);
  await video('cosas.html', datos, base, { escenas: DURS.map((dur, n) => ({ n, dur })), fps: FPS, musica, musicaDesde });
}
sonido(base, mezclado);

// Portada: la tijera congelada un instante antes del remate, sin textos
{
  const { b, p } = await abrir();
  await p.evaluate(t => mostrar(4, t, { sinTexto: true }), T.lag - .05);
  await p.locator('#lienzo').screenshot({ path: foto, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: foto, kicker: 'Cosas que solo entendés si jugás Clubs Pro', dato: '5', titulo: '¿Cuántas te *pasaron*?', foco: '50% 55%' }, jpg);
conPortada(mezclado, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4), uSl = [];
for (const s of slides) uSl.push(await subir(s));
const uPortada = await subirPortada(jpg, 'social/viral/lun-cosas-portada.jpg');
const desc = `${Math.round(total)} s · lista numerada que se escribe sola sobre jugadas reales del vivo del 22/10 (sin HUD del juego) · 1 ataque de SF Drysdale a nuestro arco, 2 y 3 jugadas en ataque (no hay córner corto grabado: el texto queda genérico), 4 la tijera de ${PROTA} en el 90+ del 3-3, congelada 1 s con la música cortada de verdad y después el gol, 5 el pitazo final del 1-0 a InfinitX con placa propia (Clean dorado) · "00:30" es el chiste: ese partido fue a las 23:30 y los textos no lo afirman · sin voz (lo pide el guion) · teclas, golpes y silbato sintetizados · música: ${tema.titulo}.`;
const P = o => ({ decision: 'pendiente', protagonistas: [PROTA], descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-30', pieza: 'lun-cosas' },
  titulo: 'Cosas que solo entendés si jugás Clubs Pro', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Cosas que solo entendés si jugás Clubs Pro', metodo: 'ig-reel',
      texto: `Cinco cosas que solo entendés si jugás Clubs Pro. ¿Cuántas te pasaron?\n\nTodo con imágenes de nuestro vivo, y el lag del 90 termina con la tijera de ${PROTA}.\n\nContestá con el número.\n\n#TopSecretFC #EAFC #ClubsPro` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · Cosas que solo entendés si jugás Clubs Pro', metodo: 'tiktok',
      texto: `Si entendés las cinco, jugás Clubs Pro. Si entendés tres, mandáselo al que te hizo jugar. La del 90 termina con la tijera de ${PROTA}. ¿Cuántas te pasaron? #TopSecretFC #ProClubs #EAFC #ClubsPro` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · Cosas que solo entendés si jugás Clubs Pro', metodo: 'youtube',
      titulo: '5 cosas que solo entendés si jugás Pro Clubs | EA FC',
      texto: `¿Cuántas te pasaron? Contestá con el número. La del minuto 90 termina con la tijera de ${PROTA}. #Shorts #ProClubs #EAFC` }),
    { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel · Cosas que solo entendés si jugás Clubs Pro', decision: 'pendiente', protagonistas: [PROTA], metodo: 'ig-carrusel',
      descripcion: 'Nueve placas con cuadros reales del vivo del 22/10: portada, clave ("si entendés las cinco…"), una placa por cosa (1 a 5), resumen con las cinco y la acción "Contestá con el número". Sin música ni voz.',
      media: uSl.map(url => ({ tipo: 'imagen', url })), local: { slides },
      texto: `Cinco cosas que solo entendés si jugás Clubs Pro. Si entendés las cinco, sos de los nuestros.\n\nDeslizá: el arquero que se cae, el que no devuelve la pelota, el córner corto, el lag del minuto 90 y ganar a medianoche.\n\nLa del 90 es la tijera de ${PROTA} ante SF Drysdale.\n\n¿Cuántas te pasaron? Contestá con el número.\n\n#TopSecretFC #EAFC #ClubsPro` },
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
