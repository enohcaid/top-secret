#!/usr/bin/env node
// "El movimiento que nadie vio" (idea alt-pizarra del guion viral-guiones-2026-11-09): un gol real, vuelve atrás y se apaga todo
// menos el jugador sin pelota; marcas estilo análisis de TV que siguen a los jugadores y quedan pegadas al pasto.
//
// Decisiones (producción sin supervisión):
//   - La jugada: el 1-1 con Parke Avellane del 27/10 en Espacio Gamer (fuentes/goles/vvivo-2026-10-27, YouTube de RS32-DaniStone,
//     sin overlay; el marcador del HUD dice TOP 0-1 PKE → 1-1 al 20'). Pase largo de "MARTINEZ", gol de "LAUTAVESTER7" (etiquetas
//     del juego) y el #9 (NicoBJ_96) pica derecho al arco por afuera sin tocarla. El partido todavía no está en seed_matches.js:
//     todo lo que se afirma se ve en el video; no se da el resultado final porque no consta.
//   - Lo que se afirma del movimiento sale del seguimiento: el defensor corre en paralelo al #9 durante toda la jugada, en línea
//     recta, y no va a cerrar al que lleva la pelota. Las flechas son las trayectorias reales, no dibujos.
//   - Seguimiento propio sin opencv (lib/seguir.py), cámara como homografía cuadro a cuadro + jugadores por color.
//   - La voz nombra por número ("el nueve", "el siete"); los gamertags, en pantalla. Voz de Elena, como pide el guion.
//   - Efectos sintetizados, como en ¿Dónde está la pelota? Sin Facebook ni X: no están en las redes del guion.
//
//   node scripts/social/piezas/2026-11-09-alt-pizarra.mjs
//     --cuadros     hoja de cuadros clave en fuentes/redes/viral/alt-pizarra/hoja.jpg, sin renderizar
//     --cuadro=<t>  un cuadro en cuadro.jpg
//     --placas      solo el carrusel
//     --sin-lote    renderiza todo pero no sube ni carga el lote
//     --sin-render  reusa el video base: rehace voz, sonido y portada, sube y carga el lote
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

const DIR = path.join(ROOT, 'fuentes/redes/viral/alt-pizarra');
const FUENTE = path.join(ROOT, 'fuentes/goles/vvivo-2026-10-27/source.mp4');
const ID = 'viral-alt-pizarra-2026-11-09';
const NUEVE = 'NicoBJ_96', SIETE = 'Lautavester7', PASADOR = 'Juan_Martinez4';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [pizarra] ${m}`);
const flag = f => process.argv.includes(f);

const DESDE = 1694.8, LARGO = 7, FPS = 60;
// Cuadros de la jugada (índice desde DESDE): se congela con la pelota en el aire y con el siete de cara al arquero; el gol entra ~316
const F = { inicio: 30, finGolNormal: 336, c: 84, e: 240, fin: 372 };
const PELOTA = [811, 262];    // en coordenadas de la referencia (cuadro 84)
const ARCO = [1133, 290];     // centro del arco en el cuadro e: hacia ahí se abre el pasillo

fs.mkdirSync(DIR, { recursive: true });
// ── Seguimiento y cuadros ──
const jsSeg = path.join(DIR, 'seguimiento.json');
if (!fs.existsSync(jsSeg)) {
  const cfg = path.join(DIR, 'seguir.json');
  fs.writeFileSync(cfg, JSON.stringify({ video: FUENTE, desde: DESDE, largo: LARGO, fps: FPS, ancho: 1280, alto: 720, referencia: F.c, recorteY: [105, 625],
    pistas: [{ id: 'nueve', tipo: 'oscuro', cuadro: F.c, x: 880, y: 408 }, { id: 'defensor', tipo: 'blanco', cuadro: F.c, x: 908, y: 355 }, { id: 'siete', tipo: 'oscuro', cuadro: F.c, x: 960, y: 317 }] }));
  log('Seguimiento…');
  const r = spawnSync('python', [path.join(ROOT, 'scripts/social/lib/seguir.py'), ffmpeg, cfg, jsSeg], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error('seguir.py: ' + r.stderr);
}
const SEG = JSON.parse(fs.readFileSync(jsSeg, 'utf8'));
const dirJ = path.join(DIR, 'jugada');
if (!fs.existsSync(path.join(dirJ, '0001.jpg'))) {
  fs.mkdirSync(dirJ, { recursive: true });
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(DESDE), '-i', FUENTE, '-t', String(LARGO), '-vf', `fps=${FPS},scale=2560:1440:flags=lanczos,unsharp=5:5:0.8:5:5:0`, '-q:v', '3', path.join(dirJ, '%04d.jpg')], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
}

// ── Música y voz: la duración de cada escena sale de su frase, y cae sobre el pulso del tema ──
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
const { beat: B, inicio: musicaDesde } = pulsoDelTema(musica, 34);
const arribaB = s => Math.ceil(s / B - .02) * B;

const GUION = [
  { id: 'a', texto: 'Todos miraron el gol. Mirá al que no tenía la pelota.', grande: true },
  { id: 'c', texto: 'Frená. La pelota está en el aire, y el nueve ya arrancó.' },
  { id: 'd', texto: 'Pica derecho al arco, sin pedirla. Y un defensor se va con él.' },
  { id: 'e', texto: 'Ese defensor ya no cierra, y el siete sale solo contra el arquero.' },
  { id: 'f', texto: 'El gol es del siete. El camino lo abrió el nueve, sin tocar la pelota.' },
  { id: 'g', texto: 'Guardalo para tu próximo partido.', sinSub: true },
];
const previa = narracion(GUION.map(g => ({ en: 0, texto: g.texto })), DIR);
const durV = Object.fromEntries(GUION.map((g, i) => [g.id, previa[i].dur]));
const T = { a0: .12 };
T.a2 = arribaB(Math.max(4.9, durV.a + .25));   // fin del gol a velocidad normal
T.b = T.a2;
T.c = T.b + arribaB(.7);
T.d = T.c + arribaB(durV.c + .3);
T.e = T.d + arribaB(Math.max(durV.d + .3, 5));
T.f = T.e + arribaB(durV.e + .3);
T.g = T.f + arribaB(Math.max(durV.f + .3, 4));
const total = T.g + arribaB(durV.g + .9);
const MOV = 3.7;                               // lo que tarda de cuadro e al fin, a 0,6x
T.gol = T.f + MOV * (316 - F.e) / (F.fin - F.e);
T.fin = T.f + MOV;
const pistas = narracion(GUION.map(g => ({ en: g.id === 'a' ? T.a0 : T[g.id] + .05, texto: g.texto })), DIR);
// El momento en que dice "nueve" en la primera frase de la jugada: ahí la luz pasa de la pelota al jugador
T.cNueve = pistas[1].palabras.find(p => /nueve/i.test(p.w)).t - .1;
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} · total ${total.toFixed(1)} s · ${Object.entries(T).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' ')}`);

// ── Tiempo de pantalla → cuadro de la jugada ──
const eIO = p => { p = Math.min(1, Math.max(0, p)); return p * p * (3 - 2 * p); };
const mapa = [[0, F.inicio], [T.a2, F.finGolNormal]];
for (let i = 1; i <= 16; i++) mapa.push([T.b + (T.c - T.b) * i / 16, F.finGolNormal + (F.c - F.finGolNormal) * eIO(i / 16)]);
mapa.push([T.d + .75, F.c], [T.e, F.e], [T.f, F.e], [T.fin, F.fin], [total, F.fin]);

const K = (t, n, d, s, dx, dy, z) => ({ t, n, d, s, dx, dy, z });
const cam = [
  K(0, .5, 0, .5, -120, -60, 2.667), K(1.2, .5, 0, .5, -40, -60, 2.667), K(3.2, .4, 0, .6, 40, -60, 2.667), K(T.a2 - .8, .35, 0, .65, 95, -60, 2.667), K(T.a2, .35, 0, .65, 95, -60, 2.667),
  K(T.c - .15, 1, 0, 0, -30, -90, 2.8), K(T.cNueve - .2, 1, 0, 0, -30, -90, 2.8), K(T.cNueve + .35, 1, 0, 0, 0, -60, 3.7), K(T.d, 1, 0, 0, 0, -60, 3.7),
  K(T.d + .75, .55, .15, .3, 25, -60, 3.05), K((T.d + T.e) / 2, .45, .15, .4, 20, -50, 2.85), K(T.e, .4, .1, .5, 15, -50, 2.75), K(T.f, .4, .1, .5, 15, -50, 2.75),
  K(T.gol, .3, 0, .7, 95, -60, 2.667), K(T.fin - .35, .5, 0, .5, 40, -60, 2.8), K(T.fin + .3, 1, 0, 0, 0, -70, 3.5), K(T.g, 1, 0, 0, 0, -70, 3.5), K(T.g + .5, 1, 0, 0, 0, -100, 3.2), K(total, 1, 0, 0, 0, -100, 3.2),
];
const frases = pistas.map((p, i) => ({ en: p.en, fin: i + 1 < pistas.length ? Math.min(pistas[i + 1].en - .02, p.en + p.dur + .5) : p.en + p.dur + .5, grande: GUION[i].grande, palabras: p.palabras })).filter((_, i) => !GUION[i].sinSub);

const ESCUDO = archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'));
const comunes = {
  H: SEG.H, n: SEG.n, pistas: Object.fromEntries(Object.entries(SEG.pistas).map(([k, v]) => [k, v.pasto])), dir: archivo(dirJ),
  pelota: PELOTA, arco: ARCO, fC: F.c, fFin1: F.e, escudo: ESCUDO, nueve: NUEVE, siete: SIETE, goleador: SIETE, kicker: 'EL MOVIMIENTO QUE NADIE VIO',
};
const datos = { ...comunes, T, mapa, cam, frases, cierre: ['GUARDALO PARA TU PRÓXIMO PARTIDO', `${NUEVE}, sin tocar la pelota`] };

// Carrusel: 1080x1350. Las mismas marcas, sobre los mismos cuadros.
const dPlacas = {
  ...datos,
  placas: [
    { f: F.fin, cx: 930, cy: 400, s: 2.35, a: 'TODOS MIRARON EL <em>GOL.</em>', b: 'Mirá al que no tenía la pelota.', dyNueve: -34, dxNueve: -190 },
    { f: F.c, cx: 860, cy: 390, s: 2.35, pelota: true, a: '', b: `La pelota está en el aire, y <em>${NUEVE}</em> ya arrancó.`, dyNueve: 96 },
    { f: F.c, cx: 1000, cy: 390, s: 2.35, flechas: 150, defensor: true, a: '', b: 'Pica derecho al arco, sin pedirla. Un defensor se va con él. Las flechas son las corridas reales.', dyNueve: 96, dxNueve: -40 },
    { f: F.e, cx: 760, cy: 400, s: 2.35, estela: true, defensor: true, siete: true, pasillo: true, a: '', b: `El defensor corre en línea con él y no cierra. <em>${SIETE}</em> sale solo contra el arquero.`, dyNueve: 90 },
    { f: F.fin, cx: 960, cy: 420, s: 2.35, a: 'GUARDALO PARA TU PRÓXIMO <em>PARTIDO</em>', b: `El gol es de ${SIETE}. El camino lo abrió ${NUEVE}, sin tocar la pelota.`, dyNueve: -34, dxNueve: -190, escudo: true },
  ],
};

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/pizarra.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}
if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [];
  const M = [.2, 1.5, 3, 4.8, T.a2 - .2, T.b + .4, T.c + .1, T.c + 1, T.cNueve + .1, T.cNueve + .6, T.d + .3, T.d + 1, T.d + 2, T.d + 3.5, T.e - .3, T.e + .3, T.e + 1.3, T.f - .2, T.f + .8, T.gol + .1, T.gol + .8, T.fin + .5, T.g + .5, total - .1];
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

const slides = await carrusel('pizarra.html', dPlacas, DIR, 'placa');
if (flag('--placas')) { log('Listo (carrusel).'); process.exit(0); }

// ── Sonido: voz y música primero (sidechain); los efectos van encima, sin bajar con la música ──
function sonido(entra, sale) {
  const SR = 48000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', entra, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (audio): ' + String(r.stderr).slice(-300));
  const o = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const n = o.length >> 1;
  let h = 12345; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const fx = new Float32Array(n);
  const suma = (seg, dur, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < dur * SR && i0 + k < n; k++) fx[i0 + k] += f(k / SR); };
  const golpe = (seg, vol) => suma(seg, .6, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (48 + 60 * Math.exp(-30 * u)) * u) + .25 * Math.exp(-60 * u) * azar()));
  const barrido = (seg, dur, vol) => { let a = 0; suma(seg, dur, u => { a += .08 * (azar() - a); return vol * Math.pow(Math.sin(Math.PI * u / dur), 2) * a * 3; }); };
  const hinchada = (seg, dur, vol) => { let a = 0, b = 0; suma(seg, dur, u => { a += .05 * (azar() - a); b += .004 * (azar() - b); return vol * Math.min(1, u / .2) * Math.exp(-u * .9) * (a * 2.4 + b * 6) * (1 + .15 * Math.sin(u * 19)); }); };
  const trazo = (seg, vol) => suma(seg, .5, u => { const f = 900 + 1800 * u; return vol * Math.sin(Math.PI * u / .5) * Math.sin(2 * Math.PI * f * u) * .4; });
  const rebobina = (seg, dur, vol) => { let fase = 0; suma(seg, dur, u => { fase += 2 * Math.PI * (2400 - 1900 * u / dur) / SR; return vol * Math.sin(fase) * Math.sin(Math.PI * u / dur) * (.6 + .4 * Math.sign(Math.sin(u * 180))); }); };
  const golNormal = T.a2 * (316 - F.inicio) / (F.finGolNormal - F.inicio);
  golpe(golNormal, .6); hinchada(golNormal, 3, .3);
  rebobina(T.b, T.c - T.b, .16); barrido(T.b - .05, .4, .4);
  golpe(T.c, .7); barrido(T.c - .08, .3, .35);
  trazo(T.d + .05, .22); trazo(T.d + .4, .18);
  golpe(T.e, .6); trazo(T.e + .1, .2);
  golpe(T.gol, .85); hinchada(T.gol, 3.5, .34);
  golpe(T.fin, .4);
  golpe(T.g, .55);
  for (let k = 0; k < n; k++) { o[k * 2] += fx[k]; o[k * 2 + 1] += fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

const base = path.join(DIR, 'pizarra-base.mp4'), conVoz = path.join(DIR, 'pizarra-voz.mp4'), mezclado = path.join(DIR, 'pizarra-sonido.mp4'), mp4 = path.join(DIR, 'pizarra.mp4'), jpg = path.join(DIR, 'pizarra-portada.jpg'), fotoPortada = path.join(DIR, 'pizarra-foto-portada.jpg');
if (!flag('--sin-render')) {
  log(`Render (${Math.round(total * 60)} cuadros a 60 fps)…`);
  await video('pizarra.html', datos, base, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica, musicaDesde });
}
agregarVoz(base, pistas, conVoz);
sonido(conVoz, mezclado);

// Portada: el cuadro congelado, todo apagado menos el nueve, con su flecha
{
  const { b, p } = await abrir();
  // Acercada y con el nueve en el tercio de arriba: el título de la portada tapa la mitad de abajo
  await p.evaluate(([t, k]) => { D.cam = [k]; return mostrar(0, t, { sinTexto: true }); }, [T.d + .7, K(0, 1, 0, 0, 0, 55, 4.2)]);
  await p.locator('#lienzo').screenshot({ path: fotoPortada, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: fotoPortada, kicker: 'El movimiento que nadie vio', titulo: 'Mirá al que *no tenía la pelota*', foco: '50% 40%' }, jpg);
conPortada(mezclado, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4), uSl = [];
for (const s of slides) {
  const dest = path.join(DIR, `pizarra-${path.basename(s)}`);
  fs.copyFileSync(s, dest);
  uSl.push(await subir(dest));
}
const uPortada = await subirPortada(jpg, 'social/viral/pizarra-portada.jpg');
const desc = `${Math.round(total)} s · lleva voz (Elena; en la voz van por número, los gamertags en pantalla) · gol real: 1-1 con Parke Avellane, 27/10, Espacio Gamer (vivo de RS32-DaniStone) · técnica nueva: seguimiento de cámara y jugadores por código, sin IA: las flechas son las corridas reales de ${NUEVE} y del defensor, no dibujos; nada del plan de juego · partido todavía no cargado en seed_matches.js: no se da resultado final · música: ${tema.titulo}.`;
const P = o => ({ decision: 'pendiente', protagonistas: [NUEVE, SIETE], descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-09', pieza: 'alt-pizarra' },
  titulo: 'El movimiento que nadie vio', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · El movimiento que nadie vio', metodo: 'ig-reel',
      texto: `El gol es de ${SIETE}. La jugada la abrió ${NUEVE}, sin tocar la pelota.\n\nGuardalo para tu próximo partido.\n\n¿En tu equipo hay uno que pica así?\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · El movimiento que nadie vio', metodo: 'tiktok',
      texto: `Todos miraron el gol de ${SIETE}. Mirá lo que hace ${NUEVE} sin la pelota. Guardalo para tu próximo partido. #TopSecretFC #ProClubs #EAFC #ClubsPro` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · El movimiento que nadie vio', metodo: 'youtube',
      titulo: 'El movimiento sin pelota que abrió este gol | Pro Clubs EA FC',
      texto: `${NUEVE} pica al arco sin tocarla, se lleva a un defensor y ${SIETE} define. Gol real en Espacio Gamer. #Shorts #ProClubs #EAFC` }),
    { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel · El movimiento que nadie vio', decision: 'pendiente', protagonistas: [NUEVE, SIETE], metodo: 'ig-carrusel',
      descripcion: 'Cinco placas con los mismos cuadros y marcas del video, sin música ni voz. Va además del Reel porque el guion aprobado pide las dos.',
      media: uSl.map(url => ({ tipo: 'imagen', url })), local: { slides: slides.map(s => path.join(DIR, `pizarra-${path.basename(s)}`)) },
      texto: `El gol se lo llevan otros, pero la jugada empezó antes.\n\nDeslizá: ${NUEVE} pica derecho al arco sin tocar la pelota, un defensor se va con él y ${SIETE} sale solo contra el arquero. Las flechas son las corridas reales del gol con Parke Avellane en Espacio Gamer.\n\nGuardalo para tu próximo partido.\n\n¿Vos picás así o la pedís al pie?\n\n#TopSecretFC #ProClubs #EAFC #ClubsPro` },
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
