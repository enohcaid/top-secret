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
