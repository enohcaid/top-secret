#!/usr/bin/env node
// "POV: sos el arquero y quedan 10 segundos" (idea sab-pov del guion viral-guiones-2026-10-19). Primera persona del
// arquero: córner en contra con 1-0 arriba en el 90, los pensamientos en pantalla, el manotazo y el pitazo. Escenas
// con ChatGPT (guantes naranjas de nuestro kit de arquero en cuadro) animadas con Canva; motion en plantillas/pov.html.
// Música: "Vértigo" (los últimos minutos ganando 1-0), con el drop en el manotazo. Sin voz en off: los textos SON los
// pensamientos del arquero y un narrador rompería la primera persona.
//
//   node scripts/social/piezas/2026-10-19-sab-pov.mjs   [--solo-imagenes]
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { animar, cuadros } from '../lib/clip.mjs';
import { video, archivo, dropDelTema } from '../lib/render.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/sab-pov');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [pov] ${m}`);
const OJOS = 'FOTO EN PRIMERA PERSONA, desde los ojos del arquero (cámara a la altura de la cabeza, como una GoPro en la frente): en el borde inferior del cuadro se ven sus propios antebrazos con GUANTES DE ARQUERO y mangas NARANJAS. No se ve la cara del arquero.';
const RIVAL = 'Los rivales usan camiseta BLANCA lisa, sin escudo ni marcas.';
const ESCENAS = [
  { id: '1-corner', jugadores: [],
    escena: `${OJOS} Estadio de noche, el área chica llena de jugadores apretados: compañeros con camiseta NEGRA de laureles dorados (de espaldas, sin números) y rivales. ${RIVAL} A lo lejos, en el banderín del córner, un rival con la pelota levanta el brazo. Reflectores fuertes, tensión de último minuto.`,
    movimiento: 'Cámara en mano con respiración agitada, un leve vaivén. Los jugadores del área se empujan apenas.' },
  { id: '2-centro', jugadores: [],
    escena: `${OJOS} La pelota viene por el aire hacia la cámara, contra los reflectores de la noche, girando. Varios jugadores saltan en el área (rivales de camiseta BLANCA y compañeros de camiseta NEGRA, sin números). Los guantes naranjas empiezan a levantarse. ${RIVAL}`,
    movimiento: 'La pelota se acerca lentamente hacia la cámara. Los jugadores suben en el salto.' },
  { id: '3-manotazo', jugadores: [],
    escena: `${OJOS} Instante congelado del manotazo: el puño con GUANTE NARANJA golpea la pelota en primer plano, la pelota se deforma por el impacto y sale despedida hacia arriba y afuera; detrás, cabezas de jugadores en el salto y los reflectores. Gotas de agua saltando del guante.`,
    movimiento: 'Cámara lenta extrema: la pelota se aleja del puño hacia arriba. Gotas de agua suspendidas.' },
  { id: '4-festejo', jugadores: ['Elianja20', 'Cabers14', 'Juan_Martinez4'],
    escena: `${OJOS} Elianja20, Cabers14 y Juan_Martinez4 corren hacia la cámara gritando de euforia con los brazos abiertos, a punto de abrazar al arquero, en la cancha de noche; papelitos dorados en el aire, reflectores cálidos.`,
    movimiento: 'Los jugadores avanzan hacia la cámara. Papelitos dorados que caen. Leve cámara en mano.' },
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

const musica = await elegirMusica('viral-pov-arquero', { preferida: process.env.TEMA || 'Vértigo' });
const tema = dropDelTema(musica) || { drop: 0, bpm: 148 };
const B = 60 / tema.bpm;
const T = (t, txt, extra = {}) => ({ t: t * B, txt, ...extra });
const escenas = [
  { clip: clips['1-corner'], vel: 0.5, dur: 12 * B, textos: [T(0.5, 'POV: minuto 90. Ganás 1-0.', { hasta: 5.5 * B }), T(6, 'Córner en contra.')] },
  { clip: clips['2-centro'], vel: 0.45, dur: 8 * B, textos: [T(0.5, 'No la toques.'), T(2.8, 'Salí.'), T(5, 'NO SALGAS.', { grito: true })] },
  { clip: clips['3-manotazo'], vel: 0.3, dur: 6 * B, sacudon: 0, flash: 0, textos: [T(0.3, '¡AFUERA!', { grito: true })] },
  { clip: clips['4-festejo'], vel: 0.6, dur: 12 * B, textos: [T(0.5, 'Pitazo final.', { hasta: 0 }), T(4, '1-0.', { grito: true, hasta: 0 })] },
];
// "hasta" relativo a la escena → absoluto; 0 = hasta el final del video
let t0 = 0;
for (const e of escenas) { for (const x of e.textos) if (x.hasta !== undefined) x.hasta = x.hasta ? t0 + x.hasta : Infinity; t0 += e.dur; }
const total = t0;
const finEn = total - 5 * B;
escenas[3].textos[1].hasta = escenas[3].textos[0].hasta = (total - escenas[3].dur) + 7.5 * B;   // los textos se van antes de la pregunta
const manotazo = escenas[0].dur + escenas[1].dur;
const datos = { hud: { local: 'Top Secret', visita: 'Rival', gl: 1, gv: 0, min: 90 }, escenas, finEn, pregunta: '¿Salís o te quedás?', escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')) };
const mp4 = path.join(ROOT, 'fuentes/redes/viral/pov-arquero.mp4');
log(`Render (${total.toFixed(1)} s, ${tema.bpm} BPM, drop en el manotazo)…`);
await video('pov.html', datos, mp4, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica, musicaDesde: Math.max(0, tema.drop - manotazo) });

const key = 'social/viral/pov-arquero.mp4';
await putFile(mp4, key);
const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
const desc = `${Math.round(total)} s · primera persona, escenas IA + motion · sin voz (los textos son sus pensamientos) · música: ${path.basename(musica, '.mp3').replace(/^[\d-]+ - /, '')}`;
const P = o => ({ decision: 'pendiente', media: [{ tipo: 'video', url, vertical: true }], descripcion: desc, protagonistas: [], local: { video: mp4 }, ...o });
const lote = {
  id: 'viral-sab-pov-2026-10-19', tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-10-19', pieza: 'sab-pov' },
  titulo: 'POV: sos el arquero y quedan 10 segundos', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · POV del arquero', metodo: 'ig-reel',
      texto: 'Minuto 90, 1-0 arriba, córner en contra.\n\n¿Salís o te quedás? Te leemos.\n\n#TopSecretFC #ProClubs #EAFC' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · POV del arquero', metodo: 'tiktok',
      texto: 'POV: sos el arquero, minuto 90 y córner en contra. ¿Salís o te quedás? #TopSecretFC #ProClubs #EAFC #pov' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · POV del arquero', metodo: 'youtube',
      titulo: 'POV: sos el arquero en el minuto 90 | Pro Clubs EA FC', texto: '1-0 arriba y córner en contra. ¿Salís o te quedás? #Shorts #ProClubs #EAFC' }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Listo: ' + url);
