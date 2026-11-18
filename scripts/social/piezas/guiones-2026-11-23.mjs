#!/usr/bin/env node
// Guion de la semana del lunes 23 al domingo 29/11 (Juan, 2026-11-18: "tenemos que hacer contenido viral para la
// próxima semana"). Del guion anterior (9 al 22/11) la última pieza, "Una pelota, todo el plantel, sin cortes", sale
// el jueves 19: para esta semana no había nada. Turnos: martes 24, jueves 26 y sábado 28 a las 14:00. Van 6 ideas
// para 3 turnos, para que Juan elija.
//
// Criterio (único dato: likes de Instagram, metricas.mjs al 18/11):
//   mejor: POV arquero 17 · los 6 compañeros 15 · Obelisco 8 · la noche triple 6
//   peor: reacción 0 · tier list 0 · gorra 0 · resúmenes de quincena/semana 0
//   → rinde lo que reconoce cualquiera que juega Clubs Pro (y se manda por privado); lo que habla solo de nosotros, no.
// No se repite ningún concepto ya usado (POV, tipos de compañeros, imposible gigante, plano secuencia, ¿dónde está la
// pelota?, pizarra, tier list, reacción, silueta, glow-up, Cabeza fría) ni lo descartado del guion anterior (el caso
// de investigación, la carrera de goleadores, la foto de la IA) — feedback_no_repetir. La música es siempre The Shorts.
//
// Datos reales que se pueden usar: seed_matches.js tiene todo hasta el 17/11. Espacio Gamer terminó su temporada
// regular (19 fechas) con Top Secret 18° (4 G, 4 E, 11 P, 16 pts): por reglamento 17° y 18° van a promoción. La
// fecha de la promoción no está confirmada: ninguna idea la promete.
//
//   node scripts/social/piezas/guiones-2026-11-23.mjs            → carga el lote en aprobar.html
//   node scripts/social/piezas/guiones-2026-11-23.mjs --revisar  → solo pasa los textos por el revisor
import { agregarLote, PAGINA } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const idea = (id, formato, guion) => ({ id, red: 'plan', formato, guion: { ...guion, texto: `${guion.texto} #TopSecretFC` }, decision: 'pendiente', texto: '' });

const lote = {
  id: 'viral-guiones-2026-11-23', tipo: 'viral', etapa: 'guion', creado: new Date().toISOString(),
  semanaHasta: '2026-11-29',
  titulo: 'Guion de la semana · lunes 23 al domingo 29 de noviembre',
  bajada: '6 ideas para 3 turnos (martes, jueves y sábado 14:00). Las fechas son sugeridas: lo aprobado sale en el próximo turno libre. Criterio: rindió lo que reconoce cualquiera que juega Clubs Pro (POV 17 likes, los 6 compañeros 15); lo que habla solo de nosotros quedó en 0',
  piezas: [
    idea('mar-grupo', 'El grupo del club a las 22:59 y a las 00:30', {
      cuando: 'Martes 24 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG'],
      gancho: 'El grupo del equipo a las 22:59. Y el mismo grupo a las 00:30.',
      escenas: [
        'Pantalla de un chat grupal inventado ("Los de los martes"), en un celular sobre la mesa. 22:59: todos confirman, stickers de fuego, "hoy salimos a ganar", "tengo la táctica".',
        'La cámara entra en la pantalla. Los mensajes caen al ritmo de la música, cada vez más rápido: "¿quién está?", "me sale error", "esperen que actualiza".',
        'Corte a negro con el reloj: 00:30. El mismo grupo: un audio de 4 minutos sin escuchar, "yo avisé", "mañana no puedo", y uno que escribe "¿una más?".',
        'Remate: el último mensaje queda "visto por 10". Cierre: "Mandáselo al grupo. Sin decir nada."',
      ],
      texto: 'El grupo a las 22:59 y el mismo grupo a las 00:30. Mandáselo al tuyo y no digas nada.',
      porque: 'Lo que más rindió es lo que reconoce cualquiera que juega Clubs Pro y se manda por privado (los 6 compañeros, 15 likes). Acá el que lo recibe es justamente el grupo del equipo, y no hace falta conocernos. No repite los tipos de compañeros: no hay personajes, la historia la cuenta el chat.',
      crear: 'Técnica nueva: chat animado por código, con mensajes que entran al pulso, escritura en vivo ("escribiendo…"), stickers y un audio con su onda; la cámara se mete y sale de la pantalla del celular. Chat genérico, sin imitar la interfaz de ninguna app real. Nombres inventados, ningún gamertag del plantel. Sin voz: se lee. Versión carrusel con 6 capturas del chat.',
    }),
    idea('jue-relatos', 'Mismo gol, cuatro relatos', {
      cuando: 'Jueves 26 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'Un gol nuestro, contado cuatro veces. El último no lo vas a poder escuchar sin reírte.',
      escenas: [
        'Un gol real de Top Secret de esta temporada, entero, una vez y sin relato.',
        'Vuelve a empezar con un relator de radio argentino, a los gritos, con el estiramiento del "gol" hasta que no le da el aire.',
        'Otra vez, ahora con una narradora de documental de naturaleza, en voz baja: "el delantero acecha, paciente, a su presa".',
        'Otra vez, con un comentarista en inglés muy serio. Y la última con alguien que lo cuenta como un susurro de ASMR, pegado al micrófono.',
        'Cierre: "¿Con cuál te quedás?"',
      ],
      texto: 'Mismo gol, cuatro relatos. ¿Con cuál te quedás? Contestá con el número.',
      porque: 'El formato de "lo mismo, contado de cuatro formas" se mira hasta el final porque cada versión es una sorpresa, y la pregunta del cierre lleva a comentar. Es la única idea de la semana con material real del club: el gol es nuestro, pero no hace falta conocernos para que haga gracia.',
      crear: 'Técnica nueva: cuatro voces distintas sobre el mismo video (las voces neuronales: rioplatense para radio y documental, inglés para el comentarista) con efecto de sonido propio por versión: compresión de radio AM, eco de documental, susurro cerca. El gol se elige mirando los videos del vivo: tiene que ser lindo y verse completo. En la voz, el jugador por su posición; el gamertag va en pantalla. Cuidado con el relato de radio: nada de doble sentido.',
    }),
    idea('sab-vlog', 'Un día en la vida: noche de triple fecha', {
      cuando: 'Sábado 28 · 14:00',
      redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'Un día en la vida de un jugador de Clubs Pro con triple fecha. Empieza a las 22:45.',
      escenas: [
        'Formato "un día en mi vida", con la hora grande en cada toma. 22:45: el agua, el joystick cargando, la silla acomodada. "Hoy dormimos temprano."',
        '23:00, primer partido: gol, festejo con el puño. 23:30, segundo: empate, el control apoyado en la frente.',
        '23:59, el tercero: el reloj de la pared, la luz de la tele en la cara, la taza vacía. 00:50: "una más y me voy".',
        '01:40: el despertador ya puesto para las 7. Cierre: "Mañana es martes otra vez."',
      ],
      texto: 'Un día en la vida con triple fecha: empieza 22:45 y "dormimos temprano". Spoiler: no.',
      porque: 'El "un día en mi vida" es de los formatos que más se ven en todas las redes, no solo en fútbol, y la triple fecha es real: la jugamos tres veces este mes. No es un POV: no ves a través de sus ojos, lo seguís como en un video de alguien.',
      crear: 'Escenas con ChatGPT de un jugador sin cara visible (de espaldas, manos, la tele), siempre el mismo cuarto y la misma luz para que parezca filmado la misma noche. Animadas con Canva imagen a video. Técnica nueva: estética de video de celular vertical (toma en mano, enfoque que busca, hora en pantalla tipo vlog). Voz de Elena en tono de vlog, corta.',
    }),
    idea('alt-humor', 'Tu humor durante un partido, minuto a minuto', {
      cuando: 'Alternativa · próximo turno libre',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG', 'X'],
      gancho: 'Así está tu humor durante un partido de Clubs Pro. El minuto 89 es real.',
      escenas: [
        'Un gráfico de línea, estilo bolsa de valores, que se dibuja de izquierda a derecha con el reloj del partido abajo.',
        'Minuto 1, optimismo total. Minuto 12, te sacan la pelota y la línea cae. Minuto 34, gol nuestro: sube como cohete.',
        'Minuto 60, el compañero que no pasa la pelota: baja de a poco. Minuto 89, gol en contra: la línea atraviesa el piso del gráfico.',
        'Minuto 90+3, empate: vuelve a subir. Cierre: "¿En qué minuto estás vos ahora?"',
      ],
      texto: 'Tu humor durante un partido, minuto a minuto. ¿En qué minuto estás vos?',
      porque: 'Los gráficos que "miden" algo cotidiano con chiste se comparten mucho y se entienden en un segundo. Es un recurso visual que todavía no usamos (gráfico animado con humor, no datos del club), y en carrusel también se guarda.',
      crear: 'Técnica nueva: gráfico animado por código con cámara que sigue la punta de la línea, sonidos en cada subida y caída, y caritas que cambian. Datos inventados y presentados como chiste, sin números del club. Sin voz.',
    }),
    idea('alt-promocion', 'Tráiler: nos jugamos la categoría', {
      cuando: 'Alternativa · cuando la liga confirme la fecha de la promoción',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'En una temporada de 19 fechas, todo se decide en una serie.',
      escenas: [
        'Tráiler de película: negro, un golpe de sonido y títulos grandes. "19 fechas." "4 victorias." "Una serie."',
        'Imágenes reales de la temporada en Espacio Gamer, cada vez más rápidas: el 1-0 del debut, la tijera del 3-3, los festejos.',
        'Silencio. "Promoción." El escudo del rival frente al nuestro.',
        'Cierre con la fecha y la hora reales, y "En vivo por Twitch, Kick, YouTube e Instagram".',
      ],
      texto: 'Terminamos 18° en Espacio Gamer y nos jugamos la categoría en la promoción. Fecha, hora y rival en el video.',
      porque: 'Es para la gente que ya nos sigue (por eso va de alternativa), pero el formato tráiler rinde más que un anuncio común y la situación es real: Top Secret quedó 18° y por reglamento juega la promoción. Sirve para llevar gente al vivo.',
      crear: 'Solo se produce cuando la liga confirme fecha, hora y rival: sin eso no sale. Técnica nueva: montaje de tráiler (cortes al golpe de la música, títulos que llenan la pantalla, silencios). Imágenes de los videos del vivo y del seed. Sin voz o con una sola frase de Elena.',
    }),
    idea('alt-penal', '¿Era penal? El VAR lo decidís vos', {
      cuando: 'Alternativa · próximo turno libre',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'Jugada real, área nuestra, minuto 70. ¿Era penal? Contestá antes de que termine.',
      escenas: [
        'Una jugada real dudosa de esta temporada, a velocidad normal.',
        'Pantalla de "revisión": la misma jugada desde la repetición, en cámara lenta, con la imagen enmarcada como un monitor de VAR.',
        'Cuenta regresiva de 5 segundos con "SÍ" y "NO" en pantalla, y una pausa en negro: "Comentá antes de ver".',
        'Revelación en el último segundo: lo que cobró el juego. Cierre: "¿Acertaste?"',
      ],
      texto: '¿Era penal? Contestá SÍ o NO antes del final. Lo que cobró el juego está en el último segundo.',
      porque: 'Las jugadas polémicas son lo que más se discute en fútbol: cada uno quiere opinar, y los comentarios suben el alcance. Es interactiva como "¿Dónde está la pelota?" pero el juego es otro: no hay que encontrar nada, hay que opinar.',
      crear: 'Necesita una jugada dudosa de verdad en los videos del vivo; si no hay ninguna clara, se descarta. Técnica nueva: marco de monitor de revisión con cámara lenta y cuenta regresiva. La respuesta va al final del video (nada que haya que hacer a mano en las redes). Sin voz.',
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
