---
name: feedback-portadas
description: Juan (2026-10-21): toda publicación lleva una portada pensada — la imagen que se ve apenas entrás a la red (miniatura del reel/video/short), no la que elige la plataforma
metadata:
  type: feedback
---

**Regla:** a partir del 2026-10-21, cada pieza de video (reel, video de Facebook, TikTok, Short, X) tiene que tener su **portada diseñada**: lo que se ve en el perfil/feed antes de reproducir. No se deja la que elige la plataforma (primer cuadro o uno al azar).

**Why:** pedido de Juan tras publicar el video del gol vs Sub 21 en todas las redes: "contemplemos la imagen que ilustra las publicaciones, lo que se ve apenas entrás a la red social".

**How to apply:** la portada se muestra en aprobar.html junto a la pieza para aprobarla. Qué permite cada red (verificado el 2026-10-21): Instagram reel → `cover_url` al crear el contenedor (después de publicado no se puede cambiar por API); Facebook video → miniatura propia (también después, `/{video}/thumbnails`); TikTok y YouTube Shorts → toman un cuadro del video, así que la portada va también como primeros cuadros del video (lo que ya hacían los videos de scripts/video-plantel). Ver [[feedback_calidad_contenido_redes]].

**Portada propia, nunca reciclada (Juan, 2026-10-23):** la portada de un video no puede usar la misma imagen que otra publicación del mismo día (p. ej. la foto de campaña de la noticia): en el feed se ven dos posteos iguales. Cada video lleva su imagen nueva (ChatGPT, `scripts/social/lib/imagen.mjs` → `generarImagen`), con otra escena y, si se puede, otro kit.
