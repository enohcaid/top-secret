#!/usr/bin/env node
// Mini-documental "El día que nos atajó un bot" (idea sab-doc del guion viral-guiones-2026-10-12).
// Historia real del miércoles 7/10 ante Cambaceres (2-1, VPUG): atajó el arquero bot del juego, "F. van Dijk".
// Contexto que pidió Juan (ficción, estilo Supercampeones): se lesionó un defensor, el arquero pasó a jugar de
// defensor y desde la tribuna bajó un jugador misterioso a atajar. El suplente del arco (adri_cai) estaba enfermo.
// Escenas nuevas con ChatGPT, animadas con Canva, motion en plantillas/documental.html y voz de Elena (la del club).
//
//   node scripts/social/piezas/2026-10-12-sab-doc.mjs                 → genera lo que falte, renderiza y carga el lote
//   --solo-imagenes   para revisar las imágenes antes de gastar clips de Canva
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { animar, cuadros } from '../lib/clip.mjs';
import { video, archivo } from '../lib/render.mjs';
import { narracion, agregarVoz } from '../lib/voz.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/sab-doc');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [sab-doc] ${m}`);
const BOT = 'un arquero misterioso con camiseta y guantes GRIS PLOMO lisos (sin escudo, sin nombre, sin número, sin marcas), gorra gris con visera baja que le deja la cara en sombra (no se le ven los ojos)';

// Cada escena: imagen nueva (ChatGPT) + movimiento de cámara (Canva) + una frase de la voz.
const ESCENAS = [
  { id: '1-arco', jugadores: [], voz: 'Siete de octubre. Noche de triple fecha.',
    kicker: 'Miércoles 7 de octubre · VPUG',
    escena: 'Estadio de fútbol de noche, completamente vacío de jugadores. Plano desde el punto del penal hacia un ARCO VACÍO, la red quieta, reflectores fríos azulados que cortan la neblina, el pasto mojado brilla. Tribuna oscura al fondo. Atmósfera de documental, silencio, algo falta.',
    movimiento: 'Travelling muy lento hacia el arco vacío. La neblina se mueve apenas frente a los reflectores.' },
  { id: '2-lesion', jugadores: [], voz: 'Se lesiona un defensor. Y el arquero suplente, enfermo en casa.',
    kicker: 'Antes del partido',
    escena: 'En la cancha de noche, un defensor de Top Secret (camiseta NEGRA con laureles dorados en cuello y puños, de ESPALDAS a cámara, SIN número ni nombre visibles) sentado en el pasto agarrándose el tobillo con dolor; un médico arrodillado al lado con un maletín. Reflectores detrás, mucho contraluz, tono de documental deportivo.',
    movimiento: 'Paralaje lateral muy lento alrededor del jugador sentado. Las luces del fondo destellan suave.' },
  { id: '3-guantes', jugadores: ['Ivan_Cabj_La12'], voz: 'Nuestro arquero se sacó los guantes y pasó a jugar de defensor.',
    kicker: 'Cambio de planes',
    escena: 'Plano medio en la cancha de noche: Ivan_Cabj_La12 con su kit naranja de arquero, mirada decidida, sacándose un guante con los dientes mientras camina hacia la defensa, el otro guante ya en la mano. Luz lateral dura, fondo de estadio desenfocado.',
    movimiento: 'Acercamiento muy lento hacia el jugador. Leve vaivén de cámara en mano.' },
  { id: '4-tribuna', jugadores: [], voz: 'El arco quedó vacío. Hasta que alguien bajó de la tribuna.',
    kicker: 'Minutos antes de empezar',
    escena: `Tribuna de un estadio de noche llena de hinchas sentados y desenfocados. En el medio, de pie, una figura sola: ${BOT}, a contraluz de un reflector que le dibuja la silueta. Todos los de alrededor lo miran. Misterio, plano general con teleobjetivo, estética de anime de fútbol de los 90 llevada a foto real.`,
    movimiento: 'Zoom muy lento hacia la figura de pie. El reflector de atrás titila apenas.' },
  { id: '5-vandijk', jugadores: [], voz: 'Nadie sabía quién era. En la planilla decía: F. van Dijk.',
    kicker: 'La planilla', ficha: { rol: 'Arquero', nombre: 'F. van Dijk', dato: 'Procedencia: desconocida' }, fichaEn: /planilla/,
    escena: `Debajo del travesaño de un arco, de noche: ${BOT}, en posición de arquero, piernas flexionadas, brazos abiertos, mirando hacia adelante. Pose heroica y quieta, viento que le mueve la camiseta, reflectores detrás que le hacen un halo. Plano bajo desde el pasto, épico, de película.`,
    movimiento: 'Travelling lento de abajo hacia arriba, de los pies a la cara en sombra. Los reflectores destellan.' },
  { id: '6-gol', jugadores: [], voz: 'A los seis minutos, perdíamos uno a cero.',
    kicker: 'Minuto 6', marcador: { izq: 'Top Secret', a: 0, b: 1, der: 'Cambaceres', rojo: true }, marcadorEn: /seis/,
    escena: `La pelota adentro del arco, inflando la red. ${BOT} tirado en el pasto después de no llegar, de espaldas, mirando la pelota en la red. Noche, reflectores, gotas de lluvia finas. Tono de derrota.`,
    movimiento: 'Cámara casi quieta con un empuje muy lento. La red todavía se mueve.' },
  { id: '7-vuelta', jugadores: ['NicoBJ_96', 'Lautavester7'], voz: 'Empatamos antes del descanso. Y a los ochenta minutos, lo dimos vuelta.',
    kicker: 'Minuto 80', marcador: { izq: 'Top Secret', a: 2, b: 1, der: 'Cambaceres', goles: "NicoBJ_96 36' · Lautavester7 80'" }, marcadorEn: /ochenta/,
    escena: 'Festejo en la cancha de noche: NicoBJ_96 y Lautavester7 abrazados gritando de euforia hacia la tribuna, puños apretados, papelitos dorados en el aire, reflectores cálidos con destellos. Plano medio, energía de remontada.',
    movimiento: 'Travelling lento hacia atrás mientras caen papelitos dorados. Destellos de los reflectores.' },
  { id: '8-tunel', jugadores: [], voz: 'Terminó el partido, y nunca más lo vimos. Algunos héroes no tienen gamertag.',
    kicker: 'Después del partido', cierre: ['Algunos héroes', 'no tienen gamertag'], cierreEn: /Algunos/,
    escena: `El túnel de un estadio visto desde la cancha, de noche. ${BOT} camina de espaldas hacia la luz blanca del fondo del túnel, sacándose un guante, solo. Silueta a contraluz, sombra larga hacia la cámara. Melancolía de final de película.`,
    movimiento: 'Cámara quieta con un empuje muy lento. La luz del fondo del túnel respira suave.' },
];

fs.mkdirSync(DIR, { recursive: true });
log('Imágenes (ChatGPT)…');
const imgs = {};
for (const e of ESCENAS) { imgs[e.id] = await generarImagen({ id: e.id, escena: e.escena, jugadores: e.jugadores, vertical: true, carpeta: DIR }); log(`  ${e.id} ✓`); }
await cerrar();
if (process.argv.includes('--solo-imagenes')) { log('Listo (solo imágenes).'); process.exit(0); }

log('Clips (Canva imagen a video)…');
const clips = {};
for (const e of ESCENAS) { const mp4 = animar(imgs[e.id], e.movimiento); clips[e.id] = cuadros(mp4); clips[e.id].dir = archivo(clips[e.id].dir); log(`  ${e.id} ✓ (${clips[e.id].n} cuadros)`); }

// Voz primero: la duración de cada escena sale de su frase (Elena, un poco más pausada: es un documental).
const VOZ = { rate: '+4%' };
const frases = ESCENAS.map(e => narracion([{ en: 0, texto: e.voz }], path.join(DIR, 'voz'), VOZ)[0]);
let t = 0;
const escenas = ESCENAS.map((e, i) => {
  const dur = Math.max(3.2, frases[i].dur + (e.cierre ? 2.6 : e.ficha || e.marcador ? 1.6 : 0.9));
  const palabras = frases[i].palabras.map(p => ({ ...p, t: p.t + 0.35 }));
  // Momentos sincronizados con la voz: el segundo (dentro de la escena) en que se dice la palabra marcada.
  const en = re => re ? (palabras.find(p => re.test(p.w))?.t ?? 1) : undefined;
  const o = { ...e, dur, t0: t, clip: clips[e.id], vel: Math.min(1, 5 / dur * 0.9), palabras,
    fichaEn: en(e.fichaEn), marcadorEn: en(e.marcadorEn), cierreEn: en(e.cierreEn) };
  t += dur;
  return o;
});
const total = t;
const musica = elegirMusica('viral-sab-doc', { preferida: process.env.TEMA || undefined });
log(`Render (${total.toFixed(1)} s, música ${path.basename(musica)})…`);
const base = path.join(DIR, 'documental-sin-voz.mp4');
await video('documental.html', { escenas: escenas.map(({ escena, movimiento, jugadores, voz, ...x }) => x), escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')) },
  base, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica });
const mp4 = path.join(ROOT, 'fuentes/redes/viral/bot-documental.mp4');
agregarVoz(base, frases.map((f, i) => ({ ...f, en: escenas[i].t0 + 0.35 })), mp4, { volumenMusica: 0.5 });

const key = 'social/viral/bot-documental.mp4';
await putFile(mp4, key);
const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
const tema = path.basename(musica, '.mp3').replace(/^[\d-]+ - /, '');
const desc = `${Math.round(total)} s · documental con escenas IA + voz de Elena · música: ${tema}`;
const vid = [{ tipo: 'video', url, vertical: true }];
const P = o => ({ decision: 'pendiente', media: vid, descripcion: desc, protagonistas: [], local: { video: mp4 }, ...o });
const lote = {
  id: 'viral-sab-doc-2026-10-12', tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-10-12', pieza: 'sab-doc' },
  titulo: 'El día que nos atajó un bot', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · mini-documental', metodo: 'ig-reel',
      texto: 'Nos faltaba un jugador. El arquero pasó a defender. Y desde la tribuna bajó F. van Dijk.\n\nCambaceres 1, Top Secret 2.\n\n¿A ustedes también los salvó un bot alguna vez?\n\n#TopSecretFC #ProClubs #EAFC' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · mini-documental', metodo: 'tiktok',
      texto: 'Nos atajó un bot y ganamos. Algunos héroes no tienen gamertag. #TopSecretFC #ProClubs #EAFC #documental' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · mini-documental', metodo: 'youtube',
      titulo: 'El día que nos atajó un bot en Pro Clubs | EA FC', texto: 'F. van Dijk, el arquero que nadie conocía. #Shorts #ProClubs #EAFC' }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Listo: ' + url);
