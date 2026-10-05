---
name: reference_placa_convocatoria
description: Link /c/<fecha> del Worker — vista previa de WhatsApp con la placa del día (captura de calendario.html?placa vía Cloudflare Browser Rendering)
metadata:
  type: reference
---

- **Link para compartir:** `https://top-secret-proxy.juan-c-m-1985.workers.dev/c/<YYYY-MM-DD>` → HTML con OG (`og:image` = `/placa/<fecha>.jpg`, 1200×630) y redirect a `convocatoria.html`. El botón Compartir de `calendario.html` ya manda este link. `convocatoria.html` también declara `og:image` = `/placa/hoy.jpg` para quien pegue el link común.
- **Imagen:** `calendario.html?placa` dibuja la placa (`calendario-share.js`) y marca `#placa-ready`; el Worker (`generarPlaca`) le saca captura con Browser Rendering (REST `/browser-rendering/screenshot`, JPEG q82, ~8 s) y la guarda en R2 `og/placa/<fecha>.jpg`. Se regenera: cron cada 30 min entre 9 y 24 ART, al pedirla si tiene más de 15 min (sirve la vieja y renueva de fondo), y `POST /placa/refresh` desde el botón Compartir. Lock en KV `placa_lock`.
- **Requisitos:** secreto del Worker `CF_BR_TOKEN` (token API con permiso "Browser Run Write/Read") + binding plain_text `CF_ACCOUNT_ID` (lo pone `deploy-worker.mjs`). Sin token, `/placa/*` sirve lo que haya en R2 o redirige a `logos/og/og-convocatoria-v2.jpg`.
- **Horizontal 1200×630 (`buildWide`), no la 4:5:** con imagen vertical WhatsApp muestra una miniatura chica al costado; la vista previa grande solo sale con proporción ~1.91:1.
- **JPEG, no PNG:** el PNG pesaba ~770 KB; WhatsApp no muestra vistas previas pesadas (~300 KB).
- Plan gratis de Browser Rendering ≈ 10 min de navegador por día; ~30 capturas × 8 s entran holgado.
