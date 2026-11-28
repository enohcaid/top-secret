#!/usr/bin/env node
// "VPN, lo que va" (Juan, 2026-11-28: "armalo con lo que hay, que sea un video estético, no de datos"): los goles de VPN
// que quedaron en las grabaciones del vigía, uno detrás de otro, sin tablas ni números.
//
// Material (revisado cuadro a cuadro el 28/11): 8 de los 14 goles de VPN están grabados. Los otros clips de esas
// noches son de VPUG (CCC = COMUNICACIONES, ZZZ = INSTITUTO CANT, LP = Argentino de Merlo) y quedan afuera; Moreno Al
// Ritmo (16/11), Los Picantes (18/11) y MONOTRIBUTISTAS (25/11) no se grabaron. Goleador con nombre donde el seed
// lo tiene; los demás dicen "TOP SECRET".
//
// Estética: vertical 1080x1920, la jugada recortada del lado del arco (sin marcador ni barras del juego) en una
// ventana sobre la misma jugada desenfocada y oscura; el remate en cámara lenta (la grabación es de 60 fps: a la mitad
// de velocidad no se repite ningún cuadro); tipografía dorada mínima; grano y viñeta; un tema de The Shorts. Sin voz.
//
//   node scripts/social/piezas/vpn-hasta-ahora.mjs             → render + lote en aprobar (sale al aprobarse)
//   node scripts/social/piezas/vpn-hasta-ahora.mjs --sin-lote  → solo el video
//   node scripts/social/piezas/vpn-hasta-ahora.mjs --solo-lote → sube el video ya renderizado y carga el lote
//   node scripts/social/piezas/vpn-hasta-ahora.mjs --hoja      → hoja de cuadros del video ya renderizado
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica, infoTema, creditoTexto } from '../../lib/musica.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const ID = 'viral-vpn-hasta-ahora-2026-11-28';
const DIR = path.join(ROOT, 'fuentes/redes/viral/vpn-hasta-ahora');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [vpn] ${m}`);
const flag = f => process.argv.includes(f);
fs.mkdirSync(DIR, { recursive: true });
const run = (args, que) => { const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); if (r.status !== 0) throw new Error(`ffmpeg (${que}): ${(r.stderr || '').slice(-800)}`); };

const final = path.join(DIR, 'vpn-hasta-ahora.mp4');
const SOLO_LOTE = flag("--solo-lote") && fs.existsSync(final);   // reusa el video ya renderizado
if (flag('--hoja')) {
  const comp = [], dur = 50, n = 24;
  for (let i = 0; i < n; i++) {
    const r = spawnSync(ffmpeg, ['-loglevel', 'error', '-ss', String((i + .5) * dur / n), '-i', final, '-frames:v', '1', '-vf', 'scale=240:426', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], { maxBuffer: 1e8 });
    comp.push({ input: r.stdout, left: (i % 8) * 240, top: Math.floor(i / 8) * 426 });
  }
  await sharp({ create: { width: 1920, height: 3 * 426, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 85 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
  process.exit(0);
}

// [noche del vigía, índice del gol, segundo en que entra la pelota (desde el inicio de la ventana del vigía), lado
// del arco, fecha, rival, goleador o null]. El "fin" del vigía NO es el gol: el marcador del juego cambia recién con
// el festejo, así que la v1 (tomada desde el fin) mostraba solo festejos (Juan, 28/11). Segundo del gol leído cuadro
// a cuadro, cada 0,5 s, mirando la red.
const GOLES = [
  ['2026-11-11', 0, 12.0, 'der', '11 NOV', 'Misky Mayu FC', 'Elianja20'],
  ['2026-11-11', 1, 13.0, 'izq', '11 NOV', 'Division Palermo', 'Guiidow'],
  ['2026-11-17', 2, 12.3, 'der', '16 NOV', 'Suda Esports', 'nikileo527'],  // etiqueta del juego sobre el que la empuja,
  ['2026-11-17', 3, 11.8, 'der', '16 NOV', 'Suda Esports', null],
  ['2026-11-17', 4, 11.3, 'izq', '16 NOV', 'Suda Esports', null],
  ['2026-11-17', 5, 13.6, 'der', '16 NOV', 'Instituto Reserva', 'Cabers14'],
  ['2026-11-18', 2, 11.9, 'der', '18 NOV', 'AlToke Perro', 'NicoBJ_96'],
  ['2026-11-18', 3, 12.8, 'der', '18 NOV', 'Dalmine Esports', 'NicoBJ_96'],   // etiqueta del juego: elude al arquero,
].map(([noche, i, seg, lado, fecha, rival, autor]) => {
  const g = JSON.parse(fs.readFileSync(path.join(ROOT, `fuentes/goles/vvivo-${noche}/datos.json`))).goles[i];
  return { vod: path.join(ROOT, `fuentes/goles/vvivo-${noche}/source.mp4`), gol: g.inicio + seg, lado, fecha, rival, autor };
});
const GOLEADORES = [...new Set(GOLES.map(g => g.autor).filter(Boolean))];

// Tiempos: 2,2 s de jugada a velocidad normal y el remate (0,8 s antes y 0,8 s después de que entra) a la mitad
const NORMAL = 2.2, LENTO = 1.6, FPS = 30;
const DUR_GOL = NORMAL + LENTO * 2, DUR_INTRO = 2.6, DUR_CIERRE = 3.8;
const total = DUR_INTRO + GOLES.length * DUR_GOL + DUR_CIERRE;
const VENT = { y: 528, w: 1080, h: 864 };          // ventana de la jugada
const CROP = { w: 696, h: 556, y: 92 };            // de 1280x720: sin marcador arriba ni barras abajo

// ── Capas de texto (HTML con las fuentes de las piezas, fondo transparente) ──
const FUENTES = '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;800&family=Bebas+Neue&display=swap" rel="stylesheet">';
const ESCUDO = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')).toString('base64');
const CSS = `html,body{margin:0;width:1080px;height:1920px;background:transparent;color:#f4f1ea;font-family:'Barlow Condensed'}
.k{position:absolute;left:0;right:0;text-align:center;font-weight:700;font-size:34px;letter-spacing:14px;color:#E6CF85}
.n{position:absolute;left:0;right:0;text-align:center;font-family:'Bebas Neue';font-size:132px;letter-spacing:6px;line-height:1}
.s{position:absolute;left:0;right:0;text-align:center;font-weight:500;font-size:38px;letter-spacing:8px;color:rgba(244,241,234,.62)}
.l{position:absolute;left:50%;width:90px;margin-left:-45px;height:3px;background:#E6CF85}
.e{position:absolute;left:50%;transform:translateX(-50%)}`;
async function capas() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const foto = async (html, f) => { await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>${CSS}</style></head><body>${html}</body></html>`, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: f, omitBackground: true }); return f; };
  const res = { goles: [] };
  try {
    for (const [i, g] of GOLES.entries()) res.goles.push(await foto(`
      <div class="k" style="top:380px">VPN · ${g.fecha}</div><div class="l" style="top:440px"></div>
      <div class="n" style="top:1440px;${g.autor ? "font-family:'Barlow Condensed';font-weight:800;font-size:120px;letter-spacing:2px" : 'color:#E6CF85'}">${g.autor || 'TOP SECRET'}</div>
      <div class="s" style="top:1586px">ANTE ${g.rival.toUpperCase()}</div>`, path.join(DIR, `capa-${i}.png`)));
    res.intro = await foto(`<div style="position:absolute;inset:0;background:#070605"></div>
      <img class="e" src="${ESCUDO}" style="top:620px;width:230px">
      <div class="n" style="top:900px;font-size:230px;color:#E6CF85">VPN</div>
      <div class="s" style="top:1130px;color:#f4f1ea;letter-spacing:16px">LO QUE VA</div>`, path.join(DIR, 'intro.png'));
    res.cierre = await foto(`<div style="position:absolute;inset:0;background:#070605"></div>
      <img class="e" src="${ESCUDO}" style="top:640px;width:260px">
      <div class="n" style="top:960px;font-size:150px">SEGUIMOS</div><div class="l" style="top:1110px"></div>
      <div class="s" style="top:1150px;color:#E6CF85">LUNES 30 · 23:00 · EN VIVO</div>`, path.join(DIR, 'cierre.png'));
  } finally { await b.close(); }
  return res;
}

const musica = await elegirMusica(ID);
const tema = infoTema(musica);
log(`Tema: ${tema.titulo} · ${GOLES.length} goles · ${total.toFixed(1)} s`);
const fotoPortada = path.join(DIR, 'foto-portada.jpg'), jpg = path.join(DIR, 'vpn-hasta-ahora-portada.jpg');
if (!SOLO_LOTE) {
const L = await capas();

// ── Tramos ──
const tramos = [];
const fadeV = d => `fade=in:st=0:d=0.25,fade=out:st=${(d - .3).toFixed(2)}:d=0.3`;
{
  const f = path.join(DIR, 't-intro.mp4');
  run(['-loop', '1', '-framerate', String(FPS), '-t', String(DUR_INTRO), '-i', L.intro, '-vf',
    `scale=1188:2112,zoompan=z='1+0.035*on/${DUR_INTRO * FPS}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=${FPS},format=yuv420p,${fadeV(DUR_INTRO)}`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-r', String(FPS), f], 'intro');
  tramos.push(f);
}
for (const [i, g] of GOLES.entries()) {
  const f = path.join(DIR, `t-gol-${i}.mp4`);
  const desde = g.gol - LENTO / 2 - NORMAL;
  const cx = g.lado === 'der' ? 1280 - CROP.w : 0;
  const filtro = [
    `[0:v]split[a][b]`,
    `[a]crop=${CROP.w}:${CROP.h}:${cx}:${CROP.y},scale=${VENT.w}:${VENT.h}:flags=lanczos,unsharp=5:5:0.6,eq=contrast=1.06:saturation=0.92[fg]`,
    `[b]crop=405:720:${g.lado === 'der' ? 875 : 0}:0,scale=1080:1920,boxblur=40:2,eq=brightness=-0.32:saturation=0.45[bg]`,
    `[bg][fg]overlay=0:${VENT.y}[m]`,
    `[m][1:v]overlay=0:0,split[p1][p2]`,
    `[p1]trim=0:${NORMAL},setpts=PTS-STARTPTS,fps=${FPS}[n]`,
    `[p2]trim=${NORMAL}:${NORMAL + LENTO},setpts=2*(PTS-STARTPTS),fps=${FPS}[s]`,
    `[n][s]concat=n=2:v=1:a=0,format=yuv420p,${fadeV(DUR_GOL)}[v]`,
  ].join(';');
  const guion = path.join(DIR, `t-gol-${i}.filtro`); fs.writeFileSync(guion, filtro);
  run(['-ss', desde.toFixed(3), '-t', String(NORMAL + LENTO + .1), '-i', g.vod, '-loop', '1', '-t', String(NORMAL + LENTO + .1), '-i', L.goles[i],
    '-filter_complex_script', guion, '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-r', String(FPS), '-t', String(DUR_GOL), f], `gol ${i}`);
  fs.rmSync(guion);
  tramos.push(f);
  log(`gol ${i + 1}/${GOLES.length} (${g.autor || g.rival})`);
}
{
  const f = path.join(DIR, 't-cierre.mp4');
  run(['-loop', '1', '-framerate', String(FPS), '-t', String(DUR_CIERRE), '-i', L.cierre, '-vf',
    `scale=1188:2112,zoompan=z='1.05-0.04*on/${DUR_CIERRE * FPS}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=${FPS},format=yuv420p,fade=in:st=0:d=0.3`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-r', String(FPS), f], 'cierre');
  tramos.push(f);
}

// ── Unión: grano y viñeta, música con entrada y salida suaves ──
const lista = path.join(DIR, 'tramos.txt');
fs.writeFileSync(lista, tramos.map(t => `file '${t.replace(/\\/g, '/')}'`).join('\n'));
const base = path.join(DIR, 'vpn-base.mp4');
run(['-f', 'concat', '-safe', '0', '-i', lista, '-i', musica,
  '-filter_complex', `[0:v]noise=alls=7:allf=t,vignette=PI/5[v];[1:a]atrim=0:${total.toFixed(2)},afade=in:st=0:d=0.8,afade=out:st=${(total - 1.8).toFixed(2)}:d=1.8[a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', total.toFixed(2), base], 'unión');
for (const t of [...tramos, lista]) fs.rmSync(t, { force: true });

// Portada: el remate de NicoBJ_96 en cámara lenta, sin textos del video
{
  const g = GOLES.find(x => x.autor === 'NicoBJ_96');
  run(['-ss', (g.gol - .3).toFixed(2), '-i', g.vod, '-frames:v', '1', '-vf', `crop=${CROP.w}:${CROP.h}:${1280 - CROP.w}:${CROP.y},scale=1080:-2`, '-q:v', '2', fotoPortada], 'foto portada');
}
await portada({ imagen: fotoPortada, kicker: 'VPN', titulo: 'Lo que *va*', foco: '50% 50%' }, jpg);
const conTapa = path.join(DIR, 'vpn-tapa.mp4');
conPortada(base, jpg, conTapa);
// El grano no se comprime: a CRF 18 el video pesaba 318 MB. Tope de 8 Mb/s (≈ 45 MB), sin pérdida visible en el celular.
run(['-i', conTapa, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '8M', '-bufsize', '16M', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', final], 'compresión');
for (const f of [base, conTapa]) fs.rmSync(f, { force: true });
log('Video: ' + final);
}
if (flag('--sin-lote')) process.exit(0);

// ── Lote (contenido pedido por Juan: sale apenas se aprueba) ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
const key = `social/viral/${path.basename(final)}`; await putFile(final, key);
const uVid = `${MEDIA}/${key}?v=${v}`;
const uPortada = await subirPortada(jpg, 'social/viral/vpn-hasta-ahora-portada.jpg');
const desc = `${Math.round(total)} s · pedido de Juan (28/11): video estético de VPN, no de datos · los 8 goles de VPN que quedaron grabados (de 14: Moreno Al Ritmo, Los Picantes y MONOTRIBUTISTAS no se grabaron), en orden, con el remate en cámara lenta · goleador con nombre donde se sabe (seed o etiqueta del juego en la jugada): Elianja20, Guiidow, nikileo527, Cabers14, NicoBJ_96 x2; los dos de Suda en un amontonamiento dicen TOP SECRET · el remate en cámara lenta centrado en el segundo en que entra la pelota (v2: la v1 mostraba solo festejos) · cierre: lunes 30, 23:00, en vivo · sin voz · música: ${tema.titulo}.`;
const P = o => ({ decision: 'pendiente', protagonistas: GOLEADORES, descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: final }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), publicarA: new Date().toISOString(),
  titulo: 'VPN, lo que va · los goles en cámara lenta', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · VPN, lo que va', metodo: 'ig-reel',
      texto: `Ocho goles de VPN en cámara lenta. Elianja20, Guiidow, nikileo527, Cabers14 y NicoBJ_96.\n\nEl lunes 30 a las 23:00 seguimos, en vivo. ¿Cuál te quedás?\n\n#TopSecretFC #ProClubs #VPN` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · VPN, lo que va', metodo: 'tiktok',
      texto: `Ocho goles de VPN en cámara lenta: Elianja20, Guiidow, nikileo527, Cabers14 y NicoBJ_96. ¿Cuál te quedás? #TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · VPN, lo que va', metodo: 'youtube',
      titulo: 'Ocho goles de Pro Clubs en cámara lenta | Top Secret FC en VPN',
      texto: `Los goles de Top Secret en VPN, en cámara lenta: Elianja20, Guiidow, nikileo527, Cabers14 y NicoBJ_96. #Shorts #ProClubs #EAFC` }),
    P({ id: 'x-video', red: 'x', formato: 'Video · VPN, lo que va', metodo: 'x-video',
      texto: `Ocho goles de VPN en cámara lenta, con Elianja20, Guiidow, nikileo527, Cabers14 y NicoBJ_96. El lunes 30 a las 23:00 seguimos, en vivo. ¿Cuál te quedás? #TopSecretFC` }),
  ],
};
let avisos = 0;
for (const p of lote.piezas) for (const r of revisarPieza({ ...p, texto: `${p.texto}\n\n${creditoTexto(p.musica)}` }, lote)) { avisos++; log(`  aviso ${p.id}: ${r.msg}`); }
if (avisos) throw new Error(`${avisos} avisos del revisor: corregir antes de cargar el lote.`);
await agregarLote(lote);
log('Lote cargado: ' + uVid);
process.exit(0);
