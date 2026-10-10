---
name: project_ronda_redes
description: Ronda de redes de las 14:00 — contenido distinto por red (carrusel, Reel, Short, TikTok, X, Facebook) con datos reales, aprobado por Juan en aprobar.html (la página única de aprobación) y publicado solo por la PC
metadata:
  type: project
---

Plan de Juan (2026-10-09): generar contenido propio para cada red con los formatos que más rinden, para ganar visibilidad.

**Decisiones de Juan:**
- **Revisa él todo antes de publicar**, siempre en la MISMA página: `aprobar.html` (sin link en el menú, pide el PIN de admin). Se le abre sola en el navegador predeterminado cuando el lote está listo.
- **Ritmo:** el día siguiente a cada jornada + los sábados (repaso semanal); si pasan más de 2 días sin ronda, igual sale una. Hora: 14:00.
- **No limitarse a lo que ya existe:** crear lo necesario (diseño, animación, imágenes, renders) para que el contenido sea de calidad.
- Música: el tema original del día ([[reference_beats_propios]]), uno distinto por video ([[feedback_musica_unica]]).

**Cómo funciona (scripts/social/):**
- `ronda.mjs` (tarea `TopSecretFC-RondaRedes`, 12:30, log `scripts/ronda-redes.log`): decide si toca, arma las piezas, pide los textos a Claude (`textos-encargo.md`, reglas por red), sube a R2 `social/<fecha>/`, deja el lote en KV `aprobaciones` y abre la página. `--fecha`, `--forzar`, `--no-abrir`, `--sin-textos`.
- Formato actual: **"La semana/jornada en datos"** (`formatos/semana.mjs` + `plantillas/semana.html`): 6 escenas (portada con goleadores, resultados con escudos, goleadores, mejor promedio, el equipo en números, lo que viene) como carrusel 4:5 y como video 9:16 de ~25 s (cuadros renderizados con Playwright, animación determinística `mostrar(n, t)`, ffmpeg + música). Datos: `lib/datos.mjs` (seed_matches.js + VPUG_T4_SCHEDULE/BADGES de convocatoria.html).
- Piezas por red: Instagram carrusel + Reel, Facebook álbum (video opcional, viene descartado), X post con 4 imágenes, TikTok, YouTube Short.
- `publicar.mjs` (watch-regen, cada minuto): publica lo **aprobado** cuando llega `publicarA` (meta.mjs, publicar-video.mjs, X con imágenes por CDP) y anota estado/link en el lote y en KV `social_historial`.
- Worker: `GET /aprobaciones` y `POST /aprobaciones/decidir` (PIN). Lotes nuevos de cualquier tipo van al mismo KV para salir en la misma página.

**Cambio 2026-10-09 (Juan):** "La semana en datos" le gustó más que la nota de balance semanal y la REEMPLAZA: los sábados `resumen-semanal.mjs` (tarea `TopSecretFC-ResumenSemanal`, sábados 08:00, sale a las 11:00) arma redes + **noticia del sitio** (pieza `sitio`: título y 4 párrafos editables en aprobar.html; `publicar.mjs` la mete en KV `published_noticias` con las placas adentro). La rutina diaria ya no escribe BALANCE_SEMANAL: los sábados sin resultado ni previa no hay nota (y `run-daily-images.ps1` lo toma como normal). La **ronda de las 14:00 es para contenido viral nuevo, distinto de lo que hacemos siempre** (pedido de Juan: buscar qué es viral en general, no solo en Pro Clubs, y adaptarlo); su tarea `TopSecretFC-RondaRedes` queda deshabilitada hasta tener esos formatos.

**Esquema de publicaciones automáticas (2026-10-10, Juan: "todo aprobado, armá un esquema"):**
| Cuándo | Qué | Cómo se arma |
|---|---|---|
| Todos los días, mañana | Noticia del día (sitio + redes desde noticias.html) | rutina cloud 06:00 + imágenes 06:10 |
| Sábado 11:00 | "La semana en datos" (sitio + todas las redes) | `resumen-semanal.mjs` sábado 08:00 → aprobar.html |
| Martes, jueves y sábado 14:00 | Contenido viral (un lote por turno) | se produce cada pieza (`scripts/social/piezas/`), se aprueba en aprobar.html y `publicar.mjs` la **agenda sola** en el próximo turno libre (≥3 h de margen) |
| 04:00 | 2 temas musicales originales | `diario.mjs --parte 1/2` |
Calidad > cantidad: un turno sin pieza aprobada queda vacío. Cada video con su tema propio (`elegirMusica`). Primera semana: martes 13/10 "Cabeza fría", jueves 15/10 antes y después (`piezas/semana-2026-10-12.mjs`); sábado 17/10 documental del arquero bot y martes 20/10 "Mi reacción a…" cuando se produzcan (guiones aprobados, con los comentarios de Juan en el lote `viral-guiones-2026-10-12`).

**Pendiente:** formato "gol de la fecha" (los clips del vigía todavía no son confiables: del 8/10 no quedó ninguno), formatos para días sin partido, métricas por red (Instagram devuelve likes pero no alcance/vistas: al token le falta `instagram_manage_insights`), migrar el paso "Publicar en redes" de noticias a aprobar.html.
