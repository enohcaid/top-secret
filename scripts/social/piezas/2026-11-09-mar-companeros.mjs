#!/usr/bin/env node
// "Los 6 compañeros que tenés en Clubs Pro" (idea mar-companeros del guion viral-guiones-2026-11-09): seis personajes
// inventados, presentados como el reparto de una película. Pensada para gente que no conoce al club.
//
// Decisiones (producción sin supervisión):
//   - Personajes ficticios, sin escudo ni kit del club, para que nadie del plantel se sienta aludido (protagonistas: []).
//   - Técnica nueva: cada foto "se abre" en capas (recorte con rembg + fondo reconstruido + nombre ENTRE las dos capas,
//     cuadro congelado con contorno en el remate). Sin Canva: el movimiento sale de las capas y no hay desvíos de la IA.
//   - Instagram lleva reel y carrusel porque así vino el guion aprobado; X y Facebook no estaban en el guion.
//
//   node scripts/social/piezas/2026-11-09-mar-companeros.mjs
//     --solo-imagenes   genera las imágenes y las capas, para revisarlas
//     --cuadros         además, cuadros clave en fuentes/redes/viral/mar-companeros/cuadros, sin renderizar el video
//     --sin-lote        renderiza todo pero no sube ni carga el lote
//     --sin-render      reusa el video y las placas ya renderizados: sube y carga el lote
//     --solo-placas     reusa el video, rehace las placas del carrusel: sube y carga el lote
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica, infoTema, creditoTexto } from '../../lib/musica.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { carrusel, video, archivo } from '../lib/render.mjs';
import { narrar, agregarVoz } from '../lib/voz.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/mar-companeros');
const CAPAS = path.join(DIR, 'capas');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [companeros] ${m}`);
const flag = f => process.argv.includes(f);

// Misma dirección de arte para los seis: tienen que leerse como el reparto de una misma película.
const pedido = escena => `Creá una FOTOGRAFÍA CINEMATOGRÁFICA de un personaje de ficción para el póster de una película de banda, tipo presentación del equipo en una película de atracos. Es una comedia con cara seria: el personaje se toma muy en serio algo ridículo.

═══ LA ESCENA (manda) ═══
${escena}

═══ PERSONAJE ═══
- Es una persona INVENTADA: rostro genérico que no se parezca a nadie real ni a ningún futbolista conocido. Humor por el gesto y la pose, no por una cara grotesca.
- Una sola persona nítida en la imagen. Sin otros jugadores ni otra gente reconocible.
- Ropa de fútbol NEGRA LISA con vivos dorados finos, SIN escudo, SIN logos, SIN sponsor, SIN marcas, SIN números ni nombres en ninguna prenda.

═══ FORMATO ═══
VERTICAL 9:16 (pantalla completa de celular), más alto que ancho. El personaje va centrado, de la cintura o las rodillas para arriba, ocupa el 60 % del alto, con aire arriba y abajo, y se separa con claridad del fondo: fondo con profundidad y fuera de foco, contorno del cuerpo bien limpio contra una zona más oscura o más clara.
Calidad de cine: luz dirigida y con carácter, textura real de piel y tela, grano fino de película. Nada de look de videojuego ni de póster de IA genérico.

SIN TEXTO en la imagen: ni títulos, ni carteles, ni marcadores, ni letras en ningún objeto, ni watermarks.`;

const REPARTO = [
  { id: 'megafono', credito: 'Protagonizada por', nombre: ['El','Megáfono'], tam: 245, sangria: 230, aireNombre: 40, baja: 135, yPost: -210, bajaPost: 265, rasgo: 'Pide la pelota a los gritos por audio.', remate: 'Cuando le llega, no hay más equipo.', voz: 'El Megáfono. Pide la pelota a los gritos por audio. Cuando le llega, no hay más equipo.', marcaRasgo: 'Pide', marcaRemate: 'Cuando',
    escena: 'Cancha de fútbol de noche, llovizna fina que brilla a contraluz. Un flaco de unos treinta años con barba corta y auriculares gamer con micrófono grita con toda su alma al micrófono: boca bien abierta, cuello tenso, un brazo en alto reclamando. Con el otro brazo aprieta una pelota de fútbol contra la cadera, como quien no piensa soltarla. Luz fría azulada de reflectores desde atrás y un acento dorado de costado.' },
  { id: 'nueve', credito: 'Con', nombre: ['El','Nueve'], tam: 400, baja: 150, yPost: -210, bajaPost: 110, rasgo: 'Central hasta el minuto 90. Después, de nueve.', remate: '¿El contragolpe? Que corran otros.', voz: 'El Nueve. Central hasta el minuto noventa, después de nueve, y el contragolpe que lo corran otros.', marcaRasgo: 'Central', marcaRemate: 'contragolpe',
    escena: 'Área rival de un estadio de noche, justo antes de un córner, reflectores rojizos y humo de bengalas lejos, tribuna repleta y fuera de foco. Un defensor central enorme, pelado, de unos treinta y cinco años, con auriculares gamer con micrófono, las medias bajas y la camiseta embarrada, parado solo con los brazos bien abiertos, mirando hacia arriba con cara de "este lo hago yo", dueño del lugar. Lleva una cinta dorada de capitán sin letras.' },
  { id: 'trabo', credito: 'Y también', nombre: ['','Se trabó'], tam: 320, baja: 190, yPost: -60, bajaPost: 70, rasgo: 'Nunca erró un pase.', remate: 'Fue el joystick. Fue internet. Él, nunca.', voz: 'Se Trabó. Nunca erró un pase: fue el joystick, fue internet. Él, nunca.', marcaRasgo: 'Nunca', marcaRemate: 'Fue',
    escena: 'Cuarto gamer a oscuras con luces LED violetas y un monitor encendido fuera de foco detrás (sin nada legible). Un pibe de unos veintidós años, con rulos y auriculares gamer con micrófono, sentado en una silla, le muestra a la cámara un joystick negro genérico sostenido con las dos manos, cejas bien arriba y cara de indignación absoluta, como presentando la prueba de un crimen. Camiseta de fútbol negra. Luz violeta y cian del monitor en la cara.' },
  { id: 'abogado', credito: 'Participación especial', nombre: ['El','Abogado'], tam: 350, baja: 170, yPost: -100, bajaPost: 130, rasgo: 'Le discute al árbitro de una partida online.', remate: 'El árbitro es un programa.', voz: 'El Abogado. Le discute al árbitro de una partida online. El árbitro es un programa.', marcaRasgo: 'Le', marcaRemate: 'El',
    escena: 'Mitad de cancha de un estadio vacío de noche, con niebla baja y luz dura cenital. Un hombre de unos cuarenta y cinco años con bigote prolijo, saco de traje puesto encima de la camiseta de fútbol y auriculares gamer con micrófono, de perfil tres cuartos, señala con el índice y discute muy seguro de sí mismo, con la otra mano abierta, como en un juicio. Frente a él, en el fondo y a un costado, un árbitro hecho solo de líneas de luz azul cian, como un hologram de alambre sin rostro, totalmente indiferente.' },
  { id: 'profe', credito: 'Dirigida por', nombre: ['El','Profe'], tam: 360, baja: 110, yPost: -170, bajaPost: 110, rasgo: 'Minuto 3: «cambiá la táctica».', remate: 'Minuto 5: «volvé a la de antes».', voz: 'El Profe. Minuto tres: cambiá la táctica. Minuto cinco: volvé a la de antes.', marcaRasgo: 'Minuto', marcaRemate: 'Minuto',
    escena: 'Línea de cal al borde de una cancha al atardecer, cielo naranja y dorado, estadio fuera de foco. Un hombre de unos cincuenta años, pelo engominado hacia atrás, campera negra de entrenador con vivos dorados y auriculares gamer con micrófono, levanta una pizarra táctica llena de flechas y círculos enredados (sin letras ni números), la señala con desesperación con un marcador en la mano y mira a cámara como si faltaran segundos para el desastre.' },
  { id: 'unoymevoy', credito: 'Y hasta el final', nombre: ['','Uno y me voy'], tam: 230, baja: 110, yPost: -210, bajaPost: 110, rasgo: 'Ya tiene la campera puesta.', remate: 'Dos de la mañana: sigue ahí.', voz: 'Uno y Me Voy. Ya tiene la campera puesta. Dos de la mañana: sigue ahí.', marcaRasgo: 'Ya', marcaRemate: 'Dos',
    escena: 'Living a oscuras a la madrugada, ventana con la ciudad dormida y desenfocada atrás. Un hombre de unos treinta y cinco años sentado en la punta del sillón, con una campera abrigada ya puesta y cerrada, auriculares gamer con micrófono, en una mano las llaves de la casa colgando y en la otra un joystick negro genérico. Ojeras enormes, mirada fija hacia adelante, sin parpadear, iluminado únicamente por el resplandor azul de un televisor fuera de cuadro. Debajo de la campera se ve la camiseta negra.' },
];

const HUMANO = ['trabo', 'abogado', 'unoymevoy'];

// Fondo sin el personaje: el hueco se rellena difundiendo los colores de alrededor (a baja resolución), para que al
// separarse las capas no quede un fantasma detrás. El fondo va desenfocado en el video, así que el relleno no se nota.
async function fondoSinPersona(imgPng, recortePng, salida) {
  const { data: rgb, info } = await sharp(imgPng).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const alfa = await sharp(recortePng).resize(w, h).ensureAlpha().extractChannel(3).blur(14).raw().toBuffer();
  const w2 = Math.ceil(w / 8), h2 = Math.ceil(h / 8);
  const v = new Float32Array(w2 * h2 * 3), n = new Uint32Array(w2 * h2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alfa[y * w + x] > 6) continue;   // margen generoso: mejor perder fondo que arrastrar un borde del personaje
    const k = (y >> 3) * w2 + (x >> 3);
    n[k]++;
    for (let c = 0; c < 3; c++) v[k * 3 + c] += rgb[(y * w + x) * 3 + c];
  }
  for (let k = 0; k < n.length; k++) if (n[k]) for (let c = 0; c < 3; c++) v[k * 3 + c] /= n[k];
  for (let it = 0; it < 500; it++) for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) {
    const k = y * w2 + x;
    if (n[k]) continue;
    for (let c = 0; c < 3; c++) {
      let sum = 0, m = 0;
      if (x > 0) { sum += v[(k - 1) * 3 + c]; m++; }
      if (x < w2 - 1) { sum += v[(k + 1) * 3 + c]; m++; }
      if (y > 0) { sum += v[(k - w2) * 3 + c]; m++; }
      if (y < h2 - 1) { sum += v[(k + w2) * 3 + c]; m++; }
      v[k * 3 + c] = sum / m;
    }
  }
  const crudo = (a, b) => ({ raw: { width: a, height: b, channels: 3 } });
  const relleno = await sharp(Buffer.from(Uint8ClampedArray.from(v)), crudo(w2, h2)).resize(w, h, { kernel: 'cubic' }).blur(10).raw().toBuffer();
  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const m = alfa[i] / 255;
    for (let c = 0; c < 3; c++) out[i * 3 + c] = rgb[i * 3 + c] * (1 - m) + relleno[i * 3 + c] * m;
  }
  await sharp(out, crudo(w, h)).jpeg({ quality: 90 }).toFile(salida);
}

async function capas(imgs) {
  fs.mkdirSync(CAPAS, { recursive: true });
  // u2net conserva lo que el personaje tiene en las manos (pelota, pizarra); u2net_human_seg saca lo que no es persona
  // (el árbitro de luz, el sillón, la silla), que con u2net quedaba pegado al recorte.
  for (const modelo of ['u2net', 'u2net_human_seg']) {
    const faltan = REPARTO.filter(r => (HUMANO.includes(r.id) ? 'u2net_human_seg' : 'u2net') === modelo && !fs.existsSync(path.join(CAPAS, `${r.id}.png`)));
    if (!faltan.length) continue;
    const tmp = path.join(DIR, 'capas-entrada');
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    for (const r of faltan) fs.copyFileSync(imgs[r.id], path.join(tmp, `${r.id}.png`));
    const py = spawnSync('python', [path.join(ROOT, 'scripts/stream/quitar-fondo.py'), tmp, CAPAS, modelo], { encoding: 'utf8', timeout: 20 * 60000 });
    if (py.status !== 0) throw new Error('rembg: ' + (py.stderr || py.stdout).slice(-400));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  for (const r of REPARTO) {
    const f = path.join(CAPAS, `${r.id}-fondo.jpg`);
    if (!fs.existsSync(f)) await fondoSinPersona(imgs[r.id], path.join(CAPAS, `${r.id}.png`), f);
  }
}

fs.mkdirSync(DIR, { recursive: true });
log('Imágenes (ChatGPT)…');
const imgs = {};
try {
  for (const r of REPARTO) {
    imgs[r.id] = await generarImagen({ id: r.id, carpeta: DIR, vertical: true, adjuntos: [], promptCompleto: pedido(r.escena) });
    log(`  ${r.id} ✓`);
  }
} finally { await cerrar(); }

log('Capas (rembg + fondo)…');
await capas(imgs);
if (flag('--solo-imagenes')) { log('Listo (solo imágenes y capas).'); process.exit(0); }

// Recortes sin márgenes para el reparto completo (gancho, cierre y portada del carrusel).
const tight = {}, medida = {};
for (const r of REPARTO) {
  const f = path.join(CAPAS, `${r.id}-tight.png`);
  if (!fs.existsSync(f)) await sharp(path.join(CAPAS, `${r.id}.png`)).trim({ threshold: 10 }).toFile(f);
  const m = await sharp(f).metadata();
  tight[r.id] = f; medida[r.id] = m.width / m.height;
}

// La voz manda: una frase por escena; la duración sale de la frase y los textos entran con la palabra marcada.
const OFF = 0.3;
const VOZ_DIR = path.join(DIR, 'voz');
// En la voz sin "de Clubs Pro", que ya está en pantalla: el gancho tiene que entrar en los primeros segundos.
const GANCHO = 'En tu equipo hay uno de estos seis. Y si no lo encontrás, sos vos.';
const CIERRE = '¿Cuál sos vos? Mandáselo al de tu equipo.';
const norm = w => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ]/g, '');
const momento = (f, palabra, desde = 0) => {
  const i = f.palabras.findIndex((p, k) => k >= desde && norm(p.w) === norm(palabra));
  if (i < 0) throw new Error(`No encuentro "${palabra}" en la voz: ${f.palabras.map(p => p.w).join(' ')}`);
  return f.palabras[i].t + OFF;
};
const fGancho = narrar(GANCHO, VOZ_DIR), fCierre = narrar(CIERRE, VOZ_DIR);
const frases = [fGancho];
const tiempos = [{ dur: fGancho.dur + OFF + 0.45, hay: momento(fGancho, 'hay'), seis: momento(fGancho, 'seis'), si: momento(fGancho, 'si'), sos: momento(fGancho, 'sos') }];
const reparto = REPARTO.map((r, i) => {
  const f = narrar(r.voz, VOZ_DIR);
  frases.push(f);
  const nombreFin = r.voz.split(/\s+/).findIndex(w => /\.$/.test(w)) + 1;
  tiempos.push({ dur: f.dur + OFF + (i === 5 ? 1.1 : 0.75), nombre: OFF, rasgo: momento(f, r.marcaRasgo, nombreFin), remate: momento(f, r.marcaRemate, nombreFin + 1) });
  return { ...r, recorte: archivo(path.join(CAPAS, `${r.id}.png`)), fondo: archivo(path.join(CAPAS, `${r.id}-fondo.jpg`)), tight: archivo(tight[r.id]), y: 0 };
});
frases.push(fCierre);
tiempos.push({ dur: fCierre.dur + OFF + 1.6, manda: momento(fCierre, 'mandaselo') });

// Reparto completo: nunca "en fila como soldados" (regla de Juan), alturas y planos distintos, el del frente tapa los cortes.
const escalar = (lista, k) => lista.map(d => ({ ...d, h: d.h * k, x: d.x * k + 540 * (1 - k) }));
const COLOC = { nueve: [560, 1020, 1], megafono: [235, 1060, 2], abogado: [870, 1000, 2], profe: [390, 820, 3], trabo: [755, 760, 4], unoymevoy: [540, 620, 5] };
const disp = REPARTO.map(r => { const [cx, h, z] = COLOC[r.id]; return { x: cx - h * medida[r.id] / 2, h, z }; });
const datos = {
  escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')), reparto, tiempos, destacado: REPARTO.findIndex(r => r.id === 'unoymevoy'),
  disp, dispPost: escalar(disp, 0.74),
};
const total = tiempos.reduce((s, x) => s + x.dur, 0);
log(`Guion: ${total.toFixed(1)} s · ${tiempos.map(x => x.dur.toFixed(1)).join(' + ')}`);

// Cuadros clave sin renderizar el video, para ajustar la plantilla.
if (flag('--cuadros')) {
  const sal = path.join(DIR, 'cuadros');
  fs.rmSync(sal, { recursive: true, force: true }); fs.mkdirSync(sal, { recursive: true });
  const b = await chromium.launch();
  for (const fmt of ['story', 'post']) {
    const p = await b.newPage({ viewport: fmt === 'post' ? { width: 1080, height: 1350 } : { width: 1080, height: 1920 } });
    await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/companeros.html')));
    await p.evaluate(([d, f]) => pintar(d, f), [datos, fmt]);
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
    const lista = fmt === 'post'
      ? tiempos.map((_, n) => [n, 99])
      : tiempos.flatMap((x, n) => n === 0 ? [[0, 0.4], [0, x.seis + 0.7], [0, x.sos + 0.4]] : n === 7 ? [[7, 0.5], [7, x.dur - 0.5]] : [[n, 0.08], [n, x.nombre + 0.18], [n, x.rasgo + 1.2], [n, x.dur - 0.4], [n, x.dur - 0.08]]);
    for (const [n, t] of lista) {
      await p.evaluate(([n, t]) => mostrar(n, t), [n, t]);
      await p.locator('#lienzo').screenshot({ path: path.join(sal, `${fmt}-${n}-${String(t.toFixed(2)).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 75 });
    }
    await p.close();
  }
  await b.close();
  // Hojas de control: todos los cuadros de cada formato en una imagen
  const tiempo = f => f.split('-').slice(1, 3).map(parseFloat);
  for (const [fmt, W, H, C] of [['story', 270, 480, 8], ['post', 360, 450, 4]]) {
    const lista = fs.readdirSync(sal).filter(f => f.startsWith(fmt)).sort((a, b) => tiempo(a)[0] - tiempo(b)[0] || tiempo(a)[1] - tiempo(b)[1]);
    const comp = await Promise.all(lista.map(async (f, i) => ({ input: await sharp(path.join(sal, f)).resize(W, H).toBuffer(), left: (i % C) * W, top: Math.floor(i / C) * H })));
    await sharp({ create: { width: W * C, height: Math.ceil(lista.length / C) * H, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 82 }).toFile(path.join(DIR, `hoja-${fmt}.jpg`));
  }
  log('Cuadros en ' + sal);
  process.exit(0);
}

const ID = 'viral-mar-companeros-2026-11-09';
const musica = await elegirMusica(ID);
const tema = infoTema(musica).titulo;
const base = path.join(DIR, 'companeros-sin-voz.mp4'), conVoz = path.join(DIR, 'companeros-voz.mp4'), mp4 = path.join(DIR, 'companeros.mp4'), jpg = path.join(DIR, 'companeros-portada.jpg');
if (!flag('--sin-render') && !flag('--solo-placas')) {
log(`Render (${total.toFixed(1)} s, ${tema})…`);
await video('companeros.html', datos, base, { escenas: tiempos.map((x, n) => ({ n, dur: x.dur })), fps: 60, desenfoque: true, musica });
let t0 = 0;
const pistas = frases.map((f, i) => { const o = { ...f, en: t0 + OFF }; t0 += tiempos[i].dur; return o; });
agregarVoz(base, pistas, conVoz);

await portada({ imagen: imgs.megafono, kicker: 'EL REPARTO', titulo: 'Uno de estos *seis* está en tu equipo', foco: '50% 30%' }, jpg);
conPortada(conVoz, jpg, mp4);
await carrusel('companeros.html', datos, DIR, 'companeros-placa');
}
if (flag('--solo-placas')) await carrusel('companeros.html', datos, DIR, 'companeros-placa');
const slides = tiempos.map((_, i) => path.join(DIR, `companeros-placa-${i + 1}.jpg`));
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4), uSl = [];
for (const s of slides) uSl.push(await subir(s));
const uPortada = await subirPortada(jpg, 'social/viral/companeros-portada.jpg');

const vid = [{ tipo: 'video', url: uVid, vertical: true }];
const desc = `${Math.round(total)} s · lleva voz (Elena) · 6 personajes inventados con ChatGPT en capas + motion · música: ${tema}`;
const V = o => ({ decision: 'pendiente', protagonistas: [], descripcion: desc, musica: tema, media: vid, local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-09', pieza: 'mar-companeros' },
  titulo: 'Los 6 compañeros que tenés en Clubs Pro', piezas: [
    V({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Los 6 compañeros', metodo: 'ig-reel',
      texto: 'Todos tenemos uno de estos en el equipo. Mandáselo y no digas nada.\n\n¿Cuál de los seis sos vos?\n\n#TopSecretFC #ProClubs #EAFC' }),
    V({ id: 'tiktok', red: 'tiktok', formato: 'Video · Los 6 compañeros', metodo: 'tiktok',
      texto: 'El que grita por audio, el que siempre se trabó, el de "uno y me voy". ¿Cuál sos vos? #TopSecretFC #ProClubs #EAFC #ClubsPro' }),
    V({ id: 'yt-short', red: 'youtube', formato: 'Short · Los 6 compañeros', metodo: 'youtube',
      titulo: 'Los 6 compañeros que tenés en tu equipo de Pro Clubs | EA FC',
      texto: 'Si no encontrás al tuyo, sos vos. Mandáselo al de tu equipo. #Shorts #ProClubs #EAFC' }),
    { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel · Los 6 compañeros', decision: 'pendiente', protagonistas: [], metodo: 'ig-carrusel',
      descripcion: 'Una placa por personaje, sin música ni voz. Va además del Reel porque el guion aprobado pide las dos.',
      media: uSl.map(url => ({ tipo: 'imagen', url })), local: { slides },
      texto: 'En tu equipo de Clubs Pro hay uno de estos seis. Y si no lo encontrás, sos vos.\n\nDeslizá y fijate: el que grita por audio, el central que aparece de nueve, el que siempre se trabó, el que le discute a un programa, el que cambia la táctica a los 3 minutos y el que iba a jugar uno solo.\n\n¿Cuál sos vos? Mandáselo al de tu equipo y no digas nada.\n\n#TopSecretFC #ProClubs #EAFC #ClubsPro' },
  ],
};
// El crédito del tema lo agrega agregarLote: se revisa el texto tal como va a salir.
let avisos = 0;
for (const p of lote.piezas) {
  const final = p.musica ? { ...p, texto: `${p.texto}\n\n${creditoTexto(p.musica)}` } : p;
  for (const r of revisarPieza(final, lote)) { avisos++; log(`  aviso ${p.id}: ${r.msg}`); }
}
if (avisos) throw new Error(`${avisos} avisos del revisor: corregir antes de cargar el lote.`);
await agregarLote(lote);
log('Listo: ' + uVid);
