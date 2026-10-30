// Video "15 días en Espacio Gamer" (20/10–29/10/2026, fechas 1 a 8): los 8 goles de la quincena con la señal de la
// transmisión, fotos nuevas animadas (quincena-eg-imagenes.mjs), la tabla y lo que viene. Pedido de Juan, 2026-10-30:
// versión YouTube (horizontal 1920x1080, video normal) y versión Instagram/TikTok (vertical 1080x1920), en aprobar.html
// para el domingo 1/11. Plantilla: scripts/social/plantillas/quincena.html (los dos formatos, misma línea de tiempo).
//
// Fuentes del metraje (cuadros en fuentes/redes/…):
//   20/10 Sub 21      gol-sub21/cuadros-repe (grabación limpia del vigía, 60 fps; el gol a los 2,8 s)
//   22/10 (3 partidos) noche-2026-10-22/cuadros-g1…g5 + repe (vivo de YouTube de RS32-DaniStone, sin overlay)
//   27/10 Parke Avellane quincena-eg/cuadros-pke1 (vigía 1690 s +12), -pke2 (2402 s +12), -pke2repe (2408,5 s, 60 fps)
// Resultados: fixture oficial de espaciogamer.cl. Goleadores del 27/10 leídos del video (sin pantalla de Eventos): el
// 1-1 de Lautavester7 (gambeta al arquero) y el 2-1 del 90+ de Cabers14 (rebote en el área chica) — confirmar con Juan.
//
//   node scripts/social/piezas/quincena-eg.mjs --cuadros story|yt 5,30,60   → capturas de revisión
//   node scripts/social/piezas/quincena-eg.mjs [--sin-lote] [--solo-lote]
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { archivo, video } from '../lib/render.mjs';
import { equiposDivisionEG } from '../../lib/espacio-gamer.mjs';
import { DIR_IA, ESCENAS } from './quincena-eg-imagenes.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/quincena-eg');
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [quincena-eg] ${m}`);
const foto = gt => `${MEDIA}/logos/noticias/plantel-t4/${gt}.webp`;
const cuadros = (d, fps = 30) => ({ dir: archivo(d), n: fs.readdirSync(d).filter(f => f.endsWith('.jpg')).length, fps });
const enRedes = (k, fps) => cuadros(path.join(ROOT, 'fuentes/redes', k), fps);
// Foto animada (Canva) si está; si no, la foto fija con el acercamiento de la plantilla
const ia = id => { const d = path.join(DIR_IA, `${id}-cuadros`); return fs.existsSync(d) && fs.readdirSync(d).length ? cuadros(d) : { imagen: archivo(path.join(DIR_IA, `${id}.png`)) }; };
for (const e of ESCENAS) if (!fs.existsSync(path.join(DIR_IA, `${e.id}.png`))) throw new Error(`Falta la foto ${e.id}: correr quincena-eg-imagenes.mjs`);

// Escudos de la división (los mismos que muestra el sitio)
const equipos = await equiposDivisionEG('challengers-2-espacio-gamer-argentina');
const esc = n => equipos.find(t => t.nombre.toLowerCase() === n.toLowerCase())?.logo || `${MEDIA}/logos/rebrand/favicon-180.png`;

// ── Los 8 partidos (fixture oficial de Espacio Gamer) ───────────────────────
export const NOCHES = [
  { fecha: '2026-10-20', dia: 'MARTES 20/10', titulo: 'El debut', partidos: [{ f: 2, rival: 'Sub 21', lv: 'V', gf: 1, gc: 0 }] },
  { fecha: '2026-10-22', dia: 'JUEVES 22/10', titulo: 'Tres partidos,<br><b class="o">una noche</b>', partidos: [
    { f: 1, rival: 'SF Drysdale', lv: 'L', gf: 3, gc: 3 }, { f: 3, rival: 'Los Picantes', lv: 'L', gf: 1, gc: 0 }, { f: 4, rival: 'InfinitX', lv: 'V', gf: 1, gc: 0 }] },
  { fecha: '2026-10-27', dia: 'MARTES 27/10', titulo: 'Caer y<br><b class="o">levantarse</b>', partidos: [
    { f: 5, rival: 'Miskymayu FC', lv: 'L', gf: 0, gc: 2 }, { f: 6, rival: 'Parke Avellane', lv: 'L', gf: 2, gc: 1 }] },
  { fecha: '2026-10-29', dia: 'JUEVES 29/10', titulo: 'La noche<br><b class="o">más dura</b>', partidos: [
    { f: 7, rival: 'Al Hueso', lv: 'V', gf: 0, gc: 3 }, { f: 8, rival: 'WAP eSports', lv: 'L', gf: 0, gc: 3 }] },
];
const res = p => p.gf > p.gc ? 'V' : p.gf < p.gc ? 'D' : 'E';
const fila = p => ({ etiqueta: `FECHA ${p.f} · ${p.lv === 'L' ? 'LOCAL' : 'VISITANTE'}`, rival: p.rival, escudo: esc(p.rival), marcador: `${p.gf}-${p.gc}`, res: res(p) });
export const GOLEADORES = [['Lautavester7', 4], ['Cabers14', 2], ['NicoBJ_96', 1], ['pepolemmo2710', 1]];
export const PROXIMOS = [
  { etiqueta: 'FECHA 9 · VISITANTE · EL LÍDER', rival: 'Fco Kannabiense', hora: '23:00' },
  { etiqueta: 'FECHA 10 · LOCAL', rival: 'Argentinos Jrs Esp', hora: '23:30' },
];

// ── Línea de tiempo ─────────────────────────────────────────────────────────
const N22 = n => enRedes(`noche-2026-10-22/cuadros-${n}`);
const sfd = { escudo: esc('SF Drysdale'), rival: 'SF Drysdale', sigla: 'SFD', kicker: 'ESPACIO GAMER · FECHA 1' };
const pke = { escudo: esc('Parke Avellane'), rival: 'Parke Avellane', sigla: 'PKE', kicker: 'ESPACIO GAMER · FECHA 6' };
const jornada = (i, dur, fondo) => ({ tipo: 'jornada', dur, clip: fondo, kicker: `ESPACIO GAMER · NOCHE ${i + 1}`, numero: NOCHES[i].dia, titulo: NOCHES[i].titulo, filas: NOCHES[i].partidos.map(fila) });
const TRAMOS = [
  { tipo: 'gancho', dur: 5.4, clip: ia('apertura'), kicker: 'ESPACIO GAMER · 20/10 AL 29/10', grande: '15 DÍAS', texto: '8 partidos. 8 goles.<br><b class="o">Lo mejor de la quincena.</b>' },
  jornada(0, 3.8, ia('apertura')),
  { tipo: 'gol', dur: 4.1, clip: enRedes('gol-sub21/cuadros-repe', 60), golEn: 2.8, foco: .85, escudo: esc('Sub 21'), rival: 'Sub 21', sigla: 'S21',
    kicker: 'ESPACIO GAMER · FECHA 2', minuto: "91'", antes: '0-0', despues: '1-0', goleador: 'pepolemmo2710', foto: foto('pepolemmo2710'), como: 'Asistencia de Elianja20' },
  jornada(1, 3.8, N22('g3')),
  { tipo: 'gol', dur: 5.6, clip: N22('g1'), desdeClip: 2, golEn: 3.8, foco: .72, ...sfd, minuto: "24'", antes: '0-1', despues: '1-1', goleador: 'Cabers14', foto: foto('Cabers14'), como: 'De cabeza' },
  { tipo: 'gol', dur: 5.4, clip: N22('g2'), desdeClip: 2, golEn: 4.0, foco: .12, ...sfd, minuto: "87'", antes: '1-3', despues: '2-3', goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'Desde la puerta del área' },
  { tipo: 'gol', dur: 6.8, clip: N22('g3'), desdeClip: 1.5, golEn: 5.5, foco: .16, ...sfd, minuto: "90+'", antes: '2-3', despues: '3-3', goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'De tijera, en el descuento' },
  { tipo: 'repe', dur: 5.2, clip: N22('repe'), velocidad: .5, golEn: 2.0, foco: .16, ...sfd, minuto: "90+'", antes: '2-3', despues: '3-3', goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'De tijera, en el descuento', tag: '0.5x' },
  { tipo: 'ia', dur: 3.6, clip: ia('tijera'), kicker: 'SF DRYSDALE · MINUTO 90+', texto: 'De 1-3 a 3-3.<br><b class="o">De tijera.</b>' },
  { tipo: 'gol', dur: 5.2, clip: N22('g4'), golEn: 3.7, foco: .8, escudo: esc('Los Picantes'), rival: 'Los Picantes', sigla: 'LP', kicker: 'ESPACIO GAMER · FECHA 3', minuto: "14'", antes: '0-0', despues: '1-0',
    goleador: 'NicoBJ_96', foto: foto('NicoBJ_96'), como: 'Asistencia de Lautavester7' },
  { tipo: 'gol', dur: 5.0, clip: N22('g5'), golEn: 3.0, foco: .78, escudo: esc('InfinitX'), rival: 'InfinitX', sigla: 'INF', kicker: 'ESPACIO GAMER · FECHA 4', minuto: "51'", antes: '0-0', despues: '1-0',
    goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'Asistencia de nikileo527' },
  jornada(2, 4.6, enRedes('quincena-eg/cuadros-pke2')),
  { tipo: 'gol', dur: 6.2, clip: enRedes('quincena-eg/cuadros-pke1'), desdeClip: 5, golEn: 4.7, foco: .82, ...pke, minuto: "20'", antes: '0-1', despues: '1-1', goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'Gambeta al arquero' },
  { tipo: 'gol', dur: 6.2, clip: enRedes('quincena-eg/cuadros-pke2'), desdeClip: 5, golEn: 4.3, foco: .18, ...pke, minuto: "90+'", antes: '1-1', despues: '2-1', goleador: 'Cabers14', foto: foto('Cabers14'), como: 'En el descuento, para ganarlo' },
  { tipo: 'repe', dur: 4.6, clip: enRedes('quincena-eg/cuadros-pke2repe', 60), velocidad: .5, golEn: 2.8, foco: .2, ...pke, minuto: "90+'", antes: '1-1', despues: '2-1', goleador: 'Cabers14', foto: foto('Cabers14'), como: 'En el descuento, para ganarlo', tag: '0.5x' },
  { tipo: 'ia', dur: 3.6, clip: ia('descuento'), kicker: 'PARKE AVELLANE · MINUTO 90+', texto: 'Otra vez<br><b class="o">en el descuento.</b>' },
  jornada(3, 6.4, ia('noche-dura')),
  { tipo: 'tabla', dur: 6.6, clip: N22('g3'), cuadro: 8, kicker: 'ESPACIO GAMER · TABLA DESPUÉS DE 8 FECHAS', posicion: '7º',
    puntos: '13 PUNTOS<span>A UNO DEL QUINTO</span>',
    record: [{ n: 4, t: 'GANADOS' }, { n: 1, t: 'EMPATE' }, { n: 3, t: 'PERDIDOS' }, { n: '8-12', t: 'GOLES' }],
    goleadores: GOLEADORES.map(([gt, goles]) => ({ gt, goles, foto: foto(gt) })) },
  { tipo: 'cierre', dur: 9.4, clip: ia('revancha'), kicker: 'LO QUE VIENE · MARTES 3/11', titulo: 'Dos partidos<br><b class="o">para volver a sumar</b>',
    filas: PROXIMOS.map(p => ({ ...p, escudo: esc(p.rival) })) },
];
let t0 = 0;
for (const tr of TRAMOS) { tr.desde = +t0.toFixed(2); t0 += tr.dur; tr.hasta = +t0.toFixed(2); }
const FIN = t0;
const tr = i => TRAMOS[i].desde;
const tTijera = tr(6) + TRAMOS[6].golEn;

// ── Voz del club (Elena). Sin gamertags (se pronuncian mal): el puesto; los gamertags van en pantalla ──
const { narracion, agregarVoz } = await import('../lib/voz.mjs');
const pistas = narracion([
  { en: 0.3, texto: 'Quince días en Espacio Gamer. Esto fue lo mejor.' },
  { en: tr(1) + 0.2, texto: 'Martes veinte. El debut.' },
  { en: tr(2) + 0.2, texto: 'Minuto noventa y uno: gol y victoria.' },
  { en: tr(3) + 0.2, texto: 'Jueves veintidós: tres partidos.' },
  { en: tr(4) + 0.3, texto: 'Empate de cabeza del central.' },
  { en: tr(5) + 0.2, texto: 'Perdíamos uno a tres. Descuento en el ochenta y siete.' },
  { en: tr(6) + 0.6, texto: 'Y en la última jugada...' },
  { en: tr(7) + 0.4, texto: '¡De tijera! Tres a tres.' },
  { en: tr(9) + 0.3, texto: 'Después, uno a cero a Los Picantes.' },
  { en: tr(10) + 0.3, texto: 'Y otro uno a cero. Invictos.' },
  { en: tr(11) + 0.2, texto: 'Martes veintisiete. Primero, una derrota.' },
  { en: tr(12) + 0.4, texto: 'Después, el extremo dejó en el camino al arquero.' },
  { en: tr(13) + 0.6, texto: 'Y en el descuento, otra vez el central.' },
  { en: tr(14) + 1.2, texto: 'Dos a uno en el noventa.' },
  { en: tr(16) + 0.3, texto: 'Jueves veintinueve. La noche más dura: dos derrotas por tres a cero.' },
  { en: tr(17) + 0.3, texto: 'Trece puntos. Séptimos, a uno del quinto.' },
  { en: tr(18) + 0.3, texto: 'El martes, el líder y Argentinos. Todos los partidos, en vivo, por Twitch, Kick, YouTube e Instagram.' },
], path.join(DIR, 'voz'));

const datos = {
  tramos: TRAMOS, oro: 'tijera|invictos|noventa|vivo|debut',
  escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  voz: pistas.map(p => ({ en: p.en, dur: p.dur, palabras: p.palabras.map(w => ({ t: w.t - p.en, d: w.d, w: w.w })) })),
};
const PLANTILLA = 'quincena.html';

const iC = process.argv.indexOf('--cuadros');
if (iC > 0) {
  const formato = process.argv[iC + 1], tiempos = process.argv[iC + 2].split(',').map(Number);
  const { chromium } = await import('playwright');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: formato === 'yt' ? { width: 1920, height: 1080 } : { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas', PLANTILLA)));
  await p.evaluate(([d, f]) => pintar(d, f), [datos, formato]); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  for (const s of tiempos) {
    await p.evaluate(t => mostrar(0, t), s); await p.waitForTimeout(150);
    await p.locator('#lienzo').screenshot({ path: path.join(DIR, `rev-${formato}-${String(s).replace('.', '_')}.jpg`), type: 'jpeg', quality: 80 });
  }
  await b.close(); log(`capturas en ${DIR} (${FIN.toFixed(1)} s en total)`); process.exit(0);
}

// ── Render de los dos formatos ──────────────────────────────────────────────
const { elegirMusica } = await import('../../lib/musica.mjs');
const musica = await elegirMusica('quincena-espacio-gamer-2026-11-01');
// que un gancho del tema caiga en la tijera (si la ficha del tema trae la estructura)
const musicaDesde = (() => {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/temas-diarios.json'), 'utf8')).temas.find(x => x.archivo === path.basename(musica));
    let c = 0; const g = [];
    for (const parte of t.estructura.split('·').map(s => s.trim())) { if (/^gancho/i.test(parte)) g.push(c * 4 * 60 / t.bpm); c += Number((parte.match(/(\d+)\s*$/) || [])[1] || 0); }
    const x = g.find(v => v >= tTijera); return x !== undefined ? x - tTijera : 0;
  } catch { return 0; }
})();
const { portada, conPortada, subirPortada } = await import('../lib/portada.mjs');
const SAL = {
  story: { mudo: path.join(DIR, 'quincena-v-sin-voz.mp4'), voz: path.join(DIR, 'quincena-v-con-voz.mp4'), final: path.join(DIR, 'quincena-eg-vertical.mp4') },
  yt: { mudo: path.join(DIR, 'quincena-h-sin-voz.mp4'), voz: path.join(DIR, 'quincena-eg-youtube.mp4') },
};
const jpgPortada = path.join(DIR, 'portada-vertical.jpg'), jpgMiniatura = path.join(DIR, 'miniatura-youtube.jpg');
if (!process.argv.includes('--solo-lote')) {
  for (const formato of ['story', 'yt']) {
    log(`Render ${formato} (${FIN.toFixed(1)} s; música desde ${musicaDesde.toFixed(2)} s)…`);
    await video(PLANTILLA, datos, SAL[formato].mudo, { escenas: [{ n: 0, dur: FIN }], musica, fps: 60, desenfoque: true, musicaDesde, formato });
    agregarVoz(SAL[formato].mudo, pistas, SAL[formato].voz, { volumenMusica: 0.55 });
  }
  // Portada propia (la tijera: las placas del sábado usan otras fotos, regla de Juan 2026-10-23)
  await portada({ imagen: path.join(DIR_IA, 'tijera.png'), kicker: 'ESPACIO GAMER · 15 DÍAS', dato: '8 GOLES', titulo: 'Tijera, descuento\n*y una noche dura.*', foco: '50% 40%' }, jpgPortada);
  conPortada(SAL.story.voz, jpgPortada, SAL.story.final);
  await miniatura(path.join(DIR_IA, 'tijera.png'), jpgMiniatura);
}
log('Listo: ' + SAL.story.final + ' · ' + SAL.yt.voz);
if (process.argv.includes('--sin-lote')) process.exit(0);

// Miniatura de YouTube 1280x720: la foto de la tijera, el título grande a la izquierda y el escudo.
async function miniatura(img, salida) {
  const { chromium } = await import('playwright');
  const b = await chromium.launch();
  try {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    await p.setContent(`<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@900&family=Bebas+Neue&family=JetBrains+Mono:wght@700&display=block" rel="stylesheet">
      <div id="m" style="position:relative;width:1280px;height:720px;overflow:hidden;background:#070605;color:#F4EFE0;font-family:Barlow">
        <img src="${archivo(img)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:60% 40%">
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,6,5,.95) 0%,rgba(7,6,5,.7) 38%,transparent 66%)"></div>
        <div style="position:absolute;left:56px;top:70px;font:700 22px 'JetBrains Mono';letter-spacing:.28em;color:#C9A84C">ESPACIO GAMER · 20/10 AL 29/10</div>
        <div style="position:absolute;left:50px;top:110px;font:400 250px/.82 'Bebas Neue';color:#C9A84C">15 DÍAS</div>
        <div style="position:absolute;left:56px;top:330px;width:620px;font:900 64px/1.02 Barlow;letter-spacing:-.02em">8 goles, una tijera<br>y el 90+</div>
        <img src="${archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'))}" style="position:absolute;left:56px;bottom:50px;height:110px">
      </div>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.locator('#m').screenshot({ path: salida, type: 'jpeg', quality: 92 });
  } finally { await b.close(); }
}

// ── A aprobar.html: sale el domingo 1/11 a las 12:00 ────────────────────────
const { putFile } = await import('../../lib/r2.mjs');
const { agregarLote } = await import('../lib/aprobaciones.mjs');
const { revisarPieza } = await import('../../../revisar-textos.js');
const { infoTema } = await import('../../lib/musica.mjs');
const v = Date.now().toString(36);
const subir = async (f, key) => { await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const urlV = await subir(SAL.story.final, 'social/quincena-eg/quincena-eg-vertical.mp4');
const urlH = await subir(SAL.yt.voz, 'social/quincena-eg/quincena-eg-youtube.mp4');
const portadaUrl = await subirPortada(jpgPortada, 'social/quincena-eg/portada-vertical.jpg');
const miniUrl = await subirPortada(jpgMiniatura, 'social/quincena-eg/miniatura-youtube.jpg');
const musicaNombre = infoTema(musica).titulo;
const desc = `${FIN.toFixed(0)} s · los 8 goles con la señal de la transmisión, repeticiones, fotos nuevas animadas (rotuladas como recreación), tabla y lo que viene · voz del club · música: ${musicaNombre}`;
const vertical = { media: [{ tipo: 'video', url: urlV, vertical: true, poster: portadaUrl }], local: { video: SAL.story.final }, portada: { url: portadaUrl, local: jpgPortada } };
const P = o => ({ decision: 'pendiente', descripcion: desc, musica: musicaNombre, protagonistas: ['Lautavester7', 'Cabers14', 'NicoBJ_96', 'pepolemmo2710'], ...vertical, ...o });
const lote = {
  id: 'video-quincena-eg-2026-11-01', tipo: 'resumen-quincenal', creado: new Date().toISOString(), publicarA: '2026-11-01T12:00:00-03:00',
  titulo: '15 días en Espacio Gamer · video resumen (YouTube horizontal + vertical para el resto) · domingo 1/11 12:00', piezas: [
    P({ id: 'yt-video', red: 'youtube', formato: 'Video (horizontal)', metodo: 'youtube', descripcion: 'Video normal de YouTube 1920x1080 con miniatura propia · ' + desc,
      media: [{ tipo: 'video', url: urlH, vertical: false, poster: miniUrl }], local: { video: SAL.yt.voz }, portada: { url: miniUrl, local: jpgMiniatura }, miniatura: jpgMiniatura,
      titulo: '15 días en Espacio Gamer: 8 goles, una tijera y el 90+ | Top Secret FC · Pro Clubs EA FC',
      texto: 'Las primeras ocho fechas de Top Secret FC en Espacio Gamer, del 20 al 29 de octubre: el debut con gol en el 91\' ante Sub 21, el 3-3 con SF Drysdale que se empató de tijera en el descuento, los 1-0 a Los Picantes e InfinitX, el 2-1 a Parke Avellane en el 90+ y la noche más dura, con dos derrotas por 3-0.\n\nGoles: Lautavester7 (4), Cabers14 (2), NicoBJ_96 y pepolemmo2710.\nTabla: 13 puntos, séptimos, a uno del quinto.\nLo que viene: martes 3/11, 23:00 vs Fco Kannabiense (el líder) y 23:30 vs Argentinos Jrs Esp.\n\nTodos los partidos van en vivo por Twitch, Kick, YouTube e Instagram.\nLas fotos de las jugadas son recreaciones hechas con IA; los goles son de la transmisión.\n\n#TopSecretFC #EspacioGamer #ProClubs #EAFC' }),
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel', metodo: 'ig-reel',
      texto: '15 días, 8 partidos, 8 goles. 🎬\n\nEl debut en el 91\', la tijera de Lautavester7 para el 3-3, el 2-1 de Cabers14 en el descuento… y una noche dura para cerrar la quincena.\n\n13 puntos, séptimos en Espacio Gamer. El martes, el líder y Argentinos Jrs Esp.\n\n¿Cuál fue el mejor gol? 👇\n\n#TopSecretFC #EspacioGamer #ProClubs #EAFC' }),
    P({ id: 'fb-video', red: 'facebook', formato: 'Reel / video', metodo: 'fb-video',
      texto: 'Las primeras ocho fechas de Top Secret FC en Espacio Gamer, en un video: el gol del debut en el 91\' ante Sub 21, el 3-3 con SF Drysdale que Lautavester7 empató de tijera en el descuento, los 1-0 a Los Picantes e InfinitX y el 2-1 a Parke Avellane con gol de Cabers14 en el 90+. Cerramos la quincena con dos derrotas por 3-0: 13 puntos y séptimos, a uno del quinto.\n\nEl martes 3/11: 23:00 vs Fco Kannabiense (el líder) y 23:30 vs Argentinos Jrs Esp, en vivo por Twitch, Kick, YouTube e Instagram.' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok',
      texto: '15 días en Espacio Gamer: gol en el 91\', una tijera en el descuento y un 2-1 en el 90+ ⚽ #TopSecretFC #ProClubs #EAFC #EspacioGamer' }),
    P({ id: 'x', red: 'x', formato: 'Post con video', metodo: 'x-video',
      texto: '15 días en Espacio Gamer: 8 partidos, 8 goles. Gol en el 91\' en el debut, tijera para el 3-3 y 2-1 en el 90+. 13 puntos, séptimos. El martes, el líder. #TopSecretFC' }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Lote en aprobar.html: ' + lote.id);
