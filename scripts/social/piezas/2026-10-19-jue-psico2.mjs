#!/usr/bin/env node
// "Cabeza fría #2: tres partidos en una noche" (idea jue-psico2 del guion viral-guiones-2026-10-19). Misma plantilla
// que la primera (plantillas/cabeza-fria.html + carrusel psico.html), ahora con la voz de Elena (regla de Juan,
// 2026-10-14: las próximas Cabeza fría van con voz). Prueba real: la triple fecha del lunes 12/10 (1-0, 0-0 y 1-4):
// el tercero se nos fue, así que se cuenta como lo que aprendimos (no como "así se gana el tercero").
//
//   node scripts/social/piezas/2026-10-19-jue-psico2.mjs   [--solo-imagenes]
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { animar, cuadros } from '../lib/clip.mjs';
import { carrusel, video, archivo } from '../lib/render.mjs';
import { narracion, agregarVoz } from '../lib/voz.mjs';
import { cargar } from '../lib/datos.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/jue-psico2');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [psico2] ${m}`);
const ESCENAS = [
  { id: '1-tercero', jugadores: ['RS32-DaniStone'],
    escena: 'Cancha de noche, tarde, después de muchos partidos: RS32-DaniStone agotado, inclinado con las manos en las rodillas, transpirado, mirando el pasto. Reflectores fríos detrás, neblina. Cansancio de la tercera vuelta de una noche larga.',
    movimiento: 'Travelling muy lento hacia el jugador. La neblina se mueve frente a los reflectores.' },
  { id: '2-reset', jugadores: ['Guiidow'],
    escena: 'Banco de suplentes de un estadio de noche: Guiidow sentado, ojos cerrados, toalla blanca sobre los hombros, tomando agua de una botella, respirando tranquilo. Calma en medio del ruido; luz cálida lateral, fondo desenfocado.',
    movimiento: 'Paralaje lateral lento. Luces del fondo destellan apenas.' },
  { id: '3-espalda', jugadores: ['nikileo527'],
    escena: 'nikileo527 caminando hacia la cámara por la cancha de noche, mirada fija hacia adelante y decidida, dejando a sus espaldas una pantalla gigante del estadio encendida y desenfocada (sin texto legible). Plano medio, teleobjetivo.',
    movimiento: 'Travelling lento hacia atrás mientras el jugador avanza. La pantalla del fondo parpadea.' },
  { id: '4-consigna', jugadores: ['Juan_Martinez4', 'Huber236', 'Cabers14'],
    escena: 'Ronda de jugadores de Top Secret en la cancha de noche antes de arrancar: Juan_Martinez4 habla con firmeza marcando UN dedo hacia arriba (una sola consigna), Huber236 y Cabers14 lo escuchan concentrados, abrazados por los hombros. Plano medio cerrado, luz dura, tensión buena.',
    movimiento: 'Acercamiento muy lento a la ronda. Leve vaivén de cámara en mano.' },
];

// Guion hablado (Elena) y en pantalla, escena por escena.
const W = (t, c = '', extra = {}) => ({ t, c, ...extra });
const GUION = [
  { tipo: 'apertura', clip: '1-tercero', kicker: 'Lunes · triple fecha', marcador: '1-4',
    palabras: [W('Tercer'), W('partido', '', { br: true }), W('de'), W('la'), W('noche.', 'oro')],
    voz: 'Tres partidos en una noche. El tercero se nos fue uno a cuatro.', marcaEn: /cuatro/ },
  { tipo: 'tarjeta', titulo: ['Cabeza', 'fría'], sub: 'Lo que aprendimos de una triple',
    voz: 'Esto es lo que aprendimos.' },
  { tipo: 'error', clip: '2-reset', num: '01', kicker: 'Hábito 01', grade: 'linear-gradient(rgba(20,80,120,.3),transparent)',
    palabras: [W('Entre'), W('partidos,', '', { br: true }), W('reseteá', 'oro')],
    hacer: 'Parate, tomá agua y respirá lento. <b>No repases</b> el partido que terminó.',
    voz: 'Uno: el minuto entre partidos es para resetear. Parate, tomá agua, respirá lento. No repases el que terminó.', hacerEn: /Parate/ },
  { tipo: 'error', clip: '3-espalda', num: '02', kicker: 'Hábito 02', grade: 'linear-gradient(rgba(120,90,20,.25),transparent)',
    palabras: [W('El'), W('resultado', 'oro'), W('de', '', { br: true }), W('recién'), W('no', ''), W('juega', '', { br: true })],
    hacer: 'Ni la goleada ni la derrota pasan al próximo: <b>cada partido arranca 0-0</b>.',
    voz: 'Dos: el resultado de recién no juega el próximo. Ni la goleada, ni la derrota. Cada partido arranca cero a cero.', hacerEn: /goleada/ },
  { tipo: 'error', clip: '4-consigna', vel: 0.4, num: '03', kicker: 'Hábito 03', grade: 'linear-gradient(rgba(140,30,30,.22),transparent)',
    palabras: [W('Una'), W('sola', 'oro'), W('consigna', '', { br: true }), W('por'), W('partido')],
    hacer: 'Decila en voz alta antes de arrancar: <b>«presión alta»</b>, <b>«paciencia con la pelota»</b>.',
    voz: 'Tres: una sola consigna por partido. Decila en voz alta antes de arrancar.', hacerEn: /Decila/ },
  { tipo: 'cierre', titulo: ['Cabeza', 'fría'], cta: 'Guardalo para tu próxima triple.<br><b>Mandáselo</b> a tu equipo.',
    voz: 'Guardalo para tu próxima triple. Y mandáselo a tu equipo.' },
];

fs.mkdirSync(DIR, { recursive: true });
log('Imágenes (ChatGPT)…');
const imgs = {};
for (const e of ESCENAS) { imgs[e.id] = await generarImagen({ id: e.id, escena: e.escena, jugadores: e.jugadores, vertical: true, carpeta: DIR }); log(`  ${e.id} ✓`); }
await cerrar();
if (process.argv.includes('--solo-imagenes')) { log('Listo (solo imágenes).'); process.exit(0); }

log('Clips (Canva imagen a video)…');
const clips = {};
for (const e of ESCENAS) { const mp4 = animar(imgs[e.id], e.movimiento); clips[e.id] = cuadros(mp4); clips[e.id].dir = archivo(clips[e.id].dir); log(`  ${e.id} ✓`); }

// La voz manda: cada escena dura lo que su frase + aire; los textos del "qué hacer" entran con la palabra marcada.
const frases = GUION.map(g => narracion([{ en: 0, texto: g.voz }], path.join(DIR, 'voz'))[0]);
const OFF = 0.3;
let t = 0;
const escenas = GUION.map((g, i) => {
  const f = frases[i], dur = f.dur + OFF + (g.tipo === 'cierre' ? 2.4 : g.tipo === 'error' ? 1.4 : 0.8);
  const en = re => (f.palabras.find(p => re.test(p.w))?.t ?? 1) + OFF;
  const { voz, marcaEn, hacerEn, clip, ...resto } = g;
  const o = { ...resto, dur, t0: t, ...(clip ? { clip: clips[clip] } : {}), barras: 0,
    ...(g.marcador ? { marcador: { t: en(marcaEn), txt: g.marcador } } : {}), ...(hacerEn ? { hacerEn: en(hacerEn) } : {}),
    ...(g.tipo === 'cierre' ? { escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')) } : {}) };
  t += dur;
  return o;
});
const total = t;
const musica = await elegirMusica('viral-cabeza-fria-2', { preferida: process.env.TEMA || undefined });
log(`Render (${total.toFixed(1)} s, ${path.basename(musica)})…`);
const base = path.join(DIR, 'cabeza-fria-2-sin-voz.mp4');
await video('cabeza-fria.html', { escenas: escenas.map(({ t0, ...x }) => x) }, base, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica });
const mp4 = path.join(ROOT, 'fuentes/redes/viral/cabeza-fria-2.mp4');
agregarVoz(base, frases.map((f, i) => ({ ...f, en: escenas[i].t0 + OFF })), mp4, { volumenMusica: 0.55 });

// Carrusel para guardar (misma plantilla que la #1)
const d = await cargar();
const noche = d.partidos.filter(m => m.date === '2026-10-12');
const slides = await carrusel('psico.html', {
  serie: 'Cabeza fría · Psicología del juego', escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  portada: { kicker: 'Cabeza fría #2', titulo: 'Tres partidos<br>en <em>una</em><br>noche', img: archivo(path.join(ROOT, 'Renders/Guiidow/Brazos4.png')) },
  errores: [
    { titulo: 'Entre partidos,<br><em>reseteá</em>', pasa: 'El minuto entre partidos se va repasando el anterior: la jugada, el error, la discusión. Llegás al siguiente con la cabeza en el otro.', hacer: 'Parate, tomá agua y respirá lento. <strong>No repases</strong> el partido que terminó.' },
    { titulo: 'El resultado de recién<br><em>no juega</em>', pasa: 'Después de una goleada se relaja; después de una derrota se juega con bronca. Las dos te sacan del partido nuevo.', hacer: 'Ni la goleada ni la derrota pasan al próximo: <strong>cada partido arranca 0-0</strong>.' },
    { titulo: 'Una <em>sola</em><br>consigna', pasa: 'Con diez indicaciones a la vez no se cumple ninguna, y menos en el tercer partido, con la cabeza cansada.', hacer: 'Decila en voz alta antes de arrancar: <strong>«presión alta»</strong> o <strong>«paciencia con la pelota»</strong>.' },
  ],
  prueba: { kicker: 'Nos pasó el lunes', titulo: 'El tercero<br>se nos <em>fue</em>', partidos: noche.map(m => ({ rival: m.rival, score: `${m.gf}-${m.gc}`, res: m.res })),
    texto: 'Triple fecha para cerrar el grupo: ganamos el primero, empatamos el segundo y el tercero se nos fue 1-4. De ahí salen estos tres hábitos.' },
  cierre: { kicker: 'Guardalo', titulo: 'Para tu<br>próxima <em>triple</em>', texto: 'Guardalo para tu próxima triple.<br><b>Mandáselo</b> a tu equipo.', img: archivo(path.join(ROOT, 'Renders/CipriMancini/Unica4.png')) },
}, DIR, 'cabeza-fria-2');

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4), uSl = []; for (const s of slides) uSl.push(await subir(s));
const vid = [{ tipo: 'video', url: uVid, vertical: true }], img = uSl.map(url => ({ tipo: 'imagen', url }));
const desc = `${Math.round(total)} s · escenas IA + motion + voz de Elena · música: ${path.basename(musica, '.mp3').replace(/^[\d-]+ - /, '')}`;
const P = o => ({ decision: 'pendiente', protagonistas: [], ...o });
const lote = {
  id: 'viral-jue-psico2-2026-10-19', tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-10-19', pieza: 'jue-psico2' },
  titulo: 'Cabeza fría #2: tres partidos en una noche', piezas: [
    P({ id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel · Cabeza fría #2', descripcion: 'Las placas para guardar', media: img, metodo: 'ig-carrusel',
      texto: 'Tres partidos en una noche. El tercero se nos fue 1-4.\n\nDe ahí salen estos 3 hábitos para llegar entero al último partido de una triple. Deslizá.\n\nGuardalo para tu próxima triple y mandáselo a tu equipo.\n\n#TopSecretFC #ProClubs #EAFC #PsicologiaDelDeporte' }),
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Cabeza fría #2', descripcion: desc, media: vid, metodo: 'ig-reel', local: { video: mp4 },
      texto: 'Tres partidos en una noche y el tercero se nos fue 1-4. Esto aprendimos.\n\nGuardalo para tu próxima triple.\n\n#TopSecretFC #ProClubs #EAFC' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · Cabeza fría #2', descripcion: desc, media: vid, metodo: 'tiktok', local: { video: mp4 },
      texto: 'Triple fecha: el tercero se nos fue 1-4. 3 hábitos para que no te pase. #TopSecretFC #ProClubs #EAFC #PsicologiaDelDeporte' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · Cabeza fría #2', descripcion: desc, media: vid, metodo: 'youtube', local: { video: mp4 },
      titulo: 'Cómo llegar entero al tercer partido de una noche | Pro Clubs EA FC', texto: '3 hábitos que aprendimos perdiendo el tercero de una triple fecha. #Shorts #ProClubs #EAFC' }),
    P({ id: 'fb-album', red: 'facebook', formato: 'Álbum · carrusel Cabeza fría #2', descripcion: 'Las placas para guardar', media: img, metodo: 'fb-album',
      texto: 'El lunes jugamos tres partidos en una noche para cerrar el grupo: ganamos 1-0, empatamos 0-0 y el tercero se nos fue 1-4. Estos son los tres hábitos que sacamos de esa noche, para llegar entero al último partido.' }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Listo: ' + uVid);
