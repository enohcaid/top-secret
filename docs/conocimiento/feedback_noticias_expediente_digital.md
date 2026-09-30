---
name: noticias-expediente-digital
description: "Desde 2026-09-29 las noticias de Top Secret abandonan la estética de fichero/expediente de papel; noticias.html es un \"expediente de computadora\" limpio y gráfico"
metadata:
  node_type: memory
  type: feedback
  modified: 2026-09-29T16:13:22.968Z
---

2026-09-29, pedido de Juan: "abandonaremos a partir de esta etapa las noticias con fichero y buscaremos una estética mucho más limpia y gráfica; el expediente será la sección noticias y será un expediente de computadora".

- noticias.html ahora: consola `TSFC://archivo/noticias`, IDs `EXP-AAMMDD-XX` (`expId()`), buscador + filtros por categoría normalizada (`catKey()`), destacado como ventana con barra de semáforos, visor de artículo a pantalla completa. Tipografía JetBrains Mono para metadatos.
- El `body` de NOTICIAS acepta bloques además de strings: `{h}`, `{img, caption, wide}`, `{pair:[a,b], caption}`, `{quote, by}`, `{specs:[[k,v]]}` (render en `bodyHtml()`). Referencia de estilo: notas de lanzamiento de kits del Chelsea.
- Primera nota con esta estética: `presentacion-kits-t4` (fijada), portada `logos/noticias/kits-t4-portada` en R2.

- **Regla 2026-09-29 (usuario): "a partir de ahora todas tienen que ser como esa"** — toda noticia nueva sigue el estilo de `presentacion-kits-t4` (bajada, specs, secciones {h}, imágenes grandes/pares con epígrafe, cita, cierre con link). Segunda nota así: `renovacion-web-identidad-2026` (hecha sin generar imágenes: capturas del sitio + escudos compuestos con sharp). Si no hace falta imagen nueva, usar imágenes del sitio y pegarles el logo encima.
- Placas de post IG e historia: las genera `share-cards.js` en el navegador para cualquier noticia (estética expediente + Clean dorado).

**Why:** el look de fichero (papeles, clips, sellos) quedó viejo frente al rediseño limpio del sitio (ver [[feedback_diseno_sitio_limpio]]).
**How to apply:** imágenes nuevas de noticias: foto de campaña limpia, sin texto ni collage de papeles. Al reactivar el pipeline diario (pausado por receso, [[project_topsecret_receso_pausa_tareas]]) hay que actualizar sus estilos de imagen (EXPEDIENTE_FICHA etc.) y la rutina cloud a esta estética.
