// Reel de la salvada de Cabers14 sobre la línea (22/10/2026, Espacio Gamer · Fecha 4 vs InfinitX, minuto 27, 0-0;
// después ganamos 1-0 con gol de Lautavester7 en el 51'). Pedido de Juan, 2026-10-23: "el clip bien producido como
// hicimos con el gol en último minuto de Sub 21, para todas las redes". Vertical 1080x1920, < 60 s.
//   TRANSMISIÓN OFICIAL — el tramo real del VOD de Twitch (topsecretfc 2908163169, 4106 s) con el overlay al aire
//   REPETICIÓN          — la señal limpia (vivo de YouTube de RS32-DaniStone, AcrpRjOUvGM, 4320,4 s a 60 fps), 0,5x
//   EL LOGRO            — dos imágenes de ChatGPT (la salvada / el festejo), rotuladas como recreación
//   EL GOL              — el 1-0 de Lautavester7 en el 51' (la salvada valió un gol) · cierre
// Plantilla: scripts/social/plantillas/noche.html (tramos oficial, repe, logro, gol, cierre).
//
//   node scripts/social/piezas/salvada-cabers14.mjs --imagenes        → genera las dos imágenes (revisarlas)
//   node scripts/social/piezas/salvada-cabers14.mjs --cuadros 2,12,20 → capturas de revisión
//   node scripts/social/piezas/salvada-cabers14.mjs [--sin-lote | --solo-lote]
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { archivo, video } from '../lib/render.mjs';

const DIR = path.join(ROOT, 'fuentes/redes/salvada-cabers14');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [salvada] ${m}`);
fs.mkdirSync(DIR, { recursive: true });
const clip = k => { const d = path.join(DIR, `cuadros-${k}`); return { dir: archivo(d), n: fs.readdirSync(d).filter(f => f.endsWith('.jpg')).length }; };
const foto = gt => `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/logos/noticias/plantel-t4/${gt}.webp`;
const ESC_INF = 'https://espaciogamer.cl/wp-content/uploads/2026/10/escudo-20261017-184001-vrqhkmuma0.png';

// Imágenes nuevas (ChatGPT): propias del video, distintas de la foto de la noticia (regla de portadas, 2026-10-23)
export const ESCENAS = [
  { id: 'salvada-recreacion', jugadores: ['Cabers14', 'adri_cai'], kitId: 'titular',
    escena: 'Partido de noche, estadio lleno, vista desde ATRÁS del arco, a través de la red: en primer plano la red desenfocada; del otro lado, Cabers14 (dorsal 5, camiseta negra titular de Top Secret, de frente a la cámara) estirado en el aire sobre la línea despeja la pelota con el pie justo antes de que cruce; el arquero adri_cai (dorsal 32, buzo naranja) caído a un costado y dos delanteros rivales (camiseta celeste) llegando. Luces del estadio de frente, contraluz, gotas de pasto en el aire.' },
  { id: 'salvada-festejo', jugadores: ['Cabers14', 'adri_cai', 'Elianja20'], kitId: 'titular',
    escena: 'Noche de estadio, apenas después de la jugada: Cabers14 (dorsal 5, camiseta negra titular de Top Secret) se levanta del pasto gritando con el puño apretado, con los ojos cerrados de bronca y alivio; el arquero adri_cai (dorsal 32, buzo naranja) lo abraza desde atrás agarrándolo de la camiseta y Elianja20 (dorsal 24) le palmea la cabeza. Luces del estadio, tribuna desenfocada. Foto deportiva emotiva, plano medio.' },
];
if (process.argv.includes('--imagenes')) {
  const { generarImagen, cerrar } = await import('../lib/imagen.mjs');
  for (const e of ESCENAS) { const f = await generarImagen({ id: e.id, escena: e.escena, jugadores: e.jugadores, vertical: true, carpeta: DIR, kitId: e.kitId }); log(`${e.id} → ${f}`); }
  await cerrar();
  process.exit(0);
}
const img = id => archivo(path.join(DIR, `${id}.png`));

const TRAMOS = [
  { tipo: 'gancho', dur: 3.2, clip: clip('repe'), cuadro: 1.5, kicker: 'ESPACIO GAMER · VS INFINITX', grande: "27'",
    texto: '0-0.<br><b>Y el arco vacío.</b>' },
  { tipo: 'oficial', dur: 10, clip: clip('oficial'), momento: 8.3, sub: 'TWITCH · KICK · YOUTUBE · INSTAGRAM · 22/10',
    antes: 'Minuto 27.<br><b>El arquero, vencido.</b>', despues: '<b>¡Sobre la línea!</b><br>Cabers14.',
    feats: ['Placa del torneo y el rival', 'El palco: el plantel en pantalla', 'Marcador y reloj del partido'] },
  { tipo: 'repe', dur: 8, clip: clip('repe'), velocidad: .5, golEn: 2.0, foco: .82, escudo: ESC_INF, rival: 'InfinitX', sigla: 'INF',
    kicker: 'ESPACIO GAMER · FECHA 4', minuto: "27'", antes: '0-0', despues: '0-0', goleador: 'Cabers14', foto: foto('Cabers14'),
    como: 'La salvó sobre la línea', tag: '0.5x', etiqueta: 'LA SALVADA' },
  { tipo: 'logro', dur: 4.2, imagen: img('salvada-recreacion'), rotulo: 'LA SALVADA', origen: '15% 62%', kicker: 'MINUTO 27 · 0-0',
    texto: 'Arco vacío.<br><b>Cabers14 no la dejó entrar.</b>' },
  { tipo: 'logro', dur: 4.2, imagen: img('salvada-festejo'), rotulo: 'LA SALVADA', origen: '62% 38%', kicker: 'VALIÓ LO MISMO QUE UN GOL',
    texto: 'Un grito<br><b>de defensor.</b>' },
  { tipo: 'gol', dur: 6.4, clip: clip('gol'), golEn: 3.0, foco: .78, escudo: ESC_INF, rival: 'InfinitX', sigla: 'INF', kicker: 'ESPACIO GAMER · FECHA 4',
    minuto: "51'", antes: '0-0', despues: '1-0', goleador: 'Lautavester7', foto: foto('Lautavester7'), como: 'Y en el 51, el gol que la hizo valer', rotulo: 'Y EN EL 51…' },
  { tipo: 'cierre', dur: 9.2, clip: clip('gol'), cuadro: 5 },
];
let t0 = 0;
for (const tr of TRAMOS) { tr.desde = +t0.toFixed(2); t0 += tr.dur; tr.hasta = +t0.toFixed(2); }
const FIN = t0;
const tSalvada = TRAMOS[1].desde + TRAMOS[1].momento;

// Voz del club (Elena): sin gamertags en la voz (el puesto); los gamertags van en pantalla.
const { narracion, agregarVoz } = await import('../lib/voz.mjs');
const pistas = narracion([
  { en: 0.3, texto: 'Minuto veintisiete. Cero a cero. Y el arco vacío.' },
  { en: TRAMOS[1].desde + 0.4, texto: 'Así se vivió en nuestra transmisión.' },
  { en: tSalvada + 0.2, texto: '¡Sobre la línea!' },
  { en: TRAMOS[2].desde + 0.3, texto: 'Mirala otra vez. El central llegó a tiempo.' },
  { en: TRAMOS[3].desde + 0.3, texto: 'Esa pelota ya era gol.' },
  { en: TRAMOS[4].desde + 0.3, texto: 'Y valió lo mismo que uno.' },
  { en: TRAMOS[5].desde + 0.3, texto: 'Porque en el cincuenta y uno llegó el uno a cero.' },
  { en: TRAMOS[6].desde + 0.4, texto: 'Victoria, y el central, figura del partido. Todos los partidos, en vivo, por Twitch, Kick, YouTube e Instagram.' },
], path.join(DIR, 'voz'));

const datos = {
  tramos: TRAMOS, oro: 'línea|vivo|victoria|figura',
  proximo: 'MAR 27/10 · 23:00 · vs MISKYMAYU FC',
  cierre: { kicker: 'ESPACIO GAMER · FECHA 4', frase: 'Figura del partido: <b>Cabers14 · 9,1</b>',
    filas: [{ etiqueta: 'VICTORIA · GOL DE LAUTAVESTER7', rival: 'InfinitX', escudo: ESC_INF, marcador: '1-0', res: 'victoria' }] },
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

// Música: tema propio que no se repite; un gancho del tema cae en la salvada
const { elegirMusica } = await import('../../lib/musica.mjs');
const musica = elegirMusica('salvada-cabers14-2026-10-22');
const ganchos = (() => {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/temas-diarios.json'), 'utf8')).temas.find(x => x.archivo === path.basename(musica));
    let c = 0; const out = [];
    for (const p of t.estructura.split('·').map(s => s.trim())) { if (/^gancho/i.test(p)) out.push(c * 4 * 60 / t.bpm); c += Number((p.match(/(\d+)\s*$/) || [])[1] || 0); }
    return out;
  } catch { return []; }
})();
const gancho = ganchos.find(g => g >= tSalvada);
const musicaDesde = gancho !== undefined ? gancho - tSalvada : 0;

const mudo = path.join(DIR, 'salvada-sin-voz.mp4'), conVoz = path.join(DIR, 'salvada-con-voz.mp4'), final = path.join(DIR, 'salvada-cabers14.mp4');
const { portada, conPortada, subirPortada } = await import('../lib/portada.mjs');
const jpgPortada = path.join(DIR, 'portada.jpg');
if (!(process.argv.includes('--solo-lote') && fs.existsSync(final) && fs.existsSync(jpgPortada))) {
  log(`Render (${FIN.toFixed(1)} s; música desde ${musicaDesde.toFixed(2)} s → gancho en la salvada, ${tSalvada.toFixed(1)} s)…`);
  await video(PLANTILLA, datos, mudo, { escenas: [{ n: 0, dur: FIN }], musica, fps: 60, desenfoque: true, musicaDesde });
  agregarVoz(mudo, pistas, conVoz, { volumenMusica: 0.55 });
  // Portada: el festejo (imagen propia del video, no la de la noticia)
  await portada({ imagen: path.join(DIR, 'salvada-festejo.png'), kicker: "ESPACIO GAMER · MINUTO 27", dato: '0-0', titulo: 'Arco vacío.\n*Cabers14 no la dejó entrar.*', foco: '50% 30%' }, jpgPortada);
  conPortada(conVoz, jpgPortada, final);
}
log('Listo: ' + final);
if (process.argv.includes('--sin-lote')) process.exit(0);

// ── A aprobar.html: contenido de resultados → sale apenas se aprueba (publicarA = ahora) ──
const { putFile } = await import('../../lib/r2.mjs');
const { agregarLote } = await import('../lib/aprobaciones.mjs');
const { revisarPieza } = await import('../../../revisar-textos.js');
const key = 'social/salvada-cabers14/salvada-cabers14.mp4';
await putFile(final, key);
const url = `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/${key}?v=${Date.now().toString(36)}`;
const portadaUrl = await subirPortada(jpgPortada, 'social/salvada-cabers14/portada.jpg');
const musicaNombre = path.basename(musica).replace(/^\d{4}-\d{2}-\d{2}(-\d)? - /, '').replace(/\.\w+$/, '');
const desc = `${FIN.toFixed(0)} s · transmisión oficial (VOD de Twitch con el overlay) + repetición + recreación (IA, rotulada) + el gol del 51' · voz del club · música: ${musicaNombre}`;
const P = o => ({ decision: 'pendiente', media: [{ tipo: 'video', url, vertical: true }], descripcion: desc, protagonistas: ['Cabers14'], local: { video: final }, portada: { url: portadaUrl, local: jpgPortada }, ...o });
const lote = {
  id: 'video-salvada-cabers14-2026-10-22', tipo: 'viral', creado: new Date().toISOString(), publicarA: new Date().toISOString(),
  titulo: 'La salvada de Cabers14 sobre la línea vs InfinitX (reel + historias, todas las redes)', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel', metodo: 'ig-reel',
      texto: 'Minuto 27, 0-0 y el arco vacío. Cabers14 la sacó sobre la línea.\n\nEn el 51 llegó el 1-0 de Lautavester7: esa salvada valió lo mismo que un gol. Figura del partido: Cabers14 (9,1).\n\n¿La viste en vivo?\n\n#TopSecretFC #EspacioGamer #ProClubs' }),
    P({ id: 'ig-historia', red: 'instagram', formato: 'Historia', descripcion: '24 h · ' + desc, metodo: 'ig-historia', texto: '' }),
    P({ id: 'fb-video', red: 'facebook', formato: 'Reel / video', metodo: 'fb-video',
      texto: 'Jueves 22 de octubre, Espacio Gamer ante InfinitX. Con 0-0 en el minuto 27, adri_cai quedó vencido y la pelota iba al arco vacío: Cabers14 la sacó sobre la línea. En el 51, Lautavester7 hizo el 1-0.\n\nEn el video: la jugada tal como salió en nuestra transmisión oficial, la repetición y una recreación.\n\nTodos los partidos van en vivo por Twitch, Kick, YouTube e Instagram. El próximo: martes 27 a las 23:00 vs MISKYMAYU FC.' }),
    P({ id: 'fb-historia', red: 'facebook', formato: 'Historia', descripcion: '24 h · ' + desc, metodo: 'fb-historia', texto: '' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok',
      texto: 'Arco vacío y Cabers14 la sacó sobre la línea 🧱 Después llegó el 1-0. #TopSecretFC #ProClubs #EAFC #EspacioGamer' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short', metodo: 'youtube', titulo: 'Arco vacío y la saca sobre la línea | Pro Clubs EA FC',
      texto: 'Minuto 27 ante InfinitX, 0-0: Cabers14 salva sobre la línea con el arquero vencido. Después, el 1-0 de Lautavester7.\n\n#Shorts #TopSecretFC #ProClubs' }),
    P({ id: 'x', red: 'x', formato: 'Post con video', metodo: 'x-video',
      texto: 'Minuto 27, 0-0, arco vacío: Cabers14 la sacó sobre la línea. En el 51 llegó el 1-0 y esa salvada valió tres puntos. #TopSecretFC' }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Lote en aprobar.html: ' + lote.id);
