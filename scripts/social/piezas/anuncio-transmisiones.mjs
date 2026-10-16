#!/usr/bin/env node
// Anuncio de las nuevas transmisiones (2026-10-15, pedido de Juan: "una presentación de alto nivel"). Pieza vertical con
// metraje REAL de la transmisión nueva: la salida de OBS + overlay grabada por scripts/stream/demo-vivo.mjs sobre 5
// momentos del vivo del 14/10 (fuentes/stream/momentos/: demo-horizontal.mp4 y demo-vertical.mp4), motion design
// (plantillas/anuncio-vivo.html), la voz del club y un tema propio.
//
//   node scripts/social/piezas/anuncio-transmisiones.mjs                 → render completo (60 fps + desenfoque, voz)
//   node scripts/social/piezas/anuncio-transmisiones.mjs --cuadros 2,10  → solo capturas de esos segundos (revisión)
//   --desfase 3.68   segundos entre el video que reproduce OBS y la grabación (se mide con el primer corte de cartel)
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { chromium } from 'playwright';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../../lib/env.mjs';
import { video, archivo } from '../lib/render.mjs';
import { narracion, agregarVoz } from '../lib/voz.mjs';
import { elegirMusica } from '../../lib/musica.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/anuncio-vivo');
const MOM = path.join(ROOT, 'fuentes/stream/momentos');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DESFASE = +arg('--desfase', 3.68);
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [anuncio] ${m}`);
fs.mkdirSync(DIR, { recursive: true });

// Tema: 110 BPM, drop 1 a los 8,73 s y drop 2 (gancho B) a los 48 s (intro 4 · gancho A 8 · verso 8 · build 2 compases)
const musica = elegirMusica('anuncio-nuevas-transmisiones');
const BPM = 110, BAR = 4 * 60 / BPM, DROP1 = 4 * BAR, DROP2 = 22 * BAR, FIN = DROP2 + 4.8 * BAR;

// Tramos del metraje en segundos del VIDEO DE LOS MOMENTOS (media); la grabación va DESFASE segundos atrás.
// ev = segundo dentro del tramo en que pasa el evento (golpe sincronizado en la plantilla).
const TRAMOS = {
  gol:    { archivo: 'demo-horizontal', desde: 19.5, dur: 3 * BAR, ancho: 1280, ev: 2.1, lado: 'izq' },   // ev medido en los cuadros (el overlay lee eventos cada 1,5 s)
  contra: { archivo: 'demo-horizontal', desde: 52.2, dur: 3 * BAR, ancho: 1280, ev: 2.2, lado: 'der' },
  final:  { archivo: 'demo-horizontal', desde: 89.4, dur: 3 * BAR, ancho: 1280, ev: 1.5, lado: 'izq' },
  pausa:  { archivo: 'demo-vertical',   desde: 142.0, dur: 4 * BAR, ancho: 720 },
  ig:     { archivo: 'demo-vertical',   desde: 19.5, dur: 2 * BAR, ancho: 720 },
};
const clips = {};
for (const [k, tr] of Object.entries(TRAMOS)) {
  const dir = path.join(DIR, `cuadros-${k}`);
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) {
    fs.mkdirSync(dir, { recursive: true });
    const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', (tr.desde - DESFASE).toFixed(3), '-t', (tr.dur + 0.5).toFixed(3),
      '-i', path.join(MOM, tr.archivo + '.mp4'), '-vf', `fps=30,scale=${tr.ancho}:-2`, '-q:v', '2', path.join(dir, '%04d.jpg')], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
  }
  clips[k] = { dir: archivo(dir), n: fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).length };
}

// Voz del club (Elena), cada frase en su escena
const T = { titulo: DROP1 - 2 * BAR, plat: DROP1, gol: DROP1 + 3 * BAR, contra: DROP1 + 6 * BAR, final: DROP1 + 9 * BAR, pausa: DROP1 + 12 * BAR, ig: DROP2 - 2 * BAR, cierre: DROP2 };
const pistas = narracion([
  { en: 0.35, texto: 'Nunca viste un partido de Top Secret así.' },
  { en: T.titulo + 0.15, texto: 'Las nuevas transmisiones del club.' },
  { en: T.plat + 0.35, texto: 'En vivo en Twitch, Kick, YouTube e Instagram. Todo al mismo tiempo.' },
  { en: T.gol + 0.3, texto: 'Cada gol nuestro se grita en pantalla.' },
  { en: T.contra + 0.3, texto: 'Y cuando toca sufrir, se sufre en equipo.' },
  { en: T.final + 0.25, texto: 'Al final de cada partido, el vestuario reacciona.' },
  { en: T.pausa + 0.3, texto: 'En las esperas, la pantalla es nuestra: charlas, entrevistas y los números del club.' },
  { en: T.ig + 0.1, texto: 'Y en Instagram, en vertical, pensado para tu celular.' },
  { en: T.cierre + 0.7, texto: 'El martes arranca la Temporada 4 en Espacio Gamer. Te esperamos en vivo.' },
], path.join(DIR, 'voz'));

const datos = {
  bpm: BPM, drop1: DROP1, drop2: DROP2, fin: FIN, clips,
  eventoEn: Object.fromEntries(Object.entries(TRAMOS).filter(([, t]) => t.ev != null).map(([k, t]) => [k, t.ev])),
  palcoLado: Object.fromEntries(Object.entries(TRAMOS).filter(([, t]) => t.lado).map(([k, t]) => [k, t.lado])),
  escudo: archivo(path.join(ROOT, 'logos/rebrand/Top Secret Logo New.png')),
  voz: pistas.map(p => ({ en: p.en, dur: p.dur, palabras: p.palabras.map(w => ({ t: w.t - p.en, d: w.d, w: w.w })) })),
};

const cuadros = arg('--cuadros');
if (cuadros) {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/anuncio-vivo.html')));
  await p.evaluate(d => pintar(d), datos); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  for (const s of cuadros.split(',').map(Number)) {
    await p.evaluate(t => mostrar(0, t), s); await p.waitForTimeout(150);
    await p.locator('#lienzo').screenshot({ path: path.join(DIR, `cuadro-${String(s).replace('.', '_')}.jpg`), type: 'jpeg', quality: 85 });
  }
  await b.close(); log('capturas en ' + DIR); process.exit(0);
}

log(`Render (${FIN.toFixed(1)} s, ${BPM} BPM, drops en ${DROP1.toFixed(2)} y ${DROP2.toFixed(2)})…`);
const mudo = path.join(DIR, 'anuncio-sin-voz.mp4'), final = path.join(DIR, 'anuncio-nuevas-transmisiones.mp4');
await video('anuncio-vivo.html', datos, mudo, { escenas: [{ n: 0, dur: FIN }], musica, fps: 60, desenfoque: true });
agregarVoz(mudo, pistas, final, { volumenMusica: 0.55 });
log('Listo: ' + final);
