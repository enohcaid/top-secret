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
//   node scripts/social/piezas/guiones-2026-11-23.mjs --actualizar → reemplaza solo las ideas pendientes (respeta las decididas)
import { agregarLote, PAGINA } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const idea = (id, formato, guion) => ({ id, red: 'plan', formato, guion: { ...guion, texto: `${guion.texto} #TopSecretFC` }, decision: 'pendiente', texto: '' });

const lote = {
  id: 'viral-guiones-2026-11-23', tipo: 'viral', etapa: 'guion', creado: new Date().toISOString(),
  semanaHasta: '2026-11-29',
  titulo: 'Guion de la semana · lunes 23 al domingo 29 de noviembre',
  bajada: '6 ideas para 3 turnos (martes, jueves y sábado 14:00). Las fechas son sugeridas: lo aprobado sale en el próximo turno libre. Criterio: rindió lo que reconoce cualquiera que juega Clubs Pro (POV 17 likes, los 6 compañeros 15); lo que habla solo de nosotros quedó en 0',
  piezas: [
    // Juan, 2026-11-18, en aprobar: "El grupo del club" no tenía consonancia con la actividad y no se entendía la
    // dinámica; "Mismo gol, cuatro relatos": no le gustan los relatos. Las dos se reemplazan por ideas que salen de lo
    // que el club hace de verdad (ligas, noches de partidos, el vivo).
    idea('mar-explicado', 'Qué es Clubs Pro, en 30 segundos', {
      cuando: 'Martes 24 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG'],
      gancho: 'Once personas, cada una maneja a un solo jugador. Y hay tabla, ascensos y descensos.',
      escenas: [
        'Una cancha vista desde arriba, vacía. Van apareciendo los once jugadores del club, uno por uno, cada uno con un joystick dibujado al lado: "cada jugador es una persona distinta".',
        'Los once se mueven a la vez en una jugada real de esta temporada, con una línea que une a cada jugador con su joystick: nadie maneja a dos.',
        'La cancha se aleja y queda dentro de una tabla de posiciones: "tres ligas, con fechas, tabla, ascenso y descenso". Las tres ligas con sus escudos.',
        'Un reloj: 22:30 a 00:30, "de lunes a jueves, hasta tres partidos por noche". Cierre con el escudo: "Y todo se transmite en vivo."',
      ],
      texto: 'Once personas, once jugadores, una sola pelota. Así es Clubs Pro y así juega Top Secret: tres ligas, hasta tres partidos por noche.',
      porque: 'La mayoría de la gente que ve un video nuestro no sabe qué es Clubs Pro ni por qué jugamos "partidos" de un videojuego con tabla y ascensos. Es lo que no se entendió del grupo: acá la dinámica es el tema. Sirve para cualquiera que llegue por primera vez, y no repite nada: nunca explicamos qué hacemos.',
      crear: 'Técnica nueva: infografía animada que pasa de una cancha vista desde arriba a una tabla de posiciones, con los renders T4 del plantel como fichas y una jugada real de los videos del vivo. Escudos reales de VPN, VPUG y Espacio Gamer. Voz de Elena, porque explica (unas 60 palabras). Versión carrusel con 5 placas.',
    }),
    idea('jue-partido30', 'Un partido entero en 30 segundos', {
      cuando: 'Jueves 26 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: '90 minutos en 30 segundos. Cuando hay gol, el video frena.',
      escenas: [
        'Un partido real de esta temporada, completo, del pitazo inicial al final, acelerado: los jugadores corren como hormigas y el reloj del juego vuela en una esquina.',
        'Cada vez que hay un gol, el video frena de golpe a velocidad normal, se ve la jugada entera y vuelve a acelerar. El marcador de la esquina se actualiza.',
        'Al final, el resultado grande en pantalla con el escudo del rival y la liga.',
        'Cierre: "Esto es una noche. Esta semana jugamos tres." (o lo que corresponda a esa semana).',
      ],
      texto: 'Un partido entero en 30 segundos. Cuando hay gol, frena. ¿Cuántos contaste?',
      porque: 'Los videos "un partido entero en X segundos" se miran hasta el final porque nunca sabés cuándo viene el próximo frenazo, y se repiten para contar. Es material 100 % nuestro (el partido real, del vivo), así que tiene que ver con lo que hacemos, y no necesita voz ni relato.',
      crear: 'Técnica nueva: cambio de velocidad continuo (de x20 a x1 con rampa suave antes y después de cada gol) sobre la grabación completa del vivo; hay grabaciones de 8 noches de noviembre en fuentes/goles/. Se elige un partido con 2 o 3 goles y un final interesante. Gamertags del gol en pantalla. Sin voz, la música marca los frenazos.',
    }),
    idea('sab-vlog', 'Un día en la vida: noche de triple fecha', {
      cuando: 'Sábado 28 · 14:00',
      redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'Un día en la vida de un jugador de Clubs Pro con triple fecha. La jornada: de 22:30 a 00:30.',
      escenas: [
        'Formato "un día en mi vida", con la hora grande en cada toma. 22:20: el agua, el joystick cargando, la silla acomodada, el audio del equipo abierto.',
        '22:30, primer partido: gol, festejo con el puño. 23:00, segundo: empate, el control apoyado en la frente.',
        '23:30, el tercero: la luz de la tele en la cara, la taza vacía, el último ataque.',
        '00:30: la consola se apaga y la pantalla queda negra. Cierre: "Mañana, otra jornada."',
      ],
      texto: 'Un día en la vida con triple fecha: de 22:30 a 00:30, tres partidos y una taza vacía.',
      porque: 'El "un día en mi vida" es de los formatos que más se ven en todas las redes, no solo en fútbol, y la triple fecha es real: la jugamos tres veces este mes. No es un POV: no ves a través de sus ojos, lo seguís como en un video de alguien. Horarios reales de la jornada (Juan, 2026-11-18: empieza 22:30 y termina 00:30).',
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

if (process.argv.includes('--actualizar')) {
  // Después de las respuestas de Juan en aprobar: las ideas ya decididas (aprobadas, en producción o descartadas)
  // quedan como están; las pendientes se reemplazan por la versión del archivo (sin el comentario ya resuelto); las
  // pendientes que ya no están en el archivo se van. agregarLote() pisaría todo, incluido el estado de producción.
  const { leer, guardarKV } = await import('../lib/aprobaciones.mjs');
  const data = await leer();
  const l = data.lotes.find(x => x.id === lote.id);
  if (!l) throw new Error(`No existe ${lote.id} en aprobar`);
  const decidida = p => p && p.decision && p.decision !== 'pendiente';
  const nuevas = lote.piezas.map(p => { const vieja = l.piezas.find(x => x.id === p.id); return decidida(vieja) ? vieja : p; });
  const sacadas = l.piezas.filter(p => !lote.piezas.some(x => x.id === p.id) && !decidida(p));
  l.piezas = [...nuevas, ...l.piezas.filter(p => !lote.piezas.some(x => x.id === p.id) && decidida(p))];
  l.bajada = lote.bajada; l.titulo = lote.titulo;
  await guardarKV('aprobaciones', data);
  console.log(`Lote ${lote.id} actualizado. Reemplazadas: ${nuevas.filter(p => !decidida(p)).map(p => p.id).join(', ')}. Sacadas: ${sacadas.map(p => p.id).join(', ') || 'ninguna'}. ${PAGINA}`);
} else if (process.argv.includes('--revisar')) {
  for (const p of lote.piezas) {
    const avisos = revisarPieza({ red: 'instagram', metodo: 'ig-reel', formato: 'Reel', protagonistas: [], texto: p.guion.texto }, lote);
    console.log(`${p.id}: ${avisos.length ? JSON.stringify(avisos) : 'ok'}`);
  }
} else {
  await agregarLote(lote);
  console.log(`Lote ${lote.id} cargado (${lote.piezas.length} ideas). ${PAGINA}`);
}
