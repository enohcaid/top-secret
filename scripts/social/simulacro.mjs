#!/usr/bin/env node
// Simulacro de contenido viral (pedido de Juan, 2026-10-09: "necesito ver plasmadas algunas ideas y ver qué me
// generan"). Produce dos piezas reales (carrusel de psicología del deporte y video "antes y después") y carga el
// guion de la semana 12-18/10 como ideas para aprobar en aprobar.html → pestaña "Contenido viral".
// Nada de esto se publica solo: el lote del simulacro no tiene hora de publicación.
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { ROOT } from '../lib/env.mjs';
import { putFile } from '../lib/r2.mjs';
import { cargar } from './lib/datos.mjs';
import { carrusel, video, archivo, dropDelTema } from './lib/render.mjs';
import { agregarLote, leer, PAGINA } from './lib/aprobaciones.mjs';

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
const dir = path.join(ROOT, 'fuentes/redes/simulacro');
fs.mkdirSync(dir, { recursive: true });
const ESCUDO = archivo(path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'));
const v = Date.now().toString(36);
const subir = async f => { const key = `social/simulacro/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };

// ── 1. Carrusel de psicología: "3 errores mentales que te hacen perder en Pro Clubs" ──
const d = await cargar();
const noche = d.partidos.filter(m => m.date === '2026-10-07');   // la noche del 0-1 y la reacción (dato real)
const psico = {
  serie: 'Cabeza fría · Psicología del juego',
  escudo: ESCUDO,
  portada: { kicker: 'Cabeza fría', titulo: '3 errores<br>mentales que<br>te hacen <em>perder</em><br>en Pro Clubs', img: archivo(path.join(ROOT, 'Renders/Guiidow/Brazos4.png')) },
  errores: [
    { titulo: 'Seguir <em>pensando</em><br>en el gol que te hicieron', pasa: 'La cabeza se queda repitiendo la jugada anterior. Mientras tanto, la siguiente ya empezó y llegás tarde a todo.', hacer: 'Al sacar del medio, decite una palabra («siguiente») y enfocate <strong>solo en la próxima jugada</strong>.' },
    { titulo: '<em>Culpar</em> a un compañero<br>por el audio', pasa: 'Culpar a un compañero en pleno partido sube la tensión de todo el equipo. Con tensión se decide peor y se arriesga menos.', hacer: 'Hablale para <strong>corregir, no para culpar</strong>: en vez de «¿por qué no volviste?», decile «volvé a tu marca».' },
    { titulo: 'Querer <em>empatar</em><br>en una sola jugada', pasa: 'Abajo en el marcador aparecen el pase imposible y el remate de 40 metros. El apuro regala la pelota.', hacer: 'Olvidate del marcador por un rato: proponete <strong>ganar los próximos 10 minutos</strong>, jugada por jugada.' },
  ],
  prueba: {
    kicker: 'Nos pasó el miércoles', titulo: 'Del 0-1 a<br><em>dos victorias</em>',
    partidos: noche.map(m => ({ rival: m.rival, score: `${m.gf}-${m.gc}`, res: m.res })),
    texto: 'Se le cortó la conexión a un compañero y perdimos 0-1. No se podía controlar. Lo que sí: cómo salimos al partido siguiente. Esa misma noche, dos victorias.',
  },
  cierre: { kicker: 'Guardalo', titulo: 'Para la<br>próxima <em>vez</em>', texto: 'Guardalo para cuando te toque.<br><b>Mandáselo</b> al que todavía está discutiendo el gol del primer tiempo.', img: archivo(path.join(ROOT, 'Renders/CipriMancini/Unica4.png')) },
};
console.log('Carrusel de psicología…');
const slidesPsico = await carrusel('psico.html', psico, dir, 'psico');

// ── 2. Video "antes y después": Lautavester7, temporada 1 a 4 ──
// Renders recortados al cuerpo (fuentes/redes/simulacro/lauta-t*.png, hechos con sharp.trim()).
// Simulacro: música del día solo para escucharlo (no se registra como usada porque no se publica).
const musica = path.join(ROOT, 'fuentes/musica/propios/2026-10-09 - Madrugada.mp3');
const tema = dropDelTema(musica) || { drop: 0, bpm: 130 };
const B = 60 / tema.bpm, REVELA = 1.6 + 10 * B;              // 1,6 s de gancho y después las tres épocas (10 pulsos)
const antes = {
  escudo: ESCUDO, bpm: tema.bpm, revela: REVELA,
  gancho: [{ t: 'Mismo' }, { t: 'jugador.' }, { t: '4', oro: true, salto: true }, { t: 'temporadas.', oro: true }],
  final: 'Lautavester7 · Temporada 4',
  pregunta: '¿Cuál es tu favorita?',
  versiones: [1, 2, 3, 4].map(n => ({ img: archivo(path.join(dir, `lauta-t${n}.png`)), titulo: `Temporada ${n}`, sub: n === 4 ? 'Ahora' : ['El comienzo', 'Creciendo', 'El salto'][n - 1] })),
};
console.log('Video antes y después (60 fps con desenfoque de movimiento)…');
const mp4 = path.join(dir, 'antes-despues-lautavester7.mp4');
await video('antes-despues.html', antes, mp4, {
  escenas: [{ n: 0, dur: REVELA + 11 * B }], fps: 60, desenfoque: true,
  musica: fs.existsSync(musica) ? musica : null, musicaDesde: Math.max(0, tema.drop - REVELA),   // el drop del tema cae en la revelación
});

console.log('Subiendo…');
const uPsico = [];
for (const s of slidesPsico) uPsico.push(await subir(s));
const uVideo = await subir(mp4);

// ── Lote 1: las dos piezas producidas ──
const img = uPsico.map(url => ({ tipo: 'imagen', url }));
const vid = [{ tipo: 'video', url: uVideo, vertical: true }];
await agregarLote({
  id: 'viral-simulacro', tipo: 'viral', simulacro: true, creado: new Date().toISOString(), publicarA: null,
  titulo: 'Simulacro · dos piezas producidas',
  piezas: [
    { id: 'psico-ig', red: 'instagram', formato: 'Carrusel · psicología del deporte', descripcion: 'Serie "Cabeza fría" · pensado para guardar y mandar por mensaje', media: img, metodo: 'ig-carrusel',
      texto: 'Perdiste 0-1 y todavía estás pensando en ese gol. Ese es el error número uno.\n\n3 errores mentales que te hacen perder en Pro Clubs, y qué hacer con cada uno. El miércoles nos pasó a nosotros: se le cortó la conexión a un compañero, perdimos 0-1, y esa misma noche ganamos los dos partidos que quedaban.\n\nGuardalo para la próxima. Y mandáselo al que sigue discutiendo el gol del primer tiempo.\n\n#TopSecretFC #ProClubs #EAFC #PsicologiaDelDeporte #Gaming' },
    { id: 'psico-x', red: 'x', formato: 'Post · pregunta', descripcion: 'Acompaña al carrusel: busca respuestas en la primera media hora', media: img.slice(0, 1), metodo: 'x-imagenes',
      texto: '¿Qué te tiltea más en Pro Clubs?\n\nA) El gol en contra en el último minuto\nB) El compañero que no vuelve a defender\nC) El lag\nD) El que te grita por el audio\n\nNosotros ya elegimos. #ProClubs' },
    { id: 'antes-reel', red: 'instagram', formato: 'Reel · antes y después', descripcion: '8 s pensados para verse en loop · música del día solo de muestra', media: vid, metodo: 'ig-reel',
      texto: 'Mismo jugador. 4 temporadas. ¿Cuál es tu favorita?\n#TopSecretFC #ProClubs #EAFC' },
    { id: 'antes-tiktok', red: 'tiktok', formato: 'Video · antes y después', descripcion: 'Mismo video; en TikTok funciona mejor con un sonido en tendencia (decisión pendiente)', media: vid, metodo: 'tiktok',
      texto: 'de la temporada 1 a la 4 💀➡️🔥 #ProClubs #EAFC #glowup #TopSecretFC' },
    { id: 'antes-short', red: 'youtube', formato: 'Short · antes y después', descripcion: 'El final empalma con el principio: la repetición pesa en Shorts', media: vid, metodo: 'youtube', titulo: 'Mismo jugador, 4 temporadas de Pro Clubs | EA FC',
      texto: '¿Cuál es tu temporada favorita? #Shorts #ProClubs #EAFC' },
  ].map(p => ({ decision: 'pendiente', ...p })),
});

// ── Lote 2: guion de la semana 12-18/10 (ideas para aprobar antes de producirlas) ──
const G = (id, formato, guion, red = 'plan') => ({ id, red, formato, guion, decision: 'pendiente', texto: '' });
// Si el guion ya existe, no se pisa: tiene las decisiones y comentarios de Juan.
if (!(await leer()).lotes.some(l => l.id === 'viral-guiones-2026-10-12')) await agregarLote({
  id: 'viral-guiones-2026-10-12', tipo: 'viral', etapa: 'guion', creado: new Date().toISOString(),
  titulo: 'Guion de la semana · lunes 12 al domingo 18 de octubre',
  bajada: 'Mezcla: 2 memes de tendencia, 1 de psicología, 1 transformación, 1 mini-documental y conversación en X',
  piezas: [
    G('lun-meme', 'Meme de tendencia: "Grr lunes"', {
      cuando: 'Lunes 12 · 12:00 (día de partido)', redes: ['Reel', 'TikTok', 'Historia IG'],
      gancho: '"Grr lunes"… salvo que el lunes hay VPUG.',
      escenas: ['0-2 s: texto "Grr lunes" sobre un jugador serio, de brazos cruzados, en blanco y negro.', 'Corte al golpe de la música: el mismo jugador festejando, color y dorado, texto "…salvo que hoy hay VPUG".', 'Cierre: placa con los partidos de esta noche (23:00 Inter Regional, 23:30 Temperley eSports) y "en vivo por Twitch y Kick".'],
      texto: 'Grr lunes. Salvo este. 23:00 y 23:30, en vivo. #TopSecretFC #ProClubs',
      porque: 'Es el meme del mes en TikTok e Instagram y las marcas lo usan porque el lunes es universal. Para nosotros el lunes es día de partido: el chiste se escribe solo.',
      crear: 'Plantilla corta de meme (rápida) con renders que ya tenemos. Música del día.',
    }),
    G('lun-x', 'Encuesta en X', {
      cuando: 'Lunes 12 · 18:00', redes: ['X'],
      gancho: '¿Cuántos goles mete Top Secret esta noche?',
      texto: '¿Cuántos goles metemos esta noche en VPUG? (dos partidos)\n0-1 · 2-3 · 4-5 · 6 o más',
      porque: 'Las encuestas generan respuestas en la primera media hora, que es lo que X empuja al "Para vos". Además lleva gente al vivo.',
      crear: 'Nada: texto.',
    }),
    G('mar-psico', 'Psicología del deporte: carrusel "Cabeza fría"', {
      cuando: 'Martes 13 · 14:00', redes: ['Carrusel IG', 'Álbum FB', 'X'],
      gancho: '3 errores mentales que te hacen perder en Pro Clubs.',
      escenas: ['Es la pieza del simulacro (abajo, en "Listo para publicar"): portada, un error por placa con "qué pasa / qué hacer", la prueba real del 0-1 del miércoles y el cierre "guardalo / mandáselo".'],
      porque: 'Lo útil se guarda y se comparte por mensaje privado, las dos señales que más pesan hoy en Instagram. El tilt le pasa a cualquiera que juegue, no solo a Pro Clubs: abre público.',
      crear: 'Ya está hecha. Si gusta, "Cabeza fría" se vuelve una serie: un carrusel por semana.',
    }),
    G('jue-glowup', 'Transformación: antes y después', {
      cuando: 'Jueves 15 · 14:00', redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'Mismo jugador. 4 temporadas.',
      escenas: ['Es la pieza del simulacro: temporada 1, 2 y 3 en cortes rápidos al pulso, destello y la versión actual con el kit T4.', 'Si funciona, una por semana con otro jugador del plantel (hay renders de las 4 temporadas de 7 jugadores).'],
      texto: 'Mismo jugador. 4 temporadas. ¿Cuál es tu favorita?',
      porque: 'Las transformaciones "antes y después" con corte al ritmo son uno de los formatos más repetidos del año. Es corto, se ve en loop y genera comentarios de opinión.',
      crear: 'Ya está hecha la primera (Lautavester7).',
    }),
    G('vie-reaccion', 'Meme de tendencia: "Mi reacción a…"', {
      cuando: 'Viernes 16 · 14:00', redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'Mi reacción a los goles de [goleador de la semana]: 1… 2… 3…',
      escenas: ['La cara del jugador cambia con cada número: arranca indiferente y termina desatado.', 'Los números salen de los partidos reales de la semana (lunes y miércoles).', 'Cierre con el total de la temporada.'],
      porque: 'Formato del mes: convertir un número en una reacción que crece. Se adapta a cualquier dato y celebra a un jugador sin que sea otra placa de estadísticas.',
      crear: '4 expresiones nuevas del jugador con ChatGPT (de indiferente a eufórico), a partir de su render T4.',
    }),
    G('sab-doc', 'Mini-documental: "El día que nos atajó un bot"', {
      cuando: 'Sábado 17 · 14:00', redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'El 7 de octubre nos faltó un jugador. Atajó la máquina. Ganamos.',
      escenas: ['Estilo "documental de Netflix": música solemne, textos en pantalla, ritmo lento.', '"Miércoles 7 de octubre. Faltaba uno." → el arco vacío.', '"Atajó un bot." → silencio dramático.', '"Cambaceres 1 · Top Secret 2." → festejo.', 'Cierre: "Algunos héroes no tienen gamertag."'],
      porque: 'El formato "documental solemne sobre algo mínimo" está pegando y la anécdota es real y graciosa (está en el reporte del partido). El humor sobre uno mismo humaniza al club.',
      crear: 'Escenas con ChatGPT (arco vacío, el "bot" atajando), animación propia y música del día. Sin voz en off por ahora: texto en pantalla (si después querés voz, hay voces sintéticas argentinas gratis).',
    }),
    G('dom-x', 'Pregunta de domingo en X', {
      cuando: 'Domingo 18 · 19:00', redes: ['X'],
      gancho: 'Si pudieras sumar a Top Secret a un jugador de la historia del fútbol, ¿a quién traés?',
      texto: 'Pregunta de domingo: si pudieras sumar a UN jugador de la historia del fútbol a Top Secret, ¿a quién traés y en qué posición? 👇',
      porque: 'Pregunta abierta y de opinión: genera respuestas y citas. Domingo sin partidos, la gente está en el celular.',
      crear: 'Nada: texto.',
    }),
  ],
});

console.log('Listo.');
if (!process.argv.includes('--no-abrir')) spawn('cmd', ['/c', 'start', '', PAGINA], { detached: true, stdio: 'ignore' }).unref();
