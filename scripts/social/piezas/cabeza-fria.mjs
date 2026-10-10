#!/usr/bin/env node
// "Cabeza fría" en video: psicología del deporte contada con escenas nuevas (ChatGPT) animadas con IA (Canva) y
// motion design encima. Historia real: el miércoles 7/10 se le cortó la conexión a un compañero, perdimos 0-1, y
// esa misma noche ganamos 2-1 y 3-1. Cada paso se cachea en fuentes/redes/cabeza-fria/ (imágenes, clips, cuadros).
//
//   node scripts/social/piezas/cabeza-fria.mjs            → genera lo que falte y renderiza
//   --solo-imagenes   para revisar las imágenes antes de gastar clips de Canva
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { animar, cuadros } from '../lib/clip.mjs';
import { video, archivo, dropDelTema } from '../lib/render.mjs';
import { leer, guardarKV } from '../lib/aprobaciones.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/cabeza-fria');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [cabeza-fria] ${m}`);

// Escenas con imagen nueva + movimiento para Canva (solo cámara/luz). Jugadores = renders adjuntos (identidad real).
const ESCENAS = [
  { id: '1-desconexion', jugadores: [],
    escena: 'Estadio de fútbol de noche, cancha vacía bajo reflectores fríos y azulados. En el centro de la cancha, un jugador de fútbol de espaldas a cámara con la camiseta NEGRA de Top Secret (cuello y puños con laureles dorados), SIN nombre ni dorsal visibles. Su cuerpo se está desintegrando en cubos de píxeles negros y dorados que se desprenden y suben hacia el cielo, como una señal que se corta. Plano general, simetría, mucho cielo negro arriba. Silencio, tensión, soledad.',
    movimiento: 'Travelling muy lento hacia adelante. Los cubos de píxeles dorados se desprenden y suben lentamente. Los reflectores parpadean apenas.' },
  { id: '2-repeticion', jugadores: ['Huber236'],
    escena: 'Plano medio en la cancha de noche: Huber236 quieto, con la cabeza girada mirando por encima del hombro hacia atrás, mandíbula apretada, transpirado. Detrás de él, en el área, como un fantasma translúcido azul cian, se ve la jugada del gol que le hicieron: un delantero rival rematando y la pelota entrando al arco, como una repetición que no lo deja en paz. Luz lateral dura, fondo oscuro.',
    movimiento: 'Paralaje lateral lento de la cámara. La figura translúcida del fondo se desvanece y vuelve a aparecer.' },
  { id: '3-audio', jugadores: ['CipriMancini', 'Alexisraies23'],
    escena: 'Dos jugadores de Top Secret cara a cara en la cancha de noche, muy cerca, con AURICULARES GAMER CON MICRÓFONO puestos sobre la cabeza (así se hablan en el juego): CipriMancini le grita a Alexisraies23 con bronca, señalándolo; Alexisraies23 aprieta la mandíbula y aparta la mirada. Tensión, gotas de transpiración, reflectores detrás con destellos. Plano medio cerrado, teleobjetivo.',
    movimiento: 'Acercamiento muy lento entre los dos jugadores, con un leve vaivén de cámara en mano. Las luces del fondo destellan.' },
  { id: '4-remate', jugadores: ['Elianja20'],
    escena: 'Acción congelada en la cancha de noche: Elianja20 remata desesperado desde muy lejos, el cuerpo tirado hacia atrás, la pelota sale disparada muy por encima del travesaño hacia la tribuna. Pasto que salta, transpiración, teleobjetivo, tribuna desenfocada. Se siente el apuro y el error.',
    movimiento: 'La cámara sigue lentamente hacia arriba la trayectoria de la pelota. Leve desenfoque de movimiento en el fondo.' },
  { id: '5-festejo', jugadores: ['NicoBJ_96', 'Lautavester7'],
    escena: 'Festejo en la cancha de noche: NicoBJ_96 y Lautavester7 abrazados, gritando de euforia frente a cámara, puños apretados, venas marcadas; papelitos dorados en el aire, reflectores cálidos detrás con destellos dorados. Plano medio, energía de remontada.',
    movimiento: 'Travelling lento hacia atrás mientras caen papelitos dorados. Destellos de los reflectores.' },
];

fs.mkdirSync(DIR, { recursive: true });
log('Imágenes (ChatGPT)…');
const imgs = {};
for (const e of ESCENAS) { imgs[e.id] = await generarImagen({ id: e.id, escena: e.escena, jugadores: e.jugadores, vertical: true, carpeta: DIR }); log(`  ${e.id} ✓`); }
await cerrar();
if (process.argv.includes('--solo-imagenes')) { log('Listo (solo imágenes).'); }
else {
  log('Clips (Canva imagen a video)…');
  const clips = {};
  for (const e of ESCENAS) { const mp4 = animar(imgs[e.id], e.movimiento); clips[e.id] = cuadros(mp4); clips[e.id].dir = archivo(clips[e.id].dir); log(`  ${e.id} ✓ (${clips[e.id].n} cuadros)`); }

  // Música: el tema original más nuevo (simulacro: no se registra como usado hasta publicar).
  const propios = fs.readdirSync(path.join(ROOT, 'fuentes/musica/propios')).filter(f => f.endsWith('.mp3')).sort();
  const musica = path.join(ROOT, 'fuentes/musica/propios', propios[propios.length - 1]);
  const tema = dropDelTema(musica) || { drop: 0, bpm: 130 };
  const B = 60 / tema.bpm;
  const W = (t, c, extra = {}) => ({ t, c, ...extra });
  // vel < 1 = cámara lenta del clip de Canva: también evita los tramos finales donde la IA se desvía
  // (el jugador de la escena 1 se da vuelta, en la 3 el dedo toca la cara, en la 4 la jugada se vuelve chilena).
  const escenas = [
    { tipo: 'apertura', dur: 8 * B, clip: clips['1-desconexion'], vel: 0.55, grade: 'linear-gradient(rgba(30,60,120,.35),rgba(0,0,0,.2))',
      kicker: 'Miércoles · VPUG', palabras: [W('Se', ''), W('desconecta', ''), W('un', '', { br: true }), W('compañero.', '')], marcador: { t: 4.6 * B, txt: '0-1' } },
    { tipo: 'tarjeta', dur: 4 * B, titulo: ['Cabeza', 'fría'], sub: '3 errores que te hacen perder' },
    // Instrucciones psicológicas: frases completas y claras (Juan, psicólogo: "tienen que ser muy claras"), qué pasa en
    // el título y qué hacer como acción concreta. ~4,5 s de lectura para el "Qué hacer".
    { tipo: 'error', dur: 13 * B, clip: clips['2-repeticion'], num: '01', kicker: 'Error 01', grade: 'linear-gradient(rgba(20,80,120,.3),transparent)', hacerEn: 3 * B,
      palabras: [W('Seguir', ''), W('pensando', 'oro'), W('en', '', { br: true }), W('el', ''), W('gol', ''), W('que', ''), W('te', '', { br: true }), W('hicieron', '')],
      hacer: 'Al sacar del medio, decite una palabra («siguiente») y enfocate <b>solo en la próxima jugada</b>.' },
    { tipo: 'error', dur: 13 * B, clip: clips['3-audio'], vel: 0.22, num: '02', kicker: 'Error 02', grade: 'linear-gradient(rgba(140,30,30,.28),transparent)', hacerEn: 3 * B,
      palabras: [W('Culpar', 'rojo'), W('a', ''), W('un', '', { br: true }), W('compañero', ''), W('por', '', { br: true }), W('el', ''), W('audio', '')],
      hacer: 'Hablale para <b>corregir, no para culpar</b>: en vez de «¿por qué no volviste?», decile «volvé a tu marca».' },
    { tipo: 'error', dur: 13 * B, clip: clips['4-remate'], vel: 0.22, num: '03', kicker: 'Error 03', grade: 'linear-gradient(rgba(120,90,20,.25),transparent)', hacerEn: 3 * B,
      palabras: [W('Querer', ''), W('empatar', 'oro', { br: true }), W('en', ''), W('una', ''), W('sola', '', { br: true }), W('jugada', '')],
      hacer: 'Olvidate del marcador por un rato: proponete <b>ganar los próximos 10 minutos</b>, jugada por jugada.' },
    { tipo: 'remate', dur: 10 * B, clip: clips['5-festejo'], grade: 'linear-gradient(rgba(201,168,76,.25),transparent)', barras: 0,
      palabras: [W('Esa', ''), W('misma', ''), W('noche', 'oro')], marcadores: [{ txt: '2-1', rival: 'vs Cambaceres', t: 2 * B }, { txt: '3-1', rival: 'vs Real Envido', t: 4 * B }] },
    { tipo: 'cierre', dur: 8 * B, barras: 0, titulo: ['Cabeza', 'fría'], cta: 'Guardalo para cuando te toque.<br><b>Mandáselo</b> al que todavía discute el gol del primer tiempo.', escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')) },
  ];
  const inicioRemate = escenas.slice(0, 5).reduce((s, e) => s + e.dur, 0);
  const total = escenas.reduce((s, e) => s + e.dur, 0);
  log(`Render (${total.toFixed(1)} s, ${tema.bpm} BPM, drop en el "esa misma noche")…`);
  const mp4 = path.join(DIR, 'cabeza-fria.mp4');
  await video('cabeza-fria.html', { escenas }, mp4, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica, musicaDesde: Math.max(0, tema.drop - inicioRemate) });

  // A la página de aprobación, en el lote del simulacro (sin hora: no se publica sola).
  const key = 'social/simulacro/cabeza-fria.mp4';
  await putFile(mp4, key);
  const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
  const data = await leer();
  const lote = data.lotes.find(l => l.id === 'viral-simulacro');
  if (lote) {
    lote.piezas = lote.piezas.filter(p => p.id !== 'psico-reel');
    lote.piezas.unshift({ id: 'psico-reel', red: 'instagram', formato: 'Reel · Cabeza fría (escenas IA + motion)', descripcion: `${Math.round(total)} s · imágenes nuevas animadas con IA · música: ${path.basename(musica, '.mp3').replace(/^\d{4}-\d{2}-\d{2} - /, '')} (muestra)`,
      media: [{ tipo: 'video', url, vertical: true }], decision: 'pendiente', metodo: 'ig-reel',
      texto: 'Se le cortó la conexión a un compañero. 0-1. Lo que pasó después no fue suerte.\n\n3 errores mentales que te hacen perder en Pro Clubs, y qué hacer con cada uno.\n\nGuardalo. Y mandáselo al que todavía discute el gol del primer tiempo.\n\n#TopSecretFC #ProClubs #EAFC #PsicologiaDelDeporte' });
    await guardarKV('aprobaciones', data);
  }
  log('Listo: ' + url);
}
