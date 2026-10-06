---
name: reference_noticias_en_redes
description: Cómo sale una noticia a las redes desde el sitio — paso "Publicar en redes" con revisión por red, piezas con título, publicación automática desde la PC
metadata:
  type: reference
---

**Desde 2026-10-06** las noticias se publican en las redes desde el propio sitio, con un paso de revisión (pedido de Juan: "un paso que me muestre qué se publica en cada sitio" + opción de publicar en todas). **Sin música** (decisión de Juan: las noticias salen como imagen; la regla de música única es para los videos, ver [[feedback_musica_unica]]).

**Qué sale en cada red** (criterio: donde hay link con vista previa, la foto va limpia; donde no hay link tocable, la imagen lleva título):

| Destino | Pieza | Texto |
|---|---|---|
| Instagram · post | foto + título (1080×1350) | `shareCaptions.ig` + "Nota completa en el sitio: link en la bio." |
| Instagram · historia | foto + título + "NOTA COMPLETA · LINK EN LA BIO" (1080×1920, texto fuera del 20% inferior) | — |
| Facebook · post | link a `/og/<id>` (vista previa: foto limpia + título) | `shareCaptions.fb` |
| Facebook · historia | la misma historia | — |
| X | texto + link a `/og/<id>` (tarjeta con la foto) | `shareCaptions.x` (≤280, el link cuenta 23) |

**Flujo:**
1. noticias.html → "Publicar" en el borrador → se publica en el sitio y se abre el paso "Publicar en redes" (`noticias-redes-ui.js`). También desde el modal Compartir de cualquier noticia → "Publicar en redes" (pide el PIN).
2. Las piezas con título las dibuja `noticia-redes.js` (canvas, en el navegador): título corto (`tituloImagen` del draft si existe, si no la parte del título antes de ':'), editable en el paso; gamertags tal cual y en dorado; escudo Clean blanco arriba del título. Usa las fotos **sin escudo** (`imagePostRaw`/`imageStoryRaw`, R2 `Renders/Daily News/raw/`); sin ellas usa la publicada (que ya trae el escudo en una esquina) y no suma otro.
3. Worker `POST /redes-publicar` (PIN): guarda las piezas en R2 `logos/noticias/redes/<id>-ig.jpg|-historia.jpg` y el pedido en KV `redes_job` (rechaza otro mientras haya uno en curso). `GET /redes-estado` devuelve el pedido con el estado de cada destino; el sitio lo sigue cada 4 s.
4. La PC: `watch-regen.ps1` (cada minuto) consulta `/redes-estado` y, si hay algo en cola, corre `node scripts/publicar-noticia-redes.mjs`: Instagram/Facebook por `scripts/meta.mjs` (`ig-imagen`, `ig-historia`, `fb-link`, `fb-historia`), X por el Chrome con CDP. Escribe el estado en KV por la API de Cloudflare (`CF_*` + `KV_NAMESPACE_ID` del `.env`). Log en `scripts/daily-images.log`. **Requiere la PC prendida con sesión iniciada** (y el Chrome CDP para X).
- Probar sin publicar: `node scripts/publicar-noticia-redes.mjs --prueba` (crea los contenedores de Instagram, escribe y borra el texto en X; Facebook no valida en prueba). Ver el pedido actual: `--estado`. Piezas locales: `node scripts/noticia-redes.mjs [--id <id>] [--titulo "…"]`.

**Regla de Juan (2026-10-06): el logo va en TODAS las publicaciones.** Cobertura: foto del sitio/OG (estampada por el generador → también la vista previa de Facebook y X), piezas con título (escudo en el bloque del título; si la foto no es de la noticia diaria —noticias manuales— también), descargas del modal Compartir (`TSRedes.limpia`: foto sola + escudo en la esquina más limpia con halo; historia sin foto vertical = la foto sobre fondo desenfocado 9:16). Las placas viejas de expediente (`share-cards.js`) ya no se usan.

**Escudo en la foto limpia** (`stampCrest` en generate-image-chatgpt.mjs): solo esquinas reales (corrido hacia adentro quedaba al lado de un jugador del fondo), elige la de menos luces/bordes, halo oscuro difuso detrás para el contraste; en historias respeta 14% arriba / 20% abajo. Estampa siempre sobre la copia limpia de `fuentes/daily-news-raw/` (re-estampar no acumula escudos).

**Caché:** `/media` es immutable por URL — las imágenes de la noticia llevan `?v=` (si no, una regenerada con el mismo nombre seguía saliendo vieja, también para Instagram).
