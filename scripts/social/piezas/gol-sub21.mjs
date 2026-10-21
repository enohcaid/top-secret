// Reel + historia del gol agónico vs Sub 21 (20/10/2026, Espacio Gamer · Fecha 2, debut oficial de la T4; pedido de
// Juan 2026-10-21: "el gol bien adornado, con repetición, que se vea cómo se transmite y que venda nuestro producto").
// Vertical 1080x1920, < 60 s (sirve para historia y reel). Partes bien separadas:
//   TRANSMISIÓN OFICIAL — el tramo real del VOD de Twitch (topsecretfc 2906478929) con el overlay como salió al aire
//   REPETICIÓN          — la grabación limpia del vigía (sin overlay), en cámara lenta
//   EL LOGRO            — imágenes de ChatGPT (la jugada / el festejo) animadas con Canva, con otra estética y rotuladas
//   cierre              — resultado + "todos los partidos en vivo" (el producto) + próximo partido
//
//   node scripts/social/piezas/gol-sub21.mjs --imagenes        → solo genera las imágenes (para revisarlas)
//   node scripts/social/piezas/gol-sub21.mjs --animar          → clips de Canva de las imágenes aprobadas
//   node scripts/social/piezas/gol-sub21.mjs --cuadros 2,10    → capturas de esos segundos (revisión)
//   node scripts/social/piezas/gol-sub21.mjs                   → render completo
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import { ROOT } from '../../lib/env.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/gol-sub21');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [gol-sub21] ${m}`);
fs.mkdirSync(DIR, { recursive: true });

// El resto de las redes (Juan, 2026-10-21: "publiquemos en todas las redes"): TikTok, YouTube Shorts y X
export const PIEZAS_EXTRA = P => [
  P({ id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok',
    texto: 'Minuto 91, 0-0 y debut oficial. Asistencia de Elianja20, gol de pepolemmo2710 🔥 Así se vivió en nuestra transmisión. #TopSecretFC #ProClubs #EAFC #EspacioGamer' }),
  P({ id: 'yt-short', red: 'youtube', formato: 'Short', metodo: 'youtube', titulo: 'Gol en el minuto 91 para ganar el debut oficial | Pro Clubs EA FC',
    texto: "Debut oficial en Espacio Gamer: asistencia de Elianja20 y gol de pepolemmo2710 en el 91' ante Sub 21.\n\n#Shorts #TopSecretFC #ProClubs" }),
  P({ id: 'x', red: 'x', formato: 'Post con video', metodo: 'x-video',
    texto: 'Minuto 91, 0-0 en el debut oficial y apareció pepolemmo2710 tras el pase de Elianja20. Así se vivió en nuestra transmisión. ¿Lo viste en vivo? #TopSecretFC' }),
];

export const ESCENAS = [
  // quieta: el clip de Canva de la jugada salió mal (Juan: "se enreda con la red, pasa cualquier cosa"): va la imagen fija
  // con un acercamiento hacia la pelota hecho en la plantilla
  { id: 'gol-sub21-jugada', jugadores: ['pepolemmo2710', 'Elianja20'], quieta: true, origen: '78% 72%',
    escena: 'Último minuto de un partido de noche, estadio lleno e iluminado. pepolemmo2710 (dorsal 15, camiseta negra titular de Top Secret) remata de derecha dentro del área y la pelota entra junto al palo, mientras el arquero rival (camiseta naranja) vuela estirado sin llegar. Elianja20 (dorsal 24), que acaba de dar el pase, mira la jugada desde atrás. Momento congelado, dramático, cámara baja a ras del pasto, luces del estadio y gotas de pasto en el aire.',
    movimiento: 'La cámara se acerca lentamente hacia la pelota que entra al arco; las luces del estadio titilan suave.' },
  { id: 'gol-sub21-festejo', jugadores: ['pepolemmo2710', 'Elianja20'],
    escena: 'Festejo de un gol en el último minuto, de noche: pepolemmo2710 (dorsal 15, camiseta negra titular de Top Secret) corre hacia la tribuna con los brazos abiertos y la boca abierta gritando el gol; Elianja20 (dorsal 24) salta a abrazarlo por detrás, y atrás llegan corriendo compañeros con la misma camiseta negra. Tribuna llena enloquecida, luces del estadio, papelitos dorados en el aire. Foto deportiva épica, cuerpo entero.',
    movimiento: 'La cámara retrocede despacio y sube un poco; los papelitos dorados caen lentamente.' },
];

if (process.argv.includes('--imagenes')) {
  for (const e of ESCENAS) { const f = await generarImagen({ id: e.id, escena: e.escena, jugadores: e.jugadores, vertical: true, carpeta: DIR }); log(`${e.id} → ${f}`); }
  await cerrar();
  process.exit(0);
}

// Clips de Canva de las dos imágenes (lentos: ~5-11 min c/u con el cupo agotado; quedan cacheados)
const { animar, cuadros: aCuadros } = await import('../lib/clip.mjs');
const { archivo, video } = await import('../lib/render.mjs');
const ai = {};
for (const e of ESCENAS) {
  let png = path.join(DIR, `${e.id}.png`);
  if (!fs.existsSync(png) && process.argv.includes('--quietas')) png = ESCENAS.map(x => path.join(DIR, `${x.id}.png`)).find(f => fs.existsSync(f)) || png;
  if (!fs.existsSync(png)) throw new Error(`Falta ${png}: correr primero --imagenes`);
  // --quietas: para revisar el diseño antes de que Canva anime, la imagen fija como un solo cuadro
  if (e.quieta || process.argv.includes('--quietas')) {
    const d = path.join(DIR, `${e.id}-quieta`); fs.mkdirSync(d, { recursive: true });
    spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-vf', 'scale=1080:-2', '-q:v', '2', path.join(d, '0001.jpg')]);
    ai[e.id] = { dir: archivo(d), n: 1, quieta: true, origen: e.origen || '50% 50%' }; continue;
  }
  const mp4 = animar(png, e.movimiento);
  const c = aCuadros(mp4); ai[e.id] = { dir: archivo(c.dir), n: c.n };
  log(`clip ${e.id}: ${c.n} cuadros`);
}
if (process.argv.includes('--animar')) process.exit(0);

// Metraje (extraído en fuentes/redes/gol-sub21/cuadros-*: ver el encabezado y la nota del 2026-10-21)
//   vod   = VOD de Twitch 2906478929, tramo 860-960 s, desde 41,5 s (el gol entra a los 49,8 s → 8,3 s del tramo)
//   goool = el mismo VOD desde 59,8 s (cartel GOOOL del overlay + palco)
//   repe  = grabación limpia del vigía (rec …-001.ts desde 48 s) desde 5,0 s, a 60 fps → 0,5x; el gol a los 2,8 s → 5,6 s
const clip = k => { const d = path.join(DIR, `cuadros-${k}`); return { dir: archivo(d), n: fs.readdirSync(d).filter(f => f.endsWith('.jpg')).length }; };

// Música: "Debut" (tema del 20/10, 140 BPM): el tema del club sobre el primer partido oficial. Arranca en 26,4 s para que
// el final del verso y el build acompañen el ataque y el drop del gancho B (37,71 s del tema) caiga justo en el gol.
const { elegirMusica } = await import('../../lib/musica.mjs');
const musica = elegirMusica('gol-agonico-sub21', { preferida: 'Debut' });
const BPM = 140, BAR = 4 * 60 / BPM, DROP_B = 22 * BAR;
const T = { oficial: 3, gol: 3 + 8.3, goool: 14, repe: 17, logro: 25, cierre: 33, fin: 41 };
const musicaDesde = DROP_B - T.gol;

// Voz del club (Elena): pocas frases, el gol y el drop sin voz encima. En la voz no van gamertags (se pronuncian mal):
// rol o posición; los gamertags van en pantalla.
const { narracion, agregarVoz } = await import('../lib/voz.mjs');
const pistas = narracion([
  { en: 0.25, texto: 'Minuto noventa y uno. Cero a cero.' },
  { en: T.oficial + 0.2, texto: 'Debut oficial en Espacio Gamer. Así lo vivimos en la transmisión.' },
  { en: T.repe + 0.3, texto: 'Mirala otra vez.' },
  { en: T.logro + 0.3, texto: 'Asistencia del lateral. Gol del extremo.' },
  { en: T.logro + 4.3, texto: 'Y el debut termina en victoria.' },
  { en: T.cierre + 0.4, texto: 'Todos los partidos, en vivo, por Twitch, Kick, YouTube e Instagram.' },
], path.join(DIR, 'voz'));

const datos = {
  bpm: BPM, fase: (DROP_B - musicaDesde) % (60 / BPM), T, golRepe: 5.6,
  clips: { vod: clip('vod'), goool: clip('goool'), repe: clip('repe'), jugada: ai['gol-sub21-jugada'], festejo: ai['gol-sub21-festejo'] },
  escudoTS: archivo(path.join(ROOT, 'logos/rebrand/Top Secret Logo New.png')),
  escudoSub: 'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184004-ml2ubyzw5d.png',
  proximo: 'JUE 22/10 · 22:30 · vs Suda eSports',
  voz: pistas.map(p => ({ en: p.en, dur: p.dur, palabras: p.palabras.map(w => ({ t: w.t - p.en, d: w.d, w: w.w })) })),
};

const cuadrosArg = (() => { const i = process.argv.indexOf('--cuadros'); return i > 0 ? process.argv[i + 1] : null; })();
if (cuadrosArg) {
  const { chromium } = await import('playwright');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/gol-sub21.html')));
  await p.evaluate(d => pintar(d), datos); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  for (const s of cuadrosArg.split(',').map(Number)) {
    await p.evaluate(t => mostrar(0, t), s); await p.waitForTimeout(100);
    await p.locator('#lienzo').screenshot({ path: path.join(DIR, `cuadro-${String(s).replace('.', '_')}.jpg`), type: 'jpeg', quality: 85 });
  }
  await b.close(); log('capturas en ' + DIR); process.exit(0);
}

log(`Render (${T.fin} s; música desde ${musicaDesde.toFixed(2)} s → drop en el gol, ${T.gol} s)…`);
const mudo = path.join(DIR, 'gol-sub21-sin-voz.mp4'), final = path.join(DIR, 'gol-sub21.mp4');
await video('gol-sub21.html', datos, mudo, { escenas: [{ n: 0, dur: T.fin }], musica, fps: 60, desenfoque: true, musicaDesde });
agregarVoz(mudo, pistas, final, { volumenMusica: 0.6 });
log('Listo: ' + final);

// ── A aprobar.html: reel e historia (Instagram y Facebook). Sin hora: publicar.mjs la agenda al aprobarla. ──
const { putFile } = await import('../../lib/r2.mjs');
const { agregarLote } = await import('../lib/aprobaciones.mjs');
const { revisarPieza } = await import('../../../revisar-textos.js');
const key = 'social/gol-sub21/gol-agonico-sub21.mp4';
await putFile(final, key);
const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
const desc = `${T.fin} s · transmisión oficial (VOD de Twitch con el overlay) + repetición + recreación del festejo (IA, rotulada) · voz del club · música: Debut`;
const P = o => ({ decision: 'pendiente', media: [{ tipo: 'video', url, vertical: true }], descripcion: desc, protagonistas: ['pepolemmo2710', 'Elianja20'], local: { video: final }, ...o });
const lote = {
  id: 'video-gol-sub21-2026-10-21', tipo: 'viral', creado: new Date().toISOString(),
  titulo: 'El gol del 91\' vs Sub 21 · debut oficial (reel + historias)', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel', metodo: 'ig-reel',
      texto: 'Minuto 91 y 0-0 en el debut oficial. Asistencia de Elianja20, gol de pepolemmo2710 y primera victoria en Espacio Gamer.\n\nAsí se vivió en nuestra transmisión. ¿Lo viste en vivo?\n\n#TopSecretFC #EspacioGamer #ProClubs' }),
    P({ id: 'ig-historia', red: 'instagram', formato: 'Historia', descripcion: '24 h · ' + desc, metodo: 'ig-historia', texto: '' }),
    P({ id: 'fb-video', red: 'facebook', formato: 'Reel / video', metodo: 'fb-video',
      texto: 'Martes 20 de octubre, debut oficial en Espacio Gamer. Con 0-0 en el minuto 91, Elianja20 asistió y pepolemmo2710 marcó el 1-0 ante Sub 21.\n\nEn el video: el gol tal como salió en nuestra transmisión oficial, la repetición y una recreación del festejo.\n\nTodos los partidos van en vivo por Twitch, Kick, YouTube e Instagram. El próximo: jueves a las 22:30 vs Suda eSports.' }),
    P({ id: 'fb-historia', red: 'facebook', formato: 'Historia', descripcion: '24 h · ' + desc, metodo: 'fb-historia', texto: '' }),
    ...PIEZAS_EXTRA(P),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Lote en aprobar.html: ' + lote.id);
