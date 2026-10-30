// Resumen quincenal de Espacio Gamer en placas (pedido de Juan, 2026-10-30): es la noticia del día del sábado 31/10
// (no hubo resumen semanal el 24/10: se cayó la escritura de textos). Carrusel de 8 placas 4:5 + noticia del sitio con
// las placas adentro + Instagram, Facebook, X y TikTok (fotos). El video del mismo resumen sale el domingo
// (quincena-eg.mjs). El lote se llama resumen-2026-10-31: así la tarea del resumen semanal de las 08:00 no arma otro.
//
//   node scripts/social/piezas/quincena-eg-placas.mjs [--sin-lote]
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { archivo, carrusel } from '../lib/render.mjs';
import { render } from '../lib/datos.mjs';
import { equiposDivisionEG } from '../../lib/espacio-gamer.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { DIR_IA } from './quincena-eg-imagenes.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/quincena-eg/placas');
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const FECHA = '2026-10-31';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [quincena-placas] ${m}`);
const ia = id => archivo(path.join(DIR_IA, `${id}.png`));

const equipos = await equiposDivisionEG('challengers-2-espacio-gamer-argentina');
const esc = n => equipos.find(t => t.nombre.toLowerCase() === n.toLowerCase())?.logo || '';
const NOCHES = [
  { dia: 'MARTES 20/10', p: [[2, 'Sub 21', 'V', 1, 0]] },
  { dia: 'JUEVES 22/10', p: [[1, 'SF Drysdale', 'L', 3, 3], [3, 'Los Picantes', 'L', 1, 0], [4, 'InfinitX', 'V', 1, 0]] },
  { dia: 'MARTES 27/10', p: [[5, 'Miskymayu FC', 'L', 0, 2], [6, 'Parke Avellane', 'L', 2, 1]] },
  { dia: 'JUEVES 29/10', p: [[7, 'Al Hueso', 'V', 0, 3], [8, 'WAP eSports', 'L', 0, 3]] },
].map(n => ({ dia: n.dia, filas: n.p.map(([f, rival, lv, gf, gc]) => ({ etiqueta: `FECHA ${f} · ${lv === 'L' ? 'LOCAL' : 'VISITANTE'}`, rival, escudo: esc(rival), marcador: `${gf}-${gc}`, res: gf > gc ? 'V' : gf < gc ? 'D' : 'E' })) }));

// Tabla en vivo (la misma que posiciones.html): del 5º al 9º, con Top Secret marcado
const tabla = await (await fetch('https://top-secret-proxy.juan-c-m-1985.workers.dev/eg-table')).json();
const iTS = tabla.findIndex(t => /top secret/i.test(t.name));
const ts = tabla[iTS];
if (!ts || ts.gp !== 8 || ts.pts !== 13) throw new Error(`La tabla de EG cambió (Top Secret: ${JSON.stringify(ts)}): revisar los textos antes de publicar.`);
const quinto = tabla[4];
const filasTabla = tabla.slice(Math.max(0, iTS - 2), iTS + 3).map((t, k) => ({ pos: Math.max(0, iTS - 2) + k + 1, nombre: t.name, logo: t.logo, pj: t.gp, pts: t.pts, ts: /top secret/i.test(t.name) }));

// Frame real de la tijera (repetición del vivo del 22/10)
const frameTijera = path.join(ROOT, 'fuentes/redes/noche-2026-10-22/cuadros-repe/0120.jpg');
const D = {
  kicker: 'ESPACIO GAMER · 20/10 AL 29/10',
  escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  portada: { imagen: ia('apertura'), foco: '50% 12%', kicker: 'Resumen de la quincena', big: '15 DÍAS', titulo: 'en <b>Espacio Gamer</b>',
    cifras: [{ n: 8, t: 'PARTIDOS' }, { n: 13, t: 'PUNTOS' }, { n: `${iTS + 1}º`, t: 'EN LA TABLA' }] },
  semanas: [
    { kicker: 'Semana 1 · Fechas 1 a 4', titulo: 'Invictos:<br><b>3 triunfos y 1 empate</b>', noches: NOCHES.slice(0, 2) },
    { kicker: 'Semana 2 · Fechas 5 a 8', titulo: 'Un triunfo<br><b>y una noche dura</b>', noches: NOCHES.slice(2) },
  ],
  goleadoresTitulo: '8 goles,<br><b>4 nombres</b>',
  goleadores: [['Lautavester7', 4], ['Cabers14', 2], ['NicoBJ_96', 1], ['pepolemmo2710', 1]].map(([gt, goles]) => ({ gt, goles, img: archivo(render(gt, ['Gesto4', 'Unica4', 'Frente4', 'Brazos4'])) })),
  momentos: [
    { imagen: archivo(frameTijera), foco: '20% 50%', kicker: 'SF Drysdale · Fecha 1', big: '3-3', titulo: 'Íbamos 1-3.<br><b>Lo empatamos de tijera.</b>',
      lista: [["87'", 'Lautavester7 descuenta'], ["90+'", 'Lautavester7, de tijera']] },
    { imagen: ia('descuento'), foco: '50% 35%', recreacion: true, kicker: 'Los goles después del 90', big: '3', titulo: 'goles en el <b>descuento</b>',
      lista: [["91'", 'pepolemmo2710 · 1-0 a Sub 21'], ["90+'", 'Lautavester7 · 3-3 a SF Drysdale'], ["90+'", 'Cabers14 · 2-1 a Parke Avellane']] },
  ],
  tabla: { posicion: `${iTS + 1}º`, puntos: `${ts.pts} PUNTOS<span>A ${quinto.pts - ts.pts} DEL QUINTO</span>`, filas: filasTabla, nota: `${ts.w}G · ${ts.d}E · ${ts.l}P · ${ts.gf} goles a favor, ${ts.gc} en contra` },
  prox: { imagen: ia('revancha'), kicker: 'Lo que viene · Martes 3/11', titulo: 'Dos partidos<br><b>para volver a sumar</b>',
    filas: [{ etiqueta: 'FECHA 9 · VISITANTE · EL LÍDER', rival: 'Fco Kannabiense', escudo: esc('Fco Kannabiense'), hora: '23:00' },
            { etiqueta: 'FECHA 10 · LOCAL', rival: 'Argentinos Jrs Esp', escudo: esc('Argentinos Jrs Esp'), hora: '23:30' }] },
};
for (const g of D.goleadores) if (!g.img || g.img.endsWith('null')) throw new Error('Falta un render de goleador');

log('Placas…');
const slides = await carrusel('quincena-placas.html', D, DIR, 'placa');
log(`${slides.length} placas en ${DIR}`);
if (process.argv.includes('--sin-lote')) process.exit(0);

const v = Date.now().toString(36);
const urls = [];
for (const s of slides) { const key = `social/${FECHA}/quincena-${path.basename(s)}`; await putFile(s, key); urls.push(`${MEDIA}/${key}?v=${v}`); }

// ── Textos (escritos a mano con los datos de arriba) ──
const titulo = '15 días en Espacio Gamer: tijera, descuento y una noche para corregir';
const bajada = 'Ocho fechas, 13 puntos y el séptimo puesto: Top Secret arrancó invicto la primera semana y cerró la segunda con dos derrotas por 3-0. El martes, el líder.';
const parr = [
  'Top Secret cumplió sus primeras ocho fechas en Espacio Gamer y el balance tiene de todo: cuatro triunfos, un empate y tres derrotas, 8 goles a favor y 12 en contra. Suma 13 puntos y está séptimo, a uno del quinto puesto.',
  'La primera semana fue invicta. El debut, el martes 20, se ganó 1-0 ante Sub 21 con un gol de pepolemmo2710 en el minuto 91. El jueves 22 llegó la noche de tres partidos: ante SF Drysdale el equipo perdía 1-3 y lo empató con Lautavester7, que descontó en el 87 y lo igualó de tijera en el descuento; después vinieron dos 1-0, a Los Picantes (NicoBJ_96) y a InfinitX (Lautavester7).',
  'La segunda semana costó más. El martes 27 se perdió 0-2 con Miskymayu FC y se ganó 2-1 a Parke Avellane: Lautavester7 empató gambeteando al arquero y Cabers14 lo dio vuelta en el 90+. El jueves 29 fue la noche más dura, con dos derrotas por 0-3 ante Al Hueso y WAP eSports.',
  'Lautavester7 es el goleador de la quincena con 4 goles, seguido por Cabers14 con 2. Tres de los ocho goles llegaron después del minuto 90.',
  'Lo que viene es exigente: el martes 3 de noviembre, a las 23:00, Top Secret visita a Fco Kannabiense, el líder invicto, y a las 23:30 recibe a Argentinos Jrs Esp. Los dos partidos van en vivo por Twitch, Kick, YouTube e Instagram.',
];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const noticia = {
  id: `quincena-eg-${FECHA}`, generatedAt: new Date().toISOString(), category: 'Analisis',
  title: titulo, date: FECHA, dateLabel: `31 de ${MESES[9]} de 2026`, excerpt: bajada,
  image: urls[0], imagePost: urls[0],
  body: [
    parr[0],
    { specs: [['Fechas', '1 a 8'], ['Récord', `${ts.w}G · ${ts.d}E · ${ts.l}P`], ['Goles', `${ts.gf} a favor · ${ts.gc} en contra`], ['Tabla', `${iTS + 1}º con ${ts.pts} puntos`]] },
    { h: 'Una semana invicta' },
    parr[1],
    { pair: [urls[1], urls[4]], caption: 'Los resultados de la primera semana y la tijera ante SF Drysdale.' },
    { h: 'Una semana para corregir' },
    parr[2],
    { pair: [urls[2], urls[5]], caption: 'La segunda semana y los tres goles después del 90 (recreación).' },
    { h: 'Los goles' },
    parr[3],
    { pair: [urls[3], urls[6]], caption: 'Goleadores de la quincena y la tabla de Espacio Gamer.' },
    { quote: 'Tres de los ocho goles llegaron después del minuto 90.', by: 'La quincena en datos' },
    { h: 'Lo que viene' },
    parr[4],
    { img: urls[7], caption: 'Martes 3/11: el líder y Argentinos Jrs Esp.' },
  ],
  status: 'published',
};
const T = {
  ig: '15 días en Espacio Gamer 📊\n\nSemana 1: invictos (3 triunfos y un empate), con la tijera de Lautavester7 para el 3-3.\nSemana 2: un 2-1 en el 90+ con gol de Cabers14… y una noche dura.\n\n13 puntos, séptimos, a uno del quinto. El martes, el líder.\n\nDeslizá para ver todo 👉\n\n#TopSecretFC #EspacioGamer #ProClubs #EAFC',
  fb: 'El resumen de nuestras primeras ocho fechas en Espacio Gamer: 4 triunfos, 1 empate y 3 derrotas, 13 puntos y el séptimo puesto. Lautavester7 lleva 4 goles y tres de los ocho llegaron después del minuto 90.\n\nEl martes 3/11: 23:00 vs Fco Kannabiense (el líder) y 23:30 vs Argentinos Jrs Esp, en vivo por Twitch, Kick, YouTube e Instagram.\n\nLa nota completa: https://topsecret.ar/noticias.html?id=' + noticia.id,
  x: '15 días en Espacio Gamer: 4G 1E 3D, 13 puntos, séptimos. La tijera para el 3-3, el 2-1 en el 90+ y una noche dura para corregir. El martes, el líder. #TopSecretFC',
  tt: '15 días en Espacio Gamer en 8 placas 📊 #TopSecretFC #ProClubs #EAFC #EspacioGamer',
};
const imgs = urls.map(url => ({ tipo: 'imagen', url }));
const local = { slides };
const piezas = [
  { id: 'sitio', red: 'sitio', formato: 'Noticia en el sitio', descripcion: 'La noticia del día del sábado · 5 párrafos separados por una línea en blanco; las placas van adentro', media: imgs.slice(0, 1), titulo, texto: parr.join('\n\n'), noticia, metodo: 'sitio-noticia' },
  { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel', descripcion: '8 placas', media: imgs, texto: T.ig, metodo: 'ig-carrusel' },
  { id: 'fb-album', red: 'facebook', formato: 'Álbum de fotos', descripcion: 'Las 8 placas en un post', media: imgs, texto: T.fb, metodo: 'fb-album' },
  { id: 'x-post', red: 'x', formato: 'Post con 4 imágenes', descripcion: 'Portada, semana 1, semana 2 y goleadores', media: imgs.slice(0, 4), texto: T.x, metodo: 'x-imagenes' },
  { id: 'tiktok', red: 'tiktok', formato: 'Carrusel de fotos', descripcion: 'Las 8 placas', media: imgs, titulo: '15 días en Espacio Gamer', texto: T.tt, metodo: 'tiktok-fotos' },
].map(p => ({ decision: 'pendiente', ...p, local }));
await agregarLote({
  id: `resumen-${FECHA}`, tipo: 'resumen-semanal', creado: new Date().toISOString(),
  titulo: '15 días en Espacio Gamer · resumen quincenal en placas (noticia del día) · sábado 31/10 08:00',
  publicarA: `${FECHA}T08:00:00-03:00`, piezas,
});
log(`Lote resumen-${FECHA} en aprobar.html: ${piezas.length} piezas.`);
