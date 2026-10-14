---
name: reference_ea_proclubs_api
description: API de Pro Clubs de EA (proclubs.ea.com) — club FC 27 = 404340 en common-gen5; qué endpoints sirven, qué trae cada uno y por qué hay que pasar por el Worker
metadata:
  type: reference
---

Páginas como proclubs.io leen la API pública (sin login) de EA: `https://proclubs.ea.com/api/fc/<ruta>`.

**Club en FC 27**: `clubId=404340`, `platform=common-gen5` (crossplay; PC también cae acá). El viejo `16051` de `estadisticas.html` (`CEA_CLUB_ID`) es de un juego anterior y devuelve todo en 0.

**Acceso**: Akamai bloquea curl/Node y Chrome headless (Access Denied / ERR_HTTP2). Funciona:
- el Worker `/ea?path=<ruta urlencoded>` (IP de Cloudflare pasa) — pero solo para rutas en `EA_ALLOWED_PATHS`;
- el Chrome CDP de la PC (puerto 9222) navegando directo a la URL de la API.

**Endpoints que responden (2026-10-13)**:
- `allTimeLeaderboard/search?platform=common-gen5&clubName=Top%20Secret` — buscar club por nombre (la vieja `clubs/search` da 404).
- `clubs/overallStats?platform=…&clubIds=404340` — récord total, división, racha, skillRating, últimos 10 rivales.
- `clubs/matches?platform=…&clubIds=404340&matchType=leagueMatch|friendlyMatch|playoffMatch` — últimos 5 partidos de ese tipo. **`friendlyMatch` = partidos privados (amistosos y los de liga VPN/VPUG/Espacio Gamer) con los 11 jugadores.** Por jugador: `playername` (gamertag), `pos`, `archetypeid`, `rating`, goals, assists, shots, passesmade/passattempts, tacklesmade/tackleattempts, saves, redcards, mom, secondsPlayed, `vproattr` (atributos del pro), `match_event_aggregate_*`. Agregado del club por partido.
- `members/stats?platform=…&clubId=404340` — por miembro: partidos, winRate, goles, asistencias, % pase/tiro/entrada, ratingAve, MOM, `proOverall`, `proPos`, altura, nacionalidad, posición favorita.
- `members/career/stats?platform=…&clubId=404340` — carrera total por miembro.

**Límite clave**: EA solo devuelve los últimos 5 partidos por tipo. Para tener historial hay que guardarlos (p. ej. cron del Worker → KV/Firestore) a medida que se juegan.

**Comparación con el reporte del video (2026-10-13, partidos VPUG del 12/10)**: notas, goles, asistencias, tiros, pases y atajadas coinciden exactos cuando el partido terminó normal. Pero:
- Un partido cortado/reiniciado queda en EA como un registro aparte con 3-0 (ej. "3-0 CSyD La Mochila" de 5 minutos antes del 1-0 real). Si alguien se desconecta, EA puede registrar un 0-3 con stats casi vacías (Temperley: el sitio dice 0-0, EA 0-3 con 0 tiros de ambos lados y Huber236 con 0 minutos). No tomar el marcador de EA a ciegas: filtrar por duración (`secondsPlayed`) y stats vacías.
- El nombre del rival en EA es el del club en el juego, no el de la liga ("CREADORES CAP" = Peñarol Creadores, "Temperley eSp" = Temperley eSports) → hace falta un mapa de alias.
- EA no trae posesión, xG, córners, offsides, faltas, regates, distancia, minuto de cada gol ni la posición exacta (solo forward/midfielder/defender/goalkeeper). Sí trae, para los 11, pases, entradas, tiros, atajadas, minutos jugados, MVP y arquetipo.

**Atributos del pro (build)**: NO están en la API pública de FC 27. `vproattr` de cada partido viene como `"NH"` para todos (en juegos viejos era la lista de atributos). Lo único del pro: `proOverall` (media), `proPos`, `proHeight`, `proNationality` (52 = Argentina) en `members/stats`, y `archetypeid` (número, sin nombre) por partido. `clubs/members/stats` y `clubs/seasonalStats` dan 404; `settings` da la tabla de divisiones.

**espaciogamer.cl (la liga) usa esta misma API**: WordPress + plugin propio `espacio-gamer-motor`; las páginas de jugador (`/jugador/<gamertag-en-minúsculas>/`) vienen renderizadas del servidor, sin API pública que consultar (solo admin-ajax para likes/sesión). El perfil muestra PJ, goles, asistencias, MVP, nota (rating de EA ×10, sobre 100), racha de 5, nota partido a partido, % victorias, aporte en goles, rivales más enfrentados, títulos, tabla por división y últimos partidos; nivel/XP es gamificación propia de la liga; "dónde juega" + mejor dupla + récords son premium. **No muestra atributos/build** — todo sale de los partidos que ellos guardan de EA. Juan_Martinez4 = `/jugador/juan_martinez4/` (0 partidos de liga al 2026-10-13).
