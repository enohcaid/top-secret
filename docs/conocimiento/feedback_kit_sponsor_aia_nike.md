---
name: kit-sponsor-aia-nike-si-va
description: El sponsor AIA y el swoosh de Nike SI forman parte del kit real del club — nunca instruir al generador de imagenes que los quite
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-11T15:39:01.494Z
---

El kit oficial de Top Secret FC (el que se ve en `logos/T3 Kits.png`) incluye sponsor **"AIA"** en el pecho y **swoosh de Nike** (proveedor técnico) en camiseta/short/medias — son elementos REALES de la identidad del club, no artefactos del videojuego a descartar.

**Corrección repetida por el usuario (2026-08-11, "ya hice esta corrección varias veces")**: en algún momento se coló en el pipeline de `scripts/generate-image-chatgpt.mjs` la instrucción de que "AIA" y el swoosh de Nike eran "sponsors falsos que vienen del videojuego" y había que quitarlos al generar imágenes con ChatGPT. Es un error — hay que reproducirlos fielmente, no eliminarlos. Ya corregido en el código (prompt de generación y de evaluación) el 2026-08-11, pero si en el futuro alguien reintroduce una regla de "sin sponsors/logos de marca" para el kit del club, es INCORRECTA — revertirla.

**Qué SÍ sigue siendo un error real (no confundir con lo anterior):**
- Un sponsor distinto de "AIA" (ej. "Emirates").
- Un logo de marca deportiva que no sea Nike.
- El escudo o la identidad de un CLUB REAL (Tottenham, Real Madrid, Boca, etc.) en vez del escudo circular de Top Secret FC — el corte/plantilla del kit en el videojuego a veces se parece visualmente al de un club real, pero el escudo y el sponsor son los propios del club.

**Cómo aplicar:** cualquier prompt o criterio de evaluación de imágenes que mencione "AIA" o "Nike" en el contexto del kit del club debe tratarlos como ELEMENTOS A CONSERVAR, nunca a quitar. Ver también [[reference_kit_crop_generate_image.md]] para el mecanismo de recorte de kits que reemplaza el póster de 3 kits por una sola prenda ya elegida por el script.
