---
name: project_vpug_t4_pretemporada
description: Liga Pretemporada VPUG (FC-27) (T7 CopáFácil, -fthh5@b7we) — primer torneo de la Temporada 4, Grupo D, lunes y miércoles 23:00 y 23:30
metadata:
  type: project
---

Torneo `-fthh5@b7we` ("Liga Pretemporada VPUG (FC-27) (T7)"), arrancó 2026-10-05. 64 equipos en 8 grupos (A–H) de 8, ida única, 7 fechas. TOP Secret está en el **Grupo D**: F1 local Villa Dalmine eSports, F2 visita Norpatagonicos eSports, F3 local Cambaceres, F4 visita Real Envido, F5 local Inter Regional, F6 visita Temperley eSports, F7 local Peñarol Creadores.

**Cadencia confirmada por Juan (2026-10-05): lunes y miércoles, 23:00 y 23:30 (2 partidos por día)** → F1-F2 05/10, F3-F4 07/10, F5-F6 12/10, F7 14/10 23:00. CopáFácil no guarda fecha por partido; si el organizador reprograma, corregir `RAW` en `calendario.html` y `VPUG_T4_SCHEDULE` en `convocatoria.html` (espejados).

Cableado: Worker `/vpug-table-t4` (`?group=D` filtra; sin parámetro devuelve todos con `group`), `posiciones.html` tab T4 → VPUG (`fetchT4VPUG`, fallback `VPUG_T4_DATA`), tarjeta VPUG del home (`index-home.js`). Si hay playoffs después de la fase de grupos, son partidos nuevos en `matchs.json` del mismo `evt` — sumarlos a los dos fixtures.
