---
name: feedback_una_publicacion_por_red
description: Juan (2026-10-23): noticia y video sobre lo mismo = UNA publicación por red, no dos; se unifican sin descartar nada
metadata:
  type: feedback
---

**Regla:** si una noticia y un video cuentan lo mismo (p. ej. la salvada de Cabers14 del 22/10), van en **un solo lote y una sola publicación por red**, sin descartar contenido:
- **Sitio:** la nota con el video adentro (`{ video, poster, vertical: true, caption }` en el body; noticias.html lo muestra en 9:16).
- **Instagram:** carrusel foto con título + video (`meta.mjs ig-carrusel` acepta .mp4 desde 2026-10-23); una sola historia (el video).
- **Facebook:** el video con el texto y el link a la nota; una sola historia (el video).
- **X:** el video con el link a la nota. **TikTok** y **YouTube Short:** el video.

**Why:** "2 publicaciones es mucho" — salían la noticia y el reel por separado en cada red.

**How to apply:** al producir una pieza de video sobre un hecho que también tiene nota, armar un lote único (`tipo: 'noticia'`, `publicarA` = ahora) en vez de `noticia-lote.mjs` + el lote del video. Ver el lote `salvada-cabers14-2026-10-23`.
