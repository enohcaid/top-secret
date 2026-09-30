---
name: auto-noticias-cutoff
description: auto-noticias.js ya no genera noticias de resultados para T3 en adelante (AUTO_NEWS_CUTOFF) — evita duplicar los artículos reales del pipeline diario
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-10T03:42:38.169Z
---

`auto-noticias.js` (`generateMatchNews`) no es una tarea programada — es una función que corre en el navegador (importada por `noticias.html` e `index.html`) y generaba una tarjeta "Resultados" por cada fecha con `match_result` en `SEED_MATCHES`, con imágenes genéricas (`logos/victoria/festejo*.png`, `logos/empate/*`, `logos/derrota/*`). No se comparaba por fecha contra los artículos reales del pipeline diario (KV, `window._KV_NEWS`) — solo por id exacto (que nunca coincidía: `resultados-2026-08-03` vs `auto-2026-08-03`) — así que para toda fecha de T3 ya cubierta por el pipeline diario (imagen generada por IA) aparecía DUPLICADA con la vieja de imagen genérica.

**Fix (2026-08-10, commit e222e6c):** constante `AUTO_NEWS_CUTOFF = '2026-08-03'` (arranque de T3) dentro de `generateMatchNews` — filtra cualquier match con fecha >= ese corte, así el fallback genérico deja de generarse para T3 en adelante (el pipeline diario cubre todo). Las ~41 tarjetas de T1/T2 (marzo-junio, sin otra cobertura) siguen intactas — el usuario pidió explícitamente conservarlas.

**Si el pipeline diario alguna vez deja de cubrir un día** (falla la rutina cloud, no se genera imagen, etc.), ese partido va a quedar SIN ninguna noticia de resultado — el fallback ya no se activa para fechas >= el corte. Es el trade-off aceptado; no agregar de nuevo el fallback automático "por las dudas" sin que el usuario lo pida.
