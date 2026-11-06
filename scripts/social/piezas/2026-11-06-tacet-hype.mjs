#!/usr/bin/env node
// Expectativa para la presentación de Tacet Sin (Juan, 2026-11-06): historias de Instagram y videos de TikTok, hoy y mañana
// durante el día, antes de la pieza "Tacet" del 7/11 a las 20:00.
//
// Decisiones:
//   - No dicen el nombre: se revela a las 20:00. Por eso no llevan el crédito del tema (el campo `musica` lo agregaría al texto).
//   - TikTok no deja publicar historias desde la web ni por API: ahí salen como videos cortos.
//   - Historias de Instagram por API: sin stickers. La cuenta regresiva va dibujada.
//   - Cada teaser tiene su idea visual y un tema cuya letra juega con el concepto.
//
//   node scripts/social/piezas/2026-11-06-tacet-hype.mjs [--cuadros] [--sin-lote] [ids…]
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
import { espectro } from '../lib/espectro.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const BASE = path.join(ROOT, 'fuentes/redes/viral/tacet-sin'), DIR = path.join(BASE, 'hype');
fs.mkdirSync(DIR, { recursive: true });
const flag = f => process.argv.includes(f);
const pedidos = process.argv.slice(2).filter(a => !a.startsWith('--'));
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [hype] ${m}`);
const ff = args => { const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }); if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr); };
const lista = d => fs.readdirSync(path.join(BASE, d)).filter(f => /^\d+\.jpg$/.test(f)).sort().map(f => archivo(path.join(BASE, d, f)));
// Los cuadros de la pieza principal ya están; falta el loop azul del Vol. 2
if (!fs.existsSync(path.join(BASE, 'disco2/0001.jpg'))) {
  fs.mkdirSync(path.join(BASE, 'disco2'), { recursive: true });
  ff(['-i', path.join(ROOT, 'fuentes/musica/youtube/canva/v2-a.mp4'), '-vf', 'scale=800:800:flags=lanczos,colorlevels=rimin=0.05:gimin=0.05:bimin=0.05', '-q:v', '4', path.join(BASE, 'disco2/%04d.jpg')]);
}
const letrasT = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/letras-tiempos.json'), 'utf8'));
const miniaturas = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/beats/letras.json'), 'utf8')).map(t => archivo(path.join(ROOT, 'fuentes/musica/youtube/miniaturas', t.slug + '.png')));

const TEASERS = [
  { id: 'suena', tema: 'Silent Room', desde: 23.2, fin: 9.6, modo: 'suena', cuadros: lista('c2'), hora: '2026-11-06T19:00:00-03:00', cuando: 'hoy 19:00', portada: 7.5,
    titulo: 'Tacet, expectativa 1: algo suena', tiktok: 'Algo suena detrás de nuestros videos. Mañana a las 20:00 le ponemos nombre. #TopSecretFC #ProClubs #EAFC' },
  { id: 'espejo', tema: 'Mirror', desde: 13.8, fin: 9.8, modo: 'espejo', disco: lista('disco2'), semilla: 41, hora: '2026-11-06T22:30:00-03:00', cuando: 'hoy 22:30', portada: 8,
    titulo: 'Tacet, expectativa 2: ¿de dónde te suena?', tiktok: 'Si mirás nuestros videos, esto ya lo escuchaste. ¿De dónde te suena? Mañana, 20:00. #TopSecretFC #ProClubs #EAFC' },
  { id: 'veintitres', tema: 'The Night Before', desde: 38.5, fin: 8.8, modo: 'veintitres', temas: miniaturas, hora: '2026-11-07T11:30:00-03:00', cuando: 'mañana 11:30', portada: 6.6,
    titulo: 'Tacet, expectativa 3: 23', tiktok: '23 temas, un solo nombre. Hoy a las 20:00 se termina el misterio. #TopSecretFC #ProClubs #EAFC' },
  { id: 'costado', tema: 'Waiting My Turn', desde: 6.3, fin: 10.2, modo: 'costado', cuadros: lista('c3'), disco: lista('disco'), semilla: 7, estalla: 5.2, hora: '2026-11-07T17:30:00-03:00', cuando: 'mañana 17:30', portada: 8.5,
    titulo: 'Tacet, expectativa 4: hoy, 20:00', tiktok: 'Lo que sonaba de fondo pasa al frente. Hoy, 20:00. #TopSecretFC #ProClubs #EAFC' },
].filter(t => !pedidos.length || pedidos.includes(t.id));

async function abrirCon(datos) {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => log('ERROR página: ' + e.message));
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/tacet-teaser.html')));
  await p.evaluate(d => pintar(d), datos);
  return { b, p };
}

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const hojas = [];
for (const t of TEASERS) {
  const musica = await elegirMusica(`viral-tacet-hype-${t.id}`, { preferida: t.tema }), info = infoTema(musica);
  if (info.titulo !== t.tema) throw new Error(`tema inesperado: ${info.titulo}`);
  const datos = {
    modo: t.modo, semilla: t.semilla, T: { fin: t.fin, estalla: t.estalla }, bandas: espectro(musica, t.fin, t.desde),
    letra: letrasT[info.slug].lineas.map(l => ({ texto: l.texto, ini: l.ini - t.desde, fin: l.fin - t.desde })).filter(l => l.ini >= -.05 && l.ini < t.fin - 1),
    cuadros: t.cuadros, disco: t.disco, temas: t.temas, escudo: archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png')),
  };
  if (flag('--cuadros')) {
    const { b, p } = await abrirCon(datos);
    const fila = [];
    for (const f of [.12, .28, .45, .62, .8, .96]) {
      await p.evaluate(s => mostrar(0, s), t.fin * f);
      fila.push(await sharp(await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 84 })).resize(240, 427).toBuffer());
    }
    await b.close();
    hojas.push(fila);
    continue;
  }
  const base = path.join(DIR, `${t.id}-base.mp4`), audio = path.join(DIR, `${t.id}.mp4`), final = path.join(DIR, `${t.id}-tiktok.mp4`), jpg = path.join(DIR, `${t.id}-portada.jpg`);
  log(`Render ${t.id} (${info.titulo})…`);
  await video('tacet-teaser.html', datos, base, { escenas: [{ n: 0, dur: t.fin }], fps: 60, desenfoque: true });
  ff(['-i', base, '-ss', String(t.desde), '-i', musica, '-af', `afade=t=in:d=0.12,afade=t=out:st=${(t.fin - 1.1).toFixed(2)}:d=1`, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(t.fin), '-movflags', '+faststart', audio]);
  { const { b, p } = await abrirCon(datos); await p.evaluate(s => mostrar(0, s), t.portada); await p.locator('#lienzo').screenshot({ path: jpg, type: 'jpeg', quality: 93 }); await b.close(); }
  conPortada(audio, jpg, final);
  if (flag('--sin-lote')) continue;
  await putFile(audio, `social/viral/tacet-hype-${t.id}.mp4`);
  await putFile(final, `social/viral/tacet-hype-${t.id}-tiktok.mp4`);
  const v = Date.now().toString(36), uHist = `${MEDIA}/social/viral/tacet-hype-${t.id}.mp4?v=${v}`, uTik = `${MEDIA}/social/viral/tacet-hype-${t.id}-tiktok.mp4?v=${v}`;
  const uPortada = await subirPortada(jpg, `social/viral/tacet-hype-${t.id}-portada.jpg`);
  const desc = `${Math.round(t.fin)} s · sale ${t.cuando} · no nombra a Tacet Sin a propósito: se revela a las 20:00 del 7/11, por eso el texto no lleva crédito del tema · suena ${info.titulo}.`;
  const lote = {
    id: `viral-tacet-hype-${t.id}`, tipo: 'viral', creado: new Date().toISOString(), publicarA: t.hora, titulo: t.titulo, piezas: [
      { id: 'ig-historia', red: 'instagram', formato: 'Historia', metodo: 'ig-historia', decision: 'pendiente', descripcion: desc, media: [{ tipo: 'video', url: uHist, vertical: true }], local: { video: audio } },
      { id: 'tiktok', red: 'tiktok', formato: 'Video', metodo: 'tiktok', decision: 'pendiente', descripcion: desc, media: [{ tipo: 'video', url: uTik, vertical: true }], local: { video: final }, portada: { url: uPortada, local: jpg }, texto: t.tiktok },
    ],
  };
  let avisos = 0;
  for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) { avisos++; log(`  aviso ${t.id}/${p.id}: ${r.msg}`); }
  if (avisos) throw new Error(`${avisos} avisos del revisor en ${t.id}.`);
  await agregarLote(lote);
  log(`Lote ${lote.id} cargado.`);
}
if (hojas.length) {
  const comp = hojas.flatMap((f, i) => f.map((input, k) => ({ input, left: k * 240, top: i * 427 })));
  await sharp({ create: { width: 1440, height: hojas.length * 427, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 88 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
}
process.exit(0);
