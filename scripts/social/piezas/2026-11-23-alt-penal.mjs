#!/usr/bin/env node
// "¿Era penal? El VAR lo decidís vos" (idea alt-penal del guion viral-guiones-2026-11-23): la jugada real a velocidad
// normal, la revisión en cámara lenta dentro de un monitor, cuenta de 5 con SÍ / NO, pausa en negro y la revelación:
// lo que cobró el juego (penal + amarilla) y el penal pateado. Cierre: "¿Acertaste?".
//
// Decisiones (producción sin supervisión):
//   - La jugada: la ÚNICA cámara de penal en juego de los 21 vivos grabados (escaneo cuadro a cuadro de la cámara de
//     pelota parada en fuentes/goles/*/source.mp4; los resúmenes de EA leídos dan 0 penales y la otra serie de penales,
//     19/10, es una definición, no una jugada). Es del 4/11 contra HYT (fuentes/goles/vvivo-2026-11-04, 56:10–56:44 del
//     vivo): enredo con varios en el piso justo sobre la línea del área de ellos, minuto 45 (el del cartel de la amarilla).
//     El juego cobró penal y amarilla para FODEN (HYT); lo pateó el 22, Lil_Dekuroko, y entró: 1-1 (marcador del vigía).
//   - El guion decía "área nuestra, minuto 70": se cambia por lo real (área de ellos, minuto 45). La duda es genuina:
//     el contacto es en la línea del área, entre cuatro jugadores.
//   - Ese partido no está en seed_matches.js (no es del calendario oficial): no se nombra la liga ni el resultado final,
//     solo lo que se ve en la grabación.
//   - No se nombra a quién le hicieron la falta (no se distingue con certeza en el lío); el protagonista es el que pateó.
//   - Sin voz (lo pide el guion: es un juego para opinar). El audio del vivo no se usa (puede tener voces de la
//     transmisión): música + efectos sintetizados, con el silbato en la revelación.
//   - Sin Facebook: no está en las redes del guion.
//
//   node scripts/social/piezas/2026-11-23-alt-penal.mjs
//     --cuadros         hoja de cuadros clave en fuentes/redes/viral/alt-penal/hoja.jpg, sin renderizar
//     --cuadro=n,t      un cuadro suelto en fuentes/redes/viral/alt-penal/cuadro.jpg
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

const DIR = path.join(ROOT, 'fuentes/redes/viral/alt-penal');
const FUENTE = path.join(ROOT, 'fuentes/goles/vvivo-2026-11-04/source.mp4');
const ID = 'viral-alt-penal-2026-11-23';
const K = 1.5, FPS = 60;   // los cuadros se guardan a 1920x1080 (1,5 veces el video de 720p)
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [penal] ${m}`);
const flag = f => process.argv.includes(f);

// Tramos del vivo (segundos de source.mp4). cam: [segundo, centro x] de la franja; rev.cam: [segundo, cx, cy, ancho].
const TRAMOS = {
  jugada: { desde: 3370.0, largo: 7.0, cam: [[3370, 880], [3373, 840], [3375, 790], [3377, 800]] },
  arbitro: { desde: 3377.15, largo: 1.5, cx: 470 },
  amarilla: { desde: 3380.75, largo: 1.5, cx: 420 },
  penal: { desde: 3401.5, largo: 2.5, cx: 600 },
};
const REV = { desde: 3374.5, vel: .3, lazo: [3375.2, 3375.95], cam: [[3374.5, 730, 200, 520], [3375.3, 730, 215, 400], [3376.6, 745, 240, 380]] };
const GOL_EN = 1.3;   // segundo del tramo "penal" en que la pelota pasa al arquero (3402,8; a 3403,55 corta a la toma abierta)

function extraer(id) {
  const tr = TRAMOS[id], d = path.join(DIR, id);
  if (!fs.existsSync(path.join(d, '0001.jpg'))) {
    fs.mkdirSync(d, { recursive: true });
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(tr.desde), '-i', FUENTE, '-t', String(tr.largo), '-an',
      '-vf', `fps=${FPS},scale=${1280 * K}:${720 * K}:flags=lanczos,unsharp=5:5:0.6:5:5:0`, '-q:v', '3', path.join(d, '%04d.jpg')], { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  }
  return { ...tr, dir: archivo(d), n: fs.readdirSync(d).filter(f => /^\d+\.jpg$/.test(f)).length };
}
fs.mkdirSync(DIR, { recursive: true });
const tr = Object.fromEntries(Object.keys(TRAMOS).map(k => [k, extraer(k)]));
log('Cuadros: ' + Object.entries(tr).map(([k, v]) => `${k} ${v.n}`).join(' · '));

// ── Música y tiempos: la cuenta y la revelación caen sobre el pulso del tema ──
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
const { beat: B, inicio } = pulsoDelTema(musica, 34);
const enPulsos = s => Math.max(1, Math.round(s / B)) * B;
// La jugada dura lo que dura de verdad; la revisión se ajusta al pulso cambiando apenas la velocidad
const T = { jugada: TRAMOS.jugada.largo - .05, revision: enPulsos(7), tick: enPulsos(5) / 5, negro: enPulsos(1.3), cierre: enPulsos(3.2) };
REV.vel = +((3376.6 - REV.desde) / T.revision).toFixed(3);
const tramosRev = [{ ...tr.arbitro, dur: 1.4 }, { ...tr.amarilla, dur: 1.4 }, { ...tr.penal, dur: 2.0 }];
T.revela = tramosRev.reduce((s, x) => s + x.dur, 0);
const escenas = [{ n: 0, dur: T.jugada }, { n: 1, dur: T.revision }, { n: 2, dur: 5 * T.tick }, { n: 3, dur: T.negro }, { n: 4, dur: T.revela }, { n: 5, dur: T.cierre }];
const total = escenas.reduce((s, e) => s + e.dur, 0);
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} s · tick ${T.tick.toFixed(2)} s · cámara lenta ×${REV.vel} · total ${total.toFixed(1)} s`);
if (T.tick < .85 || T.tick > 1.25) log(`  ojo: el tick da ${T.tick.toFixed(2)} s, lejos del segundo que promete la cuenta`);

const PATEADOR = 'Lil_Dekuroko';
const datos = {
  K, fps: FPS, T, escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  jugada: tr.jugada, rev: REV,
  revela: { tramos: tramosRev, golEn: GOL_EN },
  textos: {
    kicker: 'JUGADA REAL · ÁREA DE ELLOS · MINUTO 45',
    pregunta: '¿ERA PENAL?',
    contesta: 'Contestá antes de que termine',
    revision: 'LA MISMA JUGADA, EN CÁMARA LENTA',
    duda: '¿Hay falta?<br>¿Fue adentro del área?',
    comenta: 'Elegí antes de que llegue a cero',
    negro: ['COMENTÁ<br>ANTES DE VER', 'SÍ O NO'],
    cobro: 'LO QUE COBRÓ EL JUEGO',
    pateador: PATEADOR,
    gol: 'GOL · 1-1',
    cierre: ['¿ACERTASTE?', '¿Vos lo cobrabas?'],
  },
};

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/penal.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}

if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [];
  const M = [[0, .1], [0, .6], [0, 3], [0, 5.2], [0, 6.8], [1, .1], [1, 2], [1, 4], [1, T.revision - .1], [2, .2], [2, T.tick * 2.5], [2, T.tick * 4.6],
    [3, .6], [4, .1], [4, .9], [4, 1.6], [4, 2.8], [4, 2.8 + GOL_EN - .2], [4, 2.8 + GOL_EN + .2], [4, T.revela - .05], [5, .4], [5, T.cierre - .1]];
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

// ── Sonido: la música del render + efectos sintetizados ──
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
  const pitido = (seg, vol) => { for (const d of [0, .16]) suma(seg + d, .1, u => vol * Math.min(1, u / .005) * Math.exp(-14 * u) * Math.sin(2 * Math.PI * 1900 * u)); };
  // silbato: dos tonos cerca de 3 kHz con el trino de la bolita, uno corto y uno largo
  const silbato = (seg, vol) => { let ph = 0; for (const [d, dur] of [[0, .16], [.24, .62]]) suma(seg + d, dur, u => { ph += 2 * Math.PI * (2950 + 90 * Math.sin(2 * Math.PI * 32 * u)) / SR; return vol * Math.min(1, u / .01) * Math.min(1, (dur - u) / .04) * (Math.sin(ph) + .35 * Math.sin(ph * 2.02)) * (.7 + .3 * Math.sin(2 * Math.PI * 32 * u)); }); };
  const hinchada = (seg, dur, vol) => { let a = 0, b = 0; suma(seg, dur, u => { a += .05 * (azar() - a); b += .004 * (azar() - b); return vol * Math.min(1, u / .2) * Math.exp(-u * 1.1) * (a * 2.4 + b * 6) * (1 + .15 * Math.sin(u * 19)); }); };
  const duck = new Float32Array(n).fill(1);
  const bajar = (a, b, g) => { for (let k = Math.round(a * SR); k < Math.min(n, b * SR); k++) duck[k] = Math.min(duck[k], g); };
  const ini = []; let s = 0; for (const e of escenas) { ini.push(s); s += e.dur; }
  golpe(.05, .5); barrido(0, .35, .35);
  // revisión: entra el monitor con el pitido del VAR; la música baja un poco para que se escuche
  barrido(ini[1] - .1, .4, .4); golpe(ini[1], .5); pitido(ini[1] + .12, .28); bajar(ini[1], ini[2], .7);
  // cuenta
  for (let i = 0; i < 5; i++) tick(ini[2] + i * T.tick, i >= 3, i >= 3 ? .34 : .24);
  subida(ini[3] - T.tick * 1.4, T.tick * 1.4, .45);
  // negro: casi silencio
  bajar(ini[3], ini[4], .12); golpe(ini[3], .55);
  // revelación: silbato, golpe del PENAL, golpe del cambio de tramo, el gol con hinchada
  silbato(ini[4] + .02, .2); golpe(ini[4] + .02, .85); barrido(ini[4] - .05, .4, .4);
  golpe(ini[4] + tramosRev[0].dur, .4);
  const gol = ini[4] + tramosRev[0].dur + tramosRev[1].dur + GOL_EN;
  golpe(gol, .75); hinchada(gol, 3.2, .34);
  golpe(ini[5] + .05, .45);
  const suave = 2400; let g = 1;   // solo baja la música, no los efectos
  for (let k = 0; k < n; k++) { g += (duck[k] - g) / suave; o[k * 2] = o[k * 2] * g * .8 + fx[k]; o[k * 2 + 1] = o[k * 2 + 1] * g * .8 + fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

const base = path.join(DIR, 'penal-base.mp4'), mezclado = path.join(DIR, 'penal-sonido.mp4'), mp4 = path.join(DIR, 'penal.mp4'), jpg = path.join(DIR, 'penal-portada.jpg'), fotoPortada = path.join(DIR, 'penal-foto-portada.jpg');
if (!flag('--sin-render')) {
  log(`Render (${Math.round(total * 60)} cuadros a 60 fps)…`);
  await video('penal.html', datos, base, { escenas, fps: 60, desenfoque: true, musica, musicaDesde: inicio });
}
sonido(base, mezclado);

// Portada: el cuadro del lío en vertical (9:16 directo del vivo; con el monitor el título de la portada lo pisaba)
{
  const k = Math.round((3375.45 - TRAMOS.jugada.desde) * FPS) + 1, an = Math.round(405 * K);
  await sharp(path.join(DIR, 'jugada', `${String(k).padStart(4, '0')}.jpg`))
    .extract({ left: Math.round(735 * K - an / 2), top: 0, width: an, height: 720 * K }).resize(1080, 1920).jpeg({ quality: 95 }).toFile(fotoPortada);
}
await portada({ imagen: fotoPortada, kicker: 'Jugada real · el VAR sos vos', titulo: '¿Era *penal*?', dato: '5"', foco: '50% 30%' }, jpg);
conPortada(mezclado, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
await putFile(mp4, 'social/viral/penal.mp4');
const uVid = `${MEDIA}/social/viral/penal.mp4?v=${Date.now().toString(36)}`;
const uPortada = await subirPortada(jpg, 'social/viral/penal-portada.jpg');
const desc = `${Math.round(total)} s · sin voz (es un juego para opinar, como pide el guion) · la jugada es real: 4/11 contra HYT, minuto 45, enredo sobre la línea del área de ellos (la única cámara de penal en juego de los 21 vivos grabados) · revisión en cámara lenta ×${REV.vel.toFixed(1).replace('.', ',')} dentro de un monitor, cuenta real de ${(5 * T.tick).toFixed(1)} s al pulso, pausa en negro y al final lo que cobró el juego (penal y amarilla) y el penal de ${PATEADOR} (1-1) · el guion decía "área nuestra, minuto 70": se cambió por lo real · audio del vivo descartado (puede traer voces de la transmisión): música + efectos sintetizados con silbato · música: ${tema.titulo}.`;
const pieza = o => ({ decision: 'pendiente', protagonistas: [PATEADOR], descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-23', pieza: 'alt-penal' },
  titulo: '¿Era penal? El VAR lo decidís vos', piezas: [
    pieza({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Juego de VAR', metodo: 'ig-reel',
      texto: `¿Era penal? Jugada real de esta temporada: área de ellos, minuto 45, Lil_Dekuroko en el lío y varios en el piso sobre la línea.

Mirá la repetición en cámara lenta y decidí antes de que llegue a cero. Lo que cobró el juego está en el último segundo.

SÍ o NO en los comentarios.

#TopSecretFC #ProClubs #EAFC` }),
    pieza({ id: 'tiktok', red: 'tiktok', formato: 'Video · Juego de VAR', metodo: 'tiktok',
      texto: `El VAR sos vos. Lío en el área con Lil_Dekuroko adentro: ¿penal o siga, siga? Comentá antes de ver lo que cobró el juego. #TopSecretFC #ProClubs #EAFC` }),
    pieza({ id: 'yt-short', red: 'youtube', formato: 'Short · Juego de VAR', metodo: 'youtube',
      titulo: '¿Era penal? El VAR lo decidís vos · Top Secret FC en Pro Clubs',
      texto: `Una jugada real de esta temporada, con Lil_Dekuroko en el área: ¿hay falta y fue adentro? Mirala en cámara lenta y decidí antes del final; lo que cobró el juego aparece recién al cierre. #Shorts #ProClubs #EAFC` }),
    pieza({ id: 'x-video', red: 'x', formato: 'Video · Juego de VAR', metodo: 'x-video',
      texto: `¿Era penal? Minuto 45, Lil_Dekuroko en el lío, todo sobre la línea del área. Contestá SÍ o NO antes del final: lo que cobró el juego está en el último segundo. #TopSecretFC` }),
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
