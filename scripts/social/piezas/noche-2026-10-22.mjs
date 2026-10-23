// Video de la noche del 22/10/2026 en Espacio Gamer (fechas 1, 3 y 4): 3-3 con SF Drysdale (de 1-3 a la tijera de
// Lautavester7 en el descuento), 1-0 a Los Picantes y 1-0 a InfinitX. Pedido de Juan, 2026-10-23: "armame todo bien
// producido para publicar en redes y ponelo en aprobar". Vertical 1080x1920, < 60 s (reel, TikTok, Short, X, FB).
// Metraje: el vivo de YouTube de RS32-DaniStone (AcrpRjOUvGM, señal limpia sin overlay, sin audio), cuadros extraídos
// en fuentes/redes/noche-2026-10-22/cuadros-* (ver los tiempos en TRAMOS). Plantilla: scripts/social/plantillas/noche.html.
//
//   node scripts/social/piezas/noche-2026-10-22.mjs --cuadros 5,27,50   → capturas de esos segundos (revisión)
//   node scripts/social/piezas/noche-2026-10-22.mjs [--portada <img>]   → render completo + lote en aprobar.html
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { archivo, video, dropDelTema } from '../lib/render.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/noche-2026-10-22');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [noche-22-10] ${m}`);
const clip = k => { const d = path.join(DIR, `cuadros-${k}`); return { dir: archivo(d), n: fs.readdirSync(d).filter(f => f.endsWith('.jpg')).length }; };
const foto = gt => `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/noticias/plantel-t4/${gt}.webp`;   // retrato del plantel T4
const ESC = {
  sfd: 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/escudos-eg/suda-esports.webp',
  lp: 'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184002-fyufpthupl.png',
  inf: 'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184001-vrqhkmuma0.png',
};

// Tramos (segundos del video). golEn = segundo del tramo (o del clip, en la repetición) en que entra la pelota;
// foco = hacia qué lado del cuadro está el arco (0 izquierda … 1 derecha). Fuente de cada clip (segundos del VOD):
// g1 1377+7,5 · golpe 1804,5+2,3 · g2 2084+6,8 · g3 2119,5+8,5 · repe 2124,5+3 a 60 fps · g4 2619+6,8 · g5 4632+6,4
const sfd = { escudo: ESC.sfd, rival: 'SF Drysdale', sigla: 'SFD' };
const TRAMOS = [
  { tipo: 'gancho', dur: 3.4, clip: clip('g3'), cuadro: 7.2, kicker: 'ESPACIO GAMER · JUEVES 22/10', grande: '3-3',
    texto: 'De <span class="tachado">1-3</span> a la tijera.<br><b>Y dos triunfos más.</b>' },
  { tipo: 'gol', dur: 7.5, clip: clip('g1'), golEn: 5.8, foco: .72, ...sfd, kicker: 'ESPACIO GAMER · FECHA 1', minuto: "24'", antes: '0-1', despues: '1-1',
    goleador: 'Cabers14', foto: foto('Cabers14'), como: 'De cabeza' },
  { tipo: 'golpe', dur: 2.3, clip: clip('golpe'), kicker: 'SF DRYSDALE · MINUTO 58', grande: '1-3', texto: 'Se nos fueron<br><b>dos goles arriba.</b>' },
  { tipo: 'gol', dur: 6.8, clip: clip('g2'), golEn: 6.0, foco: .12, ...sfd, kicker: 'ESPACIO GAMER · FECHA 1', minuto: "87'", antes: '1-3', despues: '2-3',
    goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'Desde la puerta del área' },
  { tipo: 'gol', dur: 8.5, clip: clip('g3'), golEn: 7.0, foco: .16, ...sfd, kicker: 'ESPACIO GAMER · FECHA 1', minuto: "90+'", antes: '2-3', despues: '3-3',
    goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'De tijera, en el descuento' },
  { tipo: 'repe', dur: 6, clip: clip('repe'), velocidad: .5, golEn: 2.0, foco: .16, ...sfd, kicker: 'ESPACIO GAMER · FECHA 1', minuto: "90+'", antes: '2-3', despues: '3-3',
    goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'De tijera, en el descuento', tag: '0.5x' },
  { tipo: 'gol', dur: 6.8, clip: clip('g4'), golEn: 3.7, foco: .8, escudo: ESC.lp, rival: 'Los Picantes', sigla: 'LP', kicker: 'ESPACIO GAMER · FECHA 3', minuto: "14'", antes: '0-0', despues: '1-0',
    goleador: 'NicoBJ_96', foto: foto('NicoBJ_96'), como: 'Asistencia de Lautavester7' },
  { tipo: 'gol', dur: 6.4, clip: clip('g5'), golEn: 3.0, foco: .78, escudo: ESC.inf, rival: 'InfinitX', sigla: 'INF', kicker: 'ESPACIO GAMER · FECHA 4', minuto: "51'", antes: '0-0', despues: '1-0',
    goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'Asistencia de nikileo527 · su tercer gol' },
  { tipo: 'cierre', dur: 8.6, clip: clip('g3'), cuadro: 8 },
];
let t0 = 0;
for (const tr of TRAMOS) { tr.desde = +t0.toFixed(2); t0 += tr.dur; tr.hasta = +t0.toFixed(2); }
const T = Object.fromEntries(TRAMOS.map((tr, i) => [`${tr.tipo}${i}`, tr.desde]));
const FIN = t0;
const tTijera = TRAMOS[4].desde + TRAMOS[4].golEn;


// Voz del club (Elena). Sin gamertags en la voz (se pronuncian mal): el puesto; los gamertags van en pantalla.
const { narracion, agregarVoz } = await import('../lib/voz.mjs');
const pistas = narracion([
  { en: 0.3, texto: 'Tres partidos en una noche. Y una jugada para guardar.' },
  { en: TRAMOS[1].desde + 0.3, texto: 'Primero, el empate de cabeza del central.' },
  { en: TRAMOS[2].desde + 0.1, texto: 'Pero se nos fueron uno a tres.' },
  { en: TRAMOS[3].desde + 0.3, texto: 'Minuto ochenta y siete: descuento del extremo.' },
  { en: TRAMOS[4].desde + 0.3, texto: 'Y en la última jugada...' },
  { en: tTijera + 0.2, texto: '¡De tijera! Tres a tres.' },
  { en: TRAMOS[5].desde + 1.4, texto: 'Mirala otra vez.' },
  { en: TRAMOS[6].desde + 0.3, texto: 'Después, uno a cero a Los Picantes.' },
  { en: TRAMOS[7].desde + 0.3, texto: 'Y otro uno a cero para cerrar la noche.' },
  { en: TRAMOS[8].desde + 0.4, texto: 'Invictos en Espacio Gamer. Todos los partidos, en vivo, por Twitch, Kick, YouTube e Instagram.' },
], path.join(DIR, 'voz'));

const datos = {
  tramos: TRAMOS, oro: 'tijera|invictos|vivo|tres',
  proximo: 'MAR 27/10 · 23:00 · vs MISKYMAYU FC',
  cierre: { kicker: 'LA NOCHE EN ESPACIO GAMER', frase: 'Invictos: <b>3 triunfos y 1 empate</b>',
    filas: [
      { etiqueta: 'FECHA 1', rival: 'SF Drysdale', escudo: ESC.sfd, marcador: '3-3', res: 'empate' },
      { etiqueta: 'FECHA 3', rival: 'Los Picantes', escudo: ESC.lp, marcador: '1-0', res: 'victoria' },
      { etiqueta: 'FECHA 4', rival: 'InfinitX', escudo: ESC.inf, marcador: '1-0', res: 'victoria' },
    ] },
  voz: pistas.map(p => ({ en: p.en, dur: p.dur, palabras: p.palabras.map(w => ({ t: w.t - p.en, d: w.d, w: w.w })) })),
};
const PLANTILLA = 'noche.html';

const cuadrosArg = (() => { const i = process.argv.indexOf('--cuadros'); return i > 0 ? process.argv[i + 1] : null; })();
if (cuadrosArg) {
  const { chromium } = await import('playwright');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas', PLANTILLA)));
  await p.evaluate(d => pintar(d), datos); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  for (const s of cuadrosArg.split(',').map(Number)) {
    await p.evaluate(t => mostrar(0, t), s); await p.waitForTimeout(150);
    await p.locator('#lienzo').screenshot({ path: path.join(DIR, `cuadro-${String(s).replace('.', '_')}.jpg`), type: 'jpeg', quality: 85 });
  }
  await b.close(); log('capturas en ' + DIR); process.exit(0);
}

// Música: tema propio que no se repite (se elige recién acá: las capturas de revisión no gastan un tema); el drop cae en la tijera
const { elegirMusica } = await import('../../lib/musica.mjs');
const musica = elegirMusica('noche-espacio-gamer-2026-10-22');
// el primer gancho del tema que llegue a la tijera (Astilla: gancho A en 21,3 s, antes; gancho B en 39,1 → desde 12,1 s)
const ganchos = (() => {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/temas-diarios.json'), 'utf8')).temas.find(x => x.archivo === path.basename(musica));
    let c = 0; const out = [];
    for (const p of t.estructura.split('·').map(s => s.trim())) { if (/^gancho/i.test(p)) out.push(c * 4 * 60 / t.bpm); c += Number((p.match(/(\d+)\s*$/) || [])[1] || 0); }
    return out;
  } catch { const d = dropDelTema(musica); return d ? [d.drop] : []; }
})();
const gancho = ganchos.find(g => g >= tTijera);
const musicaDesde = gancho !== undefined ? gancho - tTijera : 0;
log(`Render (${FIN.toFixed(1)} s; música desde ${musicaDesde.toFixed(2)} s → drop en la tijera, ${tTijera.toFixed(1)} s)…`);
const mudo = path.join(DIR, 'noche-sin-voz.mp4'), conVoz = path.join(DIR, 'noche-con-voz.mp4'), final = path.join(DIR, 'noche-2026-10-22.mp4');
const { portada, conPortada, subirPortada } = await import('../lib/portada.mjs');
const jpgPortada = path.join(DIR, 'portada.jpg');
// --solo-lote: el video ya está renderizado (fuentes/redes/noche-2026-10-22/): solo subirlo y armar el lote
if (!(process.argv.includes('--solo-lote') && fs.existsSync(final) && fs.existsSync(jpgPortada))) {
  await video(PLANTILLA, datos, mudo, { escenas: [{ n: 0, dur: FIN }], musica, fps: 60, desenfoque: true, musicaDesde });
  agregarVoz(mudo, pistas, conVoz, { volumenMusica: 0.55 });
  // Portada (regla de Juan 2026-10-21): la foto de campaña de la nota (ChatGPT) con el 3-3
  const iPort = process.argv.indexOf('--portada');
  const imgPortada = iPort > 0 ? process.argv[iPort + 1] : path.join(DIR, 'portada-tijera.png');   // imagen propia (ChatGPT): la de la noticia no, se duplica en el feed (Juan)
  await portada({ imagen: imgPortada, kicker: 'ESPACIO GAMER · 22/10', dato: '3-3', titulo: 'De 1-3 a la tijera.\n*Y dos triunfos más.*', foco: '50% 40%' }, jpgPortada);
  conPortada(conVoz, jpgPortada, final);
}
log('Listo: ' + final);
if (process.argv.includes('--sin-lote')) process.exit(0);

// ── A aprobar.html. Sin hora: publicar.mjs la agenda al aprobarla. ──
const { putFile } = await import('../../lib/r2.mjs');
const { agregarLote } = await import('../lib/aprobaciones.mjs');
const { revisarPieza } = await import('../../../revisar-textos.js');
const v = Date.now().toString(36);
const key = 'social/noche-2026-10-22/noche-espacio-gamer.mp4';
await putFile(final, key);
const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${v}`;
const portadaUrl = await subirPortada(jpgPortada, 'social/noche-2026-10-22/portada.jpg');
const musicaNombre = path.basename(musica).replace(/^\d{4}-\d{2}-\d{2} - /, '').replace(/\.\w+$/, '');
const desc = `${FIN.toFixed(0)} s · los 5 goles con la señal de la transmisión, repetición de la tijera, resultados de la noche · voz del club · música: ${musicaNombre}`;
const P = o => ({ decision: 'pendiente', media: [{ tipo: 'video', url, vertical: true }], descripcion: desc, protagonistas: ['Lautavester7', 'Cabers14', 'NicoBJ_96'], local: { video: final }, portada: { url: portadaUrl, local: jpgPortada }, ...o });
const lote = {
  id: 'video-noche-2026-10-22', tipo: 'viral', creado: new Date().toISOString(),
  titulo: 'La noche del 22/10 en Espacio Gamer · de 1-3 a la tijera (video para todas las redes)', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel', metodo: 'ig-reel',
      texto: 'De 1-3 a 3-3 con una tijera en el descuento. Y después, dos 1-0.\n\nCabers14 de cabeza, Lautavester7 tres veces (la última, de tijera) y NicoBJ_96. Invictos en Espacio Gamer.\n\n¿La viste en vivo?\n\n#TopSecretFC #EspacioGamer #ProClubs #EAFC' }),
    P({ id: 'ig-historia', red: 'instagram', formato: 'Historia', descripcion: '24 h · ' + desc, metodo: 'ig-historia', texto: '' }),
    P({ id: 'fb-video', red: 'facebook', formato: 'Reel / video', metodo: 'fb-video',
      texto: 'Jueves 22 de octubre, tres partidos de Espacio Gamer en una noche. Ante SF Drysdale íbamos 1-3: descontó Lautavester7 en el 87\' y, en la última jugada, lo empató de tijera. Después, 1-0 a Los Picantes (NicoBJ_96) y 1-0 a InfinitX (otra vez Lautavester7).\n\nTres triunfos y un empate en cuatro partidos. Todos van en vivo por Twitch, Kick, YouTube e Instagram. El próximo: martes 27 a las 23:00 vs MISKYMAYU FC.' }),
    P({ id: 'fb-historia', red: 'facebook', formato: 'Historia', descripcion: '24 h · ' + desc, metodo: 'fb-historia', texto: '' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok',
      texto: 'De 1-3 a 3-3 con la tijera de Lautavester7 en el último minuto 🔥 y dos triunfos más en Espacio Gamer. #TopSecretFC #ProClubs #EAFC #EspacioGamer' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short', metodo: 'youtube', titulo: 'De 1-3 a 3-3 con una tijera en el descuento | Pro Clubs EA FC',
      texto: 'Noche de Espacio Gamer: 3-3 ante SF Drysdale con la tijera de Lautavester7 en el último minuto, 1-0 a Los Picantes y 1-0 a InfinitX.\n\n#Shorts #TopSecretFC #ProClubs' }),
    P({ id: 'x', red: 'x', formato: 'Post con video', metodo: 'x-video',
      texto: 'Íbamos 1-3. Lautavester7 descontó en el 87\' y lo empató de tijera en la última. Después, dos 1-0. Invictos en Espacio Gamer. #TopSecretFC' }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Lote en aprobar.html: ' + lote.id);
