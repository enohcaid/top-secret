#!/usr/bin/env node
// Ronda de redes de las 14:00 (plan de Juan, 2026-10-09): contenido distinto para cada red, con el formato que
// mejor rinde en cada una, el día siguiente a cada jornada y los sábados (y si pasan más de 2 días sin ronda,
// igual sale una). Arma las piezas, escribe los textos, sube todo a R2, deja el lote en aprobar.html y lo abre
// en el navegador. Publica scripts/social/publicar.mjs (watch-regen, cada minuto) solo lo aprobado.
//
//   node scripts/social/ronda.mjs                       → decide si hoy toca y arma la ronda de hoy (14:00)
//   node scripts/social/ronda.mjs --fecha 2026-10-10    → arma la ronda de ese día
//   --forzar      arma aunque hoy no toque     --no-abrir   no abre el navegador     --sin-textos  textos de muestra
// Tarea programada: TopSecretFC-RondaRedes (12:30). Log: scripts/ronda-redes.log
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ROOT } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';
import { elegirMusica } from '../lib/musica.mjs';
import { cargar, hoyART, diaSemana, fechaCorta, TEMPORADA } from './lib/datos.mjs';
import { carrusel, video } from './lib/render.mjs';
import { escribirTextos } from './lib/textos.mjs';
import { agregarLote, leerKV, PAGINA } from './lib/aprobaciones.mjs';
import * as semana from './formatos/semana.mjs';

const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const FECHA = opt('--fecha') || hoyART();
const HORA = opt('--hora') || '14:00';
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const log = m => console.log(`${new Date().toLocaleString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })} [ronda] ${m}`);
const sumar = (f, d) => { const x = new Date(f + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };

const d = await cargar();
d.fixture = d.fixture.map(f => ({ ...f, escudo: f.escudo || d.escudos[f.rival] || '' }));
const ayer = sumar(FECHA, -1);
const esSabado = new Date(FECHA + 'T12:00:00-03:00').getUTCDay() === 6;
const jugoAyer = d.partidos.some(m => m.date === ayer);
const historial = await leerKV('social_historial', { rondas: [] });
const ultima = historial.rondas.map(r => r.fecha).filter(f => f < FECHA).sort().pop();
// Sin historial todavía (arranque del sistema) no aplica: la primera ronda sale en un día que toque.
const sinRonda = !!ultima && (Date.parse(FECHA) - Date.parse(ultima)) / 86400000 > 2;

// ── ¿Toca hoy? ───────────────────────────────────────────────────────────────
const motivo = esSabado ? 'sábado (repaso semanal)' : jugoAyer ? `jornada del ${diaSemana(ayer)}` : sinRonda ? `más de 2 días sin ronda (última: ${ultima || 'ninguna'})` : null;
if (!motivo && !argv.includes('--forzar')) { log(`${FECHA}: hoy no toca ronda.`); process.exit(0); }
log(`Ronda ${FECHA} ${HORA} — ${motivo || 'forzada'}`);

// ── Qué se cuenta: la jornada de ayer o la semana ──────────────────────────
// (Con clips de goles identificados se sumará "el gol de la fecha"; hoy los clips del vivo no son confiables.)
const repaso = esSabado || !jugoAyer;
const desde = repaso ? sumar(FECHA, -7) : ayer, hasta = ayer;
const pieza = semana.datos(d, { desde, hasta, semana: Math.max(1, Math.ceil((Date.parse(hasta) - Date.parse(TEMPORADA.desde)) / (7 * 86400000))) });
if (!pieza) { log(`No hay partidos entre ${desde} y ${hasta}: no hay ronda de datos. (Falta el formato sin partidos.)`); process.exit(0); }
if (!repaso) {
  pieza.plantilla.portada.kicker = `La jornada del ${diaSemana(ayer)} ${fechaCorta(ayer)}`;
  pieza.plantilla.kicker = `${TEMPORADA.torneo} · ${fechaCorta(ayer)}`;
}

// ── Producción ─────────────────────────────────────────────────────────────
const id = `ronda-${FECHA}`;
const dir = path.join(ROOT, 'fuentes/redes/ronda', FECHA);
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
  contexto: repaso ? `Repaso de la semana (${desde} a ${hasta}) en ${TEMPORADA.torneo}` : `Jornada del ${diaSemana(ayer)} ${fechaCorta(ayer)} en ${TEMPORADA.torneo}`,
  liga: TEMPORADA.liga,
  record: `${r.pj} partidos: ${r.v} victorias, ${r.e} empates, ${r.d} derrotas · ${r.gf} goles a favor, ${r.gc} en contra · ${r.pts} puntos`,
  partidos: pieza.partidos.map(m => `${diaSemana(m.date)} ${fechaCorta(m.date)}: Top Secret ${m.gf}-${m.gc} ${m.rival} (${m.isHome ? 'local' : 'visitante'})`),
  goleadores: r.goleadores.map(j => `${j.gt}: ${j.goles} gol${j.goles > 1 ? 'es' : ''}`),
  mejor_promedio: r.promedios[0] ? `${r.promedios[0].gt} (${r.promedios[0].prom.toFixed(2)} en ${r.promedios[0].pj} partidos)` : null,
  proximos: d.fixture.filter(f => f.date > hasta).slice(0, 3).map(f => `${diaSemana(f.date)} ${fechaCorta(f.date)} ${f.time}: vs ${f.rival} (${f.isHome ? 'local' : 'visitante'})`),
  vivo: 'Los partidos se transmiten en vivo por Twitch y Kick (topsecretfc)',
};
let t;
if (argv.includes('--sin-textos')) t = { instagram_carrusel: 'Texto de muestra', instagram_reel: 'Texto de muestra', facebook: 'Texto de muestra', x: 'Texto de muestra', tiktok: 'Texto de muestra', youtube_titulo: 'Título de muestra', youtube_texto: 'Texto de muestra' };
else {
  log('Textos (Claude)…');
  t = escribirTextos({ pieza: `Formato "${repaso ? 'La semana en datos' : 'La jornada en datos'}": un carrusel de 6 placas (portada, resultados, goleadores, mejor promedio, el equipo en números, lo que viene) y un video vertical de 25 s con las mismas escenas animadas y música original del club.`, datos: datosTexto });
}

// ── Lote para aprobar ─────────────────────────────────────────────────────
const slidesM = urlsSlides.map(url => ({ tipo: 'imagen', url }));
const videoM = [{ tipo: 'video', url: urlVideo, vertical: true, poster: urlsSlides[0] }];
const local = { video: mp4, slides };
const piezas = [
  { id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel', descripcion: '6 placas · lo que más se guarda y comenta', media: slidesM, texto: t.instagram_carrusel, metodo: 'ig-carrusel' },
  { id: 'ig-reel', red: 'instagram', formato: 'Reel', descripcion: 'Video vertical · lo que más llega a gente nueva', media: videoM, musica: nombreTema, texto: t.instagram_reel, metodo: 'ig-reel' },
  { id: 'fb-album', red: 'facebook', formato: 'Álbum de fotos', descripcion: 'Las 6 placas en un post', media: slidesM, texto: t.facebook, metodo: 'fb-album' },
  { id: 'fb-video', red: 'facebook', formato: 'Video', descripcion: 'El mismo video vertical', media: videoM, musica: nombreTema, texto: t.facebook, metodo: 'fb-video', decision: 'descartada' },
  { id: 'x-post', red: 'x', formato: 'Post con 4 imágenes', descripcion: 'Portada, resultados, goleadores y figura', media: slidesM.slice(0, 4), texto: t.x, metodo: 'x-imagenes' },
  { id: 'tiktok', red: 'tiktok', formato: 'Video', descripcion: 'Video vertical con música original', media: videoM, musica: nombreTema, texto: t.tiktok, metodo: 'tiktok' },
  { id: 'yt-short', red: 'youtube', formato: 'Short', descripcion: 'Video vertical', media: videoM, musica: nombreTema, titulo: t.youtube_titulo, texto: t.youtube_texto, metodo: 'youtube' },
].map(p => ({ decision: 'pendiente', ...p, local }));

await agregarLote({
  id, tipo: 'ronda', creado: new Date().toISOString(),
  titulo: `Ronda de redes · ${diaSemana(FECHA)} ${fechaCorta(FECHA)}`,
  publicarA: `${FECHA}T${HORA}:00-03:00`, motivo: motivo || 'forzada', piezas,
});
log(`Lote ${id} listo para aprobar: ${piezas.length} piezas.`);

if (!argv.includes('--no-abrir')) spawn('cmd', ['/c', 'start', '', PAGINA], { detached: true, stdio: 'ignore' }).unref();
