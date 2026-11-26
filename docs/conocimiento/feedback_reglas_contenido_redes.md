---
name: feedback_reglas_contenido_redes
description: Reglas de contenido para redes desde 2026-11-26 (gancho en 125 caracteres, 3 hashtags, carrusel clave→ideas→resumen→acción, sin rayas ni muletillas de IA), adaptadas del pack instagram-agent-skill; dónde se controlan
metadata:
  type: feedback
---

Juan, 2026-11-26: "dejá todo listo para armar el contenido con estas premisas de ahora en más" (y "no rehagas nada": lo ya publicado o en aprobación queda como está).

Origen: el pack **instagram-agent-skill** de Jakeschincariol (MIT, github.com/Jakeschincariol/instagram-agent-skill). NO se instaló: está en inglés (sus scripts de ganchos y "humanizador" miran palabras en inglés) y pensado para un creador que habla a cámara. Se copiaron sus reglas de `/ig-carousel`, `/ig-caption`, `/ig-human` y `/ig-audit`.

**Reglas** (código: `scripts/lib/reglas-redes.mjs`, editable):
- **Texto de Instagram**: la primera línea (≤125 caracteres, lo que muestra el feed antes del "más") es el gancho con el dato y el nombre propio; nunca arranca con emoji ni hashtag; una sola acción; exactamente 3 hashtags al final (#TopSecretFC + juego/liga + tema); palabras que la gente busca en el texto.
- **Todos los textos de redes**: sin rayas (—) y sin muletillas de máquina (`MULETILLAS_IA`).
- **tituloImagen** (sobre la foto): 6 palabras o menos.
- **Carrusel**: portada + 5 a 9 placas: `clave` (por qué importa, se entiende sola: Instagram puede mostrar el carrusel desde la 2.ª) → 2 a 6 `idea` (título de 3 a 7 palabras, ≤25 palabras debajo, una idea por placa) → `resumen` (lista de 2 a 6 puntos, la que se guarda) → `cta` (una acción, ≤8 palabras).
- **Métricas** (`scripts/social/metricas.mjs`): mirar cuánto superó cada post a la mediana de su formato (3x o más = señal) y compartidos/guardados cada 100 alcanzados, no vistas crudas. Sin datos hasta que el token de Meta tenga `instagram_manage_insights` (ver [[feedback_tokens_todos_los_permisos]]).

**Dónde se aplican:**
- Noticia diaria: `noticia-diaria-encargo.md` le pide a Claude `tituloImagen` y `carrusel`; `noticia-diaria.mjs` controla y le devuelve los errores para que corrija (si no cumple igual, la nota se guarda con `avisos`, no se pierde). El borrador guarda `carrusel` y `tituloImagen`.
- `scripts/social/noticia-lote.mjs`: si la nota trae `carrusel` dibuja las placas (`scripts/lib/carrusel.mjs`: 4:5 con la foto de fondo → `imagenesExtra`; 9:16 sin fondo → `capasTikTok`) y avisa en el log lo que no cumpla. Instagram hasta 10 imágenes, Facebook álbum, X portada + clave + resumen + acción (máx. 4), TikTok las capas en lugar de "la ficha" y "la frase".
- Notas manuales: `node scripts/placas-carrusel.mjs --id <id> --spec <json> --fondo <foto limpia> --subir` y pegar las URLs en la nota, o poner `carrusel` directo en la entrada de `noticias-data.js` y correr `noticia-lote.mjs --id <id>`.
