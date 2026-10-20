# Reglas extra para la noticia diaria (rutina en la nube)

La rutina "Top Secret FC — Noticia Diaria" (`trig_01Kz9ev31E5WfSN2mkVrHq7a`) lee este archivo del repo en cada corrida y lo cumple antes de escribir (si contradice su prompt, gana este archivo). Las correcciones de Juan sobre las notas se agregan acá, sin tocar el prompt.

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
