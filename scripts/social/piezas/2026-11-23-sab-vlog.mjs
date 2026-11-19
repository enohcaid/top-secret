#!/usr/bin/env node
// "Un día en la vida: noche de triple fecha" (idea sab-vlog del guion viral-guiones-2026-11-23): un video de "un día en mi
// vida" filmado con el celular, con la hora grande en cada toma, de 22:20 a 00:30.
//
// Decisiones (producción sin supervisión):
//   - La noche es REAL: jueves 12/11, la única triple fecha que calza toma por toma con el guion (seed_matches.js):
//     22:30 VPUG San Miguel eSports 3-2 (gol, puño), 23:00 Espacio Gamer ALL BOYS 1-1 (empate, joystick en la frente),
//     23:30 Espacio Gamer Cambaceres 0-1 (el último ataque). Los resultados van chicos en pantalla, con su liga.
//   - "Tu humor" (sale el 21/11) ya usó el 3-2 a San Miguel y sus tres goles del vivo: acá la tele muestra juego del vivo
//     de esa noche FUERA de esas ventanas de gol (y desenfocado: el foco del celular está en el pibe).
//   - Cierre: el guion dice "Mañana, otra jornada", pero el viernes 13 no hubo partido (la siguiente fue el lunes 16, VPN):
//     queda "El lunes, otra jornada", que es cierto. Tampoco se dice "tres veces este mes" (hubo cinco triples).
//   - Las tomas con la tele (cuarto, gol, empate, apagado) son foto fija + cámara en mano por código: la pantalla es negra en
//     la foto y la jugada entra por homografía (como pov2); Canva solo en las tomas sin tele (mesa, taza, manos).
//   - Mismo cuarto y misma luz en todas: la primera imagen va adjunta a las demás.
//   - El pibe no tiene cara (de espaldas o tapada) ni es un jugador identificado: protagonistas = [].
//   - Voz de Elena (VOZ), una frase corta por toma; los horarios se dicen como se dicen ("diez y media"), en pantalla 22:30.
//
//   node scripts/social/piezas/2026-11-23-sab-vlog.mjs
//     --solo-imagenes   genera las imágenes, para revisarlas antes de gastar clips de Canva
//     --solo-clips      además, los clips de Canva
//     --cuadros         hoja de cuadros clave en fuentes/redes/viral/sab-vlog/hoja.jpg, sin renderizar
//     --cuadro=<t>      un cuadro en cuadro.jpg
//     --sin-lote        renderiza todo pero no sube ni carga el lote
//     --sin-render      reusa el video base: rehace sonido, voz y portada, sube y carga el lote
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
import { narracion, agregarVoz } from '../lib/voz.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/sab-vlog');
const VOD = path.join(ROOT, 'fuentes/goles/vvivo-2026-11-12/source.mp4');
const ID = 'viral-sab-vlog-2026-11-23';
const NOCHE = '2026-11-12';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [vlog] ${m}`);
const flag = f => process.argv.includes(f);
const ESCUDO = path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png');

// ── Los partidos de esa noche, de seed_matches.js (nada escrito a mano) ──
const { SEED_MATCHES } = await import(archivo(path.join(ROOT, 'seed_matches.js')));
const noche = SEED_MATCHES.filter(m => m.date === NOCHE).map(m => ({ ...m, hora: (m.notes.match(/(\d\d:\d\d) hs/) || [])[1] }))
  .sort((a, b) => a.hora.localeCompare(b.hora));
if (noche.length !== 3 || noche.map(m => m.hora).join() !== '22:30,23:00,23:30') throw new Error('La noche del 12/11 no es la triple fecha esperada: revisar seed_matches.js');
const LIGA = l => l === '11x11' ? 'Espacio Gamer' : l;
const PARTIDOS = noche.map(m => ({ hora: m.hora, liga: LIGA(m.league), rival: m.rival, res: m.match_result }));
const [g1, g2, g3] = PARTIDOS.map(p => p.res.split('-').map(Number));
if (!(g1[0] > g1[1] && g2[0] === g2[1] && g3[0] < g3[1]))
  throw new Error('Los resultados no son ganado / empate / perdido: el guion de voz no calza');

// ── Imágenes (ChatGPT): un cuadro de video de celular, siempre el mismo cuarto y la misma luz ──
const CUARTO = `El cuarto (SIEMPRE el mismo): living chico de un departamento de Buenos Aires, de noche. Pared lisa gris cálido; una tele de 50 pulgadas sobre un mueble bajo de madera clara; al lado de la tele una consola genérica blanca parada, sin ninguna marca; frente a la tele, una silla de escritorio negra simple con ruedas; a la derecha de la silla una mesita baja redonda de madera y una lámpara de pie con pantalla de tela de luz cálida tenue; una planta en un rincón. Luz: solo esa lámpara cálida baja y la luz fría de la tele.`;
const PIBE = 'El pibe: unos 25 años, pelo corto oscuro, buzo negro liso con capucha bajada, jogging gris oscuro, auriculares negros genéricos con micrófono. NUNCA se le ve la cara: está de espaldas o la tiene tapada; ni perfil, ni reflejo.';
const TELE = 'La tele está APAGADA: la pantalla es un rectángulo NEGRO MATE y uniforme de borde a borde, sin reflejos, sin brillo, sin ningún contenido. Marco negro fino recto, sin ninguna marca. La tele se ve DE FRENTE Y DERECHA (sin perspectiva torcida) y entera, sin que nada la tape.';
const pedido = (escena, conRef) => `Creá una imagen fotorrealista: un CUADRO DE VIDEO VERTICAL filmado con un celular, de un video casero estilo "un día en mi vida" de un pibe argentino que juega a la play de noche. Lo filma un amigo con el celular en la mano. Parece un registro casero real, no una publicidad ni una foto de estudio.

═══ LA TOMA (manda) ═══
${escena}

═══ EL LUGAR Y LA PERSONA ═══
${CUARTO}
${PIBE}
${conRef ? '- La imagen adjunta es EL MISMO cuarto, filmado la misma noche: mantené la pared, los muebles, la tele, la silla, la lámpara, la luz y la ropa del pibe.' : ''}

═══ LOOK ═══
- Cámara de celular: lente principal, leve ruido digital de noche, algo de desenfoque en los bordes, exposición un poco alta en las luces.
- Nada de setup gamer con luces LED de colores. Desorden creíble y poco.
- Manos reales: cinco dedos bien formados, proporciones correctas.
- Joystick: negro genérico, sin ningún logo ni letra.

═══ FORMATO ═══
VERTICAL 9:16, más alto que ancho.

SIN TEXTO LEGIBLE en ninguna parte. Sin marcas ni logos de ningún fabricante. Sin marcadores, sin títulos, sin watermarks.`;

const TOMAS = [
  { id: '1-cuarto', escena: `22:20, antes del primer partido. Toma desde la puerta del cuarto, a unos 3 metros, a la altura del pecho: el pibe DE ESPALDAS, parado detrás de la silla, la acomoda frente a la tele con las dos manos en el respaldo; los auriculares colgados del cuello. En la mesita, un vaso de agua lleno y una taza negra lisa. La tele en el tercio medio-alto, centrada, ocupando cerca del 55 % del ancho del cuadro. ${TELE}` },
];
const CON_REF = [
  { id: '2-mesa', escena: 'Primer plano de la mesita, sin la tele en cuadro: un vaso de vidrio con agua y gotitas, el joystick negro enchufado a un cable cargando (una luz blanca suave en su frente), los auriculares negros con micrófono apoyados al lado. Fondo desenfocado: la pared y el resplandor tibio de la lámpara. Toma con el celular a 40 cm, un poco desde arriba.' },
  { id: '3-gol', escena: `22:30, primer partido. Toma desde atrás de la silla, a unos 2 metros y a la altura de los hombros: el pibe sentado DE ESPALDAS, auriculares puestos, levanta el puño derecho bien alto festejando un gol, el joystick en la mano izquierda. La tele en el tercio medio-alto, centrada, ocupando cerca del 60 % del ancho del cuadro, a la izquierda del puño, sin que el puño ni la cabeza la tapen. ${TELE}` },
  { id: '4-empate', escena: `23:00, segundo partido. Toma desde atrás y un poco a la derecha de la silla, a 1,5 metros: el pibe sentado DE ESPALDAS, inclinado hacia adelante con los codos en las rodillas, apoya el joystick contra la frente con las dos manos, la cabeza gacha; de su cara no se ve nada. La tele en el tercio superior, a la izquierda de la cabeza, ocupando cerca del 50 % del ancho del cuadro, sin que la cabeza la tape. ${TELE}` },
  { id: '5-taza', escena: 'Primer plano de la mesita, la tele fuera de cuadro: una taza negra lisa de cerámica, VACÍA (se ve el fondo con un resto seco de café), al lado del vaso ya vacío. La luz fría azulada de la tele le pega de costado. Detrás, muy desenfocado, el respaldo de la silla y el hombro del pibe de espaldas. Toma con el celular a 50 cm.' },
  // v2: en la primera salió sentado en el sillón con la silla vacía adelante; ahora el encuadre es cerrado y sin muebles
  { id: '6-manos', escena: 'Primer plano MUY CERRADO por encima del hombro derecho del pibe, que está SENTADO EN LA SILLA DE ESCRITORIO NEGRA (se ve el borde del respaldo de malla negra y el hombro del buzo negro): sus dos manos aprietan el joystick, los pulgares tensos sobre las palancas, los nudillos marcados, los antebrazos en tensión. Las manos y el joystick ocupan el centro del cuadro. La luz fría azulada de la tele les pega de frente. Arriba del cuadro, la tele totalmente desenfocada, solo un resplandor verde y azul sin forma ni nada legible. En cuadro NO aparece ningún otro mueble: ni otra silla, ni sillón, ni la mesita.' },
  { id: '7-apagado', escena: `00:30, terminó la noche. MISMO encuadre que la imagen adjunta (desde la puerta, a 3 metros): la silla vacía y un poco girada, el joystick tirado sobre el asiento, los auriculares colgados del respaldo, en la mesita la taza y el vaso vacíos. Nadie en cuadro. La lámpara tenue sigue prendida. La tele en el tercio medio-alto, centrada, ocupando cerca del 55 % del ancho del cuadro. ${TELE}` },
];

fs.mkdirSync(DIR, { recursive: true });
log('Imágenes (ChatGPT)…');
const imgs = {};
try {
  for (const t of TOMAS) {
    imgs[t.id] = await generarImagen({ id: t.id, carpeta: DIR, vertical: true, adjuntos: [], promptCompleto: pedido(t.escena, false) });
    log(`  ${t.id} ✓`);
  }
  for (const t of CON_REF) {
    imgs[t.id] = await generarImagen({ id: t.id, carpeta: DIR, vertical: true, adjuntos: [imgs['1-cuarto']], promptCompleto: pedido(t.escena, true) });
    log(`  ${t.id} ✓`);
  }
} finally { await cerrar(); }
if (flag('--solo-imagenes')) { log('Listo (solo imágenes).'); process.exit(0); }

// ── Fotos base 1080x1920 (recorte, sin deformar) y dónde está la tele en cada una ──
const CON_TELE = ['1-cuarto', '3-gol', '4-empate', '7-apagado'];
const base = {};
for (const id of CON_TELE) {
  base[id] = path.join(DIR, `base-${id}.jpg`);
  if (!fs.existsSync(base[id])) await sharp(imgs[id]).resize(1080, 1920, { fit: 'cover', position: 'centre' }).jpeg({ quality: 95 }).toFile(base[id]);
}
// El pibe recortado (rembg, u2net_human_seg): su buzo negro es tan oscuro como la pantalla, así que sin esto la tele se
// medía con el buzo pegado y la jugada se veía a través de él. Máscara 1080x1920 (blanco = persona).
const CON_PIBE = ['1-cuarto', '3-gol', '4-empate'];
function persona(id) {
  const sale = path.join(DIR, `persona-${id}.png`);
  if (!fs.existsSync(sale)) {
    const r = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', "import sys;from rembg import new_session,remove;open(sys.argv[2],'wb').write(remove(open(sys.argv[1],'rb').read(),session=new_session('u2net_human_seg'),only_mask=True))", base[id], sale], { encoding: 'utf8', timeout: 300000 });
    if (!fs.existsSync(sale)) throw new Error('rembg falló: ' + (r.stderr || '').slice(-300));
  }
  return sale;
}
const masc = async (id, w, h) => CON_PIBE.includes(id) ? sharp(persona(id)).resize(w, h, { fit: 'fill' }).greyscale().raw().toBuffer() : Buffer.alloc(w * h);
// La pantalla negra mate: la mancha oscura más grande con forma de tele (16:9 y llena), sin el pibe; sus 4 rincones
// extremos. Si un rincón queda tapado por el pibe, se completa con los otros tres (la tele es un paralelogramo de frente).
async function medirTele(f, id) {
  const { data, info } = await sharp(f).resize(270, 480, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, visto = new Uint8Array(W * H), pib = await masc(id, W, H);
  for (let i = 0; i < W * H; i++) if (pib[i] > 60) data[i] = 255;
  let mejor = null;
  for (const umbral of [16, 22, 28]) {
    visto.fill(0);
    for (let i = 0; i < W * H; i++) {
      if (visto[i] || data[i] > umbral) continue;
      const pila = [i], pts = []; visto[i] = 1;
      while (pila.length) {
        const j = pila.pop(); pts.push(j); const x = j % W, y = (j / W) | 0;
        for (const k of [x > 0 && j - 1, x < W - 1 && j + 1, y > 0 && j - W, y < H - 1 && j + W]) if (k !== false && !visto[k] && data[k] <= umbral) { visto[k] = 1; pila.push(k); }
      }
      if (pts.length < 600) continue;
      let x0 = W, x1 = 0, y0 = H, y1 = 0;
      for (const j of pts) { const x = j % W, y = (j / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, llena = pts.length / (w * h), asp = w / h;
      if (asp < 1.45 || asp > 2.1 || llena < .8 || y1 > H * .7) continue;
      if (!mejor || pts.length > mejor.pts.length) mejor = { pts, umbral };
    }
    if (mejor) break;
  }
  if (!mejor) throw new Error(`No encuentro la tele en ${path.basename(f)}`);
  const sx = 1080 / W, sy = 1920 / H, P = mejor.pts.map(j => [j % W, (j / W) | 0]);
  const ext = fn => P.reduce((a, b) => fn(b) > fn(a) ? b : a);
  const c = [ext(p => -p[0] - p[1]), ext(p => p[0] - p[1]), ext(p => p[0] + p[1]), ext(p => p[1] - p[0])];   // TL, TR, BR, BL
  const tapado = ([x, y]) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && pib[Y * W + X] > 60) return true; } return false; };
  const t = c.map(tapado);
  if (t.filter(Boolean).length === 1) { const i = t.indexOf(true), a = c[(i + 1) % 4], o = c[(i + 2) % 4], b = c[(i + 3) % 4]; c[i] = [a[0] + b[0] - o[0], a[1] + b[1] - o[1]]; }
  else if (t.filter(Boolean).length > 1) throw new Error(`La tele de ${id} tiene más de un rincón tapado: medirla a mano en teles.json`);
  // + un píxel de la escala chica en los bordes de la derecha y de abajo, para cubrir el borde
  return c.map(([x, y], i) => [Math.round((x + (i === 1 || i === 2 ? 1 : 0)) * sx), Math.round((y + (i >= 2 ? 1 : 0)) * sy)]);
}
const QUADS = path.join(DIR, 'teles.json');
const quads = fs.existsSync(QUADS) ? JSON.parse(fs.readFileSync(QUADS, 'utf8')) : {};
// Medidas a mano sobre una grilla (2026-11-19): la automática daba el borde de abajo 40 px corto en el cuarto (el pie de la
// pantalla no es tan negro) y no sabe qué hay detrás de la cabeza. Manda sobre la automática, que queda para fotos nuevas.
Object.assign(quads, {
  '1-cuarto': [[346, 550], [920, 542], [912, 863], [350, 907]],
  '3-gol': [[265, 535], [890, 523], [884, 866], [275, 883]],
  '4-empate': [[60, 448], [717, 450], [708, 813], [78, 845]],
  '7-apagado': [[299, 548], [916, 538], [905, 865], [305, 905]],
});
for (const id of CON_TELE) if (!quads[id]) quads[id] = await medirTele(base[id], id);
fs.writeFileSync(QUADS, JSON.stringify(quads, null, 1));
// Lo que está DELANTE de la tele (el puño del gol, la cabeza): la foto con la pantalla negra vuelta transparente, encima de
// la jugada. Dentro del contorno de la tele, lo casi negro se ve a través; lo demás tapa. Fuera del contorno, todo tapa.
async function delante(id) {
  const sale = path.join(DIR, `delante-${id}.png`);
  if (fs.existsSync(sale)) return sale;
  const { data, info } = await sharp(base[id]).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, q = quads[id], alfa = Buffer.alloc(W * H, 255), pib = await masc(id, W, H);
  const dentro = (x, y) => { let s = 0; for (let i = 0; i < 4; i++) { const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4]; const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax); if (c !== 0) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } } return true; };
  const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
  for (let y = Math.max(0, Math.min(...ys) - 2); y <= Math.min(H - 1, Math.max(...ys) + 2); y++)
    for (let x = Math.max(0, Math.min(...xs) - 2); x <= Math.min(W - 1, Math.max(...xs) + 2); x++) {
      if (!dentro(x, y)) continue;
      const i = (y * W + x) * 3, l = .3 * data[i] + .59 * data[i + 1] + .11 * data[i + 2];
      alfa[y * W + x] = Math.max(pib[y * W + x], Math.round(255 * Math.min(1, Math.max(0, (l - 30) / 26))));
    }
  const a = await sharp(alfa, { raw: { width: W, height: H, channels: 1 } }).blur(1.2).extractChannel(0).raw().toBuffer();   // blur sale en 3 canales
  await sharp(data, { raw: { width: W, height: H, channels: 3 } }).joinChannel(a, { raw: { width: W, height: H, channels: 1 } }).png().toFile(sale);
  return sale;
}
const delantes = {};
for (const id of CON_TELE) delantes[id] = await delante(id);
if (flag('--medir')) {   // control visual: el contorno medido encima de cada foto
  for (const id of CON_TELE) {
    const q = quads[id], svg = `<svg width="1080" height="1920"><polygon points="${q.map(p => p.join(',')).join(' ')}" fill="rgba(255,0,0,.35)" stroke="#0f0" stroke-width="3"/></svg>`;
    const c = await sharp(base[id]).composite([{ input: Buffer.from(svg) }]).png().toBuffer();   // sharp achica antes de componer
    await sharp(c).resize(540, 960).jpeg().toFile(path.join(DIR, `medida-${id}.jpg`));
  }
  log('Medidas en medida-*.jpg'); process.exit(0);
}

// ── La jugada de la tele: el vivo del 12/11, fuera de las ventanas de gol del 3-2 (las usó "Tu humor") ──
// 300 s: el lobby antes del primer partido · 705: juego ante San Miguel · 2400: ante ALL BOYS · 4236: el final ante Cambaceres
const TRAMOS = { '1-cuarto': 300, '3-gol': 705, '4-empate': 2400, '7-apagado': 4236 };
const teleDe = {};
for (const [id, desde] of Object.entries(TRAMOS)) {
  const d = path.join(DIR, `tele-${id}`);
  if (!fs.existsSync(path.join(d, '0001.jpg'))) {
    fs.mkdirSync(d, { recursive: true });
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(desde), '-i', VOD, '-t', '8', '-vf', 'fps=30,scale=1280:720', '-q:v', '4', path.join(d, '%04d.jpg')], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg (tele): ' + r.stderr);
  }
  teleDe[id] = { dir: archivo(d), n: fs.readdirSync(d).length };
}

log('Clips (Canva imagen a video)…');
const clips = {};
for (const [id, mov, quietos] of [
  ['2-mesa', 'Cámara de celular en mano que se acerca muy despacio a la mesita, con un leve temblor. La luz blanca del joystick late suave. Nada más se mueve.', true],
  ['5-taza', 'Cámara de celular en mano casi fija, con un leve temblor. La luz fría de la tele parpadea sobre la taza y la mesa, cambiando de intensidad. Nada más se mueve.', true],
  ['6-manos', 'Cámara de celular en mano casi fija. Los pulgares se mueven rápido sobre las palancas y las manos aprietan el joystick con tensión. La luz de la tele parpadea sobre las manos. Nada más se mueve.', false],
]) {
  const c = cuadros(animar(imgs[id], mov, { quietos }));
  clips[id] = { dir: archivo(c.dir), n: c.n };
  log(`  ${id} ✓ (${c.n} cuadros)`);
}
if (flag('--solo-clips')) { log('Listo (solo clips).'); process.exit(0); }
// Revisados cuadro por cuadro: en la mesa, desde el ~66 entra una mano con un celular; en las manos, desde el ~25 el pibe
// gira la cabeza y se le empieza a ver la cara. Se usa solo lo anterior, ida y vuelta.
clips['2-mesa'].n = Math.min(clips['2-mesa'].n, 60);
clips['6-manos'].n = Math.min(clips['6-manos'].n, 18);

// ── Voz: una frase por toma; la duración de cada toma sale de su frase ──
const [p1, p2, p3] = PARTIDOS;
const NUM = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'];
const dicho = r => { const [a, b] = r.split('-').map(Number); return `${NUM[Math.max(a, b)]} a ${NUM[Math.min(a, b)]}`; };
const ESCENAS = [
  { id: '1-cuarto', hora: '22:20', bajada: 'UN DÍA EN LA VIDA · TRIPLE FECHA', primera: true, voz: 'Así se vive una noche de triple fecha en Clubs Pro.', z: [1.04, 1.1] },
  { id: '2-mesa', hora: '22:20', bajada: 'JUEVES 12/11', voz: 'Diez y veinte: agua, joystick cargando y el audio del equipo abierto.' },
  { id: '3-gol', hora: '22:30', bajada: 'PRIMER PARTIDO', voz: `Diez y media, primer partido. ¡Gol! Ganamos ${dicho(p1.res)}.`, chip: p1, z: [1.06, 1.16] },
  { id: '4-empate', hora: '23:00', bajada: 'SEGUNDO PARTIDO', voz: `Once, el segundo. Empate, ${dicho(p2.res)}.`, chip: p2, z: [1.05, 1.14] },
  { id: '5-taza', hora: '23:30', bajada: 'TERCER PARTIDO', voz: 'Once y media, el tercero. La taza, vacía.' },
  { id: '6-manos', hora: '23:30', bajada: 'TERCER PARTIDO', voz: `Último ataque… y no entró. Perdimos ${dicho(p3.res)}.`, chip: p3 },
  { id: '7-apagado', hora: '00:30', bajada: 'VIERNES 13/11', voz: 'Doce y media. Se apaga todo.', apagado: true, z: [1.05, 1.12] },
];
const CIERRE_VOZ = 'El lunes, otra jornada.';
const vozDur = [...ESCENAS.map(e => e.voz), CIERRE_VOZ].map(x => narracion([{ en: 0, texto: x }], DIR)[0].dur);
let t = 0;
const escenas = ESCENAS.map((e, i) => {
  const ini = t, entra = e.primera ? .05 : .35;
  const dur = Math.max(2.4, entra + vozDur[i] + (e.apagado ? 1.6 : .45));
  t += dur;
  return { ...e, desde: ini, hasta: t, vozEn: ini + entra, horaNueva: i === 0 || ESCENAS[i - 1].hora !== e.hora };
});
const ap = escenas.at(-1);
const T_APAGA = ap.vozEn + vozDur[ESCENAS.length - 1] + .25;   // la tele se apaga al terminar la frase
const T_NEGRO = T_APAGA + .9, T_CIERRE = T_NEGRO + .55;
const total = T_CIERRE + Math.max(2.6, .4 + vozDur.at(-1) + 1.2);
ap.hasta = total;
const frases = narracion([...escenas.map(e => ({ en: e.vozEn, texto: e.voz })), { en: T_CIERRE + .4, texto: CIERRE_VOZ }], DIR);
log(`Total ${total.toFixed(1)} s · ${escenas.map(e => `${e.id} ${(e.hasta - e.desde).toFixed(1)}`).join(' · ')}`);

const datos = {
  escudo: archivo(ESCUDO), negro: T_NEGRO, cierreDesde: T_CIERRE, cierre: 'El lunes,<br><b>otra jornada.</b>',
  frases: frases.slice(0, -1).map(f => ({ en: f.en, dur: f.dur, palabras: f.palabras })),
  chips: escenas.filter(e => e.chip).map(e => {
    const f = frases[escenas.indexOf(e)], c = e.chip, [a, b] = c.res.split('-');
    return { desde: f.en + f.dur * .55, hasta: e.hasta - .1, liga: c.liga.toUpperCase(), html: `Top Secret <b>${a}-${b}</b> ${c.rival}` };
  }),
  escenas: escenas.map(e => ({
    desde: e.desde, hasta: e.hasta, hora: e.hora, bajada: e.bajada, horaNueva: e.horaNueva, primera: !!e.primera, z: e.z,
    ...(CON_TELE.includes(e.id) ? { foto: archivo(base[e.id]), delante: archivo(delantes[e.id]), quad: quads[e.id], tele: teleDe[e.id], vel: 1, luz: e.id === '1-cuarto' ? .12 : .22,
      teleOscura: e.id === '1-cuarto' ? .15 : 0, ...(e.apagado ? { apaga: T_APAGA - e.desde } : {}) } : { clip: clips[e.id], vel: e.id === '6-manos' ? .4 : .5 }),
  })),
};

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/vlog.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}
if (flag('--cuadros')) {
  const { b, p } = await abrir(), comp = [];
  const M = [.1, 1.2, ...escenas.slice(1).flatMap(e => [e.desde + .08, e.desde + (e.hasta - e.desde) * .7]), T_APAGA + .06, T_APAGA + .2, T_APAGA + .6, T_CIERRE + 1.2, total - .1];
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

// ── Sonido: la música se corta con la tele; encima, la tele de fondo, el festejo, los botones y el apagado ──
function sonido(entra, sale) {
  const SR = 48000;
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', entra, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (audio): ' + String(r.stderr).slice(-300));
  const o = new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
  const L = o.length >> 1;
  for (let k = 0; k < L; k++) { const s = k / SR, g = s < T_APAGA ? 1 : Math.max(0, 1 - (s - T_APAGA) / .12); o[k * 2] *= g; o[k * 2 + 1] *= g; }
  let h = 12345; const azar = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 2147483648 - 1; };
  const fx = new Float32Array(L);
  const suma = (seg, dur, f) => { const i0 = Math.round(seg * SR); for (let k = 0; k < dur * SR && i0 + k < L; k++) if (i0 + k >= 0) fx[i0 + k] += f(k / SR); };
  const clic = (seg, vol) => suma(seg, .03, u => vol * Math.exp(-u * 220) * azar());
  const golpe = (seg, vol) => suma(seg, .6, u => vol * (Math.exp(-9 * u) * Math.sin(2 * Math.PI * (48 + 60 * Math.exp(-30 * u)) * u) + .25 * Math.exp(-60 * u) * azar()));
  // la tele de fondo: hinchada lejana en las tomas con la jugada (en la del gol, el grito)
  const hinchada = (seg, dur, vol, sube = 0) => { let a = 0, b = 0; suma(seg, dur, u => { a += .05 * (azar() - a); b += .004 * (azar() - b); return vol * Math.min(1, u / .3) * Math.min(1, (dur - u) / .2) * (a * 2.4 + b * 6) * (1 + sube * Math.exp(-Math.pow((u - .4) / .9, 2))); }); };
  for (const e of escenas) if (CON_TELE.includes(e.id)) hinchada(e.desde, (e.apagado ? T_APAGA : e.hasta) - e.desde, .07, e.id === '3-gol' ? 4 : 0);
  for (const e of escenas) if (!e.primera) clic(e.desde, .35);   // el corte, como un clic de celular
  const m = escenas.find(e => e.id === '6-manos');
  for (let s = m.desde + .1; s < m.hasta - .2; s += .19) clic(s + (Math.round(s * 10) % 3) * .02, .12);   // botones del último ataque
  // el apagado: clic seco + el "tic" agudo de la pantalla
  clic(T_APAGA - .02, 1); golpe(T_APAGA, .35); suma(T_APAGA, .4, u => .05 * Math.exp(-u * 9) * Math.sin(2 * Math.PI * 15700 * u));
  for (let k = 0; k < L; k++) { o[k * 2] += fx[k]; o[k * 2 + 1] += fx[k]; }
  let pico = 0; for (const x of o) pico = Math.max(pico, Math.abs(x));
  if (pico > .97) { const f = .97 / pico; for (let i = 0; i < o.length; i++) o[i] *= f; }
  const crudo = path.join(DIR, 'sonido.f32'); fs.writeFileSync(crudo, Buffer.from(o.buffer));
  const e = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', crudo, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.rmSync(crudo, { force: true });
  if (e.status !== 0) throw new Error('ffmpeg (sonido): ' + (e.stderr || '').slice(-600));
}

const musica = await elegirMusica(ID);
const tema = infoTema(musica);
const vBase = path.join(DIR, 'vlog-base.mp4'), mezclado = path.join(DIR, 'vlog-sonido.mp4'), conVoz = path.join(DIR, 'vlog-voz.mp4'), mp4 = path.join(DIR, 'vlog.mp4'), jpg = path.join(DIR, 'vlog-portada.jpg'), fotoPortada = path.join(DIR, 'vlog-foto-portada.jpg');
if (!flag('--sin-render') || !fs.existsSync(vBase)) {
  log(`Render (${Math.round(total * 60)} cuadros a 60 fps) · tema ${tema.titulo}…`);
  await video('vlog.html', datos, vBase, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica });
}
sonido(vBase, mezclado);
agregarVoz(mezclado, frases, conVoz);

// Portada: el puño del gol, sin textos (el título lo pone la portada)
{
  const { b, p } = await abrir(), e = escenas.find(e => e.id === '3-gol');
  await p.evaluate(t => mostrar(0, t, { sinTexto: true }), e.desde + (e.hasta - e.desde) * .6);
  await p.waitForTimeout(30);
  await p.locator('#lienzo').screenshot({ path: fotoPortada, type: 'jpeg', quality: 95 });
  await b.close();
}
await portada({ imagen: fotoPortada, kicker: 'Un día en la vida', titulo: 'Noche de *triple fecha*', dato: '22:30', foco: '50% 40%' }, jpg);
conPortada(conVoz, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
await putFile(mp4, 'social/viral/vlog-triple-fecha.mp4');
const uVid = `${MEDIA}/social/viral/vlog-triple-fecha.mp4?v=${Date.now().toString(36)}`;
const uPortada = await subirPortada(jpg, 'social/viral/vlog-triple-fecha-portada.jpg');
const resumen = `${p1.res} a ${p1.rival} en ${p1.liga}, ${p2.res} con ${p2.rival} y ${p3.res} con ${p3.rival} en ${p2.liga}`;
const desc = `${Math.round(total)} s · con voz en off (Elena, tono de vlog, una frase por toma: cuenta la noche) · la noche real del jueves 12/11 (${resumen}; seed_matches.js) · escenas con ChatGPT, el mismo cuarto en todas; el pibe siempre sin cara y sin ser un jugador identificado (por eso no hay protagonista ni gamertag) · mesa, taza y manos animadas con Canva; en la tele, el vivo de esa noche fuera de las jugadas de gol que ya usó "Tu humor" · técnica nueva: video de celular por código (mano, foco que busca en cada corte, exposición, ruido, hora grande, subtítulos) y la tele que se apaga de verdad · cierre "El lunes, otra jornada" en vez de "Mañana": el viernes 13 no hubo partido · música: ${tema.titulo}, se corta cuando se apaga la tele.`;
const P = o => ({ decision: 'pendiente', protagonistas: [], descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-23', pieza: 'sab-vlog' },
  titulo: 'Un día en la vida: noche de triple fecha', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Un día en la vida, triple fecha', metodo: 'ig-reel',
      texto: `Un día en la vida con triple fecha: de 22:30 a 00:30, tres partidos y una taza vacía.\n\nLa noche del jueves 12/11: ${resumen}.\n\n¿A qué hora se te vacía la taza a vos?\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · Un día en la vida, triple fecha', metodo: 'tiktok',
      texto: `Así se vive una triple fecha de Clubs Pro: un gol, un empate y un último ataque que no entró. De 22:30 a 00:30. #TopSecretFC #ProClubs #EAFC #undiaenmivida` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · Un día en la vida, triple fecha', metodo: 'youtube',
      titulo: 'Un día en la vida: triple fecha de Pro Clubs, de 22:30 a 00:30 | EA FC',
      texto: `Tres partidos en una noche: ${p1.res} en ${p1.liga}, ${p2.res} y ${p3.res} en ${p2.liga}. #Shorts #ProClubs #EAFC` }),
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
