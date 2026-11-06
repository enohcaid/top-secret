#!/usr/bin/env node
// Expectativa de Tacet Sin con la gente de Top Secret (Juan, 2026-11-06: "que conecte con la comunidad y tenga mucha calidad").
// Dos videos que se suman a los 4 abstractos de 2026-11-06-tacet-hype.mjs; Juan elige en aprobar.html cuáles salen.
//   noches:  goles reales del 22/10 a pantalla completa y, en cada uno, su goleador (datos de seed_matches.js).
//   plantel: los 18 del plantel T4, uno por golpe de música, con su pose propia.
//
// No nombran a Tacet Sin ni el tema: se revela el 7/11 a las 20:00. Cortes al pulso real de cada tema.
//   node scripts/social/piezas/2026-11-06-tacet-club.mjs [noches|plantel] [--cuadros] [--sin-lote]
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica, infoTema } from '../../lib/musica.mjs';
import { video, archivo } from '../lib/render.mjs';
import { conPortada, subirPortada } from '../lib/portada.mjs';
import { espectro, pulso } from '../lib/espectro.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';
import { ROSTER_T4 } from '../../../roster.js';

const BASE = path.join(ROOT, 'fuentes/redes/viral/tacet-sin'), DIR = path.join(BASE, 'club'), PELOTA = path.join(ROOT, 'fuentes/redes/viral/jue-pelota');
fs.mkdirSync(path.join(DIR, 'poses'), { recursive: true });
const flag = f => process.argv.includes(f);
const pedidos = process.argv.slice(2).filter(a => !a.startsWith('--'));
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [club] ${m}`);
const ff = args => { const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr); };
const lista = d => fs.readdirSync(path.join(BASE, d)).filter(f => /^\d+\.jpg$/.test(f)).sort().map(f => archivo(path.join(BASE, d, f)));
const pose = async gt => { const s = path.join(DIR, 'poses', gt + '.webp'); if (!fs.existsSync(s)) await sharp(path.join(ROOT, 'Renders', gt, 'Unica4.png')).resize({ height: 1300 }).webp({ quality: 90 }).toFile(s); return archivo(s); };
const escudo = archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'));
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';

// Jugadas ya extraídas para "¿Dónde está la pelota?" (60 cuadros por segundo). Datos verificados contra seed_matches.js.
const GOLES = [
  { id: 'r1', f0: 1, gt: 'NicoBJ_96', linea: "14' · 1-0 a Los Picantes · Espacio Gamer", golEn: 1.9, mapa: [[0, 0], [.7, .7], [2.2, 1.7], [4.6, 4.1]], cam: [[0, 700], [.7, 770], [1.1, 860], [1.5, 930], [2.3, 930], [4.1, 860]] },
  { id: 'r2', f0: 1, gt: 'Cabers14', linea: "24' · de cabeza · 1-1 con SF Drysdale · Espacio Gamer", golEn: 1.3, mapa: [[0, 0], [1.4, .42], [1.8, .7], [4.6, 3.5]], cam: [[0, 885], [1, 885], [2.2, 830], [3.5, 770]] },
  { id: 'r3', f0: 4, gt: 'Lautavester7', linea: "90+' · de tijera · 3-3 con SF Drysdale · Espacio Gamer", golEn: .9, mapa: [[0, 0], [1.4, .4], [1.9, .8], [4.6, 3.5]], cam: [[0, 320], [.6, 310], [1.5, 350], [3.5, 410]] },
];

async function armarNoches() {
  const musica = await elegirMusica('viral-tacet-club-noches', { preferida: 'Rain' }), { beat: B, inicio } = pulso(musica, 30);
  const enP = s => Math.max(1, Math.round(s / B)) * B;
  const T = { intro: enP(2.2), cierre: enP(3.6) };
  const goles = [];
  for (const g of GOLES) {
    const d = path.join(PELOTA, g.id);
    goles.push({ ...g, dir: archivo(d), ultimo: fs.readdirSync(d).filter(f => /^\d+\.jpg$/.test(f)).length, durJugada: enP(g.mapa.at(-1)[0] - .9), durHeroe: enP(2) });
  }
  T.fin = T.intro + goles.reduce((s, g) => s + g.durJugada + g.durHeroe, 0) + T.cierre;
  const poses = {}; for (const g of GOLES) poses[g.gt] = await pose(g.gt);
  return { musica, inicio, B, datos: { modo: 'noches', T, goles, poses, disco: lista('disco'), escudo, bandas: espectro(musica, T.fin, inicio) }, portadaEn: T.intro + goles[0].durJugada + goles[0].durHeroe + goles[1].durJugada + goles[1].durHeroe + goles[2].durJugada + goles[2].durHeroe * .8,
    hora: '2026-11-06T20:45:00-03:00', cuando: 'hoy 20:45', titulo: 'Tacet, con el club: las noches de Top Secret',
    tiktok: 'La tijera de Lautavester7, el cabezazo de Cabers14 y el gol de NicoBJ_96. Las noches de Top Secret tienen música. Mañana, 20:00, le ponemos nombre. #TopSecretFC #ProClubs #EAFC', protagonistas: GOLES.map(g => g.gt) };
}

async function armarPlantel() {
  const musica = await elegirMusica('viral-tacet-club-plantel', { preferida: 'Cold Hands' }), { beat: B, inicio } = pulso(musica, 20);
  const porJug = B < .5 ? B * 2 : B;
  // Línea de abajo hacia arriba: arqueros primero, el goleador de la tijera al final. Dorsales y gamertags de roster.js.
  const ORDEN = ['Ivan_Cabj_La12', 'adri_cai', 'rivarola90', 'Alexisraies23', 'Cabers14', 'Elianja20', 'endiabladorojo66', 'Huber236', 'Guiidow', 'pepolemmo2710', 'Juan_Martinez4', 'RS32-DaniStone', 'Ciprimancini32', 'Lil_Dekuroko', 'davidelapaternal', 'nikileo527', 'NicoBJ_96', 'Lautavester7'];
  const porKey = Object.fromEntries(ROSTER_T4.map(j => [j.key, j]));
  if (ORDEN.length !== ROSTER_T4.length || ORDEN.some(g => !porKey[g])) throw new Error('el orden no coincide con ROSTER_T4');
  const jugadores = ORDEN.map(gt => ({ gt, n: porKey[gt].number ?? porKey[gt].num, arquero: gt === 'Ivan_Cabj_La12' || gt === 'adri_cai' }));
  if (jugadores.some(j => j.n == null)) throw new Error('falta un dorsal');
  const T = { intro: B * Math.round(1.6 / B), porJug, cierre: B * Math.round(4.2 / B) };
  T.fin = T.intro + porJug * jugadores.length + T.cierre;
  const poses = {}; for (const j of jugadores) poses[j.gt] = await pose(j.gt);
  return { musica, inicio, B, datos: { modo: 'plantel', T, jugadores, poses, disco: lista('disco'), escudo, bandas: espectro(musica, T.fin, inicio) }, portadaEn: T.fin - .3,
    hora: '2026-11-07T15:30:00-03:00', cuando: 'mañana 15:30', titulo: 'Tacet, con el club: 18 jugadores',
    tiktok: '18 jugadores, un mismo sonido. Hoy a las 20:00 le ponemos nombre a lo que suena detrás de nuestros videos. #TopSecretFC #ProClubs #EAFC', protagonistas: [] };
}

async function abrirCon(datos) {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/tacet-club.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}

const PIEZAS = { noches: armarNoches, plantel: armarPlantel };
const hojas = [];
for (const [id, armar] of Object.entries(PIEZAS)) {
  if (pedidos.length && !pedidos.includes(id)) continue;
  const a = await armar(), { datos: D, musica, inicio } = a, tema = infoTema(musica);
  log(`${id}: ${tema.titulo} · ${Math.round(60 / a.B)} BPM · ${D.T.fin.toFixed(1)} s`);
  if (flag('--cuadros')) {
    const { b, p } = await abrirCon(D), fila = [];
    for (let k = 0; k < 16; k++) { await p.evaluate(s => mostrar(0, s), D.T.fin * (k + .5) / 16); fila.push(await sharp(await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 84 })).resize(180, 320).toBuffer()); }
    await b.close(); hojas.push(fila); continue;
  }
  const base = path.join(DIR, `${id}-base.mp4`), audio = path.join(DIR, `${id}.mp4`), final = path.join(DIR, `${id}-tiktok.mp4`), jpg = path.join(DIR, `${id}-portada.jpg`);
  log('  render…');
  await video('tacet-club.html', D, base, { escenas: [{ n: 0, dur: D.T.fin }], fps: 60, desenfoque: true });
  ff(['-i', base, '-ss', inicio.toFixed(3), '-i', musica, '-af', `afade=t=in:d=0.1,afade=t=out:st=${(D.T.fin - 1.1).toFixed(2)}:d=1`, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', D.T.fin.toFixed(3), '-movflags', '+faststart', audio]);
  { const { b, p } = await abrirCon(D); await p.evaluate(s => mostrar(0, s), a.portadaEn); await p.locator('#lienzo').screenshot({ path: jpg, type: 'jpeg', quality: 93 }); await b.close(); }
  conPortada(audio, jpg, final);
  if (flag('--sin-lote')) continue;
  await putFile(audio, `social/viral/tacet-club-${id}.mp4`);
  await putFile(final, `social/viral/tacet-club-${id}-tiktok.mp4`);
  const v = Date.now().toString(36), uPortada = await subirPortada(jpg, `social/viral/tacet-club-${id}-portada.jpg`);
  const desc = `${Math.round(D.T.fin)} s · sale ${a.cuando} · no nombra a Tacet Sin a propósito: se revela a las 20:00 del 7/11, por eso el texto no lleva crédito del tema · suena ${tema.titulo}.`;
  const lote = {
    id: `viral-tacet-club-${id}`, tipo: 'viral', creado: new Date().toISOString(), publicarA: a.hora, titulo: a.titulo, piezas: [
      { id: 'ig-historia', red: 'instagram', formato: 'Historia', metodo: 'ig-historia', decision: 'pendiente', descripcion: desc, protagonistas: a.protagonistas, media: [{ tipo: 'video', url: `${MEDIA}/social/viral/tacet-club-${id}.mp4?v=${v}`, vertical: true }], local: { video: audio } },
      { id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok', decision: 'pendiente', descripcion: desc, protagonistas: a.protagonistas, media: [{ tipo: 'video', url: `${MEDIA}/social/viral/tacet-club-${id}-tiktok.mp4?v=${v}`, vertical: true }], local: { video: final }, portada: { url: uPortada, local: jpg }, texto: a.tiktok },
    ],
  };
  let avisos = 0;
  for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) { avisos++; log(`  aviso ${id}/${p.id}: ${r.msg}`); }
  if (avisos) throw new Error(`${avisos} avisos del revisor en ${id}.`);
  await agregarLote(lote);
  log(`  lote ${lote.id} cargado.`);
}
if (hojas.length) {
  const comp = hojas.flatMap((f, i) => f.map((input, k) => ({ input, left: (k % 8) * 180, top: (i * 2 + Math.floor(k / 8)) * 320 })));
  await sharp({ create: { width: 1440, height: hojas.length * 640, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 88 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
}
process.exit(0);
