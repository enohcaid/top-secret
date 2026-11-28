#!/usr/bin/env node
// Guion de la semana del lunes 30/11 al domingo 6/12 (Juan, 2026-11-28: "fijate las visitas de los videos, usalo
// como referencia para armar el contenido viral de esta semana"). Ya agendado de antes: sábado 28 "Un día en la vida"
// y martes 1/12 "¿Era penal?". Desde esta semana hay 5 turnos (lunes, martes, jueves, viernes y sábado 14:00).
//
// Criterio: VISTAS de los reels (pestaña Reels del perfil, 28/11; mediana ≈ 250 sobre 50 reels desde agosto):
//   arriba: "Minuto 90, 1-0 arriba, córner en contra. ¿Salís o te quedás?" 1779 (7x) · "Todos tenemos uno de estos"
//           928 (3,7x) · presentación de agosto 673 · "El gol es de Lautavester7, la jugada la abrió NicoBJ_96" 565 ·
//           presentación del plantel T4 541
//   abajo:  gorra 114 · "la semana en datos" 138 · Tacet Sin 157 · "Qué es Clubs Pro" 188 · reacción 213
//   → gana lo que le pregunta algo al que mira sobre una situación que vivió jugando (decidir, reconocerse, mandárselo
//     a alguien); pierde lo que habla de nosotros. Ninguna idea repite un concepto ya usado (feedback_no_repetir):
//     se toma el mecanismo, no el formato.
//
// Datos reales: promoción de Espacio Gamer el martes 1/12 vs CSyD La Mochila (23:00 ida, 23:30 vuelta). Jornada
// real de 22:30 a 00:30.
//
//   node scripts/social/piezas/guiones-2026-11-30.mjs            → carga el lote en aprobar.html
//   node scripts/social/piezas/guiones-2026-11-30.mjs --revisar  → solo pasa los textos por el revisor
//   node scripts/social/piezas/guiones-2026-11-30.mjs --actualizar → reemplaza solo las ideas pendientes (respeta las decididas)
import { agregarLote, PAGINA } from '../lib/aprobaciones.mjs';
import { revisarPieza } from '../../../revisar-textos.js';

const idea = (id, formato, guion) => ({ id, red: 'plan', formato, guion: { ...guion, texto: `${guion.texto} #TopSecretFC` }, decision: 'pendiente', texto: '' });

const lote = {
  id: 'viral-guiones-2026-11-30', tipo: 'viral', etapa: 'guion', creado: new Date().toISOString(),
  semanaHasta: '2026-12-06',
  titulo: 'Guion de la semana · lunes 30 de noviembre al domingo 6 de diciembre',
  bajada: '5 ideas (el martes ya está "¿Era penal?"). Criterio: vistas de los reels. Arriba "¿Salís o te quedás?" 1779 y "Todos tenemos uno" 928; abajo gorra 114 y "la semana en datos" 138. Rinde preguntarle algo al que juega; lo que habla solo de nosotros, no',
  piezas: [
    idea('lun-cosas', 'Cosas que solo entendés si jugás Clubs Pro', {
      cuando: 'Lunes 30 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG'],
      gancho: 'Si entendés las cinco, jugás Clubs Pro. Si entendés tres, mandáselo al que te hizo jugar.',
      escenas: [
        'Texto grande sobre una jugada real del vivo, numerado: "1. Se cae el arquero y alguien tiene que ir al arco." Imagen: nuestro defensor parado bajo el travesaño.',
        '"2. El que pide la pelota por el audio y después no la devuelve." "3. El córner corto que nadie pidió." Cada punto con su jugada real.',
        '"4. El lag justo en el minuto 90." La imagen se traba un segundo, de verdad, y sigue.',
        '"5. Ganar a las 00:30 y no poder dormir." La pantalla del resultado final. Cierre: "¿Cuántas te pasaron? Contestá con el número."',
      ],
      texto: 'Cosas que solo entendés si jugás Clubs Pro. ¿Cuántas te pasaron? Contestá con el número.',
      porque: 'Es el mecanismo de "Todos tenemos uno de estos en el equipo" (928 vistas, el segundo mejor reel) sin repetir el formato: ahí eran tipos de compañeros, acá son situaciones que vive cualquiera que juega. Se manda por privado y la pregunta final con un número es fácil de contestar.',
      crear: 'Técnica nueva: lista numerada con texto que se escribe solo sobre jugadas reales de las grabaciones del vivo (fuentes/goles/), una por punto, cortes al golpe de la música. La traba del lag es un congelado real de 1 s con el sonido cortado. Sin voz. Carrusel: una placa por punto (clave → 5 ideas → resumen → acción).',
    }),
    idea('mie-promocion', 'La noche que nos jugamos la categoría', {
      cuando: 'Miércoles 2 · sale al aprobarse (contenido de resultado)',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'Dos partidos, 60 minutos, la categoría en juego. Así se jugó la promoción.',
      escenas: [
        'Negro y el marcador global de la serie con CSyD La Mochila, que se arma con los dos resultados reales (ida 23:00, vuelta 23:30).',
        'La jugada que definió la serie, completa, del primer pase al gol, con el gamertag de cada uno que la tocó. Si fue nuestra: festejo. Si fue de ellos: silencio.',
        'La segunda jugada más importante (la atajada, el gol que no fue, el empate parcial), igual de completa.',
        'Cierre con el resultado: "Seguimos en Espacio Gamer" o "Nos toca volver a subir". Una sola línea, sin dramatizar.',
      ],
      texto: 'Nos jugamos la categoría en Espacio Gamer contra CSyD La Mochila. Así fueron los dos partidos.',
      porque: 'Lo real de mayor tensión de la temporada. No es el tráiler previo (descartado): es lo que pasó, contado como "El gol es de Lautavester7, la jugada la abrió NicoBJ_96" (565 vistas): la jugada entera con los nombres de todos los que la tocaron. Va como contenido de resultado: sale apenas se aprueba, sin esperar turno.',
      crear: 'Se arma el miércoles con la grabación del vivo del martes y los resultados reales; si el vigía no guardó la noche, se descarta (no se inventa). Dos versiones del cierre según el resultado. Técnica nueva: congelado en cada pase con el gamertag que aparece junto al jugador y una línea dorada que dibuja el recorrido de la pelota. Sin voz.',
    }),
    idea('jue-decidi', 'Decidí en 3 segundos', {
      cuando: 'Jueves 3 · 14:00',
      redes: ['Reel', 'TikTok', 'Short', 'X'],
      gancho: 'Tenés la pelota en el minuto 89 y tres segundos. ¿Pase, tiro o gambeta? Elegí antes de que siga.',
      escenas: [
        'Jugada real del vivo que se congela justo antes de la decisión. Tres opciones en pantalla: PASE, TIRO, GAMBETA, con una cuenta regresiva de 3 segundos.',
        'Sigue la jugada: lo que hizo nuestro jugador de verdad, con el resultado (gol, atajada, pelota perdida).',
        'Segunda jugada, otra situación (mano a mano con el arquero: ¿cruzás o la picás?), mismo juego.',
        'Tercera y última. Cierre: "¿Cuántas acertaste? 3 de 3 = convocado."',
      ],
      texto: 'Decidí en 3 segundos: pase, tiro o gambeta. ¿Cuántas acertaste de las tres?',
      porque: 'El mejor reel de la cuenta (1779 vistas, 7 veces la mediana) fue "Minuto 90, 1-0 arriba, córner en contra. ¿Salís o te quedás?": una decisión que cualquiera que juega tomó alguna vez. Este usa ese mecanismo con jugadas reales nuestras y es distinto de "¿Era penal?" (martes): ahí opinás de un fallo, acá decidís como jugador.',
      crear: 'Técnica nueva: congelado con desaturado y zoom lento al jugador con la pelota, tres botones que se marcan al terminar la cuenta y un "tic" por segundo. Tres jugadas de las grabaciones del vivo de noviembre que terminen distinto (una buena decisión, una mala, una dudosa). Sin voz.',
    }),
    idea('vie-arco', 'El que va al arco cuando se cae el arquero', {
      cuando: 'Viernes 4 · 14:00',
      redes: ['Reel', 'TikTok', 'Short'],
      gancho: 'Se desconectó el arquero. Alguien tiene que ir al arco. Este es el minuto a minuto de ese alguien.',
      escenas: [
        'Mensaje en pantalla del juego: un jugador desconectado. Silencio en el audio del equipo. Una flecha cae sobre uno de los nuestros: "vos".',
        'Va caminando al arco con la cámara detrás, como una película. Primer remate del rival: lo ataja con la cara.',
        'Segundo remate: lo ataja de verdad. Se escucha el festejo del equipo como si fuera un gol.',
        'Termina el partido y el resultado aparece junto a "Valoración del arquero improvisado". Cierre: "Etiquetá al que siempre se ofrece."',
      ],
      texto: 'Se cae el arquero y alguien tiene que ir al arco. Etiquetá al que siempre se ofrece.',
      porque: 'El 31/10 "Nos faltaba un jugador. El arquero pasó a defender" dio 274 (arriba de la mediana) contado como crónica. Contado desde la situación que le pasó a todos los que juegan, con una persona para etiquetar, tiene el mecanismo de los dos mejores reels. Es una historia de un solo personaje, no una lista.',
      crear: 'Jugadas reales si hay en las grabaciones un partido con arquero improvisado; si no, escenas con ChatGPT del render de un jugador del plantel vestido de campo bajo el arco, animadas con Canva imagen a video. Cámara de película (barras negras arriba y abajo que se abren al final). Sin voz; sonidos de audio de equipo hechos aparte, sin palabras.',
    }),
    idea('sab-tabla', 'Tres ligas a la vez: lo que aprendimos', {
      cuando: 'Sábado 5 · 14:00 (alternativa a "la semana en datos", que dio 138)',
      redes: ['Reel', 'TikTok', 'Short', 'Carrusel IG'],
      gancho: 'Tres ligas a la vez y 30 partidos en noviembre. Esto es lo que aprendimos.',
      escenas: [
        'Un calendario de noviembre que se llena de escudos: cada día de partido se pinta con el color de la liga (VPN, VPUG, Espacio Gamer).',
        'Tres aprendizajes, uno por placa, con su jugada real: uno de cada liga.',
        'El resumen en una lista de tres líneas, para guardar.',
        'Cierre con lo que viene en diciembre, solo fechas confirmadas.',
      ],
      texto: 'Tres ligas a la vez y un mes entero de partidos. Tres cosas que aprendimos, para que no te pasen.',
      porque: 'Reemplaza el formato de la semana en datos (138 vistas, de los peores) por algo útil para el que juega: aprendizajes con jugadas, que se guardan. Es la alternativa del sábado; si preferís mantener "la semana en datos", esta se descarta.',
      crear: 'Calendario animado por código con los partidos reales de seed_matches.js y los escudos de torneos-datos.js; aprendizajes escritos con las jugadas del vivo. La cantidad de partidos se cuenta del seed al armarlo (no se escribe a ojo). Carrusel con la estructura clave → ideas → resumen → acción. Voz de Elena corta.',
    }),
  ],
};

if (process.argv.includes('--actualizar')) {
  const { leer, guardarKV } = await import('../lib/aprobaciones.mjs');
  const data = await leer();
  const l = data.lotes.find(x => x.id === lote.id);
  if (!l) throw new Error(`No existe ${lote.id} en aprobar`);
  const decidida = p => p && p.decision && p.decision !== 'pendiente';
  const nuevas = lote.piezas.map(p => { const vieja = l.piezas.find(x => x.id === p.id); return decidida(vieja) ? vieja : p; });
  l.piezas = [...nuevas, ...l.piezas.filter(p => !lote.piezas.some(x => x.id === p.id) && decidida(p))];
  l.bajada = lote.bajada; l.titulo = lote.titulo;
  await guardarKV('aprobaciones', data);
  console.log(`Lote ${lote.id} actualizado. ${PAGINA}`);
} else if (process.argv.includes('--revisar')) {
  for (const p of lote.piezas) {
    const avisos = revisarPieza({ red: 'instagram', metodo: 'ig-reel', formato: 'Reel', protagonistas: [], texto: p.guion.texto }, lote);
    console.log(`${p.id}: ${avisos.length ? JSON.stringify(avisos) : 'ok'}`);
  }
} else {
  await agregarLote(lote);
  console.log(`Lote ${lote.id} cargado (${lote.piezas.length} ideas). ${PAGINA}`);
}
