---
name: feedback_baja_jugador_limpiar_firestore
description: Al dar de baja un jugador de convocatoria.html/roster.js hay que limpiar también 3 lugares en Firestore o el nombre reaparece con carga demorada
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-16T18:26:07.196Z
---

Sacar a un jugador del array `PLAYERS` en `convocatoria.html` y de `ROSTER_T3` en `roster.js` **no alcanza** — puede seguir reapareciendo en convocatoria.html porque queda pisado en Firestore (proyecto `top-secret-fc`), que se carga async DESPUÉS del render local (por eso el síntoma reportado es "el nombre carga un poco después que el resto"):

1. **`plantel/activo`, campo `jugadores`** (array de mapas `{name, num, pos, nombre}`) — jugadores promovidos desde reclutamiento. `_loadPlantel()` en convocatoria.html hace `onSnapshot` y mergea cualquier `jugadores[].name` que no esté ya en `PLAYERS` — si el jugador dado de baja seguía acá, vuelve a aparecer como "recluta". Esta es la causa raíz típica.
2. **`convocatoria/state`, campo `alwaysPresent`** (array de strings) — lista de jugadores "siempre presentes salvo excepción". Dato viejo, no causa reaparición visual por sí solo pero queda inconsistente.
3. **`convocatoria/backup`, campo `alwaysPresent`** — mismo campo en el doc de respaldo que se usa si se detecta "estado corrupto" (ver [[project_convocatoria_resets_2026_08_12]]); si no se limpia acá, una restauración de backup puede reintroducir al jugador dado de baja.

**Cómo verificar/limpiar**: lectura es pública (`curl https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/<coll>/<doc>`, sin auth). Escritura a `plantel` es abierta (`if true`); escritura a `convocatoria/*` requiere token de Anonymous Auth — conseguirlo con `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<webApiKey del bloque firebaseConfig en convocatoria.html>` con body `{"returnSecureToken":true}`, y mandar el `idToken` como `Authorization: Bearer <token>` en el `PATCH` con `updateMask.fieldPaths=<campo>`.

**Cuidado con acentos**: pasar el body JSON de la escritura por `curl -d '...'` inline en Bash/Git Bash puede corromper caracteres UTF-8 (tildes/ñ se pierden, ej. "Román" → "Rom n"). Mejor escribir el JSON a un archivo con la herramienta Write (que preserva UTF-8 correctamente) y usar `curl --data-binary @archivo.json`.
