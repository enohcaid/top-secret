#!/usr/bin/env node
// Meme "Mi reacción a los goles de NicoBJ_96" (idea vie-reaccion del guion viral-guiones-2026-10-12): sus goles
// de la temporada 4 (seed_matches.js), un corte por gol al ritmo de la música, la cara pasa de indiferente a
// desatada. Un retrato nuevo por gol con ChatGPT a partir de su render T4 (mismo encuadre, cambia solo la expresión).
// Sin voz: es un meme visual, no una historia (regla de Juan, 2026-10-14).
//
//   node scripts/social/piezas/2026-10-12-vie-reaccion.mjs   [--solo-imagenes]
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { video, archivo, dropDelTema } from '../lib/render.mjs';
import { cargar } from '../lib/datos.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const J = 'NicoBJ_96';
const DIR = path.join(ROOT, 'fuentes/redes/viral/vie-reaccion');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [vie-reaccion] ${m}`);
const ENCUADRE = `Retrato de ${J} en primer plano (de los hombros para arriba, la cara ocupa el centro), con la camiseta NEGRA de Top Secret (laureles dorados en el cuello), sentado en el banco de suplentes de un estadio de noche, reflectores desenfocados detrás. Mira a cámara. Mismo encuadre, misma luz y mismo fondo en toda la serie: solo cambia su EXPRESIÓN.`;
const CARAS = [
  'Expresión: totalmente indiferente, cara de aburrido, ojos a media asta, boca cerrada en línea recta, apoyando el mentón en la mano.',
  'Expresión: levanta una ceja, empieza a interesarse, media sonrisa de costado.',
  'Expresión: sorprendido de verdad, ojos bien abiertos, boca abierta en "O", se incorpora en el asiento.',
  'Expresión: grita de emoción con los puños cerrados a la altura de la cara, venas del cuello marcadas.',
  'Expresión: de pie, gritando con los dos brazos en alto y los puños cerrados, todavía con la camiseta puesta, euforia que crece.',
  'Expresión: completamente desatado, de pie, gritando al cielo con los brazos abiertos, la camiseta revoleada en una mano, euforia total, pelo despeinado.',
];

// Sus goles de la T4, en orden (datos reales). Si mete otro, la verificación de abajo frena el render: sumar una cara.
const d = await cargar();
const goles = d.partidos.filter(m => m.date > '2026-09-28').sort((a, b) => a.date.localeCompare(b.date))
  .flatMap(m => Array((m.players || []).find(p => (p.matched || p.name) === J)?.goals || 0).fill(m.rival));
const pj = d.partidos.filter(m => m.date > '2026-09-28' && (m.players || []).some(p => (p.matched || p.name) === J)).length;
if (goles.length !== CARAS.length) throw new Error(`${J} tiene ${goles.length} goles en la T4 y hay ${CARAS.length} caras: ajustá CARAS.`);

fs.mkdirSync(DIR, { recursive: true });
log('Retratos (ChatGPT)…');
const caras = [];
for (const [k, c] of CARAS.entries()) { caras.push(await generarImagen({ id: `cara-${k + 1}`, escena: `${ENCUADRE}\n${c}`, jugadores: [J], vertical: true, carpeta: DIR })); log(`  cara ${k + 1} ✓`); }
await cerrar();
if (process.argv.includes('--solo-imagenes')) { log('Listo (solo imágenes).'); process.exit(0); }

const musica = elegirMusica('viral-reaccion-nicobj96', { preferida: process.env.TEMA || undefined });
const tema = dropDelTema(musica) || { drop: 0, bpm: 130 };
const B = 60 / tema.bpm, inicio = 4 * B, paso = 4 * B;
const total = inicio + goles.length * paso + 8 * B;
const datos = {
  kicker: 'Temporada 4', titulo: `Mi reacción a los goles de <b>${J}</b>:`, bpm: tema.bpm, inicio, paso,
  escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  pasos: caras.map((f, k) => ({ img: archivo(f), num: String(k + 1), sub: `vs ${goles[k]}` })),
  final: { titulo: `<span>${goles.length}</span> goles`, sub: `en ${pj} partidos. ¿Quién lo frena?` },
};
const mp4 = path.join(ROOT, 'fuentes/redes/viral/reaccion-nicobj96.mp4');
log(`Render (${total.toFixed(1)} s, ${tema.bpm} BPM, ${path.basename(musica)})…`);
// El primer gol entra en el drop del tema
await video('reaccion.html', datos, mp4, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica, musicaDesde: Math.max(0, tema.drop - inicio) });

const key = 'social/viral/reaccion-nicobj96.mp4';
await putFile(mp4, key);
const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
const desc = `${Math.round(total)} s · ${goles.length} retratos nuevos al ritmo · sin voz (meme) · música: ${path.basename(musica, '.mp3').replace(/^[\d-]+ - /, '')}`;
const P = o => ({ decision: 'pendiente', media: [{ tipo: 'video', url, vertical: true }], descripcion: desc, protagonistas: [J], local: { video: mp4 }, ...o });
const lote = {
  id: 'viral-vie-reaccion-2026-10-12', tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-10-12', pieza: 'vie-reaccion' },
  titulo: `Mi reacción a los goles de ${J}`, piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · meme "Mi reacción a…"', metodo: 'ig-reel',
      texto: `Mi reacción a los goles de ${J} esta temporada. Del 1 al ${goles.length} 🔥\n\n${goles.length} goles en ${pj} partidos. ¿Quién lo frena?\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · meme "Mi reacción a…"', metodo: 'tiktok',
      texto: `Mi reacción a cada gol de ${J}: del 1 al ${goles.length}. ¿Quién lo frena? #TopSecretFC #ProClubs #EAFC #meme` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · meme "Mi reacción a…"', metodo: 'youtube',
      titulo: `Mi reacción a los ${goles.length} goles de ${J} | Pro Clubs EA FC`, texto: `${J}, ${goles.length} goles en ${pj} partidos esta temporada. #Shorts #ProClubs #EAFC` }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Listo: ' + url);
