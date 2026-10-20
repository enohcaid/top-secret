---
name: project-cambio-gamertag
description: Qué hacer cuando un jugador cambia de gamertag (caso CipriMancini → Ciprimancini32, 2026-10-20): una sola identidad, todo pasa a la clave nueva
metadata:
  type: project
---

**Caso:** 2026-10-20, `CipriMancini` pasó a **`Ciprimancini32`** y de PC a PS5. Juan lo escribió en minúscula ("ciprimancini32"); la mayúscula exacta se tomó de EA (`GET <Worker>/ea-historial`), que es lo que traen los partidos automáticos (`cargar-partidos-ea.mjs` / `ea-completar.mjs` cruzan por la clave del roster).

**Criterio:** el jugador es uno solo → la clave nueva reemplaza a la vieja en todas las temporadas (si no, sus estadísticas se parten en dos). Qué se cambió:

1. `seed_matches.js`: solo `matched` (el `name` queda como lo mostraba cada reporte).
2. `roster.js` (T3 y T4; la plataforma cambia solo en la T4, en T3 jugaba en PC), `plantilla.html` (ROSTER T1/T2), `convocatoria.html` (PLAYERS `name`+`folder`, mapa de recorte, `autoLineup`), `plantel-t4-stage.js` (hotspot), textos de `index-home.js`/`nosotros.html`.
3. Scripts reutilizables: `PLAYER_TRAITS` en `generate-image-chatgpt.mjs`, `video-plantel/poses.mjs`, banners, `fotos-grupales-t4.mjs`, `plantel-foto-t4.mjs`, `chatgpt-project-instructions.md`. Los `*-once.mjs` no se tocan.
4. **R2: se COPIAN** (no se mueven) `Renders/<viejo>/*`, `Renders/<viejo>.svg`, `Renders/T3-*/`, `Renders/T4-Frentes(-K2)/`, `logos/noticias/plantel-t4/`, `video-equipo/v1/`, `_fuentes/video-plantel/` a la clave nueva. Lo viejo queda porque lo usan las noticias publicadas. Lo mismo con las copias locales en `Renders/` (gitignored), los cuadros del video (`fuentes/video-plantel/Gesto4/frames/<gt>`) y **los clips del vivo (`fuentes/stream/clips/<gt>/`, después `lote-clips.mjs --indice`)**: si no, la tanda horaria los regenera todos en Canva (pasó con 4 clips de Ciprimancini32).
5. Firestore (con auth anónima): `convocatoria/state`, `backup`, `permanent`, `_meta` (alwaysPresent, statusEdits, lineup, availability), `plantel/activo.numeros`, `news/featured_players_history`, `news/player_of_week_history`. Los docs fechados `convocatoria/2026-…` son historial y no se tocan.
6. Noticias ya publicadas (`noticias-data.js`): no se tocan. Regla para la rutina en `reglas-noticia-diaria.md`.

Una pestaña de convocatoria abierta desde antes del cambio todavía tiene el nombre viejo: si guarda, puede volver a escribir `CipriMancini` en el estado. Recargar las pestañas abiertas; si reaparece, repetir el paso 5.
