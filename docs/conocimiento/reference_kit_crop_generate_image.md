---
name: kit-crop-generate-image
description: "generate-image-chatgpt.mjs recorta un solo kit de T3 Kits.png en vez de mandar el poster completo con los 3 — el script elige el color, no ChatGPT"
metadata: 
  node_type: memory
  type: reference
  modified: 2026-08-11T15:39:35.799Z
---

**Problema que esto resuelve (2026-08-11):** el pipeline diario de imágenes (`scripts/generate-image-chatgpt.mjs`) adjuntaba `logos/T3 Kits.png` completo (los 3 kits — negro/blanco/amarillo — puestos en 3 jugadores distintos, lado a lado) y le pedía a ChatGPT por texto que "eligiera" cuál usar. Salía mal seguido: mezclaba elementos entre los tres, o directamente copiaba el kit tal como viene en el render del jugador (que trae texturas/cortes del videojuego) en vez de la referencia canónica. El usuario pidió explícitamente que el SCRIPT haga la selección y recorte la prenda exacta, no que quede "librado al azar".

**Solución implementada:** en `generate-image-chatgpt.mjs`:
- `KIT_COLORS` (array de 3: negro/blanco/amarillo) define, para cada uno, la región de recorte dentro de `T3 Kits.png` (imagen de 941×1672 — coordenadas medidas a mano: `KIT_CROP_TOP=385`, `KIT_CROP_BOTTOM=1580`, y un rango `x`/`w` por kit) y la descripción canónica del diseño (incluye sponsor "AIA" y swoosh de Nike — ver [[feedback_kit_sponsor_aia_nike.md]], NO quitarlos).
- `cropKitImage(kitId)` usa `sharp` para extraer esa región a un PNG temporal (`os.tmpdir()/ts-kit-<color>.png`), regenerado en cada corrida.
- `pickKitColor(history)` — el SCRIPT elige el color (rotación anti-repetición contra las últimas 2 corridas, mismo patrón que `pickStyle()`/`IMAGE_STYLES`), guardado en Firestore `news/kit_color_history` vía `fetchKitHistory()`/`saveKitHistory()`.
- El flujo en `main()`: `chosenKit = pickKitColor(await fetchKitHistory())` → `kitCropPath = await cropKitImage(chosenKit.id)` → se adjunta `kitCropPath` (NO `KITS_PATH`) al mensaje de generación → `buildPrompt(draft, mentioned, chosenStyle, chosenKit, correction)` y `buildEvalPrompt(chosenStyle, draft, mentioned, chosenKit)` ahora reciben `chosenKit` y describen/evalúan SOLO ese color, no los 3.
- Después de una generación exitosa: `saveKitHistory(chosenKit.id, dateStr, kitHistory)`.

**Si se reemplaza `T3 Kits.png` por una versión nueva:** las coordenadas de `KIT_COLORS` (`x`/`w`/`KIT_CROP_TOP`/`KIT_CROP_BOTTOM`) hay que volver a medirlas a mano sobre el archivo nuevo — no son genéricas, están calculadas sobre el layout específico de esa imagen (verificado visualmente recortando y revisando cada franja antes de fijarlas).

**Reutilizable en otros scripts:** `KIT_COLORS`, `cropKitImage`, `pickKitColor`, `fetchKitHistory`, `saveKitHistory` están exportados desde `generate-image-chatgpt.mjs` — cualquier script one-off que necesite un kit específico (en vez de dejarlo a elección de ChatGPT) puede importarlos en lugar de reinventar la lógica.

**Pendiente / no cubierto por este cambio:** la infografía grande `logos/Indumentaria TOP Secret T3.png` (colección completa: entrenamiento, formal, casual, invierno, fanwear — usada en `sesion-t3-once.mjs`) sigue sin recorte programático, solo tiene descripciones de texto por sección ("sección 1", "sección 2", etc.). Si un futuro one-off vuelve a mostrar comportamiento errático eligiendo prendas de esa hoja, aplicar el mismo patrón: medir las coordenadas de cada ítem individual y recortar con `sharp` antes de adjuntar.
