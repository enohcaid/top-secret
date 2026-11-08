#!/usr/bin/env node
// Anuncio del fichaje de davidelapaternal (Juan, 2026-11-06). Datos reales: mediocampista, dorsal 34, PC (roster.js).
//   node scripts/social/piezas/fichaje-davidelapaternal.mjs --imagenes   → genera las fotos (revisarlas antes de seguir)
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/viral/fichaje-davidelapaternal');
fs.mkdirSync(DIR, { recursive: true });
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [fichaje] ${m}`);
const J = ['davidelapaternal'];

// La camiseta T4 no lleva número al frente: el 34 va en la espalda y chico en la pierna derecha del short.
export const ESCENAS = [
  { id: 'espalda', jugadores: J, kitId: 'titular', movimiento: 'La cámara avanza muy lentamente hacia la espalda del jugador. La luz cálida de los casilleros titila apenas.',
    escena: 'Vestuario vacío de noche, en penumbra, con una sola luz cálida dorada sobre los casilleros negros. davidelapaternal está DE ESPALDAS a la cámara, centrado, terminando de ponerse la camiseta negra titular de Top Secret: en la espalda se lee grande y nítido el número 34, sin ningún nombre ni otro texto. No se le ve la cara. Mucho aire oscuro arriba de la cabeza.' },
  { id: 'cancha', jugadores: J, kitId: 'titular', movimiento: 'La cámara retrocede lentamente mientras los reflectores del fondo destellan apenas. Fondo del estadio con leve movimiento de luz.',
    escena: 'Estadio vacío de noche, reflectores encendidos detrás de él, niebla baja de luz sobre el pasto. davidelapaternal, de frente a la cámara desde un ángulo bajo, entra caminando a la cancha con la pelota bajo un pie, mirada fija y seria hacia adelante, cara bien visible y fiel a su render. Camiseta negra titular con el escudo Clean dorado en el pecho y sin número al frente; short negro con 34 chico en la pierna derecha.' },
  { id: 'retrato', jugadores: J, kitId: 'titular', movimiento: 'Acercamiento muy lento a la cara. Un filo de luz dorada se desplaza lentamente por el hombro.',
    escena: 'Retrato editorial de medio cuerpo sobre fondo casi negro, con un filo de luz dorada lateral. davidelapaternal de frente, con los brazos a los costados, mirando directo a cámara con gesto sereno y seguro, cara muy nítida y fiel a su render, camiseta negra titular con el escudo Clean dorado en el pecho y sin número al frente. Espacio libre en el tercio de abajo.' },
];

if (process.argv.includes('--imagenes')) {
  const { generarImagen, cerrar } = await import('../lib/imagen.mjs');
  for (const e of ESCENAS) { const f = await generarImagen({ id: e.id, escena: e.escena, jugadores: e.jugadores, vertical: true, carpeta: DIR, kitId: e.kitId }); log(`${e.id} → ${f}`); }
  await cerrar();
  process.exit(0);
}

if (process.argv.includes('--clips')) {
  const { animar } = await import('../lib/clip.mjs');
  for (const e of ESCENAS) { animar(path.join(DIR, e.id + '.png'), e.movimiento); log(`clip ${e.id} ✓`); }
  process.exit(0);
}

// ── Video, portada, nota y lote ──
//   node scripts/social/piezas/fichaje-davidelapaternal.mjs [--cuadros] [--sin-lote] [--sin-render]
const sharp = (await import('sharp')).default;
const { chromium } = await import('playwright');
const { putFile } = await import('../../lib/r2.mjs');
const { elegirMusica, infoTema } = await import('../../lib/musica.mjs');
const { video, archivo } = await import('../lib/render.mjs');
const { cuadros } = await import('../lib/clip.mjs');
const { portada, conPortada, subirPortada } = await import('../lib/portada.mjs');
const { pulso } = await import('../lib/espectro.mjs');
const { agregarLote } = await import('../lib/aprobaciones.mjs');
const { revisarPieza } = await import('../../../revisar-textos.js');

const GT = 'davidelapaternal', ID = 'fichaje-davidelapaternal', PUBLICAR = '2026-11-08T13:00:00-03:00';
const flag = f => process.argv.includes(f);
const clips = {};
for (const e of ESCENAS) { const k = cuadros(path.join(DIR, e.id + '.mp4')); clips[e.id] = { dir: archivo(k.dir), n: k.n }; }
const musica = await elegirMusica(`viral-${ID}`), tema = infoTema(musica), { beat: B, inicio } = pulso(musica, 22);
const enP = s => Math.max(1, Math.round(s / B)) * B;
const T = { beat: B, golpe34: enP(3.2), dorsal: enP(1.5) };
T.pase = T.golpe34 + T.dorsal + enP(3.4);
T.pose = T.pase + enP(3.6);
T.fin = T.pose + enP(3.8);
log(`Tema ${tema.titulo} · ${Math.round(60 / B)} BPM · ${T.fin.toFixed(1)} s`);
const poseW = path.join(DIR, 'pose.webp');
if (!fs.existsSync(poseW)) await sharp(path.join(ROOT, `Renders/${GT}/Unica4.png`)).resize({ height: 1400 }).webp({ quality: 92 }).toFile(poseW);
const datos = { T, gt: GT, clips, pose: archivo(poseW), escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')) };

if (flag('--cuadros')) {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/fichaje.html')));
  await p.evaluate(d => pintar(d), datos);
  const M = [.7, 2, T.golpe34 + .05, T.golpe34 + .6, T.golpe34 + T.dorsal + .7, T.pase - .4, T.pase + .25, T.pase + B + .5, T.pose + .08, T.pose + .9, T.fin - 1, T.fin - .35], comp = [];
  for (const [i, t] of M.entries()) { await p.evaluate(t => mostrar(0, t), t); comp.push({ input: await sharp(await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 84 })).resize(240, 427).toBuffer(), left: (i % 6) * 240, top: Math.floor(i / 6) * 427 }); }
  await b.close();
  await sharp({ create: { width: 1440, height: 854, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 88 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja lista'); process.exit(0);
}

const base = path.join(DIR, 'base.mp4'), mp4 = path.join(DIR, `${ID}.mp4`), jpg = path.join(DIR, 'portada.jpg'), post = path.join(DIR, 'post.jpg'), historia = path.join(DIR, 'historia.mp4');
if (!flag('--sin-render')) await video('fichaje.html', datos, base, { escenas: [{ n: 0, dur: T.fin }], fps: 60, desenfoque: true, musica, musicaDesde: inicio });
fs.copyFileSync(base, historia);
await portada({ imagen: path.join(DIR, 'retrato.png'), kicker: 'Nuevo fichaje', titulo: `*${GT}*`, dato: '34', foco: '50% 30%' }, jpg);
conPortada(base, jpg, mp4);
// La foto del carrusel: la salida a la cancha, 4:5, con el nombre
{
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  const src = 'data:image/jpeg;base64,' + (await sharp(path.join(DIR, 'cancha.png')).resize(1080).jpeg({ quality: 90 }).toBuffer()).toString('base64');
  await p.setContent(`<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&display=block" rel="stylesheet"><style>body{margin:0;width:1080px;height:1350px;overflow:hidden;position:relative;background:#000;font-family:'Barlow Condensed'}img{position:absolute;left:0;top:-150px;width:1080px}.v{position:absolute;inset:0;background:linear-gradient(transparent 58%,rgba(4,3,2,.94) 88%)}.k{position:absolute;left:0;right:0;bottom:158px;text-align:center;color:#e9c67a;font-weight:600;font-size:40px;letter-spacing:9px}.n{position:absolute;left:0;right:0;bottom:58px;text-align:center;color:#fff;font-weight:700;font-size:112px}</style><img src="${src}"><div class="v"></div><div class="k">NUEVO FICHAJE · 34</div><div class="n">${GT}</div>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: post, type: 'jpeg', quality: 93 }); await b.close();
}
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36), K = `social/${ID}`;
await putFile(mp4, `${K}/${ID}.mp4`); await putFile(historia, `${K}/historia.mp4`); await putFile(post, `${K}/post.jpg`);
const uVid = `${MEDIA}/${K}/${ID}.mp4?v=${v}`, uHist = `${MEDIA}/${K}/historia.mp4?v=${v}`, uPost = `${MEDIA}/${K}/post.jpg?v=${v}`, uPortada = await subirPortada(jpg, `${K}/portada.jpg`);
const fotos = {};
for (const f of ['espalda', 'cancha']) { const s = path.join(DIR, f + '-web.jpg'); await sharp(path.join(DIR, f + '.png')).resize(1000).jpeg({ quality: 86 }).toFile(s); await putFile(s, `logos/noticias/${ID}-${f}.jpg`); fotos[f] = `${MEDIA}/logos/noticias/${ID}-${f}.jpg?v=${v}`; }

const LINK = `https://top-secret-proxy.juan-c-m-1985.workers.dev/og/${ID}`;
const PARRAFOS = [
  `Top Secret suma un jugador más para la temporada 4. <strong>${GT}</strong> llega al mediocampo, juega en PC y lleva el <strong>34</strong>.`,
  'Con él, el plantel llega a 18 jugadores. Su primera aparición con la camiseta del club está en el video de arriba: del vestuario a la cancha.',
  'Bienvenido a Top Secret.',
];
const noticia = {
  id: ID, category: 'Club', title: `${GT.toUpperCase()}, EL NUEVO 34 DE TOP SECRET`, date: '2026-11-08', dateLabel: '8 de noviembre de 2026',
  excerpt: `${GT} llega al mediocampo de Top Secret para la temporada 4. Juega en PC y lleva el 34.`, image: uPost, imagePost: uPost,
  body: [PARRAFOS[0], { specs: [['Puesto', 'Mediocampista'], ['Dorsal', '34'], ['Plataforma', 'PC'], ['Plantel', '18 jugadores']] },
    { video: uHist, poster: uPortada, vertical: true, caption: `${GT}, del vestuario a la cancha.` }, { h: 'El nuevo 34' }, PARRAFOS[1],
    { pair: [fotos.espalda, fotos.cancha], ratio: '9/16', caption: 'La camiseta titular, con el 34 en la espalda.' }, { quote: 'El 34 ya tiene dueño.', by: 'Top Secret FC' }, PARRAFOS[2]],
};
const descr = `${Math.round(T.fin)} s · fotos nuevas de ChatGPT animadas con Canva + su pose propia · sin voz (es un anuncio al ritmo de la música) · sale el domingo 8/11 a las 13:00 · música: ${tema.titulo}.`;
const P = o => ({ decision: 'pendiente', protagonistas: [GT], descripcion: descr, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'noticia', creado: new Date().toISOString(), publicarA: PUBLICAR, titulo: `Nuevo fichaje: ${GT} (nota + todas las redes)`, piezas: [
    { id: 'sitio', red: 'sitio', formato: 'Noticia en el sitio', metodo: 'sitio-noticia', decision: 'pendiente', descripcion: 'Club · con el video dentro de la nota · 3 párrafos separados por una línea en blanco', media: [{ tipo: 'imagen', url: uPost }], titulo: noticia.title, texto: PARRAFOS.join('\n\n'), noticia },
    P({ id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel (foto + video)', metodo: 'ig-carrusel', media: [{ tipo: 'imagen', url: uPost }, { tipo: 'video', url: uVid, vertical: true }], local: undefined, portada: undefined,
      texto: `El 34 ya tiene dueño.\n\n${GT} llega al mediocampo de Top Secret. Bienvenido.\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'ig-historia', red: 'instagram', formato: 'Historia', metodo: 'ig-historia', media: [{ tipo: 'video', url: uHist, vertical: true }], texto: '', musica: undefined }),
    P({ id: 'fb-video', red: 'facebook', formato: 'Reel / video', metodo: 'fb-video',
      texto: `Top Secret suma un jugador más para la temporada 4: ${GT}, mediocampista, juega en PC y lleva el 34. Con él, el plantel llega a 18 jugadores.\n\nLa nota: ${LINK}` }),
    P({ id: 'fb-historia', red: 'facebook', formato: 'Historia', metodo: 'fb-historia', media: [{ tipo: 'video', url: uHist, vertical: true }], texto: '', musica: undefined }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok', texto: `Camiseta nueva en el vestuario. ${GT} es el nuevo 34 de Top Secret. #TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short', metodo: 'youtube', titulo: `${GT}, nuevo fichaje de Top Secret | Pro Clubs EA FC`, texto: `Mediocampista, juega en PC y lleva el 34. Bienvenido a Top Secret.\n\n#Shorts #TopSecretFC #ProClubs` }),
    P({ id: 'x', red: 'x', formato: 'Post con video', metodo: 'x-video', texto: `${GT} es el nuevo 34 de Top Secret: mediocampista y ya con la camiseta puesta. Bienvenido. #TopSecretFC\n${LINK}` }),
  ],
};
let avisos = 0;
for (const p of lote.piezas) for (const r of revisarPieza({ ...p, texto: p.texto && p.musica ? `${p.texto}\n\nMúsica: "${p.musica}" — Tacet Sin (The Shorts) · youtube.com/@tacetsin` : p.texto }, lote)) { avisos++; log(`  aviso ${p.id}: ${r.msg}`); }
if (avisos) throw new Error(`${avisos} avisos del revisor: corregir antes de cargar el lote.`);
await agregarLote(lote);
log('Lote cargado: ' + lote.id);
process.exit(0);
