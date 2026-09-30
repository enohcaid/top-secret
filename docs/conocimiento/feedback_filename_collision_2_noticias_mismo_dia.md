---
name: filename-collision-2-noticias-mismo-dia
description: generateImage() nombraba las imagenes solo por fecha — 2 noticias el mismo dia pisaban las imagenes entre si
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-11T16:20:39.978Z
---

**Bug real (2026-08-11):** `scripts/generate-image-chatgpt.mjs` nombraba los archivos de imagen como `${fecha}_post.png` / `${fecha}_story.png` (ej. `2026-08-11_post.png`). Ese día se publicaron 2 noticias (la previa automática de la mañana "MARTES DE GUERRA" + una de resultados generada a mano a la tarde) — la segunda corrida sobreescribió en disco las imágenes de la primera, que ya estaba publicada. El sitio quedó mostrando la imagen equivocada en el artículo de la mañana sin que nada fallara ni avisara.

**Fix aplicado:** el nombre de archivo ahora usa `draft.id` (único por artículo, ej. `auto-2026-08-11-resultados`) en vez de solo la fecha, con fallback a fecha si el draft no tiene `id` (mantiene compatibilidad con los scripts one-off que arman un draft sintético `{date}` sin id). Ver `fileSlug` en `generateImage()` y en `main()`.

**Cómo aplicar en el futuro:** si en algún momento se genera más de una noticia el mismo día calendario (pasa cada vez que se dispara la rutina diaria a mano fuera de su horario habitual, como en este caso), verificar SIEMPRE después que:
1. Los archivos en `Renders/Daily News/` tengan nombres distintos por artículo (no solo por fecha).
2. El KV `published_noticias` (`GET /published-noticias`) tenga `imagePost`/`imageStory` apuntando cada uno a SU propio archivo, no al mismo path que otro artículo del mismo día.
Si hace falta recuperar una imagen pisada: `git log --oneline -- "Renders/Daily News/<archivo>.png"` para ver los commits que tocaron ese path, y `git show <commit>:"Renders/Daily News/<archivo>.png" > archivo.png` para extraer la versión vieja antes del pisado.
