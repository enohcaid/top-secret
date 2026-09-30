---
name: youtube-canal-oficial-tsfc
description: "Top Secret FC lanzó su canal oficial de YouTube (@TOPSecretFC) el 2026-08-09 — contenido de video del club, reportes de partido incluidos"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-09T20:48:07.923Z
---

El 2026-08-09 el club abrió su canal oficial de YouTube: `https://www.youtube.com/@TOPSecretFC`. Primer video: "Resumen Semanal #1" (`https://youtu.be/GGgiX_QBIh4`), compilación de goles de la primera semana de la Temporada 3.

**Qué se sube ahí:** compilaciones de goles, resúmenes semanales, y — desde el lanzamiento — también los **reportes de partido** (que hasta entonces iban al canal personal `@zitrion`, ver [[feedback_report_workflow]]).

**Integración en el sitio (commit 7c6890d, 2026-08-09):**
- Noticia fijada (`pinned:true`, id `youtube-resumen-semanal-1` en `noticias-data.js`) conmemorando la apertura del canal — el video está embebido y es **jugable directo en el card destacado** de `noticias.html` (campo `videoId` en la entrada; `renderFeatured()` arma un `<iframe>` de YouTube en vez de la imagen estática cuando ese campo existe).
- Burbuja de YouTube (roja, `.sr-yt`) agregada al sidebar social en `layout.js`, junto a Instagram/X/Facebook/WhatsApp — enlaza directo al canal.
- Banner de canal ya generado y commiteado en `logos/YouTube Banner TOP Secret FC.png` (2560x1440, ver [[project_topsecret_tareas_imagenes]] por el gotcha del pipeline de generación).

**Si se sube un nuevo video destacado en el futuro:** seguir el mismo patrón (agregar `videoId` a la entrada de `NOTICIAS`, no hace falta tocar `renderFeatured()` de nuevo — ya soporta cualquier `videoId`).
