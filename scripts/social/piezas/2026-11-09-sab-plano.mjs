#!/usr/bin/env node
// "Una pelota, todo el plantel, sin cortes" (idea sab-plano del guion viral-guiones-2026-11-09): plano secuencia en bucle.
// La pelota pasa por los 18 jugadores sin tocar el piso, y el último cuadro empalma con el primero.
//
//   node scripts/social/piezas/2026-11-09-sab-plano.mjs
//     --solo-poses      genera y recorta las poses de pase, y arma la hoja poses/hoja.jpg para medir los toques
//     --cuadros         hoja de cuadros en fuentes/redes/viral/sab-plano/hoja.jpg, sin renderizar
//     --prueba          usa los Gesto4 existentes en vez de las poses de pase (para ajustar cámara y empalme sin gastar ChatGPT)
//     --sin-lote        renderiza todo pero no sube ni carga el lote
//     --sin-render      reusa el video base: rehace sonido y portada, sube y carga el lote
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { elegirMusica, infoTema, creditoTexto } from '../../lib/musica.mjs';
import { video, archivo } from '../lib/render.mjs';
import { portada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { putFile } from '../../lib/r2.mjs';
import { revisarPieza } from '../../../revisar-textos.js';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { ROSTER_T4 } from '../../../roster.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/sab-plano');
const POSES = path.join(DIR, 'poses');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [plano] ${m}`);
const flag = f => process.argv.includes(f);
const PRUEBA = flag('--prueba');
const ID = 'viral-sab-plano-2026-11-09';

// Orden de la cadena: del arco hacia adelante, y el último arquero se la devuelve al primero.
const ORDEN = ['Ivan_Cabj_La12', 'rivarola90', 'Alexisraies23', 'Cabers14', 'Elianja20', 'endiabladorojo66', 'Huber236', 'Guiidow', 'nikileo527',
  'pepolemmo2710', 'Juan_Martinez4', 'RS32-DaniStone', 'Ciprimancini32', 'Lil_Dekuroko', 'davidelapaternal', 'Lautavester7', 'NicoBJ_96', 'adri_cai'];
if (ORDEN.length !== ROSTER_T4.length || ROSTER_T4.some(j => !ORDEN.includes(j.key))) throw new Error('ORDEN no coincide con ROSTER_T4');
const dorsal = gt => ROSTER_T4.find(j => j.key === gt).num;

const MARGEN = .14;   // aire transparente alrededor de cada textura, para que el desenfoque no se corte en el borde
async function texturaDe(gt) {
  const f = PRUEBA ? path.join(ROOT, `Renders/${gt}/Gesto4.png`) : path.join(POSES, `${gt}-recorte.png`);
  const { data, info } = await sharp(f).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const pad = Math.round(MARGEN * info.height);
  const buf = await sharp(data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).resize({ height: 1500, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 95 }).toBuffer();
  return { img: 'data:image/webp;base64,' + buf.toString('base64'), px: info.height };
}

// ── Poses de pase: un toque en el aire distinto por jugador. La pelota NO va en la imagen: la anima el código. ──
const TOQUES = {
  Ivan_Cabj_La12: 'arquero en pleno salto, despejando con los dos puños juntos bien arriba de la cabeza, los dos pies despegados del piso, una rodilla levantada, mirando hacia arriba.',
  rivarola90: 'cabezazo de defensor: salta apenas, cuello tenso, frente adelantada y un poco hacia arriba, brazos abiertos para equilibrarse.',
  Alexisraies23: 'volea de derecha: pierna derecha extendida hacia el costado a la altura de la cadera, torso inclinado hacia el lado contrario, brazos abiertos.',
  Cabers14: 'control de pecho: torso arqueado hacia atrás, pecho hacia arriba, brazos bien abiertos a los costados, mirando hacia abajo, a su pecho.',
  Elianja20: 'despeje de cabeza en salto: cuerpo en el aire, los dos pies despegados del piso, frente hacia adelante y arriba, un brazo por delante, potente.',
  endiabladorojo66: 'pase de empeine de zurda: pierna izquierda alta y estirada hacia adelante, a la altura del pecho, apoyado sobre la otra, brazos para equilibrar.',
  Huber236: 'control con el muslo: muslo derecho levantado en horizontal, rodilla doblada, mirando hacia abajo, a su muslo, brazos abiertos con soltura.',
  Guiidow: 'volea cruzada: la pierna izquierda cruza por delante del cuerpo con el pie a la altura de la cintura, torso girando, brazo derecho alto.',
  nikileo527: 'taco en el aire: la pierna derecha levantada hacia atrás con el talón bien arriba, mirando por encima de su hombro hacia el talón, canchero.',
  pepolemmo2710: 'toque de rodilla: rodilla izquierda bien alta, a la altura del pecho, mentón hacia la rodilla, brazos relajados.',
  Juan_Martinez4: 'pase largo de empeine: pierna derecha estirada hacia adelante a la altura de la cintura, en el final del movimiento, mirada firme hacia adelante, brazo izquierdo abierto.',
  'RS32-DaniStone': 'sombrerito: pie derecho levantado por delante del cuerpo con la cara interna hacia arriba, a la altura de la rodilla izquierda, mirando hacia el pie, mano abierta al costado.',
  Ciprimancini32: 'control de hombro y pecho de costado: torso girado, hombro derecho adelantado y levantado, cabeza inclinada hacia ese hombro, brazos abiertos.',
  Lil_Dekuroko: 'pase de exterior: pierna derecha cruzada hacia afuera con el pie a la altura de la cadera, golpeando con el exterior, torso hacia el otro lado.',
  davidelapaternal: 'pase de cabeza suave: de pie, en puntas, cuello estirado hacia arriba, ojos abiertos, brazos hacia atrás, sereno.',
  Lautavester7: 'volea voladora: en el aire, los dos pies despegados del piso, pierna derecha estirada hacia adelante a la altura de la cintura, la izquierda doblada detrás, brazos abiertos.',
  NicoBJ_96: 'media tijera en el aire: el cuerpo inclinado hacia atrás, casi horizontal, los dos pies despegados, la pierna derecha arriba golpeando y la izquierda abajo, un brazo apuntando al piso.',
  adri_cai: 'arquero sacando con la mano: brazo derecho extendido hacia arriba y adelante en el final del saque, con la mano abierta y guante, pierna izquierda adelantada, mirando hacia adelante.',
};
const pedidoPose = gt => `Te adjunto el render aprobado de este jugador de fútbol. Hacé exactamente al mismo jugador (misma cara, peinado, vello facial, tatuajes, accesorios, tono de piel y contextura), con el mismo kit idéntico (mismo escudo, swoosh, dorsal, medias, guantes y botines), en plena jugada: está tocando una pelota en el aire.

La pose: ${TOQUES[gt]}

- MUY IMPORTANTE: NO dibujes ninguna pelota, ni objetos, ni piso. Solo el jugador: la pelota se agrega después.
- Se le tiene que ver la cara (de frente o tres cuartos), con cuerpo atlético y dinámico, tela de la camiseta en movimiento. Anatomía correcta: dos brazos, dos piernas, cinco dedos. El escudo del pecho no se deforma.
- Cuerpo entero de pies a cabeza, con margen de aire en todos los lados: nada cortado por el borde.
- Formato vertical 1024x1536. Fondo PNG con canal alfa real, completamente transparente, cero viñeta, resplandor, sombra en el piso o degradado. Luz de estudio con contraste, desde arriba. Sin texto, marcos ni marcas de agua.

Generá la imagen ahora.`;

async function recortar(gt, png) {
  const destino = path.join(POSES, `${gt}-recorte.png`);
  if (fs.existsSync(destino)) return destino;
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = (x, y) => data[(y * info.width + x) * 4 + 3];
  const transparente = [a(2, 2), a(info.width - 3, 2), a(2, info.height - 3), a(info.width - 3, info.height - 3)].every(v => v < 16);
  if (transparente) { fs.copyFileSync(png, destino); return destino; }
  const r = spawnSync('python', [path.join(ROOT, 'scripts/stream/quitar-fondo.py'), png, destino, 'u2net_human_seg'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`quitar-fondo ${gt}: ${(r.stderr || '').slice(-300)}`);
  return destino;
}

// Hoja con grilla al 10 % para medir a ojo dónde toca cada uno la pelota
async function hojaPoses() {
  const A = 270, L = 420, cols = 6, comp = [];
  for (const [i, gt] of ORDEN.entries()) {
    const f = path.join(POSES, `${gt}-recorte.png`); if (!fs.existsSync(f)) continue;
    const img = await sharp(f).trim({ threshold: 10 }).resize(A, L, { fit: 'fill' }).png().toBuffer();
    let lineas = '';
    for (let k = 1; k < 10; k++) lineas += `<line x1="${k * A / 10}" y1="0" x2="${k * A / 10}" y2="${L}" stroke="#0ff" stroke-opacity=".35"/><line x1="0" y1="${k * L / 10}" x2="${A}" y2="${k * L / 10}" stroke="#0ff" stroke-opacity=".35"/>`;
    const svg = Buffer.from(`<svg width="${A}" height="${L}"><rect width="${A}" height="${L}" fill="none" stroke="#f0f"/>${lineas}<text x="4" y="16" font-size="15" fill="#ff0" font-family="Arial">${gt}</text></svg>`);
    comp.push({ input: img, left: (i % cols) * A, top: Math.floor(i / cols) * L }, { input: svg, left: (i % cols) * A, top: Math.floor(i / cols) * L });
  }
  await sharp({ create: { width: A * cols, height: L * Math.ceil(ORDEN.length / cols), channels: 3, background: '#3a3a44' } }).composite(comp).jpeg({ quality: 88 }).toFile(path.join(POSES, 'hoja.jpg'));
}

if (flag('--solo-poses') || !PRUEBA) {
  fs.mkdirSync(POSES, { recursive: true });
  try {
    for (const gt of ORDEN) {
      if (!fs.existsSync(path.join(POSES, `${gt}-recorte.png`))) {
        const png = await generarImagen({ id: gt, carpeta: POSES, vertical: false, adjuntos: [path.join(ROOT, `Renders/${gt}/Frente4.png`)], promptCompleto: pedidoPose(gt) });
        await recortar(gt, png);
      }
      log(`  pose ${gt} ✓`);
    }
  } finally { await cerrar(); }
  await hojaPoses();
  if (flag('--solo-poses')) { log('Listo (solo poses).'); process.exit(0); }
}

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
const { beat: B, inicio } = pulsoDelTema(musica, 36);
// Cada jugador = una cantidad entera de pulsos, lo más cerca posible de 2 s: da tiempo a leer el gamertag sin que afloje.
const pulsos = [2, 3, 4].sort((x, y) => Math.abs(x * B - 2) - Math.abs(y * B - 2))[0];
const P = pulsos * B, T = Math.round(P * ORDEN.length * 60) / 60;
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} s (${Math.round(60 / B)} BPM) · ${pulsos} pulsos por jugador · ${P.toFixed(2)} s · bucle ${T.toFixed(2)} s`);

const T_PORTADA = P * 16.085, GIRO_PORTADA = -.35;   // NicoBJ_96 en plena media tijera, con la pelota llegando al pie
// gt: [u, v, y0]: punto del toque en la imagen recortada (medido a mano sobre poses/hoja.jpg) y metros despegado del piso.
const CONTACTOS = {
  Ivan_Cabj_La12: [.5, .02, .3], rivarola90: [.5, -.02, .18], Alexisraies23: [.05, .33, 0], Cabers14: [.42, .3, .1], Elianja20: [.5, -.03, .3], endiabladorojo66: [.85, .31, 0],
  Huber236: [.32, .38, 0], Guiidow: [.1, .56, 0], nikileo527: [.12, .5, .05], pepolemmo2710: [.65, .31, 0], Juan_Martinez4: [.43, .57, 0], 'RS32-DaniStone': [.36, .58, 0],
  Ciprimancini32: [.6, .16, .05], Lil_Dekuroko: [.06, .58, 0], davidelapaternal: [.52, -.03, .05], Lautavester7: [.1, .55, .55], NicoBJ_96: [.07, .04, .75], adri_cai: [.06, .03, 0],
};
const METROS_POR_PX = .00132;   // en las poses de ChatGPT (1536 px de alto), una persona parada mide ~1400 px
const jugadores = await Promise.all(ORDEN.map(async gt => {
  const [cu, cv, y0] = CONTACTOS[gt] || [.5, .12, 0], t = await texturaDe(gt);
  return { gt, num: dorsal(gt), img: t.img, mg: MARGEN, alto: PRUEBA ? 1.95 : t.px * METROS_POR_PX, cu, cv, y0 };
}));
const datos = {
  T, t0: P * .17, jugadores,                                 // el cuadro 0 ya es portada: pelota a punto de llegar al primero, con el gancho a la vista
  escudo: 'data:image/webp;base64,' + (await sharp(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')).resize({ height: 900 }).webp({ quality: 90 }).toBuffer()).toString('base64'),
  camara: { lag: -.1, atras: .9, adelante: .25, dolly: .08, lat: .25, latA: .4, latB: .06, h: 1.3, hA: .5, hB: .05, ly: 1.2, lyA: .2, roll: .045, sigue: .84, sigueY: .3, mira: .18 },
  apertura: 115, polvo: 110, pop: 1 / pulsos, alturaPop: .34, altura: [.45, 1.05], vueltasPelota: 46,
  ganchos: [
    { s: .05, entra: -1.5, y: 3.4, ancho: 2.5, px: 210, lineas: ['LA PELOTA', 'NO TOCA EL PISO'], nitida: true },
    { s: 1.25, entra: -1.3, y: 3.6, ancho: 2.7, px: 170, lineas: ['Y NO VAS A ENCONTRAR', 'DÓNDE TERMINA EL VIDEO'], col: '#e3b85a', nitida: true },
  ],
  tema: { titulo: tema.titulo, artista: 'Tacet Sin', portada: tema.portada },
};

async function hoja(tiempos, salida, opciones) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/plano.html')));
  await p.evaluate(d => pintar(d), datos);
  const comp = [];
  const t0 = Date.now();
  for (const [i, t] of tiempos.entries()) {
    await p.evaluate(([t, o]) => mostrar(0, t, o), [t, opciones]);
    const buf = await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 80 });
    comp.push({ input: await sharp(buf).resize(270, 480).toBuffer(), left: (i % 6) * 270, top: Math.floor(i / 6) * 480 });
  }
  log(`${Math.round((Date.now() - t0) / tiempos.length)} ms por cuadro`);
  await b.close();
  await sharp({ create: { width: 1620, height: Math.ceil(tiempos.length / 6) * 480, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 84 }).toFile(salida);
  log('Hoja en ' + salida);
}

fs.mkdirSync(DIR, { recursive: true });
const unCuadro = process.argv.find(a => a.startsWith('--cuadro='));
if (unCuadro) {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/plano.html')));
  await p.evaluate(d => pintar(d), datos);
  await p.evaluate(([t, o]) => mostrar(0, t, o), [+unCuadro.split('=')[1] * P, flag('--sin-texto') ? { sinTexto: true, giro: GIRO_PORTADA } : {}]);
  await p.locator('#lienzo').screenshot({ path: path.join(DIR, 'cuadro.jpg'), type: 'jpeg', quality: 90 });
  await b.close();
  process.exit(0);
}
if (flag('--velocidad')) {   // cuánto se mueve el protagonista en pantalla: muy rápido se ve doble y no se lee
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/plano.html')));
  await p.evaluate(d => pintar(d), datos);
  log(JSON.stringify(await p.evaluate(() => {
    const pant = (x, c) => { const V = mirar(c.ojo, c.a, c.arriba), M = mult(perspectiva(FOV, ASP, .1, 300), V), w_ = M[3] * x[0] + M[7] * x[1] + M[11] * x[2] + M[15]; return [(M[0] * x[0] + M[4] * x[1] + M[8] * x[2] + M[12]) / w_ * 540, (M[1] * x[0] + M[5] * x[1] + M[9] * x[2] + M[13]) / w_ * 960, w_]; };
    const vels = [], dists = [], xs = []; let fuera = 0, sin = 0;
    for (let k = 0; k < Math.round(T * 60); k++) {
      const t = k / 60, c = camara(t), c2 = camara(t + 1 / 60); let visto = false;
      for (const j of PJ) {
        if (Math.abs(delta(t, j.i)) > .3 * P) continue;
        const q = [j.pos[0], 1.2, j.pos[2]], a = pant(q, c), b2 = pant(q, c2);
        vels.push(Math.hypot(a[0] - b2[0], a[1] - b2[1]) * 60); dists.push(a[2]); xs.push(a[0]);
        if (Math.abs(a[0]) > 500) fuera++;
      }
      for (const j of PJ) { const a = pant([j.pos[0], 1.2, j.pos[2]], c); if (a[2] > 2 && a[2] < 12 && Math.abs(a[0]) < 480) visto = true; }
      if (!visto) sin++;
    }
    vels.sort((x, y) => x - y); dists.sort((x, y) => x - y);
    return { pxs_mediana: Math.round(vels[vels.length >> 1]), pxs_p95: Math.round(vels[vels.length * .95 | 0]), pxs_max: Math.round(vels[vels.length - 1]), heroe_fuera_de_cuadro: fuera + '/' + vels.length, cuadros_sin_jugador: sin, x_medio: Math.round(xs.reduce((s, x) => s + x, 0) / xs.length), x_abs: Math.round(xs.reduce((s, x) => s + Math.abs(x), 0) / xs.length), dist_heroe: [dists[0].toFixed(1), dists[dists.length >> 1].toFixed(1), dists[dists.length - 1].toFixed(1)], x_en_el_toque: PJ.map(j => { const a = pant([j.pos[0], 1.2, j.pos[2]], camara(((T0 + j.i * P) % T))); return Math.round(a[0]); }).join(' ') };
  })));
  await b.close();
  process.exit(0);
}
if (flag('--cuadros')) {
  const lista = flag('--tramo') ? [0, .3, .6, .9, 1.2, 1.5, T - 3, T - 2.6, T - 2.2, T - 1.8, T - 1.4, T - 1, T - .6, T - .3, 2, 2.6, 3.2, 3.8] : Array.from({ length: 18 }, (_, i) => datos.t0 + i * P - .2);
  await hoja(lista, path.join(DIR, 'hoja.jpg'));
  process.exit(0);
}

// ── Sonido en bucle, muestra por muestra ──
// La música no tiene fundidos: los últimos segundos del tramo se funden con los primeros, así lo que suena al final sigue
// sin salto en el arranque. Sobre eso, los dos toques de cada jugador, sobre el pulso (también envuelven en el empalme).
function sonido(entra, sale, desde) {
  const SR = 48000, X = B * 2, nT = Math.round(T * SR), nX = Math.round(X * SR);
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-ss', desde.toFixed(4), '-i', musica, '-t', (T + X + .1).toFixed(4), '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0 || r.stdout.length < (nT + nX) * 8) throw new Error('ffmpeg (música): ' + String(r.stderr).slice(-300));
  const m = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const o = new Float32Array(nT * 2);
  for (let i = 0; i < nT; i++) for (let c = 0; c < 2; c++) {
    let x = m[i * 2 + c] * .8;
    if (i < nX) { const q = i / nX * Math.PI / 2; x = (m[i * 2 + c] * Math.sin(q) + m[(nT + i) * 2 + c] * Math.cos(q)) * .8; }
    o[i * 2 + c] = x;
  }
  const porJugador = T / ORDEN.length, largoG = Math.round(.32 * SR);
  const golpe = (seg, vol) => {
    const i0 = Math.round(seg * SR);
    for (let k = 0; k < largoG; k++) {
      const u = k / SR, x = vol * (Math.exp(-26 * u) * Math.sin(2 * Math.PI * (92 + 70 * Math.exp(-34 * u)) * u) + .22 * Math.exp(-170 * u) * Math.sin(2 * Math.PI * 1900 * u));
      const j = (i0 + k) % nT; o[j * 2] += x; o[j * 2 + 1] += x;
    }
  };
  for (let i = 0; i < ORDEN.length; i++) { golpe(datos.t0 + i * porJugador, .28); golpe(datos.t0 + i * porJugador + porJugador / pulsos, .42); }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const g = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= g; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0 || !/Audio: aac/.test(spawnSync(ffmpeg, ['-hide_banner', '-i', sale], { encoding: 'utf8' }).stderr)) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

// El empalme se mide: el salto del último cuadro al primero tiene que ser como el de dos cuadros seguidos cualesquiera.
async function medirEmpalme(mp4) {
  const dir = path.join(DIR, 'empalme'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', mp4, '-vf', 'scale=270:480', '-q:v', '2', path.join(dir, '%05d.jpg')], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg (empalme): ' + r.stderr.slice(-300));
  const fotos = fs.readdirSync(dir).sort(), gris = f => sharp(path.join(dir, f)).greyscale().raw().toBuffer();
  const dif = async (a, b) => { const [x, y] = await Promise.all([gris(a), gris(b)]); let s = 0; for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]); return s / x.length; };
  const empalme = await dif(fotos[fotos.length - 1], fotos[0]);
  const normales = [];
  for (let i = 0; i + 1 < fotos.length; i += 37) normales.push(await dif(fotos[i], fotos[i + 1]));
  normales.sort((a, b) => a - b);
  const tipico = normales[normales.length >> 1], maximo = normales[normales.length - 1];
  fs.rmSync(dir, { recursive: true, force: true });
  log(`Empalme: ${empalme.toFixed(2)} · entre cuadros seguidos: típico ${tipico.toFixed(2)}, máximo ${maximo.toFixed(2)}`);
  if (empalme > maximo * 1.15) throw new Error(`el empalme salta (${empalme.toFixed(2)} contra un máximo normal de ${maximo.toFixed(2)})`);
}

const base = path.join(DIR, 'plano-base.mp4'), mp4 = path.join(DIR, 'plano.mp4'), jpg = path.join(DIR, 'plano-portada.jpg'), fotoPortada = path.join(DIR, 'plano-foto-portada.jpg');
if (!flag('--sin-render')) {
  log(`Render (${Math.round(T * 60)} cuadros a 60 fps)…`);
  await video('plano.html', datos, base, { escenas: [{ n: 0, dur: T }], fps: 60, desenfoque: true });
}
sonido(base, mp4, inicio + B - datos.t0);   // el primer toque cae justo sobre un pulso
await medirEmpalme(mp4);

// Portada: un cuadro fuerte, sin los textos del mundo (el título lo pone la plantilla de portadas)
{
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/plano.html')));
  await p.evaluate(d => pintar(d), datos);
  await p.evaluate(([t, giro]) => mostrar(0, t, { sinTexto: true, giro }), [T_PORTADA, GIRO_PORTADA]);
  // La foto sube 140 px: el botín de abajo queda por encima de la etiqueta de la portada (abajo la plantilla ya oscurece)
  const foto = await p.locator('#lienzo').screenshot({ type: 'png' });
  await sharp(foto).extract({ left: 0, top: 140, width: 1080, height: 1780 }).extend({ bottom: 140, background: '#000' }).jpeg({ quality: 95 }).toFile(fotoPortada);
  await b.close();
}
await portada({ imagen: fotoPortada, kicker: '18 jugadores · 1 pelota', titulo: 'Sin *cortes*', foco: '50% 40%' }, jpg);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
await putFile(mp4, 'social/viral/plano.mp4');
const uVid = `${MEDIA}/social/viral/plano.mp4?v=${Date.now().toString(36)}`;
const uPortada = await subirPortada(jpg, 'social/viral/plano-portada.jpg');
const desc = `${Math.round(T)} s en bucle · sin voz (pieza visual, como pide el guion): música y toques de pelota sobre el pulso · 18 poses de pase nuevas con ChatGPT y escena 3D por código (cámara continua, foco real, render a 60 cuadros con desenfoque de movimiento, salida a 30 fps) · música: ${tema.titulo}. Por el empalme, el video NO lleva la portada como primeros cuadros (se vería un destello en cada vuelta) y la tarjeta "Sonando ahora" va sin barra de progreso (se reiniciaría a la vista): en Instagram la portada se aplica aparte, y en TikTok y el Short el primer cuadro ya hace de portada, con el gancho y la pelota llegando.`;
const pieza = o => ({ decision: 'pendiente', protagonistas: ORDEN, descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-09', pieza: 'sab-plano' },
  titulo: 'Una pelota, todo el plantel, sin cortes', piezas: [
    pieza({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Plano secuencia en bucle', metodo: 'ig-reel',
      texto: `Una pelota, todo el plantel, sin cortes.\n\nSale de Ivan_Cabj_La12, pasa por los 18 y no toca el piso. Y el video no termina nunca.\n\n¿En qué vuelta encontraste el empalme?\n\n#TopSecretFC #ProClubs #EAFC` }),
    pieza({ id: 'tiktok', red: 'tiktok', formato: 'Video · Plano secuencia en bucle', metodo: 'tiktok',
      texto: `La pelota no toca el piso y este video no termina. De Ivan_Cabj_La12 a adri_cai, y vuelta a empezar. ¿En qué vuelta lo notaste? #TopSecretFC #ProClubs #EAFC #PlanoSecuencia` }),
    pieza({ id: 'yt-short', red: 'youtube', formato: 'Short · Plano secuencia en bucle', metodo: 'youtube',
      titulo: 'Una pelota, 18 jugadores, sin cortes: Top Secret FC en Pro Clubs',
      texto: `Los 18 del plantel, de Ivan_Cabj_La12 a adri_cai, en un solo plano. Cuando creas que terminó, fijate si ya empezó de nuevo. #Shorts #ProClubs #EAFC` }),
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
