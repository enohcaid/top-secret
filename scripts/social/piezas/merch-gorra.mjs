// Reel del primer producto de merchandising: la gorra negra con el espía (Clean logo) bordado en dorado y
// "TOP SECRET" en la tira de atrás (pedido de Juan, 2026-11-10: "muchos efectos, que el modelo no se vea y se
// mantenga en misterio; podés replicar el producto para mostrarlo desde diferentes ángulos").
// Vertical 1080x1920. Material:
//   - 6 videos del celular (fuentes/redes/merch-gorra/src/v1..v6, copia de Descargas; 480x854): la máquina bordando,
//     la capucha cerrada, la tira trasera y el frente con la visera tapando la cara. Solo tramos revisados cuadro a
//     cuadro en que la cara no aparece (TRAMOS, abajo), recortados a la gorra y con gradación oscura.
//   - Réplicas de la gorra con ChatGPT (ángulos que el celular no tiene), con fotos reales adjuntas, animadas con Canva.
//
//   node scripts/social/piezas/merch-gorra.mjs --imagenes        → genera las réplicas (para revisarlas)
//   node scripts/social/piezas/merch-gorra.mjs --animar          → clips de Canva de las réplicas aprobadas
//   node scripts/social/piezas/merch-gorra.mjs --cuadros 2,10    → capturas de esos segundos (revisión)
//   node scripts/social/piezas/merch-gorra.mjs                   → render completo
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../../lib/env.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/merch-gorra');
const REF = path.join(DIR, 'ref');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [merch-gorra] ${m}`);
fs.mkdirSync(DIR, { recursive: true });

// Descripción fija del producto: va en cada pedido para que la réplica no se aparte de la gorra real.
const PRODUCTO = `EL PRODUCTO (tiene que ser IDÉNTICO a la gorra de las fotos adjuntas, es un producto real que se va a vender):
- Gorra de béisbol negra de 6 paneles, tela de gabardina/twill negra mate, visera curva negra, botón negro arriba y ojalillos bordados negros en los paneles.
- Al frente, centrado en los dos paneles delanteros: el espía del adjunto "Clean logo Dorado.png" (sombrero, anteojos oscuros y cuello de piloto levantado) BORDADO en hilo dorado, con relieve y textura de puntada. Ningún otro logo, ni texto al frente.
- Atrás: tira de ajuste negra con la frase TOP SECRET bordada en hilo dorado, en mayúsculas, y una hebilla rectangular de metal color bronce/latón.
- Sin ninguna persona: la gorra sola, como foto de producto de una marca de lujo. Una sola toma, sin collage, sin recuadros ni insertos con detalles.`;

const ESTILO = `ESTÉTICA: campaña de lanzamiento de una marca premium, misteriosa, "archivo clasificado". Fondo negro profundo, luz dorada dirigida, contraste alto, reflejos sutiles, profundidad de campo, textura real de la tela y del hilo, grano fino de película. Nada de look de render 3D barato ni de póster de IA genérico.
FORMATO: VERTICAL 9:16 (pantalla completa de celular), la gorra en el centro con aire arriba y abajo (ahí va texto animado después).
El único texto permitido en la imagen es el TOP SECRET bordado de la tira trasera (cuando se ve). Nada más escrito: ni títulos, ni sellos, ni marcas de agua.`;

export const ESCENAS = [
  { id: 'gorra-heroe',
    escena: 'La gorra flota sola en el vacío negro, vista de tres cuartos de frente (un poco desde abajo, heroica), el espía dorado bordado bien visible. Una luz de contra dorada le dibuja el borde; partículas doradas finísimas suspendidas en el aire; debajo, un piso negro brillante que refleja la gorra apenas. UNA SOLA gorra en toda la imagen: sin recuadros, círculos, insertos ni vistas de detalle superpuestas.',
    movimiento: 'La cámara gira lentamente alrededor de la gorra, de izquierda a derecha, mostrando el frente y el costado; las partículas doradas flotan despacio.' },
  { id: 'gorra-boveda',
    escena: 'La gorra apoyada sobre un pedestal de piedra negra pulida en el centro de una bóveda de seguridad de acero oscuro, con la puerta circular de la bóveda abierta atrás, desenfocada. Rayos láser rojos de seguridad cruzan el aire en diagonal alrededor del pedestal sin tocar la gorra. Un único foco desde arriba ilumina la gorra; vista de frente, el espía dorado en el centro.',
    movimiento: 'La cámara avanza despacio hacia la gorra entre los rayos láser, que titilan suave.' },
  // del clip de Canva solo sirve desde 4 s: antes la luz deja la gorra casi beige (no es el producto)
  { id: 'gorra-trasera', desde: 4.0,
    escena: 'Primer plano de la parte de atrás de la gorra, apoyada sobre una superficie negra: la tira de ajuste con TOP SECRET bordado en dorado y la hebilla rectangular de bronce, en foco nítido; la copa de la gorra se desenfoca hacia arriba. Luz rasante cálida que hace brillar el hilo dorado y el metal.',
    movimiento: 'La cámara se desliza lentamente de izquierda a derecha a lo largo de la tira; un brillo de luz recorre el bordado dorado.' },
  { id: 'gorra-perfil',
    escena: 'La gorra de perfil puro, la visera apuntando a la derecha, suspendida en un estudio negro. Una franja de luz dorada horizontal la recorta por detrás como un eclipse; se ve el borde del espía dorado bordado asomando en el panel delantero. Sombras duras, silueta elegante.',
    movimiento: 'La gorra gira despacio sobre su eje hasta quedar de frente; la luz dorada de atrás se intensifica.' },
  // fija: en el clip de Canva toda la gorra se vuelve dorada/marrón a mitad de camino (no es el producto)
  { id: 'gorra-macro', quieta: true,
    escena: 'Macro extremo del espía dorado bordado en el frente de la gorra: se ve cada puntada del hilo dorado sobre la trama de la tela negra, el relieve del bordado y el borde del sombrero y los anteojos. Luz rasante dorada, profundidad de campo mínima.',
    movimiento: 'La cámara se desliza muy lento sobre el bordado; un reflejo de luz cruza el hilo dorado.' },
];

const ADJUNTOS = [path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'), path.join(REF, 'frente.jpg'), path.join(REF, 'tira.jpg'), path.join(REF, 'tres-cuartos.jpg')];
const pedido = e => `Creá una FOTOGRAFÍA DE PRODUCTO cinematográfica para el lanzamiento del primer producto de merchandising de Top Secret FC, club argentino de fútbol virtual. Adjunto fotos reales de la gorra (una persona la tiene puesta: IGNORÁ a la persona, solo mirá la gorra) y el logo bordado.

${PRODUCTO}

═══ LA TOMA (manda) ═══
${e.escena}

${ESTILO}`;

// ── Metraje real ── Tramos revisados cuadro a cuadro (4 por segundo, con el recorte final) el 2026-11-10: en ninguno
// se ve la cara. v2 = frente con la visera baja (el recorte corta arriba del mentón: más abajo asoma en 5-7 s);
// v3 = capucha cerrada de espaldas; v1 = tira trasera (pelo de espaldas). v4/v5/v6 = la máquina, sin personas.
// crop: recorte en px de la fuente 480x854.
export const TRAMOS = {
  frente:   { src: 'v2', desde: 0.3, dur: 7.0, crop: [400, 500, 40, 60], cromaMin: 52 },   // la sombra en la pared es cálida
  capucha:  { src: 'v3', desde: 0.0, dur: 4.2, color: false },        // la pared de este video es cálida: blanco y negro puro
  tira:     { src: 'v1', desde: 5.0, dur: 2.8, cromaMin: 40 },
  macro1:   { src: 'v4', desde: 0.0, dur: 4.0 },
  macro2:   { src: 'v4', desde: 25.0, dur: 7.0 },
  maquina:  { src: 'v6', desde: 0.0, dur: 8.0 },
  cabezal:  { src: 'v5', desde: 0.0, dur: 6.0 },
};

// Rampa dorada (#3A2A08 → #C9A84C → #F6E3A6) según el brillo del hilo en la fuente (0-1).
const ORO = [[0, [58, 42, 8]], [0.45, [201, 168, 76]], [0.8, [246, 227, 166]], [1, [255, 246, 216]]];
function oro(v) {
  v = Math.min(1, Math.max(0, v * 1.15));
  for (let j = 1; j < ORO.length; j++) if (v <= ORO[j][0]) {
    const [a, ca] = ORO[j - 1], [b, cb] = ORO[j], u = (v - a) / (b - a);
    return ca.map((c, k) => c + u * (cb[k] - c));
  }
  return ORO.at(-1)[1];
}

// Gradación "solo dorado": queda en color únicamente el amarillo saturado (el hilo y la hebilla); todo lo demás pasa a
// gris y se oscurece. Esconde a la modelo (uñas, piel, pared crema) y hace saltar el bordado.
async function gradar(archivo, { color = true, cromaMin = 32 } = {}) {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(archivo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const curva = v => { const x = v / 255; return 255 * Math.min(1, Math.pow(x, 2.3) * 0.95); };       // aplasta medios y altos
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, s = mx ? d / mx : 0;
    let h = 0;
    if (d) h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
    // peso del color: hue 30-54 pleno (el dorado del hilo mide h40 s0,3-0,45; la pared crema h43 s0,16, la piel h0), bordes suaves
    const wH = Math.max(0, 1 - Math.max(0, Math.abs(h - 42) - 12) / 10);
    const wS = color ? Math.min(1, Math.max(0, (d - cromaMin) / 22)) : 0;                                         // croma absoluta: hilo ~65, pared ~27, pelo ~10
    const w = wH * wS;
    const y = curva(0.3 * r + 0.59 * g + 0.11 * b);
    if (w <= 0) { data[i] = data[i + 1] = data[i + 2] = y; continue; }
    const [gr, gg, gb] = oro((0.3 * r + 0.59 * g + 0.11 * b) / 255);                                     // la rampa dorada de la marca
    data[i] = y + w * (gr - y); data[i + 1] = y + w * (gg - y); data[i + 2] = y + w * (gb - y);
  }
  await sharp(data, { raw: info }).jpeg({ quality: 92 }).toFile(archivo + '.tmp');
  fs.renameSync(archivo + '.tmp', archivo);
}

export async function prepararTramos({ forzar = false } = {}) {
  const out = {};
  for (const [id, t] of Object.entries(TRAMOS)) {
    const dir = path.join(DIR, `tramo-${id}`);
    if (forzar || !fs.existsSync(dir) || !fs.readdirSync(dir).length) {
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      const vf = [t.crop ? `crop=${t.crop.join(':')}` : null, 'fps=30', 'scale=540:-2:flags=lanczos'].filter(Boolean).join(',');
      const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(t.desde), '-t', String(t.dur), '-i', path.join(DIR, 'src', `${t.src}.mp4`), '-vf', vf, '-q:v', '2', path.join(dir, '%04d.jpg')], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
      const fs_ = fs.readdirSync(dir).filter(f => f.endsWith('.jpg'));
      for (const f of fs_) await gradar(path.join(dir, f), t);
      log(`tramo ${id}: ${fs_.length} cuadros`);
    }
    out[id] = { dir, n: fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length };
  }
  return out;
}

if (process.argv.includes('--tramos')) { await prepararTramos({ forzar: process.argv.includes('--forzar') }); process.exit(0); }

if (process.argv.includes('--imagenes')) {
  const { generarImagen, cerrar } = await import('../lib/imagen.mjs');
  const solo = (() => { const i = process.argv.indexOf('--solo'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
  for (const e of ESCENAS.filter(x => !solo || solo.includes(x.id))) {
    try {
      const f = await generarImagen({ id: e.id, carpeta: DIR, vertical: true, adjuntos: ADJUNTOS, promptCompleto: pedido(e) });
      log(`${e.id} → ${f}`);
    } catch (err) { log(`${e.id} FALLÓ: ${err.message.split('\n')[0]}`); }
  }
  await cerrar();
  process.exit(0);
}

// ── Réplicas: clip de Canva si ya está (fuentes/redes/merch-gorra/<id>.mp4), si no la imagen fija (--quietas o falta) ──
const { animar, cuadros: aCuadros } = await import('../lib/clip.mjs');
const { archivo, video } = await import('../lib/render.mjs');
const replicas = {};
for (const e of ESCENAS) {
  let png = path.join(DIR, `${e.id}.png`);
  // --quietas sin todas las réplicas (para revisar el diseño mientras ChatGPT termina): usa otra que ya esté
  if (!fs.existsSync(png) && process.argv.includes('--quietas')) png = ESCENAS.map(x => path.join(DIR, `${x.id}.png`)).find(x => fs.existsSync(x)) || png;
  if (!fs.existsSync(png)) throw new Error(`Falta ${png}: correr primero --imagenes`);
  const mp4 = png.replace(/\.png$/, '.mp4');
  if (process.argv.includes('--animar') && !fs.existsSync(mp4)) {
    try { animar(png, e.movimiento, { quietos: false }); log(`clip ${e.id} listo`); } catch (err) { log(`clip ${e.id} FALLÓ: ${err.message}`); }
  }
  if (fs.existsSync(mp4) && !e.quieta && !process.argv.includes('--quietas')) { const c = aCuadros(mp4); replicas[e.id] = { dir: archivo(c.dir), n: c.n, desde: e.desde || 0 }; continue; }
  const d = path.join(DIR, `${path.basename(png, '.png')}-quieta`); fs.mkdirSync(d, { recursive: true });
  if (!fs.existsSync(path.join(d, '0001.jpg'))) spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-vf', 'scale=1080:-2', '-q:v', '2', path.join(d, '0001.jpg')]);
  replicas[e.id] = { dir: archivo(d), n: 1, quieta: true };
}
if (process.argv.includes('--animar')) process.exit(0);

// ── Tiempos: "Scar" (The Shorts) a 140 BPM; el golpe a los 41,146 s del tema cae en el revelado (T.hit) y el
// estribillo (48,0 s) en el coro. musicaDesde = 41,146 − T.hit. Todo lo demás, a compases del golpe. ──
const B = 60 / 140, BAR = 4 * B, HIT = 9.146, GOLPE = 41.146;
const T = {
  ranura: HIT - 5 * BAR, origen: HIT - 4 * BAR, franjas: HIT - 3 * BAR, macro: HIT - 2 * BAR, sujeto: HIT - BAR, hit: HIT,
  boveda: HIT + 2 * BAR, evidencia: HIT + 3 * BAR, coro: HIT + 4 * BAR, rafaga: HIT + 7 * BAR, drop: HIT + 9 * BAR,
  cierre: HIT + 10 * BAR, sello: HIT + 11 * BAR, final: HIT + 11.5 * BAR,
};
const FIN = HIT + 13 * BAR;
const tramos = await prepararTramos();
const clips = { ...Object.fromEntries(Object.entries(tramos).map(([k, v]) => [k, { dir: archivo(v.dir), n: v.n }])),
  heroe: replicas['gorra-heroe'], boveda: replicas['gorra-boveda'], trasera: replicas['gorra-trasera'], perfil: replicas['gorra-perfil'], macro: replicas['gorra-macro'] };
const datos = { T, fin: FIN, beat: B, clips, logo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')) };

const cuadrosArg = (() => { const i = process.argv.indexOf('--cuadros'); return i > 0 ? process.argv[i + 1] : null; })();
if (cuadrosArg) {
  const { chromium } = await import('playwright');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/merch-gorra.html')));
  await p.evaluate(d => pintar(d), datos); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  const out = path.join(ROOT, 'pruebas/merch/cuadros'); fs.mkdirSync(out, { recursive: true });
  for (const s of cuadrosArg.split(',').map(Number)) {
    await p.evaluate(t => mostrar(0, t), s); await p.waitForTimeout(80);
    await p.locator('#lienzo').screenshot({ path: path.join(out, `c-${String(s).replace('.', '_')}.jpg`), type: 'jpeg', quality: 80 });
  }
  await b.close(); log('capturas en ' + out); process.exit(0);
}

const { elegirMusica } = await import('../../lib/musica.mjs');
const musica = await elegirMusica('merch-gorra-001');
const musicaDesde = GOLPE - HIT;
const mudo = path.join(DIR, 'merch-gorra-sin-portada.mp4'), final = path.join(DIR, 'merch-gorra.mp4');
const soloLote = process.argv.includes('--solo-lote') && fs.existsSync(final);   // video ya revisado: solo cargar el lote
if (!soloLote) log(`Render (${FIN.toFixed(2)} s; música desde ${musicaDesde.toFixed(2)} s)…`);
if (!soloLote) await video('merch-gorra.html', datos, mudo, { escenas: [{ n: 0, dur: FIN }], musica, fps: 60, desenfoque: true, musicaDesde });
// Portada propia (regla 2026-10-21): la réplica en la bóveda + "OBJETO 001", como primeros cuadros y aparte para IG/FB
const { portada, conPortada } = await import('../lib/portada.mjs');
const jpgPortada = await portada({ imagen: path.join(DIR, 'gorra-boveda.png'), kicker: 'TOP SECRET FC · MERCH', dato: '001', titulo: 'Archivo\n*clasificado.*', foco: '50% 45%' }, path.join(DIR, 'portada.jpg'));
if (!soloLote) { conPortada(mudo, jpgPortada, final); log('Listo: ' + final); }
if (process.argv.includes('--sin-lote')) process.exit(0);

// ── A aprobar.html (Juan, 2026-11-10: "cuando termine, subilo a aprobar"). Sin hora: publicar.mjs la agenda al aprobar.
// Sin precio, link de compra ni fecha: no están definidos todavía (cierre "Próximamente"). ──
const { putFile } = await import('../../lib/r2.mjs');
const { subirPortada } = await import('../lib/portada.mjs');
const { agregarLote } = await import('../lib/aprobaciones.mjs');
const { infoTema, creditoTexto } = await import('../../lib/musica.mjs');
const { revisarPieza } = await import('../../../revisar-textos.js');
const tema = infoTema(musica).titulo;
const key = 'social/merch/merch-gorra-001.mp4';
await putFile(final, key);
const uVid = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
const uPortada = await subirPortada(jpgPortada, 'social/merch/merch-gorra-portada.jpg');
const desc = `${Math.round(FIN)} s · sin voz (teaser musical: el misterio funciona mejor sin narrador) · metraje real de los 6 videos (máquina bordando, capucha, tira, frente) con gradación "solo dorado" para que la modelo no se vea · ángulos de producto = réplicas de ChatGPT con las fotos reales adjuntas, animadas con Canva · sin precio ni fecha: cierra con "Próximamente" · música: ${tema}.`;
const P = o => ({ decision: 'pendiente', protagonistas: [], descripcion: desc, musica: tema, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: final }, portada: { url: uPortada, local: jpgPortada }, ...o });
const lote = {
  id: 'merch-gorra-001', tipo: 'viral', creado: new Date().toISOString(),
  titulo: 'Objeto 001 · la primera gorra oficial (teaser)', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Objeto 001', metodo: 'ig-reel',
      texto: 'Archivo 001. Clasificado.\n\nEl primer producto oficial de Top Secret FC: gorra negra, el espía bordado en hilo dorado al frente y TOP SECRET en la espalda.\n\nPróximamente. Activá las notificaciones para enterarte primero.\n\n#TopSecretFC #Merch #ProClubs #EAFC' }),
    P({ id: 'ig-historia', red: 'instagram', formato: 'Historia', descripcion: '24 h · ' + desc, metodo: 'ig-historia', texto: '' }),
    P({ id: 'fb-video', red: 'facebook', formato: 'Reel / video', metodo: 'fb-video',
      texto: 'Archivo 001: la primera gorra oficial de Top Secret FC.\n\nNegra, con el espía del club bordado en hilo dorado al frente y TOP SECRET en la tira de atrás. Bordada puntada por puntada.\n\nPróximamente.' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok',
      texto: 'Objeto 001: la primera gorra oficial de Top Secret FC. Próximamente. #TopSecretFC #Merch #ProClubs #EAFC' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short', metodo: 'youtube', titulo: 'Objeto 001: la primera gorra oficial de Top Secret FC | Pro Clubs EA FC',
      texto: 'Gorra negra con el espía bordado en hilo dorado y TOP SECRET en la espalda. Próximamente.\n\n#Shorts #TopSecretFC #Merch' }),
    P({ id: 'x', red: 'x', formato: 'Post con video', metodo: 'x-video',
      texto: 'Archivo 001: desclasificado. La primera gorra oficial de Top Secret FC llega pronto. #TopSecretFC' }),
  ],
};
let avisos = 0;
for (const p of lote.piezas) {
  const conCredito = p.musica && p.texto ? { ...p, texto: `${p.texto}\n\n${creditoTexto(p.musica)}` } : p;
  for (const r of revisarPieza(conCredito, lote)) { avisos++; log(`  aviso ${p.id}: ${r.msg}`); }
}
if (avisos) throw new Error(`${avisos} avisos del revisor: corregir antes de cargar el lote.`);
await agregarLote(lote);
log('Lote en aprobar.html: ' + lote.id + ' · ' + uVid);
process.exit(0);
