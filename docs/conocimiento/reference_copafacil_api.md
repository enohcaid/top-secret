---
name: copafacil-api-access
description: Cómo extraer datos de torneos de CopáFácil (Flutter SPA) vía Firebase RTDB — patrón usado en el Worker de Top Secret
metadata: 
  node_type: memory
  type: reference
  modified: 2026-08-09T18:52:02.037Z
---

## CopáFácil — Acceso a datos

**El problema:** CopáFácil es una Flutter Web SPA que renderiza en canvas. WebFetch/scraping devuelve solo la pantalla de carga, no datos.

**La solución:** Leer Firebase Realtime Database directamente. Los torneos VPUG usan el proyecto Firebase `copafacil-web`.

### URL base
```
https://copafacil-web.firebaseio.com
```

### Estructura de claves
La URL de CopáFácil tiene forma `https://copafacil.com/{eventId}@{tournamentCode}`.  
El `@` es **parte literal de la clave Firebase** — no es un separador.

- **Event ID**: lo que va antes del `@` en la URL (ej. `-fthh5` para Comunidad VPUG)
- **Tournament code**: lo que va después del `@` (ej. `llo8` para Campeonato de Invierno)
- **Clave completa**: `{eventId}@{tournamentCode}` (ej. `-fthh5@llo8`)

### Endpoints públicos (sin auth)
```
GET https://copafacil-web.firebaseio.com/events/{eventId}@{tournamentCode}/teams.json
```
Devuelve todos los equipos del torneo. Cada equipo tiene:
- `name`, `url` (logo), `g` (grupo: 'A' o 'B')
- `sts` array con snapshots de stats; el último tiene `dt` (stats string) y `colg` (posición en tabla)

```
GET https://copafacil-web.firebaseio.com/events/{eventId}/matchs.json
```
Devuelve todos los partidos del **event** (padre). Filtrar por `m.evt === "{eventId}@{tournamentCode}"` para el torneo específico. Cada partido tiene:
- `team1`, `team2` (claves de equipo), `m_set` (ID de fecha/round), `finished` (bool)
- `dt.qt_g1`, `dt.qt_g2` (goles equipo 1 y 2, solo si `finished`)

### Parseo de stats (`dt` string)
El campo `dt` de cada equipo es un string con formato `"0=pts#1=gp#2=w#3=d#4=l#5=gf#6=gc#7=gd#..."`.
```js
function parseStats(dt) {
  const s = {};
  dt.split('#').forEach(p => { const [k,v]=p.split('='); if(k&&v) s[k]=+v; });
  return { pts:s[0]||0, gp:s[1]||0, w:s[2]||0, d:s[3]||0, l:s[4]||0, gf:s[5]||0, gc:s[6]||0, gd:s[7]||0 };
}
```

### Endpoint de jugadores (PÚBLICO)
```
GET https://copafacil-web.firebaseio.com/events/{eventId}@{tournamentCode}/player.json
```
Devuelve todos los jugadores registrados en el torneo. Cada objeto jugador tiene:
- `name` — nombre de usuario en CopáFácil
- `team` — clave del equipo (filtrar por TS_KEY para los jugadores de Top Secret)
- `ART` — artilheiro = goles marcados (acumulado)
- `ASS` — asistências = asistencias (acumulado)
- `dt` — string de stats del jugador (formato `"campo=valor#..."`)
- `fs` — historial por snapshot (`{snapshotId: {ART, ASS, dt}}`), útil para diferencial por fecha

**Campos del `dt` de jugadores** (distinto al `dt` de equipos):
- Campo `0` = `ART` = goles
- Campo `1` = `ASS` = asistencias
- Campo `2` = partidos jugados (gp)

**Enfoque diferencial:** Cada jornada jugada agrega un nuevo snapshot en `fs`. Para calcular stats por fecha: `stats_fecha_N = snapshot_N - snapshot_(N-1)`. El snapshot inicial del Campeonato de Invierno es `1781802296761` (après la jornada del 18-jun-2026).

### Notas importantes
- Auth anónima bloqueada (`ADMIN_ONLY_OPERATION`) — no intentar `signInAnonymously`
- El `insc/` path requiere auth — no disponible públicamente. Usar `player.json` en su lugar.
- Los partidos futuros no tienen fecha en Firebase; hay que usar un `SCHEDULE` hardcodeado con las fechas reales
- El orden de los rounds se deriva de los `m_set` IDs ordenados por clave (cronológico)
- **Corrección (2026-08-09):** `matchs.json` va bajo el **event ID solo** (`events/{eventId}/matchs.json`), sin `@code` — devuelve los partidos de TODOS los torneos de esa comunidad juntos; hay que filtrar por `m.evt === "{eventId}@{code}"`. `teams.json` sí va con `@code` y devuelve solo los equipos de ese torneo puntual — el campo `dt` (stats) de cada equipo no existe hasta que se juega y carga al menos un partido de ESE torneo (una temporada que arranca legítimamente devuelve equipos sin `dt`, no es un bug).
- **Corrección (2026-08-09):** la página `copafacil.com/{eventId}@{code}` NO es un canvas Flutter opaco como se pensaba — es HTML/CSS server-rendido normal. `WebFetch` sigue sin servir (necesita JS), pero un Playwright headless (`playwright` ya está en devDependencies) con `page.goto()` + `page.screenshot()`/`page.content()` funciona perfecto y da texto/DOM legible, no una captura de canvas. Útil para inspeccionar visualmente el fixture/clasificación cuando la API no alcanza (ej. confirmar que no hay fecha de calendario por partido — se comprobó clickeando el detalle de un partido: solo trae equipos/medios/comentarios, ninguna fecha).

### Torneos VPUG conocidos en este proyecto
| Torneo | URL CopáFácil | Event ID | Code | TS Key |
|--------|--------------|----------|------|--------|
| T2 (ejemplo previo) | `-fthh5@pg59` | `-fthh5` | `pg59` | — |
| Pretemporada Invierno 2026 | `-fthh5@llo8` | `-fthh5` | `llo8` | `-OvQetM8ROfp55aARizV` |
| #1 Primera División VPUG T6 (temporada regular, arrancó 2026-08-10) | `-fthh5@7zxj` | `-fthh5` | `7zxj` | `-OvQetM8ROfp55aARizV` |

### Implementación en el Worker
El endpoint `/copafacil-pretemporada` en `top-secret-worker.js` implementa este patrón completo para un torneo con fechas/horarios hardcodeados. El endpoint `/vpug-table-t3` es más simple (solo standings, sin fixture) y sigue el patrón de `/vpug-table`.
Usarlos como referencia para futuros torneos de CopáFácil. Checklist completo de qué tocar en el sitio (Worker + posiciones.html + calendario.html + convocatoria.html): ver "Nueva temporada/torneo de CopáFácil (VPUG)" en CLAUDE.md.
