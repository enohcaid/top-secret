#!/usr/bin/env node
// "¿Quién es? El jugador en silueta" (idea sab-silueta del guion viral-guiones-2026-10-19): nikileo527 — lateral con
// la 10 y hat-trick en el debut de la temporada (5/10 ante Norpatagonicos eSports, seed_matches.js). Silueta del render
// Unica4 (filtro CSS), 3 pistas leídas por Elena, cuenta regresiva y revelación. Con voz: las pistas cuentan algo.
//
//   node scripts/social/piezas/2026-10-19-sab-silueta.mjs
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { video, archivo } from '../lib/render.mjs';
import { narrar, agregarVoz } from '../lib/voz.mjs';
import { cargar } from '../lib/datos.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const J = 'nikileo527';
const DIR = path.join(ROOT, 'fuentes/redes/viral/sab-silueta');
// Dato de la pista 3, verificado contra los partidos reales
const d = await cargar();
const debut = d.partidos.sort((a, b) => a.date.localeCompare(b.date))[0];
const goles = (debut.players || []).find(p => (p.matched || p.name) === J)?.goals;
if (goles !== 3) throw new Error(`La pista del hat-trick no se sostiene: ${J} hizo ${goles} en el debut (${debut.rival}).`);

// Voz: cada frase después de la anterior, con aire; la cuenta regresiva a un ritmo fijo.
const PISTAS = [['1', 'Juega de lateral'], ['2', 'Usa la 10'], ['3', 'Hat-trick en el debut de la temporada']];
const linea = [
  { id: 'gancho', texto: 'Tres pistas. Un jugador. ¿Lo sacás antes de la revelación?', aire: 0.7 },
  { id: 'p1', texto: 'Pista uno: juega de lateral.', aire: 1.1 },
  { id: 'p2', texto: 'Pista dos: usa la diez.', aire: 1.1 },
  { id: 'p3', texto: 'Pista tres: metió un hat-trick en el debut de la temporada.', aire: 1.4 },
  { id: 'c3', texto: 'Tres.', aire: 0.45 }, { id: 'c2', texto: 'Dos.', aire: 0.45 }, { id: 'c1', texto: 'Uno.', aire: 0.6 },
  { id: 'final', texto: '¿En qué pista lo sacaste?', aire: 2.2, despues: 1.6 },
];
let t = 0.3;
const pistas = {};
for (const l of linea) {
  t += l.despues || 0;
  const n = narrar(l.texto, path.join(DIR, 'voz'));
  pistas[l.id] = { ...n, en: t };
  t += n.dur + l.aire;
}
const total = t;
const revela = pistas.c1.en + pistas.c1.dur + 0.5;

const musica = await elegirMusica('viral-silueta-nikileo527', { preferida: process.env.TEMA || undefined });
const datos = {
  img: archivo(path.join(ROOT, 'Renders', J, 'Unica4.png')), nombre: J, sub: 'Lateral · 10',
  pistas: PISTAS.map(([n, txt], k) => ({ n, txt, t: pistas[`p${k + 1}`].en })),
  cuenta: ['c3', 'c2', 'c1'].map(k => pistas[k].en), revela, final: pistas.final.en - 0.2,
  pregunta: '¿En qué pista<br>lo sacaste?', escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
};
const base = path.join(DIR, 'silueta-sin-voz.mp4'), mp4 = path.join(ROOT, 'fuentes/redes/viral/silueta-nikileo527.mp4');
console.log(`Render (${total.toFixed(1)} s, ${path.basename(musica)})…`);
await video('silueta.html', datos, base, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica });
agregarVoz(base, Object.values(pistas), mp4, { volumenMusica: 0.5 });

const key = 'social/viral/silueta-nikileo527.mp4';
await putFile(mp4, key);
const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
const desc = `${Math.round(total)} s · silueta del render + pistas con la voz de Elena · música: ${path.basename(musica, '.mp3').replace(/^[\d-]+ - /, '')}`;
// Sin el nombre en los textos: es un juego de adivinar y el texto se lee antes de ver el video.
const P = o => ({ decision: 'pendiente', media: [{ tipo: 'video', url, vertical: true }], descripcion: desc, protagonistas: [], local: { video: mp4 }, ...o });
const lote = {
  id: 'viral-sab-silueta-2026-10-19', tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-10-19', pieza: 'sab-silueta' },
  titulo: `¿Quién es? La silueta de ${J}`, piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · ¿Quién es?', metodo: 'ig-reel',
      texto: `3 pistas, 1 jugador. ¿Lo sacás antes de la revelación?\n\nComentá en qué pista lo adivinaste (sin spoilear).\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · ¿Quién es?', metodo: 'tiktok',
      texto: `3 pistas, 1 jugador. ¿En cuál lo sacaste? #TopSecretFC #ProClubs #EAFC #quieneseljugador` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · ¿Quién es?', metodo: 'youtube',
      titulo: '¿Quién es? 3 pistas, 1 jugador de Pro Clubs | EA FC', texto: `Lateral, con la 10 y hat-trick en el debut. ¿Quién es? #Shorts #ProClubs #EAFC` }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) console.log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
console.log('Listo: ' + url);
