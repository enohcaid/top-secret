#!/usr/bin/env node
// Resumen semanal "La semana en datos" (decisión de Juan, 2026-10-09): reemplaza a la noticia de balance semanal
// que escribía la rutina diaria los sábados. Arma un carrusel de 6 placas y un video vertical con los partidos de
// la semana, los textos de cada red y la NOTICIA DEL SITIO (con las placas adentro), y lo deja todo en
// aprobar.html (que se abre solo en el navegador). Publica scripts/social/publicar.mjs solo lo aprobado.
//
//   node scripts/social/resumen-semanal.mjs                     → si hoy es sábado, arma el de hoy
//   node scripts/social/resumen-semanal.mjs --fecha 2026-10-10  → el de ese sábado
//   --hora 11:00 (hora de publicación)  --forzar  --no-abrir  --sin-textos
// Tarea programada: TopSecretFC-ResumenSemanal (sábados 08:00). Log: scripts/ronda-redes.log
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ROOT } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';
import { elegirMusica } from '../lib/musica.mjs';
import { cargar, hoyART, diaSemana, fechaCorta, TEMPORADA } from './lib/datos.mjs';
import { carrusel, video } from './lib/render.mjs';
import { escribirTextos, escribirNoticia } from './lib/textos.mjs';
import { agregarLote, PAGINA } from './lib/aprobaciones.mjs';
import * as semana from './formatos/semana.mjs';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const FECHA = opt('--fecha') || hoyART();
const HORA = opt('--hora') || '11:00';
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [resumen] ${m}`);
const sumar = (f, d) => { const x = new Date(f + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
const esSabado = new Date(FECHA + 'T12:00:00-03:00').getUTCDay() === 6;

// Sin process.exit() después de un fetch: en Windows tira "Assertion failed … UV_HANDLE_CLOSING" (código 9).
if (!esSabado && !argv.includes('--forzar')) log(`${FECHA}: el resumen semanal sale los sábados.`);
else await armar();

async function armar() {
  const d = await cargar();
  d.fixture = d.fixture.map(f => ({ ...f, escudo: f.escudo || d.escudos[f.rival] || '' }));
  const desde = sumar(FECHA, -7), hasta = sumar(FECHA, -1);
  const nSemana = Math.max(1, Math.ceil((Date.parse(hasta) - Date.parse(TEMPORADA.desde) + 86400000) / (7 * 86400000)));
  const pieza = semana.datos(d, { desde, hasta, semana: nSemana });
  if (!pieza) { log(`Sin partidos entre ${desde} y ${hasta}: no hay resumen esta semana.`); return; }
  log(`Resumen ${FECHA} (${desde} a ${hasta}, semana ${nSemana}) — sale ${HORA}`);

  // ── Producción ───────────────────────────────────────────────────────────
  const id = `resumen-${FECHA}`;
  const dir = path.join(ROOT, 'fuentes/redes/resumen', FECHA);
  fs.mkdirSync(dir, { recursive: true });
  log('Carrusel…');
  const slides = await carrusel('semana.html', pieza.plantilla, dir, 'slide');
  log('Video vertical…');
  const musica = elegirMusica(id);
  const mp4 = path.join(dir, `${id}.mp4`);
  await video('semana.html', pieza.plantilla, mp4, { escenas: semana.ESCENAS_VIDEO, gancho: 1.6, musica });
  const nombreTema = path.basename(musica).replace(/\.\w+$/, '').replace(/^\d{4}-\d{2}-\d{2} - /, '');

  log('Subiendo a R2…');
  const v = Date.now().toString(36);
  const subir = async f => { const key = `social/${FECHA}/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
  const urlsSlides = [];
  for (const s of slides) urlsSlides.push(await subir(s));
  const urlVideo = await subir(mp4);

  // ── Textos ────────────────────────────────────────────────────────────────
  const r = pieza.resumen;
  const datosTexto = {
    contexto: `Resumen de la semana ${nSemana} (${desde} a ${hasta}) en ${TEMPORADA.torneo}`,
    liga: TEMPORADA.liga,
    record: `${r.pj} partidos: ${r.v} victorias, ${r.e} empates, ${r.d} derrotas · ${r.gf} goles a favor, ${r.gc} en contra · ${r.pts} puntos`,
    partidos: pieza.partidos.map(m => `${diaSemana(m.date)} ${fechaCorta(m.date)}: Top Secret ${m.gf}-${m.gc} ${m.rival} (${m.isHome ? 'local' : 'visitante'})`),
    goleadores: r.goleadores.map(j => `${j.gt}: ${j.goles} gol${j.goles > 1 ? 'es' : ''}`),
    mejor_promedio: r.promedios[0] ? `${r.promedios[0].gt} (${r.promedios[0].prom.toFixed(2)} en ${r.promedios[0].pj} partidos)` : null,
    proximos: d.fixture.filter(f => f.date > hasta).slice(0, 3).map(f => `${diaSemana(f.date)} ${fechaCorta(f.date)} ${f.time}: vs ${f.rival} (${f.isHome ? 'local' : 'visitante'})`),
    vivo: 'Los partidos se transmiten en vivo por Twitch y Kick (topsecretfc)',
  };
  let t, n;
  if (argv.includes('--sin-textos')) {
    t = Object.fromEntries(['instagram_carrusel', 'instagram_reel', 'facebook', 'x', 'tiktok', 'youtube_titulo', 'youtube_texto'].map(k => [k, 'Texto de muestra']));
    n = { titulo: 'TÍTULO DE MUESTRA', bajada: 'Bajada de muestra', apertura: 'Apertura.', goles: 'Goles.', viene: 'Viene.', cierre: 'Cierre.' };
  } else {
    log('Textos de las redes (Claude)…');
    t = escribirTextos({ pieza: 'Formato "La semana en datos": un carrusel de 6 placas (portada, resultados, goleadores, mejor promedio, el equipo en números, lo que viene) y un video vertical de 25 s con las mismas escenas animadas y música original del club.', datos: datosTexto });
    log('Noticia del sitio (Claude)…');
    n = escribirNoticia({ datos: datosTexto });
  }

  // Noticia del sitio con las placas adentro (mismos bloques que el resto de las notas: specs, img, pair, h).
  const [, mm, dd] = FECHA.split('-').map(Number);
  const fig = r.promedios[0];
  const noticia = {
    id: `semana-${FECHA}`, generatedAt: new Date().toISOString(), category: 'Analisis',
    title: n.titulo, date: FECHA, dateLabel: `${dd} de ${MESES[mm - 1]} de ${FECHA.slice(0, 4)}`, excerpt: n.bajada,
    image: urlsSlides[0], imagePost: urlsSlides[0],
    body: [
      n.apertura,
      { specs: [['Semana', `${r.v}V · ${r.e}E · ${r.d}D`], ['Puntos', String(r.pts)], ['Goles', `${r.gf} a favor · ${r.gc} en contra`], ...(fig ? [['Mejor promedio', `${fig.gt} · ${fig.prom.toFixed(2).replace('.', ',')}`]] : [])] },
      { img: urlsSlides[1], caption: 'Los resultados de la semana.' },
      { h: 'Los goles y la figura' },
      n.goles,
      { pair: [urlsSlides[2], urlsSlides[3]], caption: 'Goleadores y mejor promedio de la semana.' },
      { img: urlsSlides[4], caption: 'El equipo en números.' },
      { h: 'Lo que viene' },
      n.viene,
      { img: urlsSlides[5], caption: 'Próximos partidos.' },
      `${n.cierre} <a href='calendario.html'>Calendario</a>`,
    ],
    shareCaption: t.x, shareCaptions: { ig: t.instagram_carrusel, x: t.x, fb: t.facebook },
    status: 'published',
  };

  // ── Lote para aprobar ─────────────────────────────────────────────────────
  const slidesM = urlsSlides.map(url => ({ tipo: 'imagen', url }));
  const videoM = [{ tipo: 'video', url: urlVideo, vertical: true, poster: urlsSlides[0] }];
  const local = { video: mp4, slides };
  // Lo editable de la noticia: el título y sus 4 párrafos (apertura, goles, lo que viene, cierre) separados por una
  // línea en blanco; las placas, la ficha y los subtítulos los pone el publicador (publicar.mjs, sitio-noticia).
  const piezas = [
    { id: 'sitio', red: 'sitio', formato: 'Noticia en el sitio', descripcion: 'Reemplaza a la nota de balance semanal · 4 párrafos separados por una línea en blanco; las placas van adentro', media: slidesM.slice(0, 1), titulo: noticia.title, texto: [n.apertura, n.goles, n.viene, n.cierre].join('\n\n'), noticia, metodo: 'sitio-noticia' },
    { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel', descripcion: '6 placas · lo que más se guarda y comenta', media: slidesM, texto: t.instagram_carrusel, metodo: 'ig-carrusel' },
    { id: 'ig-reel', red: 'instagram', formato: 'Reel', descripcion: 'Video vertical · lo que más llega a gente nueva', media: videoM, musica: nombreTema, texto: t.instagram_reel, metodo: 'ig-reel' },
    { id: 'fb-album', red: 'facebook', formato: 'Álbum de fotos', descripcion: 'Las 6 placas en un post', media: slidesM, texto: t.facebook, metodo: 'fb-album' },
    { id: 'x-post', red: 'x', formato: 'Post con 4 imágenes', descripcion: 'Portada, resultados, goleadores y figura', media: slidesM.slice(0, 4), texto: t.x, metodo: 'x-imagenes' },
    { id: 'tiktok', red: 'tiktok', formato: 'Video', descripcion: 'Video vertical con música original', media: videoM, musica: nombreTema, texto: t.tiktok, metodo: 'tiktok' },
    { id: 'yt-short', red: 'youtube', formato: 'Short', descripcion: 'Video vertical', media: videoM, musica: nombreTema, titulo: t.youtube_titulo, texto: t.youtube_texto, metodo: 'youtube' },
  ].map(p => ({ decision: 'pendiente', ...p, local }));

  await agregarLote({
    id, tipo: 'resumen-semanal', creado: new Date().toISOString(),
    titulo: `La semana en datos · sábado ${fechaCorta(FECHA)}`,
    publicarA: `${FECHA}T${HORA}:00-03:00`, piezas,
  });
  log(`Lote ${id} listo para aprobar: ${piezas.length} piezas.`);
  if (!argv.includes('--no-abrir')) spawn('cmd', ['/c', 'start', '', PAGINA], { detached: true, stdio: 'ignore' }).unref();
}
