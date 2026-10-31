// Imágenes de la quincena en Espacio Gamer (20/10–29/10/2026), pedido de Juan 2026-10-30: fotos nuevas generadas con
// ChatGPT (16:9 con el sujeto al centro: sirven para YouTube y recortadas a 9:16) y animadas con "Imagen a video" de
// Canva. Las usan las placas del sábado y los dos videos del domingo (quincena-eg.mjs).
//
//   node scripts/social/piezas/quincena-eg-imagenes.mjs            → genera las que falten y las anima
//   node scripts/social/piezas/quincena-eg-imagenes.mjs --sin-animar
// Todo queda en fuentes/redes/quincena-eg/ia/ (cacheado: lo que ya existe no se rehace).
import path from 'path';
import { ROOT } from '../../lib/env.mjs';
import { generarImagen, cerrar } from '../lib/imagen.mjs';
import { animar, cuadros } from '../lib/clip.mjs';

export const DIR_IA = path.join(ROOT, 'fuentes/redes/quincena-eg/ia');
const log = m => console.log(`${new Date().toLocaleTimeString('es-AR')} [quincena-ia] ${m}`);

// Lugares distintos entre sí y de las últimas notas (nada de túnel ni vestuario: Juan, no repetir).
export const ESCENAS = [
  { id: 'apertura', jugadores: [],
    escena: 'Plano general desde lo alto de la tribuna de un estadio enorme de noche, lleno, con los reflectores encendidos. En el círculo central, once jugadores de negro y dorado de espaldas a cámara, abrazados en ronda, chicos en la inmensidad del campo. Lluvia fina brillando en la luz de los reflectores, césped mojado que refleja las luces.',
    movimiento: 'La cámara desciende lentamente desde la tribuna hacia el círculo central; la lluvia cae y brilla en los reflectores.' },
  { id: 'tijera', jugadores: ['Lautavester7'],
    // Sin referencia de la espalda del kit: la toma va DE FRENTE (la primera versión puso el escudo en la espalda, Juan 2026-10-30)
    escena: 'Lautavester7 en el aire en plena chilena (tijera), el cuerpo horizontal y la pierna derecha arriba pegándole a la pelota, dentro del área. La cámara está baja, DETRÁS DEL ARCO, mirando hacia él a través de la red desenfocada en primer plano: lo vemos DE FRENTE, con el PECHO de la camiseta hacia la cámara, donde van el escudo del espía dorado y la pipa de Nike. No se ve su espalda. Reflectores, gotas de lluvia suspendidas. Momento congelado de máxima tensión.',
    movimiento: 'Cámara lenta: la pelota sale despedida hacia el arco y las gotas de lluvia se mueven despacio; la cámara gira apenas alrededor del jugador.' },
  { id: 'descuento', jugadores: ['Cabers14'],
    escena: 'Cabers14 festejando un gol en el último minuto: corre hacia la cámara gritando con los brazos abiertos, la camiseta mojada, venas del cuello marcadas. Detrás, la hinchada desenfocada saltando en la tribuna con bengalas doradas. Plano medio, teleobjetivo, luz de reflectores dura.',
    movimiento: 'Travelling hacia atrás siguiendo al jugador que corre hacia la cámara; las bengalas de la tribuna parpadean al fondo.' },
  { id: 'noche-dura', jugadores: [],
    escena: 'Un jugador de negro y dorado sentado solo sobre el césped, de espaldas a cámara, los antebrazos sobre las rodillas y la cabeza baja, en un estadio que se está vaciando después del partido. Algunas luces de la tribuna ya apagadas, el marcador electrónico apagado al fondo. Plano general, mucho espacio negativo, tono frío y melancólico con un solo reflector dorado encendido.',
    movimiento: 'La cámara se aleja muy despacio; un reflector de la tribuna se apaga al fondo.' },
  { id: 'revancha', jugadores: [],
    escena: 'Primer plano de una pizarra táctica de fútbol en una sala de análisis a oscuras, iluminada por la luz de una pantalla con un partido en pausa. Una mano con muñequera negra y dorada mueve un imán dorado hacia el área rival. En la pizarra, una formación 3-5-2 dibujada con flechas. Sin texto legible.',
    movimiento: 'Acercamiento lento a la pizarra mientras la mano desliza el imán dorado; la luz de la pantalla titila suave.' },
  // Portada y miniatura (Juan, 2026-10-30: en la tijera el escudo y la pipa quedaron en la espalda). Solo foto, sin animar.
  { id: 'portada', jugadores: ['Lautavester7'], soloFoto: true,
    escena: 'Lautavester7 festejando el gol de tijera del empate en el último minuto: se desliza de rodillas sobre el césped mojado hacia la cámara, DE FRENTE, con los brazos abiertos y gritando, salpicando agua. Se le ve el PECHO de la camiseta: el escudo del espía dorado y la pipa de Nike van adelante, en el pecho (la espalda de la camiseta no tiene escudo). Detrás, la tribuna llena desenfocada, reflectores y lluvia. Plano bajo, teleobjetivo, épico.' },
];

export function rutasIA() {
  return Object.fromEntries(ESCENAS.map(e => [e.id, { png: path.join(DIR_IA, `${e.id}.png`), mp4: path.join(DIR_IA, `${e.id}.mp4`) }]));
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  for (const e of ESCENAS) {
    log(`Imagen ${e.id}…`);
    await generarImagen({ id: e.id, escena: e.escena, jugadores: e.jugadores, horizontal: true, carpeta: DIR_IA });
  }
  await cerrar();
  if (!process.argv.includes('--sin-animar')) {
    for (const e of ESCENAS.filter(x => !x.soloFoto)) {
      log(`Animando ${e.id} (Canva)…`);
      const mp4 = animar(path.join(DIR_IA, `${e.id}.png`), e.movimiento);
      cuadros(mp4, 1920);
    }
  }
  log('Listo.');
}
