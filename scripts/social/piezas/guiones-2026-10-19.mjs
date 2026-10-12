#!/usr/bin/env node
// Guion de la semana lunes 19 al domingo 25/10 (pedido de Juan, 2026-10-12): ideas nuevas para aprobar en
// aprobar.html ("Para aprobar" → "Ideas para la próxima semana"). Turnos de contenido viral: martes, jueves y
// sábado 14:00; el martes 20 ya lo ocupa "Mi reacción a…" (idea aprobada la semana pasada), así que quedan
// jueves 22 y sábado 24. Van más ideas que turnos para que Juan elija; lo aprobado que no entre pasa a la
// semana siguiente. Criterio aprendido del lote anterior: Juan descartó los posts de solo texto en X y el meme
// del lunes, y aprobó lo producido (psicología, transformación, reacción, mini-documental).
import { agregarLote, PAGINA } from '../lib/aprobaciones.mjs';

const idea = (id, formato, guion) => ({ id, red: 'plan', formato, guion, decision: 'pendiente', texto: '' });

const lote = {
  id: 'viral-guiones-2026-10-19', tipo: 'viral', etapa: 'guion', creado: new Date().toISOString(),
  semanaHasta: '2026-10-25',
  titulo: 'Guion de la semana · lunes 19 al domingo 25 de octubre',
  bajada: '5 ideas para 2 turnos libres (jueves 22 y sábado 24; el martes 20 ya tiene "Mi reacción a…"). Lo aprobado que no entre pasa a la semana siguiente',
  piezas: [
    idea('jue-psico2', 'Cabeza fría #2: tres partidos en una noche', {
      cuando: 'Jueves 22 · 14:00',
      redes: ['Carrusel IG', 'Reel', 'TikTok', 'Short', 'Álbum FB'],
      gancho: 'Tres partidos en una noche. Así se llega entero al tercero.',
      escenas: [
        'Segunda entrega de la serie, con la misma plantilla que la primera: portada, un hábito por placa con "qué pasa / qué hacer", la prueba real y el cierre "guardalo / mandáselo".',
        'Hábito 1: el minuto entre partidos es para resetear (pararse, tomar agua, respirar lento), no para repasar el partido anterior.',
        'Hábito 2: el resultado de recién no juega el próximo. Ni la goleada ni la derrota.',
        'Hábito 3: una sola consigna por partido, dicha en voz alta antes de arrancar ("presión alta", "paciencia con la pelota").',
        'Prueba real: la triple fecha del lunes 12/10 que cerró el Grupo D, con los resultados de seed_matches.js.',
      ],
      texto: 'Tres partidos en una noche. El tercero se gana con la cabeza. Guardalo para tu próxima triple.',
      porque: 'Continúa la serie que ya aprobaste: lo útil se guarda y se comparte por privado, las dos señales que más pesan en Instagram. Y la triple fecha es algo que vive cualquiera que juega torneos.',
      crear: 'Textos y placas con la plantilla de "Cabeza fría"; versión video igual que la primera. Música propia nueva.',
    }),
    idea('jue-glowup2', 'Mismo jugador, 4 temporadas #2: Huber236', {
      cuando: 'Jueves 22 · 14:00 (o el próximo turno libre)',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'Mismo jugador. 4 temporadas. Ahora le toca a Huber236.',
      escenas: [
        'Mismo formato que la de Lautavester7: T1, T2 y T3 en cortes rápidos al pulso, destello y la versión actual con el kit T4.',
        'Hay renders de las 4 temporadas de Huber236 (también de Guiidow, Juan_Martinez4, RS32-DaniStone y CipriMancini, para las próximas).',
      ],
      texto: 'Mismo jugador. 4 temporadas. ¿Cuál es tu favorita?',
      porque: 'Si la del 15/10 rinde, la segunda consolida la serie: la gente empieza a esperar "la de quién toca". Producirla cuesta poco porque la plantilla ya existe.',
      crear: 'Nada nuevo: la plantilla del antes y después con los renders de Huber236. Música propia nueva.',
    }),
    idea('sab-tierlist', 'Tier list: nuestras 4 camisetas', {
      cuando: 'Sábado 24 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG'],
      gancho: 'Rankeamos nuestras propias camisetas. Alguien se va a enojar.',
      escenas: [
        'Tablero de tier list (S / A / B / C) con el escudo del club arriba.',
        'Entran una por una las camisetas de las 4 temporadas (titulares, alternativas y arquero), cada una "cae" en su fila con un golpe de la música.',
        'Pausa de suspenso antes de la fila S.',
        'Cierre: "¿Vos cuál ponés arriba? Comentalo."',
      ],
      texto: 'Rankeamos nuestras camisetas de las 4 temporadas. ¿Coincidís con la S? #TopSecretFC #ProClubs',
      porque: 'Las tier lists son de los formatos con más comentarios: todos opinan y discuten el orden. Y muestran las camisetas nuevas sin que sea una publicidad.',
      crear: 'Plantilla de tier list animada (nueva, reutilizable para otros rankings: goles, festejos, rivales). Las camisetas salen de las placas y renders que ya tenemos. El orden lo definís vos en los comentarios.',
    }),
    idea('sab-silueta', '¿Quién es? El jugador en silueta', {
      cuando: 'Sábado 24 · 14:00 (alternativa)',
      redes: ['Reel', 'TikTok', 'Short', 'Historia IG'],
      gancho: '3 pistas. 1 jugador. ¿Lo sacás antes de la revelación?',
      escenas: [
        'El render de un jugador en silueta negra sobre fondo dorado.',
        'Pista 1: posición. Pista 2: dorsal. Pista 3: un dato real de la temporada (goles, asistencias, partidos).',
        'Cuenta regresiva de 3 segundos y revelación con el render a color.',
        'Cierre: "¿En qué pista lo sacaste?"',
      ],
      texto: '3 pistas, 1 jugador. ¿En cuál lo sacaste? #TopSecretFC',
      porque: 'Los juegos de "adiviná quién" retienen hasta el final (la revelación) y la gente comenta su respuesta: dos señales que empujan el video. Además presenta al plantel nuevo a quien no lo conoce.',
      crear: 'Silueta automática a partir del render (sharp) y animación propia. Se puede volver serie, un jugador por semana.',
    }),
    idea('sab-pov', 'POV: sos el arquero y quedan 10 segundos', {
      cuando: 'Sábado 24 · 14:00 (alternativa)',
      redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'POV: vas ganando 1-0, minuto 90, y el rival tiene un córner.',
      escenas: [
        'Todo en primera persona, desde los ojos del arquero: la pelota en el banderín, el área llena.',
        'Textos cortos que suben la tensión: "No la toques." · "Salí." · "NO SALGAS."',
        'El centro, el manotazo, la pelota que sale.',
        'Pitazo final y el festejo de los compañeros que corren hacia la cámara.',
      ],
      texto: 'Minuto 90, 1-0 arriba, córner en contra. ¿Salís o te quedás? #TopSecretFC',
      porque: 'Los "POV" en primera persona son de lo más visto del año: el que mira se pone en el lugar. Y el córner del último minuto lo sufrió cualquiera que jugó un partido.',
      crear: '5 escenas en primera persona con ChatGPT (área, centro, manotazo, festejo) con el kit T4 y el escudo, animación propia y música propia nueva. Sin voz.',
    }),
  ],
};

await agregarLote(lote);
console.log(`Lote ${lote.id} cargado (${lote.piezas.length} ideas). ${PAGINA}`);
