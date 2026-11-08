#!/usr/bin/env node
// "Tacet": Top Secret presenta a Tacet Sin y publicita su canal de YouTube el día que The Shorts queda completo (Juan,
// 2026-11-06: "algo conceptual, con arte, como todo lo que rodea a Tacet Sin").
//
// Concepto: en una partitura, "tacet" es la orden de no sonar. Arranca en silencio real sobre un pentagrama. Después, 23
// franjas (una por tema) se mueven con el espectro real de la canción y dejan ver el club en larga exposición. Se cierran,
// "Top Secret presenta" y, justo cuando se canta "No sound came out", se abren al disco.
//
// Decisiones:
//   - Tema: No Sound Came Out. La letra cuenta el concepto y no está entre los últimos 8 usados.
//   - Sin voz en off: una voz rompería la idea, es una pieza musical.
//   - El tema se nombra con un crédito propio en vez de la píldora "Sonando ahora", que taparía la composición (avisado a Juan).
//   - No se habla de cómo se hizo la música.
//
//   node scripts/social/piezas/2026-11-07-tacet-sin.mjs [--cuadros] [--sin-lote] [--sin-render]
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { putFile, getFile } from '../../lib/r2.mjs';
import { elegirMusica, infoTema } from '../../lib/musica.mjs';
import { video, archivo } from '../lib/render.mjs';
import { conPortada, subirPortada } from '../lib/portada.mjs';
import { espectro } from '../lib/espectro.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/tacet-sin');
const FUENTE = path.join(ROOT, 'fuentes/goles/vvivo-2026-10-22/source.mp4');
const ID = 'viral-tacet-sin-2026-11-07';
const PUBLICAR = '2026-11-07T20:00:00-03:00';
const CANAL = 'https://www.youtube.com/@tacetsin';
const flag = f => process.argv.includes(f);
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [tacet] ${m}`);
fs.mkdirSync(DIR, { recursive: true });
const ff = args => { const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr); };

// ── Tiempos: "No sound came out" se canta en el segundo 52,08 del tema y ahí se abre el disco ──
const CANTO_ROMPE = 52.08, ROMPE = 16;
const DESDE_TEMA = CANTO_ROMPE - ROMPE;   // segundo del tema = t + DESDE_TEMA
const T = { suena: 3.2, frase1: 5.6, frase2: 9.7, cierra: 13.7, rompe: ROMPE, muro: 23.12, porTema: 5.9 / 23, cierre: 29.2, fin: 33.6 };

// ── Materiales ──
// Larga exposición: curva que hunde el pasto y deja solo la luz (líneas, camisetas, red) con estela, en el ámbar del Vol. 1
const CLIPS = { c1: { ss: 2619.0, x: 650, seg: 2.7 }, c2: { ss: 1380.6, x: 830, seg: 2.7 }, c3: { ss: 2124.6, x: 190, seg: 2.7 } };
const VF = c => `crop=264:470:${c.x}:92,scale=540:960:flags=lanczos,setpts=1.6*PTS,fps=30,tmix=frames=14,hue=s=0,curves=all='0/0 0.40/0.03 0.66/0.55 1/1',colorchannelmixer=rr=1.1:gg=0.68:bb=0.27`;
const cuadros = (id, args) => {
  const d = path.join(DIR, id);
  if (!fs.existsSync(path.join(d, '0001.jpg'))) { fs.mkdirSync(d, { recursive: true }); ff([...args, '-q:v', '4', path.join(d, '%04d.jpg')]); }
  return fs.readdirSync(d).filter(f => /^\d+\.jpg$/.test(f)).sort().map(f => archivo(path.join(d, f)));
};
const clips = {};
for (const [k, c] of Object.entries(CLIPS)) clips[k] = cuadros(k, ['-ss', String(c.ss), '-t', String(c.seg), '-i', FUENTE, '-vf', VF(c)]);
const discoF = cuadros('disco', ['-i', path.join(ROOT, 'fuentes/musica/youtube/canva/v1-a.mp4'), '-vf', 'scale=800:800:flags=lanczos,colorlevels=rimin=0.05:gimin=0.05:bimin=0.05']);

const grupalWebp = path.join(DIR, 'grupal.webp'), grupal = path.join(DIR, 'grupal.jpg');
if (!fs.existsSync(grupalWebp)) await getFile('logos/grupales/grupal-ia-estadio-suelto-blfap0.webp', grupalWebp);
if (!fs.existsSync(grupal)) await sharp(grupalWebp).recomb([[.33, .62, .12], [.21, .4, .08], [.08, .15, .03]]).linear(1.25, -22).jpeg({ quality: 90 }).toFile(grupal);

const temasJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/letras.json'), 'utf8'));
const temas = temasJson.map(t => ({ titulo: t.titulo, img: archivo(path.join(ROOT, 'fuentes/musica/youtube/miniaturas', t.slug + '.png')) }));
const tapa = async (v) => { const s = path.join(DIR, `tapa${v}.jpg`); if (!fs.existsSync(s)) await sharp(path.join(ROOT, `fuentes/musica/portadas/the-shorts-${v}.png`)).resize(820, 820).jpeg({ quality: 92 }).toFile(s); return archivo(s); };

const musica = await elegirMusica(ID, { preferida: 'No Sound Came Out' });
const tema = infoTema(musica);
if (tema.slug !== 'no-sound-came-out') throw new Error('tema inesperado: ' + tema.slug);
const lineas = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/letras-tiempos.json'), 'utf8'))[tema.slug].lineas
  .map(l => ({ texto: l.texto, ini: l.ini - DESDE_TEMA, fin: l.fin - DESDE_TEMA })).filter(l => l.ini >= ROMPE - .1);

const bandas = espectro(musica, T.fin - T.suena, T.suena + DESDE_TEMA);

const datos = {
  T, tema: tema.titulo, bandas, letra: lineas, clips, disco: discoF, temas,
  grupal: archivo(grupal), escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')), tapa1: await tapa(1), tapa2: await tapa(2),
  tramos: [{ clip: 'c1', desde: 3, hasta: 7.3 }, { clip: 'c2', desde: 6.8, hasta: 11.1 }, { grupal: true, desde: 10.6, hasta: 12.6 }, { clip: 'c3', desde: 12.1, hasta: 16.1 }],
};

async function abrir() {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/tacet.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}

if (flag('--cuadros')) {
  const { b, p } = await abrir();
  const M = [.7, 1.8, 2.9, 3.6, 5, 6.7, 8.5, 10, 11.6, 13, 14.7, 15.5, 15.95, 16.2, 17, 19.5, 22, 23.6, 25, 27.5, 28.9, 30, 31.5, 33.1];
  const cols = 8, cw = 240, ch = 427, comp = [];
  for (const [i, t] of M.entries()) {
    await p.evaluate(t => mostrar(0, t), t);
    comp.push({ input: await sharp(await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 84 })).resize(cw, ch).toBuffer(), left: (i % cols) * cw, top: Math.floor(i / cols) * ch });
  }
  await b.close();
  await sharp({ create: { width: cols * cw, height: Math.ceil(M.length / cols) * ch, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 88 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
  process.exit(0);
}

const base = path.join(DIR, 'base.mp4'), conAudio = path.join(DIR, 'con-audio.mp4'), mp4 = path.join(DIR, 'tacet-sin.mp4'), jpg = path.join(DIR, 'portada.jpg');
if (!flag('--sin-render')) {
  log(`Render (${Math.round(T.fin * 60)} cuadros a 60 fps)…`);
  await video('tacet.html', datos, base, { escenas: [{ n: 0, dur: T.fin }], fps: 60, desenfoque: true });
}
// El silencio del principio es real; el tema entra en T.suena y se apaga antes del final
const ms = Math.round(T.suena * 1000);
ff(['-i', base, '-ss', (T.suena + DESDE_TEMA).toFixed(3), '-i', musica, '-filter_complex',
  `[1:a]afade=t=in:d=0.12,afade=t=out:st=${(T.fin - T.suena - 2.2).toFixed(2)}:d=2,adelay=${ms}:all=1,apad[a]`,
  '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(T.fin), '-movflags', '+faststart', conAudio]);
{
  const { b, p } = await abrir();
  await p.evaluate(t => mostrar(0, t, { portada: true }), 0);
  await p.locator('#lienzo').screenshot({ path: jpg, type: 'jpeg', quality: 93 });
  await b.close();
}
conPortada(conAudio, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
await putFile(mp4, 'social/viral/tacet-sin.mp4');
const uVid = `${MEDIA}/social/viral/tacet-sin.mp4?v=${Date.now().toString(36)}`;
const uPortada = await subirPortada(jpg, 'social/viral/tacet-sin-portada.jpg');
const desc = `${Math.round(T.fin)} s · sin voz · arranca con 3 s de silencio real · 23 franjas, una por tema, movidas por el espectro real de la canción · imágenes del club: goles del 22/10 en larga exposición y foto grupal · APROBAR RECIÉN CON LOS 23 VIDEOS SUBIDOS: dice "completo en YouTube" · sale el 7/11 a las 20:00 · música: ${tema.titulo}.`;
const pieza = o => ({ decision: 'pendiente', descripcion: desc, musica: tema.titulo, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), publicarA: PUBLICAR, titulo: 'Tacet: Top Secret presenta a Tacet Sin', piezas: [
    pieza({ id: 'ig-reel', red: 'instagram', formato: 'Reel', metodo: 'ig-reel',
      texto: `En una partitura, tacet es la orden de no sonar.\n\nDetrás de nuestros videos suena un artista que nunca presentamos como corresponde. Hoy lo hacemos: Tacet Sin.\n\nThe Shorts ya está completo en YouTube, 23 temas. Lo encontrás como Tacet Sin. ¿Cuál reconocés?\n\n#TacetSin #TheShorts #TopSecretFC` }),
    pieza({ id: 'ig-historia', red: 'instagram', formato: 'Historia', metodo: 'ig-historia' }),
    pieza({ id: 'fb-video', red: 'facebook', formato: 'Reel / video', metodo: 'fb-video',
      texto: `Si mirás nuestros videos, ya lo escuchaste.\n\nLa música que suena detrás tiene nombre: Tacet Sin. Hoy lo presentamos como se merece, con The Shorts completo en YouTube: 23 temas en dos volúmenes, cada uno con su letra.\n\nEl canal: ${CANAL}` }),
    pieza({ id: 'fb-historia', red: 'facebook', formato: 'Historia', metodo: 'fb-historia' }),
    pieza({ id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok',
      texto: `Lo que suena detrás de nuestros videos tiene nombre. The Shorts, completo en YouTube: buscá Tacet Sin. #TacetSin #TheShorts #TopSecretFC #ProClubs #EAFC` }),
    pieza({ id: 'yt-short', red: 'youtube', formato: 'Short', metodo: 'youtube', titulo: 'Top Secret presenta a Tacet Sin: la música detrás de nuestros videos de Pro Clubs',
      texto: `The Shorts, completo: 23 temas con su letra.\n${CANAL}\n\n#Shorts #TacetSin #TheShorts` }),
    pieza({ id: 'x', red: 'x', formato: 'Post con video', metodo: 'x-video',
      texto: `En una partitura, tacet es la orden de no sonar. Top Secret presenta a Tacet Sin, lo que suena detrás de nuestros videos. The Shorts, completo en YouTube: ${CANAL} #TacetSin #TopSecretFC` }),
  ],
};
let avisos = 0;
for (const p of lote.piezas) for (const r of revisarPieza({ ...p, texto: p.texto ? `${p.texto}\n\nMúsica: "${tema.titulo}" — Tacet Sin (The Shorts)` : p.texto }, lote)) { avisos++; log(`  aviso ${p.id}: ${r.msg}`); }
if (avisos) throw new Error(`${avisos} avisos del revisor: corregir antes de cargar el lote.`);
await agregarLote(lote);
log('Listo: ' + uVid);
process.exit(0);
