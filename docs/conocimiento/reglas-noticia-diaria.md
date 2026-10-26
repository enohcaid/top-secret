# Reglas extra para la noticia diaria

La noticia diaria la escribe `scripts/noticia-diaria.mjs` (en la PC del club) y lee este archivo en cada corrida: si contradice su encargo, gana este archivo. Las correcciones de Juan sobre las notas se agregan acá.

## Posiciones (2026-10-14)

La nota del 14/10 presentó a Lautavester7 como "lateral izquierdo": leyó `played_pos: 'DI'` como defensor, y es **delantero izquierdo**.

- Siglas de `played_pos` en `seed_matches.js` (las del juego en español): **DI** = delantero izquierdo, **DD** = delantero derecho, **DC** = delantero centro, **EI/ED** = extremos, **MCO** = mediapunta, **MI/MD** = volantes por izquierda/derecha (carrileros), **MCI/MCD/MC** = mediocampistas centrales, **DCI/DFC/DCD** = defensores centrales, **PO** = arquero.
- El equipo juega con línea de 3 centrales (3-5-2 / 3-1-4-2): **no hay laterales**. Nunca describir a un jugador como "lateral".
- Ante la duda, el puesto de referencia es `posn` en `roster.js`, o simplemente delantero / mediocampista / defensor.

## Protagonista de la nota (2026-10-14)

- Una nota centrada en un jugador (perfil, entrevista, figura) solo puede elegir a alguien que haya **jugado en el último día con partidos** de `seed_matches.js` y que tenga algo **objetivamente destacado** en los datos (goles, asistencias, mejor nota, racha).
- Nunca elegir a un jugador que lleva una semana o más sin jugar (la del 14/10 eligió a Lautavester7, que no jugaba desde el 7/10, y hubo que reemplazarla por NicoBJ_96, goleador del grupo).

## Bajas del plantel (2026-10-15)

- **kee_viin03 y Juanchyroman08 se fueron del club** (bajas del 2026-10-15). No mencionarlos ni elegirlos como protagonistas en notas nuevas: el plantel vigente es `ROSTER_T4` de `roster.js`. Pueden aparecer solo como dato histórico de la T3 (sus partidos y goles de esa temporada).

## Cambio de gamertag (2026-10-20)

- **CipriMancini ahora se llama `Ciprimancini32`** (y juega en PS5). En notas nuevas usar siempre `Ciprimancini32`, también al hablar de sus partidos o goles de temporadas anteriores (es el mismo jugador). Las notas viejas ya publicadas no se tocan.

## Sin doble sentido (2026-10-21)

- Nada de frases que puedan leerse como contenido sexual, aunque sean jerga de fútbol: "la pone", "la mete", "la mandó adentro", "se la dio", "la empujó", "la clavó". Decirlo con pase, asistencia, gol, definición, remate ("asistencia de Elianja20, gol de pepolemmo2710").
- El vivo sale por Twitch, Kick, YouTube e Instagram: si se lo menciona, las cuatro.

## El día después de partidos oficiales: reporte del resultado (2026-10-23)

- **Si el día anterior hubo partidos oficiales** (VPN, VPUG o Espacio Gamer; no amistosos) en `seed_matches.js` o en el calendario (`calendario/estado.custom` de Firestore, fecha de ayer), la nota del día es **siempre el reporte de esos resultados**: resultado de cada partido, goleadores, la jugada o el momento de la noche, cómo queda el equipo en la tabla. Nada de entrevistas, perfiles ni notas institucionales ese día. (El 23/10 salió una entrevista a Guiidow sobre el partido del martes y la noche del jueves 22 —tres partidos de Espacio Gamer— quedó sin nota.)
- Si un partido de ayer todavía no está en `seed_matches.js`, el reporte se escribe igual con lo que haya (calendario + resultado), sin inventar goleadores ni minutos.

## Resumen semanal (2026-10-23)

- **La nota del sábado 2026-10-24 es el resumen semanal** de la semana del lunes 19 al jueves 22 de octubre: todos los partidos oficiales de la semana con sus resultados, los goleadores, los números del equipo y cómo queda en cada competencia. Los amistosos, como mucho, en una línea.
- Datos verificados de esa semana (Espacio Gamer): mar 20/10 Sub 21 1-0 (gol de pepolemmo2710 sobre el final); jue 22/10 SF Drysdale 3-3 (Cabers14 de cabeza a los 24'; Lautavester7 a los 87' y de tijera en el descuento, después de ir 1-3), Los Picantes 1-0 (NicoBJ_96 a los 14', asistencia de Lautavester7) e InfinitX 1-0 (Lautavester7 a los 51', asistencia de nikileo527; Cabers14 figura con 9.1). Balance: 3 triunfos y 1 empate, 6 goles a favor y 3 en contra; Lautavester7, 3 goles en la semana. La tabla de Espacio Gamer todavía puede no tener cargado el 3-3: no dar posición en la tabla salvo que ya figure con 4 partidos jugados.
- Incluir el video de los goles como bloque `{ video: 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/videos/goles/2026-10-22/compilado-v2.mp4', poster: 'https://top-secret-proxy.juan-c-m-1985.workers.dev/media/videos/goles/2026-10-22/poster.jpg', caption: 'Los goles de la semana.' }` (noticias.html lo reproduce). La nota del 23/10 (`noche-espacio-gamer-22-10`) ya contó la noche del jueves: el resumen semanal mira la semana entera, no repite esa nota.
