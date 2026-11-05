#!/usr/bin/env node
// Guion de las semanas del lunes 9 al domingo 22/11 (Juan, 2026-11-05: "no tenemos contenido viral para las próximas
// semanas para aprobar"). Última pieza viral publicada: 31/10; todos los guiones anteriores ya salieron.
// Turnos: martes, jueves y sábado 14:00. Van 9 ideas para 6 turnos, para que Juan elija.
//
// Criterio (único dato disponible: likes de Instagram, sin alcance ni vistas):
//   mejor: POV 17 · carruseles 4-7 · Cabeza fría #2 6 · silueta 5
//   peor (reel): reacción 0 · tier list 0 · quincena 0
// Lo ya usado no vuelve como secuela con la misma plantilla (feedback_no_repetir). Cada idea suma una técnica
// respecto del piso (feedback_contenido_visual_motion). De las tendencias se toma la estructura, nunca el audio:
// la música es siempre The Shorts (feedback_musica_the_shorts).
//
// seed_matches.js llega hasta el 22/10: ninguna idea promete números de esta temporada posteriores a esa fecha.
//
//   node scripts/social/piezas/guiones-2026-11-09.mjs            → carga el lote en aprobar.html
//   node scripts/social/piezas/guiones-2026-11-09.mjs --revisar  → solo pasa los textos por el revisor
import { agregarLote, PAGINA } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const idea = (id, formato, guion) => ({ id, red: 'plan', formato, guion: { ...guion, texto: `${guion.texto} #TopSecretFC` }, decision: 'pendiente', texto: '' });

const lote = {
  id: 'viral-guiones-2026-11-09', tipo: 'viral', etapa: 'guion', creado: new Date().toISOString(),
  semanaHasta: '2026-11-22',
  titulo: 'Guion de 2 semanas · lunes 9 al domingo 22 de noviembre',
  bajada: '9 ideas para 6 turnos (martes, jueves y sábado 14:00). Las fechas son sugeridas: lo aprobado sale en el próximo turno libre. Lo que no entre pasa a la semana siguiente. Lo que rindió se midió solo con likes de Instagram: es lo único que da la API',
  piezas: [
    idea('mar-companeros', 'Los 6 compañeros que tenés en Clubs Pro', {
      cuando: 'Martes 10 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG'],
      gancho: 'En tu equipo de Clubs Pro hay uno de estos seis. Y si no lo encontrás, sos vos.',
      escenas: [
        'Seis personajes inventados, uno por escena, presentados como un equipo de película: nombre grande que entra de golpe, rasgo en una línea y un remate.',
        'El que pide la pelota a los gritos por audio y nunca la suelta. El central que aparece de nueve en el minuto 90. El que siempre "se trabó". El que discute al árbitro de una partida online.',
        'El que sale a pedir cambio de táctica a los 3 minutos. El que entró a jugar "uno y me voy" y a las dos de la mañana sigue ahí.',
        'Cierre: "¿Cuál sos vos? Mandáselo al de tu equipo."',
      ],
      texto: 'Todos tenemos uno de estos en el equipo. Mandáselo y no digas nada.',
      porque: 'Es la idea pensada para gente que todavía no conoce al club: se entiende sin saber quiénes somos, y mandar un video por privado es la señal que más empuja a cuentas nuevas. Hasta ahora casi todo hablaba de nosotros. Además sale de algo real: el club se comunica por audio.',
      crear: 'Seis personajes nuevos con ChatGPT (ficticios, sin caras ni gamertags del plantel, para no burlarse de nadie). Técnica nueva: presentación tipo créditos de película, con el personaje en capas que se separan del fondo. Voz de Elena, porque cuenta algo. Versión carrusel, una placa por personaje.',
    }),
    idea('jue-obelisco', 'La camiseta gigante en el Obelisco', {
      cuando: 'Jueves 12 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'Amanecimos así en Buenos Aires.',
      escenas: [
        'Toma vertical como de celular, desde la vereda en la 9 de Julio: el Obelisco con una camiseta de Top Secret negra y dorada de varios pisos de alto.',
        'Tres tomas más, cada vez más imposibles: el escudo espía gigante sobre un edificio, una pelota enorme rodando por la avenida entre los autos, la cara del 9 en una pantalla de 40 metros.',
        'La gente de la toma filma con el celular y se detiene. Sin voz, solo música y sonido de ciudad.',
        'Remate: la cámara se aleja, corte a negro, "Todavía no. Pero estamos en eso." y el escudo.',
      ],
      texto: 'Todavía no es real. Estamos en eso. ¿Dónde la pondrías vos?',
      porque: 'Es el formato de los anuncios gigantes imposibles hechos por computadora: frena el dedo en el primer segundo y la gente los comparte preguntando si son reales. El texto y el remate aclaran que es una recreación, así que no engaña a nadie. Nada del club se vio así hasta ahora.',
      crear: 'Cuatro tomas con ChatGPT (con la camiseta y el escudo reales de referencia) animadas con Canva imagen a video. Técnica nueva: imagen de cámara en mano, reflejos, ruido de ciudad y movimiento de celular agregados encima para que parezca filmado. Si Canva no da realismo en la camiseta, se descarta antes de mostrártela.',
    }),
    idea('sab-plano', 'Una pelota, todo el plantel, sin cortes', {
      cuando: 'Sábado 14 · 14:00',
      redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'La pelota no toca el piso. Y no vas a encontrar dónde termina el video.',
      escenas: [
        'Plano secuencia que sigue a la pelota: cada jugador del plantel la recibe y la pasa al siguiente, con su gamertag y dorsal apareciendo en pantalla al pasar.',
        'La cámara gira, se acerca y se aleja sin un solo corte, por una escena oscura con luces doradas.',
        'El último jugador le devuelve la pelota al primero y el video empalma perfecto consigo mismo: vuelve a empezar sin que se note.',
      ],
      texto: 'Una pelota, todo el plantel, sin cortes. ¿En qué vuelta encontraste el empalme?',
      porque: 'El video que se repite solo suma tiempo de reproducción y repeticiones, dos cosas que pesan mucho, y la pregunta del texto invita a verlo otra vez. Presenta al plantel completo sin ser una presentación de plantel.',
      crear: 'Técnica nueva: cámara continua con profundidad real (jugadores y fondo en capas a distinta distancia, 60 fps con desenfoque) y empalme perfecto del último cuadro con el primero. Hacen falta poses de pase de cada jugador: se generan con ChatGPT desde sus renders. Sin voz, cortes de música al pulso.',
    }),
    idea('mar-caso', 'El caso del partido que EA dice que perdimos', {
      cuando: 'Martes 17 · 14:00',
      redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'Según EA perdimos 0-3, sin un solo tiro y con notas de 3. Pero hay un video.',
      escenas: [
        'Tono de investigación: la pantalla con el registro oficial de EA, el 0-3 y las notas, con la cámara recorriendo los datos muy de cerca.',
        '"Hay algo que no cierra." Se van abriendo las pruebas una por una: la hora, el rival, lo que se ve en la transmisión.',
        'La reconstrucción con el video del vivo: 0-1, 1-1, 1-2, 1-3 y el reloj corriendo.',
        'La revelación: el 2-3 sobre el final y la tijera en el descuento. Marcador real 3-3 contra SF Drysdale, en Espacio Gamer.',
        'Cierre: "Para EA, esa tijera nunca pasó."',
      ],
      texto: 'EA dice que perdimos 0-3 sin patear al arco. Lautavester7 y una tijera en el descuento dicen otra cosa. 22 de octubre, Espacio Gamer.',
      porque: 'Las historias de investigación retienen porque el que mira quiere saber cómo termina, y esta es real: sale de nuestra carga de ese partido. La tijera ya salió el 23/10 en el video de la noche, pero acá el gol es el final de otra historia, no la noticia. Va después de El día que nos atajó un bot, con dos semanas y media de distancia.',
      crear: 'Técnica nueva: "tablero de investigación" digital con cámara que viaja entre pruebas, zooms a los datos y el video real entrando como evidencia. Hay que conseguir la captura real del registro de EA de esa noche: sin ella la idea pierde fuerza. Voz de Elena; en la voz, jugadores por su posición.',
    }),
    idea('jue-pelota', '¿Dónde está la pelota?', {
      cuando: 'Jueves 19 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'Borramos la pelota. Si jugás hace años, la encontrás en 5 segundos.',
      escenas: [
        'Cuadro real de una jugada nuestra, congelado y sin la pelota, con cuatro círculos marcados A, B, C y D y una cuenta regresiva.',
        'La cámara se mueve por los jugadores: hacia dónde miran, dónde van, para dar pistas.',
        'Revelación: la pelota aparece, la imagen arranca y se ve cómo terminó la jugada.',
        'Tres rondas, cada una más difícil. Cierre: "¿Cuántas sacaste? Mandáselo al que dice que lo ve todo."',
      ],
      texto: 'Tres jugadas reales, sin la pelota. ¿Cuántas sacaste? Sin mentir.',
      porque: 'El juego clásico de los diarios de fútbol, llevado al video: la gente se queda hasta la revelación, comenta su respuesta y lo manda para desafiar a otro. Y como "¿lo sacás?" ya rindió 5 likes con la silueta, se usa la misma tentación con una mecánica totalmente distinta.',
      crear: 'Técnica nueva: quitar la pelota del cuadro real y pasar de foto congelada a video en el momento de la revelación, siguiendo el movimiento. Las jugadas salen de los videos del vivo. Sin voz: se juega leyendo y hay que dejarle tiempo.',
    }),
    idea('sab-pov2', 'POV: se te cae el internet en la final', {
      cuando: 'Sábado 21 · 14:00',
      redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'POV: minuto 88, empate, vas solo al arco. Y la imagen se traba.',
      escenas: [
        'Primera persona desde el sillón: las manos en el joystick, la tele enfrente, el partido en la pantalla.',
        'Vas mano a mano. La imagen empieza a saltar, la pelota queda quieta y aparece el circulito de carga.',
        'Corrida al router, cable en la mano, luces rojas, el reloj de pantalla avanzando. El audio del equipo se oye cortado: "¿Qué hacés? ¡Pateá!"',
        'Vuelve la imagen justo para ver la pantalla final. Cierre: "Mandáselo al que siempre dice que se le cortó."',
      ],
      texto: 'Minuto 88, mano a mano, y se traba. Todos conocemos a alguien que le pasó justo ahí. Mandáselo.',
      porque: 'Fue el mejor reel del período: el POV del arquero del 24/10 sacó 17 likes, casi tres veces el segundo. Pasarán 4 semanas, cambia la situación por completo y lo que le pasa acá le pasó a cualquiera que jugó online, aunque no sepa quiénes somos.',
      crear: 'No es la plantilla del POV anterior. Técnica nueva: el video dentro del video, con la tele en la escena mostrando el partido y fallas de imagen reales (saltos, bloques, audio cortado) hechas por código y al pulso de la música. Escenas en primera persona con ChatGPT y Canva. Sin voz, la tensión la dan los textos.',
    }),
    idea('alt-pizarra', 'El movimiento que nadie vio', {
      cuando: 'Alternativa · próximo turno libre',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG'],
      gancho: 'Todos miraron el gol. Mirá al que no tenía la pelota.',
      escenas: [
        'Un gol real de esta temporada, a velocidad normal.',
        'Vuelve atrás y se congela: el resto de la imagen se apaga y queda iluminado el jugador sin pelota que abre el espacio.',
        'Flechas y marcas dibujadas sobre el video que siguen a los jugadores; retoma la jugada en cámara lenta.',
        'Cierre: "Guardalo para tu próximo partido."',
      ],
      texto: 'El gol se lo llevan otros, pero la jugada empezó antes. Guardalo para tu próximo partido.',
      porque: 'Enseña una sola idea en pocos segundos, de lo que más se guarda y se manda en fútbol. Le da protagonismo a los que no aparecen en los resúmenes de goles.',
      crear: 'Técnica nueva: dibujos que siguen a los jugadores sobre video real, estilo análisis de televisión. El gol lo elegimos mirando los videos del vivo: tiene que tener un movimiento real, no se inventa. No muestra nada del plan de juego. Voz de Elena; en la voz, jugadores por su posición.',
    }),
    idea('alt-carrera', 'La carrera por ser el máximo goleador', {
      cuando: 'Alternativa · cuando estén cargados todos los partidos',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG', 'X'],
      gancho: 'Se fue arriba en marzo. Lo alcanzaron recién en agosto.',
      escenas: [
        'Barras con la cara de cada goleador que corren desde el primer partido del club, con el almanaque girando y los golpes de la música en cada gol.',
        'Marzo: pelea cuerpo a cuerpo entre Lautavester7 y cansitrGd22_, hasta que cansitrGd22_ toma la punta el 12/3.',
        'Abril: cansitrGd22_ juega su último partido y su cifra queda clavada. Lautavester7 la persigue hasta alcanzarla y pasarla el 10 de agosto, en la misma noche.',
        'Remate con la cifra final, llegando a hoy.',
      ],
      texto: 'De marzo a hoy, partido por partido. Lautavester7 y cansitrGd22_, la pelea por ser el máximo goleador del club.',
      porque: 'Quien mira se queda para ver quién gana, y los cruces son reales: salen de seed_matches.js. Pesa más para quien sigue al club que para el que llega de afuera, por eso va como alternativa. Y no es una tabla de opinión como la tier list.',
      crear: 'Técnica nueva: gráfico de carrera con caras, con sonido en cada gol y cámara que acompaña la punta. Antes hay que cargar los partidos posteriores al 22/10, porque la cifra final tiene que ser exacta. cansitrGd22_ ya no está en el club: fijate si te parece bien que aparezca.',
    }),
    idea('alt-ia', 'Le pedimos a la IA una foto del plantel', {
      cuando: 'Alternativa · próximo turno libre',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG'],
      gancho: 'Le pedimos a la IA una foto del equipo. Salimos 19.',
      escenas: [
        'Se pide la foto y aparece el primer intento: jugadores repetidos, y el conteo en pantalla dice 19.',
        'Segundo intento: dorsales que nadie tiene, pintados en el pecho. Tercero: un escudo inventado. Cada error marcado con un círculo y una broma.',
        'Contraste: al ritmo de la música, intento fallido y foto final, de un lado y del otro.',
        'Cierre con la foto buena y la cantidad real de intentos que hicieron falta.',
      ],
      texto: 'Le pedimos una foto del plantel a la IA. Hubo jugadores de más, dorsales inventados y un escudo que no es el nuestro. Así quedó al final.',
      porque: 'Toma la estructura de "lo de la IA contra lo real", que está corriendo estas semanas, sin usar su audio. Y es verdad: esos errores pasaron cuando hicimos las fotos grupales. Humor sobre nosotros mismos, para cualquiera que haya usado una IA.',
      crear: 'Es tu decisión: esta pieza cuenta en público que nuestras fotos grupales salen de una IA. Si no querés decirlo, descartala. Técnica nueva: pantalla partida al pulso con marcas animadas sobre los errores. Los intentos fallidos no se guardaron: hay que regenerarlos sin las indicaciones que los evitaban.',
    }),
  ],
};

if (process.argv.includes('--revisar')) {
  for (const p of lote.piezas) {
    const avisos = revisarPieza({ red: 'instagram', metodo: 'ig-reel', formato: 'Reel', protagonistas: [], texto: p.guion.texto }, lote);
    console.log(`${p.id}: ${avisos.length ? JSON.stringify(avisos) : 'ok'}`);
  }
} else {
  await agregarLote(lote);
  console.log(`Lote ${lote.id} cargado (${lote.piezas.length} ideas). ${PAGINA}`);
}
