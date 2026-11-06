#!/usr/bin/env node
// "La camiseta gigante en el Obelisco" (idea jue-obelisco del guion viral-guiones-2026-11-09): anuncios gigantes
// imposibles hechos por computadora, filmados "con el celular" desde la vereda. El remate aclara que es una recreación.
//
// Decisiones (producción sin supervisión):
//   - Cinco tomas: las cuatro del guion + la gente frenada filmando, que es además la toma de la que se aleja la cámara.
//   - El 9 es NicoBJ_96 (roster.js), así que es el protagonista y va nombrado en los textos.
//   - El texto del guion ("¿Dónde la pondrías vos?") se reescribe por doble sentido (feedback_sin_doble_sentido).
//   - Sin voz (pieza visual); el sonido de ciudad se sintetiza porque no hay ninguno en el repo.
//   - Sin Facebook: no está en las redes del guion.
//
//   node scripts/social/piezas/2026-11-09-jue-obelisco.mjs
//     --solo-imagenes   genera las imágenes, para revisarlas antes de gastar clips de Canva
//     --solo-clips      además, los clips de Canva
//     --cuadros         hoja de cuadros clave en fuentes/redes/viral/jue-obelisco/hoja.jpg, sin renderizar
//     --sin-lote        renderiza todo pero no sube ni carga el lote
//     --sin-render      reusa el video base: rehace sonido y portada, sube y carga el lote
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica, infoTema, creditoTexto } from '../../lib/musica.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { animar, cuadros } from '../lib/clip.mjs';
import { video, archivo } from '../lib/render.mjs';
import { portada, conPortada, subirPortada } from '../lib/portada.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { playerIdentityLine } from '../../generate-image-chatgpt.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/jue-obelisco');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [obelisco] ${m}`);
const flag = f => process.argv.includes(f);

const KIT = path.join(ROOT, 'logos/nosotros/detalle-k1.png');
const ESCUDO = path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png');
const NUEVE = 'NicoBJ_96';   // dorsal 9 en roster.js y PLAYER_TRAITS

// Tiene que parecer filmado por un peatón, no un póster: por eso se pide lo imperfecto del celular.
const pedido = (escena, adjuntos) => `Creá una imagen fotorrealista: un CUADRO DE VIDEO VERTICAL filmado con un celular por un peatón en Buenos Aires, Argentina. Parece un registro real que alguien subió a sus redes, del estilo de los anuncios gigantes hechos por computadora que parecen de verdad.

═══ LA ESCENA (manda) ═══
${escena}

═══ REFERENCIAS ADJUNTAS ═══
${adjuntos}

═══ LOOK ═══
- Foto de celular real: gran angular de teléfono, encuadre apenas torcido e imperfecto, exposición automática, cielo algo quemado, leve ruido digital, nitidez de teléfono. NADA de look de cine, de póster ni de render de videojuego.
- Escala creíble: el objeto gigante proyecta sombras sobre la ciudad y recibe la misma luz que todo lo demás; se integra a la ciudad, no parece pegado.
- Ciudad real y cotidiana: colectivos, taxis negros con techo amarillo, veredas, árboles, cables, gente común abrigada de entretiempo.

═══ FORMATO ═══
VERTICAL 9:16, más alto que ancho. Dejá aire arriba y abajo.

SIN TEXTO LEGIBLE en ninguna parte: carteles, pantallas vecinas y marquesinas en blanco o desenfocados, patentes ilegibles, sin títulos, sin marcadores, sin watermarks. No inventes marcas ni sponsors además de los de la referencia.`;

const CAMISETA = `La camiseta es EXACTAMENTE la del adjunto "detalle-k1": NEGRA con textura fina, cuello en V y guarda de laureles dorados en el cuello y en los puños, vivos dorados finos en los hombros. Mirándola de frente: el escudo espía dorado del adjunto "Clean logo Dorado" a la DERECHA del que mira, el swoosh dorado de Nike a la IZQUIERDA del que mira. SIN número al frente, SIN sponsor, SIN ningún otro texto.`;
const REF_CAMISETA = `- "detalle-k1": la camiseta real del club (solo como referencia de la prenda, no de la persona).\n- "Clean logo Dorado": el escudo real del club, un espía con sombrero y anteojos. Copialo tal cual, nunca otro.`;
const REF_ESCUDO = `- "Clean logo Dorado": el escudo real del club, un espía con sombrero y anteojos. Copialo tal cual, nunca otro.`;

// vel < 1 = cámara lenta del clip de Canva; se usa solo la parte buena de los 5 s.
const TOMAS = [
  { id: '1-obelisco', adjuntos: [KIT, ESCUDO], ref: REF_CAMISETA,
    escena: `Toma desde la vereda en la Avenida 9 de Julio, a la mañana temprano con luz dorada y cielo celeste. El Obelisco de Buenos Aires real (aguja blanca de cuatro caras, con su punta piramidal) ocupa el centro, de abajo hacia arriba, en contrapicado de teléfono. El Obelisco tiene PUESTA una camiseta de fútbol de tela real, de varios pisos de alto, envolviendo su tercio medio como si fuera su torso: tela tensada con pliegues enormes, mangas cortas colgando a los costados que se mueven con el viento, sombra de la tela sobre el monumento, sogas y andamios de montaje visibles, operarios diminutos que dan la escala. ${CAMISETA} La punta blanca del Obelisco asoma por arriba del cuello y la base queda a la vista abajo. En primer plano, abajo y fuera de foco, dos peatones de espaldas levantan el celular para filmarla; autos parados en la avenida.`,
    movimiento: 'Cámara en mano de un peatón que filma: leve subida hacia la punta del Obelisco. La tela gigante ondea muy apenas con el viento. Los autos avanzan lentos.' },
  { id: '2-escudo', adjuntos: [ESCUDO], ref: REF_ESCUDO,
    escena: `Toma desde la vereda de una avenida del centro de Buenos Aires, al mediodía con sol fuerte, mirando en contrapicado la fachada de un edificio alto de oficinas. Sobre toda la fachada, de la planta 4 a la planta 25, sale un ESCUDO GIGANTE tridimensional del espía del club, de metal dorado cepillado, con volumen real: el sombrero sobresale varios metros sobre la vereda y proyecta una sombra enorme sobre el edificio y sobre la calle. Se ven los anclajes de acero, las ventanas tapadas y las de alrededor reflejando el dorado. El escudo es MACIZO, relleno de punta a punta, como una sola pieza de metal dorado igual a la silueta rellena del adjunto: sombrero, anteojos y solapas son superficies doradas llenas, NUNCA un contorno hueco ni un marco de tubos por donde se vea el edificio. Sin letras. Abajo, chiquitos, peatones detenidos mirando hacia arriba, un colectivo pasando.`,
    movimiento: 'Cámara en mano de un peatón: lento paneo hacia arriba siguiendo el escudo dorado. Los reflejos del sol se deslizan sobre el metal.' },
  { id: '3-pelota', adjuntos: [ESCUDO], ref: REF_ESCUDO,
    escena: `Toma desde el cantero central de la Avenida 9 de Julio de Buenos Aires, a la tarde con luz baja de atardecer. Por el medio de la avenida viene rodando hacia la cámara una PELOTA DE FÚTBOL GIGANTE, de unos doce metros de alto, negra con paneles dorados y el escudo espía impreso en un panel, grande y RELLENO de dorado macizo, igual a la silueta llena del adjunto (sombrero, anteojos y solapas doradas llenas, nunca solo el contorno). Tiene peso real: aplasta y deforma apenas el asfalto, levanta polvo, proyecta una sombra larga. Los autos, taxis y colectivos están frenados a los costados, esquivándola; un conductor sacó la cabeza por la ventanilla. El Obelisco se ve lejos al fondo, sin camiseta. Gente en el cantero, de espaldas, filmando con el celular.`,
    movimiento: 'La pelota gigante rueda lentamente hacia la cámara por la avenida, girando sobre sí misma. Cámara en mano que retrocede apenas. Sube un poco de polvo del asfalto.' },
  { id: '4-pantalla', adjuntos: [ESCUDO, path.join(ROOT, `Renders/T4-Frentes/${NUEVE}.png`)],
    ref: `- "Clean logo Dorado": el escudo real del club.\n- El render es nuestro delantero, el jugador real de la pantalla:\n${playerIdentityLine(NUEVE)}\nRespetá su cara y su pelo tal cual el render.`,
    escena: `Toma desde la vereda de una esquina del centro de Buenos Aires, de noche, con el asfalto mojado reflejando las luces. En la esquina de un edificio hay una PANTALLA LED CURVA de 40 metros de alto, de las que hacen un efecto de profundidad. En la pantalla, enorme, la cara y los hombros del jugador del render con la camiseta negra del club y el escudo dorado, mirando hacia abajo a la gente y con el marco de la pantalla como si estuviera asomándose. Se notan los píxeles LED de cerca, y su luz cálida ilumina el asfalto y a los peatones. En primer plano, una persona detenida de espaldas filma con el celular levantado. Las otras pantallas y carteles de la cuadra están apagados o desenfocados.`,
    movimiento: 'Cámara en mano de un peatón que filma: acercamiento lento hacia la pantalla. Las luces de los autos pasan y se reflejan en el asfalto mojado. El jugador de la pantalla no se mueve.' },
  { id: '5-gente', adjuntos: [KIT, ESCUDO], ref: REF_CAMISETA,
    escena: `Vereda ancha de la Avenida 9 de Julio a la mañana: una decena de peatones de distintas edades se quedaron frenados, de espaldas a cámara, todos con el celular levantado filmando hacia el fondo. Lejos, al fondo y centrado, ocupando un tercio del alto, el Obelisco de Buenos Aires con la camiseta gigante puesta en su tercio medio. ${CAMISETA} Mucho cielo celeste. Un señor con bolsas y un pibe con mochila miran con la boca cerrada.`,
    movimiento: 'La cámara se aleja hacia atrás lentamente, cámara en mano. La ciudad queda cada vez más lejos.' },
];

fs.mkdirSync(DIR, { recursive: true });
log('Imágenes (ChatGPT)…');
const imgs = {};
try {
  for (const t of TOMAS) {
    imgs[t.id] = await generarImagen({ id: t.id, carpeta: DIR, vertical: true, adjuntos: t.adjuntos, promptCompleto: pedido(t.escena, t.ref) });
    log(`  ${t.id} ✓`);
  }
} finally { await cerrar(); }
if (flag('--solo-imagenes')) { log('Listo (solo imágenes).'); process.exit(0); }

log('Clips (Canva imagen a video)…');
const clips = {};
for (const t of TOMAS) {
  const c = cuadros(animar(imgs[t.id], t.movimiento));
  clips[t.id] = { ...c, dir: archivo(c.dir) };
  log(`  ${t.id} ✓ (${c.n} cuadros)`);
}
if (flag('--solo-clips')) { log('Listo (solo clips).'); process.exit(0); }

// Cómo se usa cada toma: velocidad del clip, zoom, reflejo de sol y encuadre.
const PLANO = {
  '1-obelisco': { vel: 0.6, zoom: [1.1, 1.07], origen: '50% 6%', sinFoco: true, sol: [1120, 120], solFuerza: 0.5 },
  // El sol quemado tapa además el óvalo blanco en que Canva convierte la farola de arriba a la izquierda.
  '2-escudo': { desde: 26, vel: 0.7, zoom: [1.07, 1.11], sol: [190, 270], solFuerza: 1 },
  // Lenta: pesa más, y no llega al tramo en que a Canva le crece una placa con el escudo arriba de la pelota.
  '3-pelota': { vel: 0.45, zoom: [1.07, 1.12], sol: [120, 960], solFuerza: 0.4 },
  '4-pantalla': { vel: 0.6, zoom: [1.07, 1.13], noche: true, fuerza: 0.85, tag: `<b>${NUEVE}</b>`, tagY: 1420 },
  '5-gente': { vel: 0.7, zoom: [1.42, 1.06], ease: true, sol: [1180, 60], solFuerza: 0.45, fuerza: 0.8 },
};
const GANCHO_Y = 990,PORTADA_FOCO = '50% 30%';
const MEDIO = 'imágenes con ChatGPT, animadas con Canva, y cámara de celular por código encima';

// ── Música: el tramo más fuerte del tema, con los cortes de las tomas sobre el pulso ──
const ID = 'viral-jue-obelisco-2026-11-09';
const musica = await elegirMusica(ID);
const tema = infoTema(musica).titulo;
function pulsoDelTema(mp3, largo) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', mp3, '-ac', '1', '-ar', '11025', '-f', 's16le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  const pcm = new Int16Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 1);
  const P = 110, en = new Float32Array(Math.floor(pcm.length / P));   // energía cada 10 ms
  for (let i = 0; i < en.length; i++) { let s = 0; for (let j = 0; j < P; j++) s += Math.abs(pcm[i * P + j]); en[i] = s / P; }
  const flujo = en.map((v, i) => i ? Math.max(0, v - en[i - 1]) : 0);
  // Tramo más fuerte
  const V = Math.round(largo * 100);
  let suma = 0, mejor = -1, desde = 0;
  for (let i = 0; i < en.length; i++) { suma += en[i]; if (i >= V) suma -= en[i - V]; if (i >= V && suma > mejor) { mejor = suma; desde = i - V + 1; } }
  // Tempo por autocorrelación del tramo (70–170 BPM) y fase del primer golpe fuerte
  const a = flujo.subarray(desde, desde + V);
  let lag = 60, top = -1;
  for (let l = 35; l <= 86; l++) { let c = 0; for (let i = l; i < a.length; i++) c += a[i] * a[i - l]; if (c > top) { top = c; lag = l; } }
  let fase = 0, fTop = -1;
  for (let f = 0; f < lag; f++) { let c = 0; for (let i = f; i < a.length; i += lag) c += a[i]; if (c > fTop) { fTop = c; fase = f; } }
  return { beat: lag / 100, inicio: (desde + fase) / 100 };
}
const { beat: B, inicio: musicaDesde } = pulsoDelTema(musica, 19);
log(`Tema: ${tema} · beat ${B.toFixed(2)} s (${Math.round(60 / B)} BPM) · desde ${musicaDesde.toFixed(2)} s`);
const aBeats = s => Math.max(1, Math.round(s / B)) * B;

const DUR = [3.2, 2.4, 2.8, 2.8, 3.1].map(aBeats);
const tomas = TOMAS.map((t, i) => ({ dur: DUR[i], clip: clips[t.id], foto: archivo(imgs[t.id]), ...PLANO[t.id] }));
const durRemate = 3.7;
const datos = {
  tomas, escudo: archivo(ESCUDO),
  gancho: { texto: 'Amanecimos así<br>en Buenos Aires.', y: GANCHO_Y, hasta: DUR[0] - 0.2 },
  remate: ['Todavía no.', 'Pero estamos en eso.'], tiemposRemate: [0.3, 1.15, 2.05],
};
const escenas = [...DUR.map((dur, n) => ({ n, dur })), { n: DUR.length, dur: durRemate }];
const finTomas = DUR.reduce((s, d) => s + d, 0), total = finTomas + durRemate;
log(`Guion: ${total.toFixed(1)} s · ${DUR.map(d => d.toFixed(1)).join(' + ')} + ${durRemate}`);

if (flag('--cuadros')) {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto(archivo(path.join(ROOT, 'scripts/social/plantillas/obelisco.html')));
  await p.evaluate(d => pintar(d), datos);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  const lista = [];
  DUR.forEach((d, n) => lista.push([n, 0.03], [n, d * 0.5], [n, d - 0.05]));
  lista.push([DUR.length, 0.8], [DUR.length, 3.4]);
  const comp = [];
  for (const [i, [n, t]] of lista.entries()) {
    await p.evaluate(([n, t]) => mostrar(n, t), [n, t]);
    const buf = await p.locator('#lienzo').screenshot({ type: 'jpeg', quality: 80 });
    comp.push({ input: await sharp(buf).resize(270, 480).toBuffer(), left: (i % 6) * 270, top: Math.floor(i / 6) * 480 });
  }
  await b.close();
  await sharp({ create: { width: 1620, height: Math.ceil(lista.length / 6) * 480, channels: 3, background: '#000' } }).composite(comp).jpeg({ quality: 84 }).toFile(path.join(DIR, 'hoja.jpg'));
  log('Hoja en ' + path.join(DIR, 'hoja.jpg'));
  process.exit(0);
}

// ── Sonido de ciudad sintetizado (no hay ninguno en el repo): rumor de tránsito, aire y bocinas lejanas, que se cortan
//    en seco con el negro. Va bajo la música; en el remate la música queda sola. ──
function conCiudad(entra, sale) {
  const horn = (t, f1, f2, d, vol) => `aevalsrc=0.25*(sgn(sin(2*PI*${f1}*t))+sgn(sin(2*PI*${f2}*t))):d=${d}:s=48000,lowpass=f=1900,highpass=f=280,afade=t=in:d=0.02,afade=t=out:st=${(d - 0.06).toFixed(2)}:d=0.06,aecho=0.8:0.6:190|330:0.28|0.14,volume=${vol},adelay=${Math.round(t * 1000)}:all=1`;
  const t2 = DUR[0], t3 = t2 + DUR[1];
  const fil = [
    `anoisesrc=d=${total.toFixed(2)}:c=brown:a=0.9:r=48000,lowpass=f=380,highpass=f=45,tremolo=f=0.27:d=0.3,volume=0.42[rumor]`,
    `anoisesrc=d=${total.toFixed(2)}:c=pink:a=0.7:r=48000,highpass=f=700,lowpass=f=4200,tremolo=f=0.41:d=0.55,volume=0.05[aire]`,
    `${horn(1.1, 415, 520, 0.4, 0.10)}[b1]`,
    `${horn(t2 + 0.7, 370, 466, 0.25, 0.07)}[b2]`,
    `${horn(t3 + 0.5, 440, 554, 0.55, 0.12)}[b3]`,
    `${horn(t3 + 1.25, 440, 554, 0.18, 0.09)}[b4]`,
    `[rumor][aire][b1][b2][b3][b4]amix=inputs=6:normalize=0:duration=first,atrim=0:${finTomas.toFixed(3)},afade=t=out:st=${(finTomas - 0.03).toFixed(3)}:d=0.03,apad,aformat=channel_layouts=stereo[ciudad]`,
    `[0:a]aresample=48000,aformat=channel_layouts=stereo,volume='if(lt(t,${finTomas.toFixed(3)}),0.62,1)':eval=frame[mu]`,
    `[mu][ciudad]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]`,
  ].join(';');
  const r = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', entra, '-filter_complex', fil, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', sale], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('ffmpeg (ciudad): ' + (r.stderr || '').slice(-600));
}

const base = path.join(DIR, 'obelisco-base.mp4'), conSonido = path.join(DIR, 'obelisco-ciudad.mp4'), mp4 = path.join(DIR, 'obelisco.mp4'), jpg = path.join(DIR, 'obelisco-portada.jpg');
if (!flag('--sin-render')) {
  log('Render…');
  await video('obelisco.html', datos, base, { escenas, fps: 60, desenfoque: true, musica, musicaDesde });
}
conCiudad(base, conSonido);
await portada({ imagen: imgs['1-obelisco'], kicker: 'BUENOS AIRES', titulo: 'Amanecimos *así*', foco: PORTADA_FOCO }, jpg);
conPortada(conSonido, jpg, mp4);
if (flag('--sin-lote')) { log('Listo (sin lote): ' + mp4); process.exit(0); }

// ── Lote ──
const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media';
await putFile(mp4, 'social/viral/obelisco.mp4');
const uVid = `${MEDIA}/social/viral/obelisco.mp4?v=${Date.now().toString(36)}`;
const uPortada = await subirPortada(jpg, 'social/viral/obelisco-portada.jpg');
const desc = `${Math.round(total)} s · sin voz (pieza visual, como pide el guion): música y sonido de ciudad · ${MEDIO} · música: ${tema}. El texto del guion ("¿Dónde la pondrías vos?") se reescribió por doble sentido (regla de Juan).`;
const P = o => ({ decision: 'pendiente', protagonistas: [NUEVE], descripcion: desc, musica: tema, media: [{ tipo: 'video', url: uVid, vertical: true }], local: { video: mp4 }, portada: { url: uPortada, local: jpg }, ...o });
const lote = {
  id: ID, tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-11-09', pieza: 'jue-obelisco' },
  titulo: 'La camiseta gigante en el Obelisco', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · La camiseta en el Obelisco', metodo: 'ig-reel',
      texto: `Amanecimos así en Buenos Aires.\n\nTodavía no es real: está hecho por computadora, con la camiseta de verdad y ${NUEVE}, nuestro 9, en la pantalla. Pero estamos en eso.\n\n¿En qué edificio de tu ciudad la colgarías?\n\n#TopSecretFC #ProClubs #EAFC` }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · La camiseta en el Obelisco', metodo: 'tiktok',
      texto: `Todavía no es real, es por computadora. Pero estamos en eso. ¿Dónde colgarías la camiseta? El de la pantalla es ${NUEVE}. #TopSecretFC #ProClubs #EAFC #BuenosAires` }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · La camiseta en el Obelisco', metodo: 'youtube',
      titulo: 'Una camiseta gigante en el Obelisco: todavía no | Top Secret FC, Pro Clubs',
      texto: `Hecho por computadora: la camiseta y el escudo son los nuestros, lo gigante todavía no. El de la pantalla de 40 metros es ${NUEVE}. #Shorts #ProClubs #EAFC` }),
    P({ id: 'x-video', red: 'x', formato: 'Video · La camiseta en el Obelisco', metodo: 'x-video',
      texto: `Una camiseta de varios pisos en el Obelisco y ${NUEVE} en una pantalla de 40 metros. Todavía no es real, es por computadora. Pero estamos en eso. #TopSecretFC` }),
  ],
};
// El crédito del tema lo agrega agregarLote: se revisa el texto tal como va a salir.
let avisos = 0;
for (const p of lote.piezas) {
  const final = { ...p, texto: `${p.texto}\n\n${creditoTexto(p.musica)}` };
  for (const r of revisarPieza(final, lote)) { avisos++; log(`  aviso ${p.id}: ${r.msg}`); }
}
if (avisos) throw new Error(`${avisos} avisos del revisor: corregir antes de cargar el lote.`);
await agregarLote(lote);
log('Listo: ' + uVid);
