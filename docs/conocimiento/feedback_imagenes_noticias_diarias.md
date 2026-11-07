---
name: feedback-imagenes-noticias-diarias
description: Criterios de calidad para las imágenes diarias de noticias de Top Secret FC (post + story)
metadata: 
  node_type: memory
  type: feedback
---

Lo que funciona bien (mantener):
- Cantidad de texto justa — no sobrecargar la imagen
- Buena mezcla de colores (oscuros + dorado del club)
- Jugadores bien posicionados y con buena ambientación

Lo que hay que mejorar:

**1. Variedad de jugadores**
No repetir siempre los mismos renders. Rotar entre todo el plantel disponible en `Renders/`.

**Why:** El usuario notó una tendencia a usar siempre los mismos jugadores, lo que hace las imágenes predecibles.

**2. Eliminar la barra negra inferior "NOTICIAS | TOP SECRET FC"**
La barra negra con ese texto es redundante ahora que las placas/logos ya identifican al club.

**Why:** Ocupa espacio útil y repite información que ya está en otro lugar de la imagen.

**How to apply:** No incluir esa barra en el prompt de generación. Si la herramienta la agrega por defecto, indicar explícitamente que no la incluya.

**3. Variar el fondo / locación**
No usar siempre el túnel de salida al campo como fondo. Explorar otras locaciones de estadio:
- Vestuario
- Grada vacía / platea
- Terreno de juego con luces encendidas
- Exterior del estadio de noche
- Sesión de entrenamiento
- Zona mixta / sala de prensa

**Why:** El fondo del túnel se repite demasiado y hace las imágenes monótonas.

**4. Variar posturas de jugadores**
No siempre caminando hacia cámara. Explorar:
- Celebrando gol
- En postura táctica / concentrado
- Calentando
- En acción de juego
- Mirando a cámara directamente

**How to apply:** Mencionar explícitamente la postura deseada en el prompt de generación según el tono de la noticia.

**5. Dorsales espejados/invertidos (2026-07-15)**
El generador de ChatGPT invirtió números de camiseta (ej. "10" → "01", dígitos en espejo).

**Why:** Artefacto común de generadores de imágenes con texto/números.

**How to apply:** Ya hay reglas en `scripts/generate-image-chatgpt.mjs` (prompt de generación + evaluador rechaza dorsales espejados). Al revisar imágenes generadas, verificar los dorsales visualmente.

**6. Kits de clubes reales con sponsors (2026-07-15)**
El generador produjo una réplica exacta de la camiseta del Tottenham (sponsor "AIA" + Nike) como "kit blanco" del club — el evaluador la aprobó porque el color era válido.

**Why:** "Camiseta blanca" sin más restricción hace que el modelo recurra a kits reales famosos que conoce.

**How to apply:** Ya hay reglas en el prompt y evaluador (prohibidos sponsors reales y diseños de kits de clubes existentes; solo el diseño de "T3 Kits.png"). Al revisar imágenes, chequear que la camiseta no tenga sponsor ni sea reconocible de un club real.

**7. Jugadores inventados y festejo repetido (2026-10-08)**
La portada del 08/10 (NicoBJ_96) repitió la del 06/10 (nikileo527): de rodillas en el césped, brazos abiertos, estadio de noche, con compañeros genéricos corriendo atrás que no son del plantel. Causas: el `imageBrief` de la rutina ("bajo los reflectores… con el plantel corriendo hacia él") le pasaba por encima al estilo sorteado (ese día era RETRATO_EDITORIAL), y el prompt permitía "jugadores genéricos de relleno".

**How to apply** (ya en `scripts/generate-image-chatgpt.mjs`):
- En la imagen solo aparecen jugadores con render adjunto; prohibido el relleno. Si el brief pide plantel/compañeros, `selectTeammates()` suma hasta 2 compañeros reales (primero los que nombra la nota, después los que hace más que no salen; nunca arqueros).
- El estilo del día define lugar, encuadre y luz; del brief se toma quién y qué emoción.
- `pickGesto()` elige el gesto de festejo y rota contra los últimos 3 (campo `gesto` en `news/image_style_history`); el de rodillas en el césped está prohibido explícitamente.

**8. Renders con escudo defectuoso**
`Renders/NicoBJ_96/Gesto4.png` salió de ChatGPT con un escudo inventado (caja/casco amarillo) en camiseta y short; se emparchó con el Clean logo Dorado (original en `Renders/_descartes-gesto4/NicoBJ_96-escudo-mal.png`). `logos/noticias/plantel-t4/<gt>.webp` = recorte 1080×1350 desde y=120 de la base dorada de `fuentes/video-plantel/Gesto4/<gt>.png`, a 720×900. Al generar poses nuevas, mirar el escudo de cerca antes de usarlas.

**9. Siempre 5 jugadores, mismo encuadre, sin profundidad (2026-11-07) — reemplaza la regla del 29/10**
Juan: "no puede ser que siempre haya 5 jugadores en 5 fondos rotativos, con el mismo enfoque de cámaras, sin profundidad, sin vida". La regla del 2026-10-29 (exactamente 5 jugadores, plano general a la altura de los ojos, prohibidos primer plano/picado/contrapicado) queda **anulada**.

**How to apply** (ya en `scripts/generate-image-chatgpt.mjs`):
- `pickPlano()` elige la cámara del día de `PLANOS` (tele desde la tribuna, a ras del césped, entre jugadores, de espaldas, plano medio 85mm, general abierto, detalle en primer plano, picado suave, cámara en mano) sin repetir las últimas 4, y la cantidad de jugadores (1 a 5) según la `toma` de la nota (`CANTIDAD_POR_TOMA`), distinta de la del día anterior. Se guardan `plano` y `n` en `news/image_style_history`; la nota diaria los ve en `escenas_recientes`.
- El prompt exige tres planos de profundidad (algo cerca de cámara, jugadores, fondo) y prohíbe la fila de jugadores frente a un fondo plano.
- Lugares nuevos además de los 6 de siempre: banco de suplentes, entrenamiento de día, lluvia, atardecer, precalentamiento, estadio vacío (regex en `STYLE_FROM_BRIEF`, `LUGAR` y validador en `noticia-diaria.mjs`, lista en `noticia-diaria-encargo.md`). Un lugar nuevo tiene que entrar en los cuatro lados.
- El encargo ya no pide 5 jugadores: la nota nombra 1 a 3 protagonistas y el sistema completa.
