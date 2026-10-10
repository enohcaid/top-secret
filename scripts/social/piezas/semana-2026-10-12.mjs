#!/usr/bin/env node
// Programa la primera semana de contenido viral (Juan aprobó todo el simulacro, 2026-10-10):
//   martes 13/10 14:00 → "Cabeza fría" (Reel/TikTok/Short/FB video + carrusel en FB y X con la pregunta)
//   jueves 15/10 14:00 → "Mismo jugador, 4 temporadas" (Reel/TikTok/Short/FB/X)
// Cada video con su propia música original (regla: un tema por video): Cabeza fría = "Frío", antes y después = "Deuda"
// (se re-renderiza: el simulacro tenía "Madrugada", que ya usó el resumen). Las piezas quedan aprobadas y con hora;
// las publica publicar.mjs. El lote del simulacro se saca de la página.
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { cargar } from '../lib/datos.mjs';
import { carrusel, video, archivo, dropDelTema } from '../lib/render.mjs';
import { leer, guardarKV } from '../lib/aprobaciones.mjs';

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const SIM = path.join(ROOT, 'fuentes/redes/simulacro');
const DIR = path.join(ROOT, 'fuentes/redes/viral');
fs.mkdirSync(DIR, { recursive: true });
const ESCUDO = archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'));
const v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };

// ── Música: un tema propio por video ──
const mCabeza = elegirMusica('viral-cabeza-fria', { preferida: 'Frío' });
const mAntes = elegirMusica('viral-antes-despues-lautavester7', { preferida: 'Deuda' });

// ── Carrusel "Cabeza fría" con los textos claros ──
const d = await cargar();
const noche = d.partidos.filter(m => m.date === '2026-10-07');
const psico = {
  serie: 'Cabeza fría · Psicología del juego', escudo: ESCUDO,
  portada: { kicker: 'Cabeza fría', titulo: '3 errores<br>mentales que<br>te hacen <em>perder</em><br>en Pro Clubs', img: archivo(path.join(ROOT, 'Renders/Guiidow/Brazos4.png')) },
  errores: [
    { titulo: 'Seguir <em>pensando</em><br>en el gol que te hicieron', pasa: 'La cabeza se queda repitiendo la jugada anterior. Mientras tanto, la siguiente ya empezó y llegás tarde a todo.', hacer: 'Al sacar del medio, decite una palabra («siguiente») y enfocate <strong>solo en la próxima jugada</strong>.' },
    { titulo: '<em>Culpar</em> a un compañero<br>por el audio', pasa: 'Culpar a un compañero en pleno partido sube la tensión de todo el equipo. Con tensión se decide peor y se arriesga menos.', hacer: 'Hablale para <strong>corregir, no para culpar</strong>: en vez de «¿por qué no volviste?», decile «volvé a tu marca».' },
    { titulo: 'Querer <em>empatar</em><br>en una sola jugada', pasa: 'Abajo en el marcador aparecen el pase imposible y el remate de 40 metros. El apuro regala la pelota.', hacer: 'Olvidate del marcador por un rato: proponete <strong>ganar los próximos 10 minutos</strong>, jugada por jugada.' },
  ],
  prueba: { kicker: 'Nos pasó el miércoles', titulo: 'Del 0-1 a<br><em>dos victorias</em>', partidos: noche.map(m => ({ rival: m.rival, score: `${m.gf}-${m.gc}`, res: m.res })),
    texto: 'Se le cortó la conexión a un compañero y perdimos 0-1. No se podía controlar. Lo que sí: cómo salimos al partido siguiente. Esa misma noche, dos victorias.' },
  cierre: { kicker: 'Guardalo', titulo: 'Para la<br>próxima <em>vez</em>', texto: 'Guardalo para cuando te toque.<br><b>Mandáselo</b> al que todavía está discutiendo el gol del primer tiempo.', img: archivo(path.join(ROOT, 'Renders/CipriMancini/Unica4.png')) },
};
console.log('Carrusel Cabeza fría…');
const slides = await carrusel('psico.html', psico, DIR, 'cabeza-fria');

// ── Antes y después con "Deuda", el drop en la revelación ──
const tema = dropDelTema(mAntes) || { drop: 0, bpm: 130 };
const B = 60 / tema.bpm, REVELA = 1.6 + 10 * B;
const antes = {
  escudo: ESCUDO, bpm: tema.bpm, revela: REVELA,
  gancho: [{ t: 'Mismo' }, { t: 'jugador.' }, { t: '4', oro: true, salto: true }, { t: 'temporadas.', oro: true }],
  final: 'Lautavester7 · Temporada 4', pregunta: '¿Cuál es tu favorita?',
  versiones: [1, 2, 3, 4].map(n => ({ img: archivo(path.join(SIM, `lauta-t${n}.png`)), titulo: `Temporada ${n}`, sub: n === 4 ? 'Ahora' : ['El comienzo', 'Creciendo', 'El salto'][n - 1] })),
};
console.log(`Antes y después con "Deuda" (${tema.bpm} BPM)…`);
const mp4Antes = path.join(DIR, 'antes-despues-lautavester7.mp4');
await video('antes-despues.html', antes, mp4Antes, { escenas: [{ n: 0, dur: REVELA + 11 * B }], fps: 60, desenfoque: true, musica: mAntes, musicaDesde: Math.max(0, tema.drop - REVELA) });

// ── Cabeza fría: el video ya renderizado (con "Frío") ──
const mp4Cabeza = path.join(DIR, 'cabeza-fria.mp4');
fs.copyFileSync(path.join(ROOT, 'fuentes/redes/cabeza-fria/cabeza-fria.mp4'), mp4Cabeza);

console.log('Subiendo…');
const uSlides = []; for (const s of slides) uSlides.push(await subir(s));
const uCabeza = await subir(mp4Cabeza), uAntes = await subir(mp4Antes);
const img = uSlides.map(url => ({ tipo: 'imagen', url }));
const vid = url => [{ tipo: 'video', url, vertical: true }];
const P = (o) => ({ decision: 'aprobada', decididoEn: new Date().toISOString(), ...o });

const loteCabeza = {
  id: 'viral-2026-10-13', tipo: 'viral', creado: new Date().toISOString(), publicarA: '2026-10-13T14:00:00-03:00',
  titulo: 'Cabeza fría · martes 13/10', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · Cabeza fría', descripcion: 'Escenas IA + motion · música: Frío', media: vid(uCabeza), metodo: 'ig-reel', local: { video: mp4Cabeza },
      texto: 'Se le cortó la conexión a un compañero. 0-1. Lo que pasó después no fue suerte.\n\n3 errores mentales que te hacen perder en Pro Clubs, y qué hacer con cada uno.\n\nGuardalo. Y mandáselo al que todavía discute el gol del primer tiempo.\n\n#TopSecretFC #ProClubs #EAFC #PsicologiaDelDeporte' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · Cabeza fría', descripcion: 'Mismo video', media: vid(uCabeza), metodo: 'tiktok', local: { video: mp4Cabeza },
      texto: 'Se desconectó un compañero y perdimos 0-1. Esa misma noche ganamos los dos que quedaban. 3 errores mentales que te hacen perder 👇 #ProClubs #EAFC #TopSecretFC #PsicologiaDelDeporte #gaming' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · Cabeza fría', descripcion: 'Mismo video', media: vid(uCabeza), metodo: 'youtube', local: { video: mp4Cabeza },
      titulo: '3 errores mentales que te hacen perder en Pro Clubs | EA FC', texto: 'Se desconectó un compañero, 0-1, y esa misma noche dimos vuelta la historia. #Shorts #ProClubs #EAFC' }),
    P({ id: 'fb-video', red: 'facebook', formato: 'Video · Cabeza fría', descripcion: 'Mismo video', media: vid(uCabeza), metodo: 'fb-video',
      texto: 'El miércoles se le cortó la conexión a un compañero y perdimos 0-1. Esa misma noche ganamos los dos partidos que quedaban. No fue suerte: fue cabeza. Estos son los 3 errores mentales que más partidos hacen perder en Pro Clubs, y qué hacer con cada uno.' }),
    P({ id: 'fb-album', red: 'facebook', formato: 'Álbum · carrusel Cabeza fría', descripcion: 'Las 6 placas para guardar', media: img, metodo: 'fb-album',
      texto: 'Cabeza fría: 3 errores mentales que te hacen perder en Pro Clubs. Guardalo para cuando te toque.' }),
    P({ id: 'x-post', red: 'x', formato: 'Post con imágenes · pregunta', descripcion: 'Busca respuestas en la primera media hora', media: img.slice(0, 4), metodo: 'x-imagenes', local: { slides: slides.slice(0, 4) },
      texto: '¿Qué te tiltea más en Pro Clubs?\n\nA) El gol en contra en el último minuto\nB) El compañero que no vuelve a defender\nC) El lag\nD) El que te grita por el audio\n\n#ProClubs #TopSecretFC' }),
  ],
};
const loteAntes = {
  id: 'viral-2026-10-15', tipo: 'viral', creado: new Date().toISOString(), publicarA: '2026-10-15T14:00:00-03:00',
  titulo: 'Mismo jugador, 4 temporadas · jueves 15/10', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · antes y después', descripcion: 'Motion · música: Deuda', media: vid(uAntes), metodo: 'ig-reel', local: { video: mp4Antes },
      texto: 'Mismo jugador. 4 temporadas. ¿Cuál es tu favorita?\n\nLautavester7, de la temporada 1 a la 4.\n\n#TopSecretFC #ProClubs #EAFC' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · antes y después', descripcion: 'Mismo video', media: vid(uAntes), metodo: 'tiktok', local: { video: mp4Antes },
      texto: 'de la temporada 1 a la 4 💀➡️🔥 #ProClubs #EAFC #glowup #TopSecretFC' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · antes y después', descripcion: 'Mismo video', media: vid(uAntes), metodo: 'youtube', local: { video: mp4Antes },
      titulo: 'Mismo jugador, 4 temporadas de Pro Clubs | EA FC', texto: '¿Cuál es tu temporada favorita? #Shorts #ProClubs #EAFC' }),
    P({ id: 'fb-video', red: 'facebook', formato: 'Video · antes y después', descripcion: 'Mismo video', media: vid(uAntes), metodo: 'fb-video',
      texto: 'Mismo jugador, cuatro temporadas: Lautavester7 de la T1 a la T4. ¿Cuál es tu favorita?' }),
    P({ id: 'x-video', red: 'x', formato: 'Video · antes y después', descripcion: 'Mismo video', media: vid(uAntes), metodo: 'x-video', local: { video: mp4Antes },
      texto: 'Mismo jugador. 4 temporadas. ¿Cuál es tu favorita? #ProClubs #TopSecretFC' }),
  ],
};

const data = await leer();
data.lotes = [loteCabeza, loteAntes, ...data.lotes.filter(l => !['viral-simulacro', loteCabeza.id, loteAntes.id].includes(l.id))];
await guardarKV('aprobaciones', data);
console.log('Programado: martes 13/10 14:00 (Cabeza fría) y jueves 15/10 14:00 (antes y después).');
