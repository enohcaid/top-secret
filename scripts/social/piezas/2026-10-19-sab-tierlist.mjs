#!/usr/bin/env node
// "Tier list: nuestras camisetas" (idea sab-tierlist del guion viral-guiones-2026-10-19). Pedido de Juan (2026-10-14):
// el orden lo propone el club, y las camisetas viejas se rehacen para que se vean bien y con el escudo que tenía el
// club en ese momento. En el juego, las de la T1 y la T2 eran kits base de EA (la T2 hasta tenía el escudo del
// Aberdeen); hasta la T3 el escudo del club era el sello circular con el espía sonriente, y desde la T4 es el espía
// "clean" (dorado; blanco en el arquero). Cada camiseta = foto de producto nueva con ChatGPT a partir de su render.
// Sin voz: el ritmo lo marca la música (cada camiseta cae con un golpe).
//
//   node scripts/social/piezas/2026-10-19-sab-tierlist.mjs   [--solo-imagenes]
import fs from 'fs';
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { putFile } from '../../lib/r2.mjs';
import { elegirMusica } from '../../lib/musica.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { carrusel, video, archivo, dropDelTema } from '../lib/render.mjs';
import { agregarLote } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const DIR = path.join(ROOT, 'fuentes/redes/viral/sab-tierlist');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [tierlist] ${m}`);
const SELLO = path.join(ROOT, 'logos/TOP Secret Logo.png');          // T1-T2: sello circular metálico
const SELLO_B = path.join(ROOT, 'logos/TOP Secret White.png');        // T3: sello circular blanco (como en sus kits)
const CLEAN = path.join(ROOT, 'logos/rebrand/Clean logo Dorado.png'); // T4
const CLEAN_B = path.join(ROOT, 'logos/rebrand/Clean logo.png');      // T4 arquero: clean blanco
// Orden propuesto (Juan lo puede cambiar en el visto bueno final): fila → camisetas, en el orden en que caen.
const KITS = [
  { id: 't1', nombre: 'Titular · Temporada 1', escudo: SELLO, fila: 'C', nota: 'El sponsor del frente dice "TeamViewer", escrito correctamente y nítido.' },
  { id: 't2b', nombre: 'Alternativa · Temporada 2', escudo: SELLO, fila: 'C' },
  { id: 't3c', nombre: 'Tercera · Temporada 3', escudo: SELLO_B, fila: 'B' },
  { id: 't3b', nombre: 'Alternativa · Temporada 3', escudo: SELLO_B, fila: 'B' },
  { id: 't4b', nombre: 'Alternativa · Temporada 4', escudo: CLEAN, fila: 'A' },
  { id: 't3', nombre: 'Titular · Temporada 3', escudo: SELLO_B, fila: 'A' },
  { id: 't4gk', nombre: 'Arquero · Temporada 4', escudo: CLEAN_B, fila: 'A' },
  { id: 't2', nombre: 'Titular · Temporada 2', escudo: SELLO, fila: 'S' },
  { id: 't4', nombre: 'Titular · Temporada 4', escudo: CLEAN, fila: 'S' },
];
const pedido = k => `Foto de PRODUCTO de estudio para el catálogo de camisetas de Top Secret FC, club argentino de fútbol virtual.

SOLO LA CAMISETA, sin persona (efecto maniquí invisible), de frente, centrada, ocupando el 75% del alto. Fondo negro liso de estudio, luz suave lateral que muestra la textura de la tela, sombra muy leve. Formato vertical 4:5.

DISEÑO: reproducí EXACTAMENTE la camiseta que viste el jugador del adjunto "ref-${k.id}.png" (colores, cortes, cuello, mangas, vivos, estampados, marca deportiva y sponsor del frente, tal cual). Es la ${k.nombre.toLowerCase()} del club. Mangas ${k.id === 't3' || k.id === 't3b' || k.id === 't3c' || k.id === 't2b' ? 'tal como en la referencia' : 'largas o cortas tal como en la referencia'}.
ESCUDO: en el pecho (lado del corazón) va el escudo del adjunto "${path.basename(k.escudo)}", bordado y nítido, del tamaño de un escudo real. Es el ÚNICO escudo de la camiseta: si la referencia tiene otro escudo, estrellas o insignias de otro club, se reemplazan por este.

SIN brazalete de capitán ni parches de competición en las mangas.${k.nota ? '\n' + k.nota : ''}

Calidad de foto de tienda oficial de un club grande de Europa. SIN TEXTO alrededor, sin etiquetas, sin marcas de agua.`;

fs.mkdirSync(DIR, { recursive: true });
log('Camisetas (ChatGPT)…');
const fotos = {};
for (const k of KITS) {
  fotos[k.id] = await generarImagen({ id: `kit-${k.id}`, vertical: false, carpeta: DIR, adjuntos: [path.join(DIR, `ref-${k.id}.png`), k.escudo], promptCompleto: pedido(k) });
  log(`  ${k.id} ✓`);
}
await cerrar();
if (process.argv.includes('--solo-imagenes')) { log('Listo (solo imágenes).'); process.exit(0); }

const musica = elegirMusica('viral-tierlist-camisetas', { preferida: process.env.TEMA || undefined });
const tema = dropDelTema(musica) || { drop: 0, bpm: 130 };
const B = 60 / tema.bpm;
const datos = {
  titulo: 'Rankeamos nuestras camisetas', sub: 'Alguien se va a enojar', bpm: tema.bpm,
  escudo: archivo(CLEAN), filas: ['S', 'A', 'B', 'C'],
  kits: KITS.map(k => ({ ...k, escudo: undefined, img: archivo(fotos[k.id]) })),
  pregunta: '¿Vos cuál ponés arriba?<br><b>Comentalo.</b>',
};
// Arranque 4 tiempos, una camiseta cada 4 tiempos, suspenso de 6 antes de la fila S, cierre de 8.
const inicio = 4 * B, paso = 4 * B, suspenso = 6 * B;
let t = inicio;
datos.kits.forEach((k, i) => { if (k.fila === 'S' && datos.kits[i - 1]?.fila !== 'S') { datos.suspensoEn = t; t += suspenso; } k.t = t; t += paso; });
datos.finEn = t;
const total = t + 8 * B;
const mp4 = path.join(ROOT, 'fuentes/redes/viral/tierlist-camisetas.mp4');
log(`Render (${total.toFixed(1)} s, ${path.basename(musica)})…`);
// El drop del tema cae con la primera camiseta de la fila S
await video('tierlist.html', datos, mp4, { escenas: [{ n: 0, dur: total }], fps: 60, desenfoque: true, musica,
  musicaDesde: Math.max(0, tema.drop - datos.kits.find(k => k.fila === 'S').t) });
const slides = await carrusel('tierlist.html', { ...datos, carrusel: true }, DIR, 'tierlist');

const MEDIA = 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media', v = Date.now().toString(36);
const subir = async f => { const key = `social/viral/${path.basename(f)}`; await putFile(f, key); return `${MEDIA}/${key}?v=${v}`; };
const uVid = await subir(mp4), uSl = []; for (const s of slides) uSl.push(await subir(s));
const vid = [{ tipo: 'video', url: uVid, vertical: true }];
const desc = `${Math.round(total)} s · 9 camisetas rehechas con el escudo de su época · sin voz (musical) · música: ${path.basename(musica, '.mp3').replace(/^[\d-]+ - /, '')}`;
const P = o => ({ decision: 'pendiente', protagonistas: [], ...o });
const lote = {
  id: 'viral-sab-tierlist-2026-10-19', tipo: 'viral', creado: new Date().toISOString(), idea: { lote: 'viral-guiones-2026-10-19', pieza: 'sab-tierlist' },
  titulo: 'Tier list: nuestras camisetas', piezas: [
    P({ id: 'ig-reel', red: 'instagram', formato: 'Reel · tier list', descripcion: desc, media: vid, metodo: 'ig-reel', local: { video: mp4 },
      texto: 'Rankeamos nuestras camisetas de las 4 temporadas. Alguien se va a enojar.\n\n¿Coincidís con la S? Comentá la tuya.\n\n#TopSecretFC #ProClubs #EAFC' }),
    P({ id: 'tiktok', red: 'tiktok', formato: 'Video · tier list', descripcion: desc, media: vid, metodo: 'tiktok', local: { video: mp4 },
      texto: 'Tier list de nuestras camisetas. ¿Cuál ponés en la S? #TopSecretFC #ProClubs #EAFC #tierlist' }),
    P({ id: 'yt-short', red: 'youtube', formato: 'Short · tier list', descripcion: desc, media: vid, metodo: 'youtube', local: { video: mp4 },
      titulo: 'Tier list de nuestras camisetas de Pro Clubs | EA FC', texto: 'Las camisetas de nuestras 4 temporadas, de la C a la S. ¿Coincidís? #Shorts #ProClubs #EAFC' }),
    P({ id: 'ig-carrusel', red: 'instagram', formato: 'Carrusel · tier list', descripcion: 'El tablero final + las camisetas rehechas', media: uSl.map(url => ({ tipo: 'imagen', url })), metodo: 'ig-carrusel',
      texto: 'Las camisetas de nuestras 4 temporadas, rehechas y con el escudo de cada época.\n\nEste es nuestro orden. ¿Cuál ponés arriba?\n\n#TopSecretFC #ProClubs #EAFC #tierlist' }),
  ],
};
for (const p of lote.piezas) for (const r of revisarPieza(p, lote)) log(`  aviso ${p.id}: ${r.msg}`);
await agregarLote(lote);
log('Listo: ' + uVid);
