---
name: project_vpug_t4_pretemporada
description: Liga Pretemporada VPUG (FC-27) (T7 CopáFácil, -fthh5@b7we) — primer torneo de la Temporada 4, Grupo D, lunes y miércoles 23:00 y 23:30
metadata:
  type: project
---

Torneo `-fthh5@b7we` ("Liga Pretemporada VPUG (FC-27) (T7)"), arrancó 2026-10-05. 64 equipos en 8 grupos (A–H) de 8, ida única, 7 fechas. TOP Secret está en el **Grupo D**: F1 local Comunicaciones Cantera (ex Villa Dalmine eSports: mismo equipo `-P2JRiVP2pCqmqxrPfis`, cambió nombre y escudo el 2026-10-06; en CopáFácil figura "Comunicaciónes Cantera"), F2 visita Norpatagonicos eSports, F3 local Cambaceres, F4 visita Real Envido, F5 local CSyD La Mochila (ex Inter Regional: mismo equipo `-P2OXy0twcTpDlidx8p-`, cambió nombre y escudo; Juan avisó 2026-10-12 tras jugarlo), F6 visita Temperley eSports, F7 local Peñarol Creadores.

**Cadencia confirmada por Juan (2026-10-05): lunes y miércoles, 23:00 y 23:30 (2 partidos por día)** → F1-F2 05/10, F3-F4 07/10, F5-F6 12/10, F7 14/10 23:00. **F1 vs Villa Dalmine eSports reprogramada al mar 06/10 22:30** (cancelada el 05/10) **y de nuevo al mié 07/10 22:30** (aviso de Juan el 06/10): ese miércoles se juegan 3 partidos (22:30, 23:00, 23:30). CopáFácil no guarda fecha por partido; si el organizador reprograma, corregir `RAW` en `calendario.html` y `VPUG_T4_SCHEDULE` en `convocatoria.html` (espejados).

Cableado: Worker `/vpug-table-t4` (`?group=D` filtra; sin parámetro devuelve todos con `group`), `posiciones.html` tab T4 → VPUG (`fetchT4VPUG`, fallback `VPUG_T4_DATA`), tarjeta VPUG del home (`index-home.js`). Si hay playoffs después de la fase de grupos, son partidos nuevos en `matchs.json` del mismo `evt` — sumarlos a los dos fixtures.

**Reporte a la liga (solo VPUG — VPN y 11x11 no lo piden):** cada partido de VPUG se reporta a **"Angel VPUG"** (WhatsApp, +598 93 798 044) con 3 fotos: **Resultado** (cartel "Fin del partido"), **Rendimiento** (tabla de TOP Secret) y **Datos del partido** con la fila **Tarjetas** (obligatoria). Se sacan del VOD de Twitch (pantallas post-partido, ~2 min antes del final del VOD); se suma Eventos (goles y tarjetas). Primer envío: F2 vs Norpatagonicos, 2026-10-06. Desde 2026-10-12 lo puede mandar la PC: [[reference_wa_enviar_reporte_angel]].

## Playoffs (2026-10-14)

Terminamos 2° del Grupo D → **PLAYOFF FASE ORO**, octavos #7 vs **Argentino de Merlo** (1° Grupo C): ida de local ellos, vuelta de local nosotros. La Fase Oro = 1° y 2° de cada grupo; la **FASE PLATA** = 3° y 4° (CopáFácil la rotula igual "1° GrupoA x 2° GrupoB", el Worker lo corrige). Octavos, cuartos, semis y final, todo ida y vuelta.

- Datos en CopáFácil: `events/-fthh5@b7we/fs.json` (fases: `show_eli` = cuadro), `m_set.json` (rondas por fase), partidos en `events/-fthh5/matchs.json` con `title` "Octavos de final #7 - ..." y su "(Vuelta)" enlazado por `return`.
- Worker `GET /vpug-playoffs-t4` arma los dos cuadros (series con ida/vuelta/global; el que avanza = el que aparece en la ronda siguiente). `posiciones.html` los muestra arriba como UN cuadro enfrentado (`posiciones-playoffs.js`): Oro de izquierda a derecha, Plata espejada de derecha a izquierda, las dos finales juntas en el medio unidas por una línea bajo un solo título "Finales"; sin recuadros separados, solo los títulos de fase. En celular: ventana deslizable en 2D (70vh) que arranca centrada en nuestra llave + botón "Ir a nuestro partido" y abajo la tabla final del Grupo D.
