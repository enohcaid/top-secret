#!/usr/bin/env node
// "POV: se te cae el internet en la final" (idea sab-pov2 del guion viral-guiones-2026-11-09): el video dentro del video.
// La tele de la escena muestra una jugada real y las fallas de imagen se hacen por código, al pulso del tema.
//
// Decisiones (producción sin supervisión):
//   - La tele muestra una jugada REAL (vivo del 3/11, fuentes/goles/vvivo-2026-11-03): NicoBJ_96 encarando al arquero, recortada
//     para que se lea como mano a mano y deje afuera HUD, radar y carteles. No hay ningún mano a mano limpio en los goles
//     guardados, y los del 22/10 ya los usó "¿Dónde está la pelota?".
//   - Marcador, minuto y resultado final son ficción de la escena, dibujados por código: no es un partido, no afirma un dato.
//   - Las escenas con tele NO pasan por Canva: una cámara movida obligaría a seguir la pantalla. Foto fija + cámara por código;
//     del clip de Canva del sillón se usa solo la mitad de abajo (las manos), con la unión en el piso.
//   - Sin voz en off (lo pide el guion). La línea de los auriculares es un personaje, con otra voz; VOZ no se toca.
//   - Cuenta "UNO, DOS, OCHO, DIEZ": chiste propio sobre el "contá hasta diez" de desenchufar el router; no está en el guion.
//   - Sin Facebook ni X: no están en las redes del guion.
//
//   node scripts/social/piezas/2026-11-09-sab-pov2.mjs
//     --solo-imagenes   genera las imágenes, para revisarlas antes de gastar clips de Canva
//     --solo-clips      además, los clips de Canva
//     --cuadros         hoja de cuadros clave en fuentes/redes/viral/sab-pov2/hoja.jpg, sin renderizar
//     --cuadro=<t>      un cuadro en cuadro.jpg
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
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { animar, cuadros } from '../lib/clip.mjs';
import { video, archivo } from '../lib/render.mjs';
import { narrar } from '../lib/voz.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/sab-pov2');
const FUENTE = path.join(ROOT, 'fuentes/goles/vvivo-2026-11-03/source.mp4');
const ID = 'viral-sab-pov2-2026-11-09';
const JUGADOR = 'NicoBJ_96';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [pov2] ${m}`);
const flag = f => process.argv.includes(f);
const ESCUDO = path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png');

const pedido = (escena, refs) => `Creá una imagen fotorrealista: un CUADRO DE VIDEO VERTICAL en PRIMERA PERSONA, desde los ojos de un pibe argentino en su casa de noche, como una GoPro en la frente. Parece un registro casero real, no una publicidad.

═══ LA ESCENA (manda) ═══
${escena}

═══ REFERENCIAS ADJUNTAS ═══
${refs}

═══ LOOK ═══
- Casa común de clase media de Buenos Aires, de noche: pared lisa, algo de desorden creíble (una taza, un cargador, ropa en una silla). Nada de setup gamer con luces LED de colores.
- Luz baja y real: una lámpara cálida lejos y sombras suaves. Gran angular de cámara de acción, leve ruido digital.
- Manos y brazos reales: cinco dedos bien formados, proporciones correctas, buzo liso gris oscuro sin estampas.

═══ FORMATO ═══
VERTICAL 9:16, más alto que ancho.

SIN TEXTO LEGIBLE en ninguna parte. Sin marcas ni logos de ningún fabricante: ni en la tele, ni en el joystick, ni en el router. Sin marcadores, sin títulos, sin watermarks.`;

const TELE = 'La tele está APAGADA: la pantalla es un rectángulo NEGRO MATE y uniforme de borde a borde, sin reflejos, sin brillo, sin ningún contenido. Marco negro fino recto, sin ninguna marca.';
const TOMAS = [
  { id: '1-sillon', adjuntos: [ESCUDO],
    refs: '- "Clean logo Dorado": el escudo real del club, un espía con sombrero y anteojos. Va SOLO en el banderín de la escena, copiado tal cual y relleno de dorado.',
    escena: `Sentado en el sillón, mirando de frente a una tele grande de 55 pulgadas colgada en la pared. La tele queda DE FRENTE Y DERECHA a la cámara, centrada, en el tercio medio-alto de la imagen, y ocupa casi todo el ancho del cuadro, sin tocar los bordes. ${TELE} Abajo, en el tercio inferior, en primer plano y bien nítidas, las dos manos propias sosteniendo un joystick de consola genérico negro, sin ningún logo, los pulgares sobre las palancas; se ven las rodillas con un jogging oscuro y el borde del sillón. Las manos NO tapan la tele. En la pared, a un costado de la tele, un banderín negro chico con el escudo del adjunto.` },
  { id: '2-pasillo', adjuntos: [],
    refs: 'Sin adjuntos.',
    escena: 'Corriendo por el pasillo oscuro de la casa, en movimiento, con la cámara algo torcida y desenfoque de movimiento en los bordes. Al fondo, una puerta abierta con luz tenue y un mueble bajo. En el borde inferior del cuadro, una mano propia extendida hacia adelante, con el brazo en buzo gris oscuro. Una zapatilla tirada en el piso, una bicicleta o una silla contra la pared.' },
  { id: '3-router', adjuntos: [],
    refs: 'Sin adjuntos.',
    escena: 'Primer plano sobre un estante de madera: un router de internet genérico negro, sin ninguna marca ni letra, con dos antenas y una fila horizontal de CINCO lucecitas LED en el frente, todas ROJAS y bien visibles, en el centro de la imagen. Desde abajo a la derecha entra la mano propia sosteniendo un cable de red amarillo desconectado, con la ficha de plástico en primer plano, a punto de enchufarlo. El resto en penumbra, iluminado apenas por el rojo de las luces.' },
];
// Se hace después de la primera, con ella adjunta: tiene que ser el mismo living.
const VUELTA = sillon => ({ id: '4-vuelta', adjuntos: [sillon],
  refs: '- La imagen adjunta es el MISMO living y la MISMA tele, vistos desde el sillón. Mantené la pared, el banderín y la luz.',
  escena: `De pie en la puerta del living, recién llegado, mirando la tele de frente desde más lejos: la tele queda DE FRENTE Y DERECHA a la cámara, en el centro de la imagen, y ocupa cerca del 60 % del ancho del cuadro. ${TELE} Se ve el sillón vacío de espaldas en el medio, con el joystick tirado encima. En el borde inferior, una mano propia caída al costado sosteniendo un cable de red amarillo que cuelga.` });

fs.mkdirSync(DIR, { recursive: true });
log('Imágenes (ChatGPT)…');
const imgs = {};
try {
  for (const t of TOMAS) {
    imgs[t.id] = await generarImagen({ id: t.id, carpeta: DIR, vertical: true, adjuntos: t.adjuntos, promptCompleto: pedido(t.escena, t.refs) });
    log(`  ${t.id} ✓`);
  }
  const v = VUELTA(imgs['1-sillon']);
  imgs[v.id] = await generarImagen({ id: v.id, carpeta: DIR, vertical: true, adjuntos: v.adjuntos, promptCompleto: pedido(v.escena, v.refs) });
  log(`  ${v.id} ✓`);
} finally { await cerrar(); }
if (flag('--solo-imagenes')) { log('Listo (solo imágenes).'); process.exit(0); }

// ── Fotos base: el banderín lleva el escudo real (ChatGPT lo dibuja de contorno) ──
async function conEscudo(img, caja, sale) {
  if (fs.existsSync(sale)) return sale;
  const [x, y, w, h, alto] = caja;
  const parche = await sharp({ create: { width: w, height: h, channels: 3, background: '#0b0b0c' } }).png().toBuffer();
  const esc = await sharp(ESCUDO).resize({ height: alto }).toBuffer(), m = await sharp(esc).metadata();
  const compuesta = await sharp(img).composite([{ input: parche, left: x, top: y }, { input: esc, left: Math.round(x + (w - m.width) / 2), top: Math.round(y + (h - alto) / 2) }]).png().toBuffer();
  await sharp(compuesta).resize(1080, 1920, { fit: 'fill' }).jpeg({ quality: 95 }).toFile(sale);
  return sale;
}
const fotoSillon = await conEscudo(imgs['1-sillon'], [176, 412, 82, 92, 80], path.join(DIR, 'base-sillon.jpg'));
const fotoVuelta = await conEscudo(imgs['4-vuelta'], [302, 406, 64, 68, 58], path.join(DIR, 'base-vuelta.jpg'));

// ── La jugada de la tele, a 60 cuadros ──
{
  const d = path.join(DIR, 'partido');
  if (!fs.existsSync(path.join(d, '0001.jpg'))) {
    fs.mkdirSync(d, { recursive: true });
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '1298.7', '-i', FUENTE, '-t', '2.95', '-vf', 'fps=60,scale=1920:1080:flags=lanczos,unsharp=5:5:0.6:5:5:0', '-q:v', '3', path.join(d, '%04d.jpg')], { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  }
}

log('Clips (Canva imagen a video)…');
const clips = {};
for (const [id, mov] of Object.entries({
  '3-router': 'Cámara en mano muy cercana, respiración agitada, leve temblor. La mano acerca la ficha del cable amarillo hacia el router. Las luces rojas parpadean. Las antenas quietas.',
  '2-pasillo': 'Cámara en mano corriendo hacia adelante por el pasillo, avance rápido hacia la puerta del fondo, sacudida de cada paso, la mano se balancea.',
  '1-sillon': 'Cámara completamente fija, sin ningún movimiento de cámara. Solo se mueven los pulgares sobre las palancas del joystick y los dedos aprietan botones, nerviosos y rápidos. La pantalla de la tele sigue negra. Nada más se mueve.',
})) {
  const c = cuadros(animar(imgs[id], mov, { quietos: false }));
  clips[id] = { ...c, disco: c.dir, dir: archivo(c.dir) };
  log(`  ${id} ✓ (${c.n} cuadros)`);
}
if (flag('--solo-clips')) { log('Listo (solo clips).'); process.exit(0); }

// A partir del cuadro ~50 Canva le hace crecer una cámara de fotos gigante al costado del router: se usa solo lo anterior, ida y vuelta.
const ROUTER_LIMPIOS = 46;
clips['3-router'].n = ROUTER_LIMPIOS;
// Dónde están las luces rojas en cada cuadro del clip del router (Canva mueve la cámara y hay que seguirlas)
async function lucesDelRouter(c) {
  const js = path.join(DIR, 'router-luces.json');
  if (fs.existsSync(js)) return JSON.parse(fs.readFileSync(js, 'utf8'));
  const sal = []; let prev = [545, 971];
  for (let n = 1; n <= ROUTER_LIMPIOS; n++) {
    const { data, info } = await sharp(path.join(c.disco, `${String(n).padStart(4, '0')}.jpg`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    // Núcleos de las luces (casi blancos de tan rojos): peine de 5 dientes separados 41 px, así da igual si el enchufe tapa la última
    const esLuz = (x, y) => { const i = (y * info.width + x) * 3; return data[i] > 225 && data[i + 1] > 40 && data[i + 1] < 215 && data[i + 2] < 215 && data[i] - data[i + 2] > 25; };
    const filas = new Array(info.height).fill(0);
    for (let y = 800; y < 1020; y++) for (let x = 300; x < 900; x++) if (esLuz(x, y)) filas[y]++;
    let yBest = -1, fBest = 0;
    for (let y = 806; y < 1014; y++) { const f = filas.slice(y - 6, y + 7).reduce((a, b) => a + b, 0); if (f > fBest) { fBest = f; yBest = y; } }
    if (yBest > 0) {
      const col = new Array(info.width).fill(0);
      for (let y = yBest - 8; y <= yBest + 8; y++) for (let x = 300; x < 900; x++) if (esLuz(x, y)) col[x]++;
      let xBest = -1, cBest = 0;
      for (let x = 400; x < 780; x++) { let c = 0; for (let i = -2; i <= 2; i++) for (let d = -5; d <= 5; d++) c += col[x + i * 41 + d] || 0; if (c > cBest) { cBest = c; xBest = x; } }
      if (xBest > 0) prev = [xBest, yBest];
    }
    sal.push(prev);
  }
  fs.writeFileSync(js, JSON.stringify(sal));
  return sal;
}
clips['3-router'].luces = await lucesDelRouter(clips['3-router']);

// ── Música: todo cae sobre el pulso del tema ──
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
const aB = s => Math.max(1, Math.round(s / B)) * B;

const N = Math.max(7, Math.round(4.6 / B));   // pulsos de falla: el circulito ocupa los últimos 3
const T = { falla: aB(5.2) };
T.pasillo = T.falla + N * B;
T.router = T.pasillo + aB(2.6);
T.vuelta = T.router + aB(5.8);
T.cierre = T.vuelta + aB(3.2);
const total = T.cierre + aB(3.6);
log(`Tema: ${tema.titulo} · beat ${B.toFixed(2)} s (${Math.round(60 / B)} BPM) · ${N} pulsos de falla · total ${total.toFixed(1)} s`);

// Voz del compañero en los auriculares: un personaje dentro de la escena, no una narración (la voz del club no se toca).
const COMPA = { voz: 'es-AR-TomasNeural', rate: '+8%', pitch: '+0Hz' };
const lineas = [
  { texto: '¿Qué hacés?', en: T.pasillo + .35, corte: [.42, .66], partes: ['¿Qué ha', '…cés?'] },
  { texto: '¡Pateá! ¡Pateá!', en: T.router + B * 1.5, corte: [.2, .36], partes: ['¡Pa…', 'teá!'] },
].map(l => ({ ...l, voz: narrar(l.texto, DIR, COMPA) }));

const n = (x, f = 0) => T.falla + x * B + f;
const conteo = [0, 1, 2, 3].map(i => T.router + aB(2.4) + i * B);
const TXT = (desde, hasta, html, y, tam, extra = {}) => ({ desde, hasta, html, y, tam, ...extra });
const datos = {
  T, B, pulsosFalla: N, escudo: archivo(ESCUDO),
  sillon: archivo(fotoSillon), vuelta: archivo(fotoVuelta),
  partido: archivo(path.join(DIR, 'partido')), partidoN: fs.readdirSync(path.join(DIR, 'partido')).length,
  k0: 30, kFalla: 100, kFreeze: 128, min: "88'",
  // [cuadro, centro x, centro y, ancho de la ventana] en píxeles del cuadro de 1920x1080: fuera quedan el HUD y el radar
  camJugada: [[1, 720, 500, 1300], [70, 620, 470, 1050], [118, 500, 470, 820], [177, 500, 470, 820]],
  final: { titulo: 'FINAL DEL PARTIDO', marcador: '1-2', abajo: 'PERDISTE' },
  quadSillon: [[283, 295], [930, 266], [921, 638], [288, 638]].map(([x, y]) => [x * 1080 / 941, y * 1920 / 1672]),
  quadVuelta: [[399, 323], [873, 310], [870, 583], [401, 583]].map(([x, y]) => [x * 1080 / 941, y * 1920 / 1672]),
  clipSillon: clips['1-sillon'], clipPasillo: clips['2-pasillo'], clipRouter: clips['3-router'],
  ledPaso: 41, ledDx: 0, ledBaja: 28, ledReflejo: 112, conteo,
  luzVerde: [conteo[0], conteo[1], conteo[2], conteo[3], conteo[3] + B / 2],
  relojDe: 88 * 60 + 14, relojA: 92 * 60 + 40,
  textos: [
    TXT(0, T.falla * .46, 'POV: <b>MINUTO 88.</b><br>EMPATE.', 880, 172, { de: 1.15 }),
    TXT(T.falla * .46, T.falla, 'VAS SOLO<br>AL ARCO.', 1090, 200),
    TXT(n(1), n(3), 'NO.', 1160, 260),
    TXT(n(3), n(N - 3), 'NO, NO, NO.', 1190, 190),
    TXT(n(N - 3), T.pasillo, 'AHORA NO.', 1180, 230, { grito: true }),
    TXT(T.pasillo + .1, T.router, 'AL ROUTER.', 610, 140),
    TXT(T.router + .1, T.router + aB(1.1), 'DESENCHUFÁ.', 560, 150),
    TXT(T.router + aB(1.1), conteo[0], 'CONTÁ<br>HASTA DIEZ.', 500, 150),
    TXT(conteo[0], conteo[1], 'UNO.', 530, 240), TXT(conteo[1], conteo[2], 'DOS.', 530, 240),
    TXT(conteo[2], conteo[3], 'OCHO.', 530, 240), TXT(conteo[3], T.vuelta, 'DIEZ.', 530, 240),
  ],
  chat: lineas.map(l => ({ desde: l.en, hasta: l.en + l.voz.dur + .25, cortes: [[l.corte[0] * l.voz.dur, l.corte[1] * l.voz.dur]], linea: [[0, l.partes[0]], [l.corte[1] * l.voz.dur, l.partes[1]]] })),
  cierre: 'Mandáselo al que siempre<br>dice que <b>se le cortó.</b>',
};

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/pov2.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}
if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [];
  const M = [.3, T.falla * .3, T.falla * .7, T.falla - .05, n(0, .06), n(1, .06), n(2, .06), n(2.6), n(4, .06), n(N - 3, .08), n(N - 1), T.pasillo + .05, T.pasillo + .6, T.pasillo + 1.6, T.router + .06, T.router + 1.2, conteo[0] + .1, conteo[2] + .1, conteo[3] + .3, T.vuelta + .1, T.vuelta + .6, T.vuelta + B * 2.5, T.cierre + .9, total - .1];
  const cols = 8, cw = 240, ch = 427;
  for (const [i, t] of M.entries()) {
    await p.evaluate(t => mostrar(0, t), t);
    await p.waitForTimeout(30);
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
  const { b, p } = await abrir();
  await p.evaluate(t => mostrar(0, t), Number(unCuadro.split('=')[1]));
  await p.waitForTimeout(30);
  await p.locator('#lienzo').screenshot({ path: path.join(DIR, 'cuadro.jpg'), type: 'jpeg', quality: 90 });
  await b.close();
  process.exit(0);
}

// ── Sonido: la música del render se corta de verdad (granos, huecos, silencio) + efectos + la voz en los auriculares ──
function sonido(entra, sale) {
  const SR = 48000;
  const dec = f => {
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', f, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
    if (r.status !== 0) throw new Error('ffmpeg (audio): ' + String(r.stderr).slice(-300));
    return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  };
  const o = dec(entra), L = o.length >> 1;
  const mu = new Float32Array(o.length);
  // Música: normal hasta la falla; en cada pulso un grano que se repite y un hueco, cada vez más largos; después nada
  const finFalla = T.falla + (N - 3) * B;
  for (let k = 0; k < L; k++) {
    const seg = k / SR; let fuente = k, g = 1;
    if (seg >= T.falla && seg < finFalla) {
      const tau = seg - T.falla, b = Math.floor(tau / B), f = tau / B - b, nivel = b / Math.max(1, N - 4);
      if (f < .8 - nivel * .35) { const ini = Math.round((T.falla + b * B) * SR), m = Math.round((.07 - .03 * nivel) * SR); fuente = ini + (k - ini) % m; g = 1 - .25 * nivel; }
      else g = 0;
    } else if (seg >= finFalla && seg < T.cierre) g = 0;
    mu[k * 2] = (o[fuente * 2] || 0) * g; mu[k * 2 + 1] = (o[fuente * 2 + 1] || 0) * g;
  }
  let h = 12345; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const fx = new Float32Array(L);
  const suma = (seg, dur, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < dur * SR && i0 + k < L; k++) fx[i0 + k] += f(k / SR); };
  const golpe = (seg, vol) => suma(seg, .6, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (48 + 60 * Math.exp(-30 * u)) * u) + .25 * Math.exp(-60 * u) * azar()));
  const barrido = (seg, dur, vol) => { let a = 0; suma(seg, dur, u => { a += .1 * (azar() - a); return vol * Math.pow(Math.sin(Math.PI * u / dur), 2) * a * 3; }); };
  const blip = (seg, frec, dur, vol) => suma(seg, dur, u => vol * Math.sign(Math.sin(2 * Math.PI * frec * u)) * Math.exp(-u * 18));
  const paso = (seg, vol) => suma(seg, .16, u => vol * Math.exp(-u * 30) * Math.sin(2 * Math.PI * (70 + 40 * Math.exp(-u * 40)) * u));
  const clic = (seg, vol) => suma(seg, .03, u => vol * Math.exp(-u * 220) * azar());
  const ping = (seg, frec, vol) => suma(seg, .22, u => vol * Math.exp(-u * 14) * Math.sin(2 * Math.PI * frec * u));
  // Hinchada de la tele: sube al acercarse al arco y se corta con la imagen
  { let a = 0, b = 0; suma(0, T.falla + 2 * B, u => {
    a += .05 * (azar() - a); b += .004 * (azar() - b);
    const salta = u > T.falla ? (Math.floor((u - T.falla) / .11) % 2 ? 0 : 1) : 1;
    return .2 * (a * 2.4 + b * 6) * (1 + .14 * Math.sin(u * 3.1)) * salta * Math.min(1, u / .3) * (1 + Math.min(.8, u / T.falla * .8));
  }); }
  for (let i = 0; i < T.falla / (B / 2); i++) clic(i * B / 2 + (i % 3 ? .02 : 0), .16);   // los botones del joystick
  for (let b = 0; b < N - 3; b++) { blip(n(b), 900 + (b % 3) * 650, .09, .14); golpe(n(b), .42); }
  barrido(T.pasillo - .08, .3, .55); golpe(T.pasillo, .55);
  for (let i = 0; T.pasillo + .1 + i * B / 2 < T.router; i++) paso(T.pasillo + .1 + i * B / 2, .6);
  barrido(T.router - .08, .28, .5); golpe(T.router, .4);
  clic(T.router + aB(1.1), .8);   // sale el cable
  conteo.forEach((c, i) => { ping(c, 660 + i * 170, .2); golpe(c, .26); });
  ping(conteo[3] + B / 2, 1320, .22); clic(conteo[3] + B / 2 + .1, .8);
  barrido(T.vuelta - .08, .28, .5);
  { // El pitazo final, por la tele
    const pit = T.vuelta + B * 2; golpe(pit, .75);
    for (const [d, l] of [[0, .32], [.42, .32], [.84, .85]]) suma(pit + d, l, u => .13 * Math.min(1, u / .012) * Math.min(1, (l - u) / .03) * (Math.sin(2 * Math.PI * 3050 * u + 3 * Math.sin(2 * Math.PI * 38 * u)) + .5 * Math.sin(2 * Math.PI * 3480 * u)));
  }
  golpe(T.cierre, .55);
  // La voz en los auriculares: filtro de teléfono y un corte en el medio
  for (const l of lineas) {
    const v = dec(l.voz.archivo), m = v.length >> 1, i0 = Math.round(l.en * SR);
    let lp = 0, hp = 0;
    for (let k = 0; k < m && i0 + k < L; k++) {
      const u = k / m;
      lp += .42 * (v[k * 2] - lp); hp += .06 * (lp - hp);
      const y = Math.max(-.5, Math.min(.5, (lp - hp) * 1.7));
      if (u < l.corte[0] || u >= l.corte[1]) fx[i0 + k] += y;
    }
    blip(l.en + l.corte[0] * l.voz.dur, 1200, .05, .05);
    blip(l.en + l.corte[1] * l.voz.dur - .03, 700, .05, .05);
  }
  const fin = new Float32Array(o.length);
  for (let k = 0; k < L; k++) { fin[k * 2] = mu[k * 2] * .85 + fx[k]; fin[k * 2 + 1] = mu[k * 2 + 1] * .85 + fx[k]; }
  let pico = 0; for (const x of fin) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < fin.length; i++) fin[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(fin.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

const base = path.join(DIR, 'pov2-base.mp4'), mezclado = path.join(DIR, 'pov2-sonido.mp4'), mp4 = path.join(DIR, 'pov2.mp4'), jpg = path.join(DIR, 'pov2-portada.jpg'), fotoPortada = path.join(DIR, 'pov2-foto-portada.jpg');
if (!flag('--sin-render')) {
  log(`Render (${Math.round(total * 60)} cuadros a 60 fps)…`);
  await video('pov2.html', datos, base, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica, musicaDesde });
}
sonido(base, mezclado);

// Portada: el mano a mano trabado, con el circulito
{
  const { b, p } = await abrir();
  await p.evaluate(t => { D.paraPortada = true; return mostrar(0, t, { sinTexto: true }); }, T.pasillo - .1);
  await p.waitForTimeout(30);
  await p.locator('#lienzo').screenshot({ path: fotoPortada, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: fotoPortada, kicker: 'POV · Solo al arco', titulo: 'Y *se traba.*', dato: "88'", foco: '50% 36%' }, jpg);
conPortada(mezclado, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
await putFile(mp4, 'social/viral/pov2.mp4');
const uVid = `${MEDIA}/social/viral/pov2.mp4?v=${Date.now().toString(36)}`;
const uPortada = await subirPortada(jpg, 'social/viral/pov2-portada.jpg');
const desc = `${Math.round(total)} s · sin voz en off (como pide el guion: la tensión la dan los textos; un narrador rompería la primera persona) · única voz: el compañero en los auriculares con el audio cortado, la línea del guion hecha con una voz sintética distinta de la del club porque es un personaje · escenas con ChatGPT; manos, pasillo y router animados con Canva · la tele muestra una jugada real de ${JUGADOR} (vivo del 3/11, recortada, sin el HUD real) con fallas por código al pulso; el 88', el 1-1 y el 1-2 son ficción de la escena, no datos de un partido · música: ${tema.titulo}, cortada junto con la imagen.`;
const P = o => ({ decision: 'pendiente', protagonistas: [JUGADOR], descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-09', pieza: 'sab-pov2' },
  titulo: 'POV: se te cae el internet en la final', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · POV se corta internet', metodo: 'ig-reel',
      texto: `Minuto 88, mano a mano, y se traba.\n\nLa jugada de la tele es real, de ${JUGADOR}. El corte, por suerte, no.\n\n¿A quién le pasó justo ahí? Mandáselo.\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · POV se corta internet', metodo: 'tiktok',
      texto: `POV: solo al arco y aparece el circulito. Todos conocemos a uno que le pasó justo ahí. Mandáselo. La jugada es de ${JUGADOR}. #TopSecretFC #ProClubs #EAFC #pov` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · POV se corta internet', metodo: 'youtube',
      titulo: 'POV: se te corta internet en el minuto 88 | Pro Clubs EA FC',
      texto: `Mano a mano, empate, y la imagen se traba. La jugada de la tele es real, de ${JUGADOR}; el corte es actuado. #Shorts #ProClubs #EAFC` }),
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
