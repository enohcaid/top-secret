#!/usr/bin/env node
// "Mismo jugador, 4 temporadas #2: Huber236" (idea jue-glowup2 del guion viral-guiones-2026-10-19). Juan (2026-10-15):
// "que tenga cosas diferentes al de Lautavester, si es todo igual no llama la atención". En vez de cortes al pulso
// (plantillas/antes-despues.html), plantillas/evolucion.html: las 4 versiones en fila, cada una pasa al frente con sus
// números reales de esa temporada (seed_matches.js) y el fondo del color de su kit; se revela la mejor temporada por
// promedio (para Huber236, la 3, no la actual) y cierra con la votación 1-2-3-4. Renders Frente de cada temporada
// recortados con sharp.trim(). Sin voz: la serie de 4 temporadas va sin narración (regla de Juan, 2026-10-14).
//
//   node scripts/social/piezas/2026-10-19-jue-glowup2.mjs
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { pathToFileURL } from 'url';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { video, archivo } from '../lib/render.mjs';
import { dropDelTema } from '../lib/render.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const J = 'Huber236';
const DIR = path.join(ROOT, 'fuentes/redes/viral/jue-glowup2');
fs.mkdirSync(DIR, { recursive: true });
const FUENTE = ['Frente', 'Frente2', 'Frente3', 'Frente4'];
for (const [i, f] of FUENTE.entries()) {
  const out = path.join(DIR, `huber-t${i + 1}.png`);
  if (!fs.existsSync(out)) await sharp(path.join(ROOT, 'Renders', J, `${f}.png`)).trim().png().toFile(out);
}

// Estadísticas por temporada (mismos cortes que estadisticas.html: T2 desde 30/4, T3 desde 2/8, T4 desde 28/9)
const { SEED_MATCHES } = await import(pathToFileURL(path.join(ROOT, 'seed_matches.js')).href);
const temporada = d => d <= '2026-04-30' ? 1 : d < '2026-08-02' ? 2 : d <= '2026-09-28' ? 3 : 4;
const st = [1, 2, 3, 4].map(() => ({ pj: 0, g: 0, a: 0, rs: [] }));
for (const m of SEED_MATCHES) for (const p of m.players || []) {
  if ((p.matched || p.name) !== J) continue;
  const x = st[temporada(m.date) - 1];
  x.pj++; x.g += p.goals || 0; x.a += p.assists || 0; if (p.rating) x.rs.push(+p.rating);
}
const prom = x => x.rs.reduce((a, b) => a + b, 0) / (x.rs.length || 1);
// La mejor: mayor promedio, con al menos 5 partidos (una temporada de 2 partidos no cuenta)
const mejor = 1 + st.map((x, i) => [x.pj >= 5 ? prom(x) : 0, i]).sort((a, b) => b[0] - a[0])[0][1];
const COLORES = ['#8A7F45', '#2F55A8', '#7A7A7A', '#B48A2E'];   // kit de cada temporada (oliva, azul noche, negro AIA, negro y oro)

const musica = elegirMusica('viral-antes-despues-huber236', { preferida: process.env.TEMA || undefined });
const tema = dropDelTema(musica) || { bpm: 130 };
const B = 60 / tema.bpm;
const fila = 1.6, inicio = fila + 3.5 * B, paso = 6 * B;
const pasos = [0, 1, 2, 3].map(k => inicio + k * paso);
const tMejor = inicio + 4 * paso, fin = tMejor + 8 * B, total = fin + 8 * B;
const m = st[mejor - 1];
const datos = {
  jugador: J, escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  gancho: `¿Cuál fue la <span>mejor temporada</span> de ${J}?`,
  versiones: st.map((x, i) => ({ n: i + 1, img: archivo(path.join(DIR, `huber-t${i + 1}.png`)), color: COLORES[i],
    stats: [['Partidos', x.pj], ['Goles', x.g], ['Asist.', x.a], ['Promedio', prom(x), 2]] })),
  mejor, mejorTxt: `Los números no mienten: la <b>temporada ${mejor}</b>, con <b>${prom(m).toFixed(2)}</b> de promedio en ${m.pj} partidos.`,
  pregunta: '¿Con cuál<br>te quedás?', tiempos: { fila, pasos, mejor: tMejor, fin },
};
const mp4 = path.join(ROOT, 'fuentes/redes/viral/evolucion-huber236.mp4');
console.log(`Render (${total.toFixed(1)} s, ${tema.bpm} BPM, ${path.basename(musica)}; mejor: T${mejor})…`);
await video('evolucion.html', datos, mp4, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica, musicaDesde: Math.max(0, (tema.drop || 0) - tMejor) });

const key = 'social/viral/evolucion-huber236.mp4';
await putFile(mp4, key);
const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
const desc = `${Math.round(total)} s · las 4 versiones con sus números reales y la mejor temporada · sin voz · música: ${path.basename(musica, '.mp3').replace(/^[\d-]+ - /, '')}`;
const P = o => ({ decision: 'pendiente', media: [{ tipo: 'video', url, vertical: true }], descripcion: desc, protagonistas: [J], local: { video: mp4 }, ...o });
const lote = {
  id: 'viral-jue-glowup2-2026-10-19', tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-10-19', pieza: 'jue-glowup2' },
  titulo: `Mismo jugador, 4 temporadas #2: ${J}`, piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · 4 temporadas con números', metodo: 'ig-reel',
      texto: `¿Cuál fue la mejor temporada de ${J}? Los números dicen la ${mejor}.\n\n¿Vos con cuál te quedás? 1, 2, 3 o 4.\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · 4 temporadas con números', metodo: 'tiktok',
      texto: `${J}, 4 temporadas: ¿1, 2, 3 o 4? Los números eligieron una. #TopSecretFC #ProClubs #EAFC #glowup` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · 4 temporadas con números', metodo: 'youtube',
      titulo: `La mejor temporada de ${J} en Pro Clubs | EA FC`, texto: `Las 4 temporadas de ${J} con sus números. ¿Con cuál te quedás? #Shorts #ProClubs #EAFC` }),
    P({ id: 'x-video', red: 'x', formato: 'Video · 4 temporadas con números', metodo: 'x-video',
      texto: `${J}, 4 temporadas. Los números eligen la ${mejor}: ${prom(m).toFixed(2)} de promedio en ${m.pj} partidos. ¿Y vos? #ProClubs #TopSecretFC` }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) console.log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
console.log('Listo: ' + url);
