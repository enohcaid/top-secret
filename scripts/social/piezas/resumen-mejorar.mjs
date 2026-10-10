#!/usr/bin/env node
// Rehace las piezas de un resumen semanal ya armado con los recursos nuevos (pedido de Juan 2026-10-10, antes de
// publicar el primero): portada con foto NUEVA de la semana (piezas/resumen-hero.mjs) y video con la capa de motion
// GSAP + el clip animado con IA de fondo + la música alineada al drop. Actualiza los medios del lote y deja las piezas
// que cambiaron en "pendiente" para que Juan las vuelva a ver (lo que ya salió no se toca).
//   node scripts/social/piezas/resumen-mejorar.mjs --fecha 2026-10-10
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { cargar, TEMPORADA } from '../lib/datos.mjs';
import { carrusel, video, archivo, dropDelTema } from '../lib/render.mjs';
import { cuadros } from '../lib/clip.mjs';
import { leer, guardarKV } from '../lib/aprobaciones.mjs';
import * as semana from '../formatos/semana.mjs';

const argv = process.argv.slice(2);
const FECHA = argv[argv.indexOf('--fecha') + 1];
const sumar = (f, d) => { const x = new Date(f + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const dir = path.join(ROOT, 'fuentes/redes/resumen', FECHA);
const id = `resumen-${FECHA}`;

const d = await cargar();
d.fixture = d.fixture.map(f => ({ ...f, escudo: f.escudo || d.escudos[f.rival] || '' }));
const desde = sumar(FECHA, -7), hasta = sumar(FECHA, -1);
const nSemana = Math.max(1, Math.ceil((Date.parse(hasta) - Date.parse(TEMPORADA.desde) + 86400000) / (7 * 86400000)));
const hero = path.join(dir, 'hero.png');
const pieza = semana.datos(d, { desde, hasta, semana: nSemana, hero: fs.existsSync(hero) ? hero : null });

// --solo-video: rehace solo el video y toca solo las piezas de video (las demás conservan su decisión).
const SOLO_VIDEO = argv.includes('--solo-video');
console.log(SOLO_VIDEO ? 'Solo el video…' : 'Carrusel con la portada nueva…');
const slides = SOLO_VIDEO ? fs.readdirSync(dir).filter(f => /^slide-\d+\.jpg$/.test(f)).sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6))).map(f => path.join(dir, f))
  : await carrusel('semana.html', pieza.plantilla, dir, 'slide');

console.log('Video con motion + clip IA…');
const GANCHO = 1.6;
const clipHero = fs.existsSync(path.join(dir, 'hero.mp4')) ? cuadros(path.join(dir, 'hero.mp4')) : null;
const plantillaVideo = { ...pieza.plantilla, hero: null, heroClip: clipHero ? { dir: archivo(clipHero.dir), n: clipHero.n, gancho: GANCHO, vel: 0.8 } : null };
const musica = elegirMusica(id);
const tema = dropDelTema(musica) || { drop: 0 };
const mp4 = path.join(dir, `${id}.mp4`);
await video('semana.html', plantillaVideo, mp4, { escenas: semana.ESCENAS_VIDEO, gancho: GANCHO, musica, fps: 60, desenfoque: true, musicaDesde: Math.max(0, tema.drop - GANCHO) });

console.log('Subiendo y actualizando el lote…');
const v = Date.now().toString(36), MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const subir = async f => { const key = `social/${FECHA}/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const urlsSlides = []; for (const s of slides) urlsSlides.push(SOLO_VIDEO ? null : await subir(s));
const urlVideo = await subir(mp4);
const data = await leer();
const l = data.lotes.find(x => x.id === id);
for (const p of l.piezas) {
  if (p.estado === 'publicado' || p.estado === 'publicando') continue;
  const esVideo = p.media?.some(m => m.tipo === 'video');
  if (SOLO_VIDEO) {
    if (!esVideo) continue;
    p.media = [{ ...p.media[0], url: urlVideo }];
    p.decision = 'pendiente';
    continue;
  }
  if (esVideo) p.media = [{ tipo: 'video', url: urlVideo, vertical: true, poster: urlsSlides[0] }];
  else if (p.id === 'x-post') p.media = urlsSlides.slice(0, 4).map(url => ({ tipo: 'imagen', url }));
  else if (p.id === 'sitio') { p.media = [{ tipo: 'imagen', url: urlsSlides[0] }]; p.noticia.image = p.noticia.imagePost = urlsSlides[0]; p.noticia.body = p.noticia.body.map(b => b.img ? { ...b, img: urlsSlides[urlsSlides.findIndex(u => u.split('?')[0].endsWith(b.img.split('?')[0].split('/').pop()))] || b.img } : b.pair ? { ...b, pair: b.pair.map(x => urlsSlides.find(u => u.split('?')[0].endsWith(x.split('?')[0].split('/').pop())) || x) } : b); }
  else p.media = urlsSlides.map(url => ({ tipo: 'imagen', url }));
  p.decision = 'pendiente';
  p.descripcion = (p.descripcion || '').replace(/ · nueva versión.*$/, '') + ' · nueva versión: portada con foto nueva de la semana' + (esVideo ? ', motion y clip animado con IA' : '');
}
await guardarKV('aprobaciones', data);
console.log('Listo:', urlVideo);
