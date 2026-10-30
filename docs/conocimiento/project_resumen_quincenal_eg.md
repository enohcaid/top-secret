---
name: project_resumen_quincenal_eg
description: Resumen quincenal de Espacio Gamer (20/10–29/10/2026) — placas como noticia del sábado 31/10 y video YouTube horizontal + vertical el domingo 1/11; scripts, fuentes y trampas encontradas
metadata:
  type: project
---

Pedido de Juan (2026-10-30): video resumen de los primeros 15 días de Espacio Gamer, versión YouTube y versión Instagram/TikTok, con fotos generadas y animadas, en aprobar.html para el domingo; y la versión en placas como noticia del día del sábado (el resumen semanal del 24/10 no salió: `escribirTextos` devolvió JSON vacío dos veces y el script murió).

**Scripts** (`scripts/social/piezas/`):
- `quincena-eg-imagenes.mjs` — 5 fotos ChatGPT 16:9 (apertura, tijera, descuento, noche-dura, revancha) + animación Canva → `fuentes/redes/quincena-eg/ia/`.
- `quincena-eg-placas.mjs` — carrusel de 8 placas (`plantillas/quincena-placas.html`) + noticia del sitio + lote `resumen-2026-10-31` (08:00). El id hace que la tarea del resumen semanal de las 08:00 no arme otro.
- `quincena-eg.mjs` — video (`plantillas/quincena.html`, un solo timeline en `story` 1080x1920 y `yt` 1920x1080), voz de Elena, música de The Shorts, portada vertical + miniatura de YouTube, lote `video-quincena-eg-2026-11-01` (12:00).

**Datos**: resultados del fixture oficial de espaciogamer.cl (admin-ajax `metrica=fixture`; el HTML trae `eg-fx-marcador` con los goles). `seed_matches.js` NO tiene los partidos del 27 y 29/10: el sync de EA del Worker da 403 (`/ea-historial` → `sync.errores: "EA 403 en clubs/matches"`) y no hubo pantalla de Eventos esos días. Los goleadores del 2-1 a Parke Avellane salieron del video del vigía: Lautavester7 (1-1, gambeta al arquero) y Cabers14 (2-1 en el 90+, rebote en el área chica — a confirmar por Juan). `retransmitir.log` anota mal algunos marcadores (Miskymayu 0-0 cuando fue 0-2) y mezcla amistosos: no usarlo como fuente de resultados.

**Trampas arregladas en el camino**:
- El detector de `generate-image-chatgpt.mjs` tomó dos veces el render adjunto (1024x1536) como la imagen generada. Ahora `generateImage(..., { excludeSizes })` descarta imágenes con las medidas de los adjuntos; `lib/imagen.mjs` lo usa en los pedidos `horizontal: true` (el pipeline diario no lo pasa: sus salidas verticales miden lo mismo que los renders).
- `lib/render.mjs` `video()` acepta `formato: 'yt'` (1920x1080); `publicar-video.mjs youtube --miniatura` intenta subir la miniatura propia (pieza con `miniatura`).
- La voz de Elena dura ~0,45 s por palabra con pausas: medir cada frase (`narrar`) antes de fijar las escenas, o se encadena el atraso de `narracion()` hasta el final.
