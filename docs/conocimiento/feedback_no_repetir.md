---
name: feedback_no_repetir
description: Regla de Juan (2026-10-27) — no repetir conceptos, lugares ni composiciones en poco tiempo; que algo le guste no significa repetirlo; vale para fotos de noticias, temas de Thrive, piezas de redes
metadata:
  type: feedback
---

"Hay que tener cuidado con no repetir conceptos. Que me guste algo no significa que hay que hacer todo igual; cualquier concepto complejo me puede gustar, pero si noto algo repetido ya no sirve." (Juan, 2026-10-27, después de que las noticias del 26 y del 27 salieran las dos con el equipo en el túnel.)

**Why:** la repetición se nota enseguida y le quita valor a todo. Del 20 al 27/10 el túnel apareció en 4 de 8 fotos de noticias: la descripción de la escena que escribe la nota manda sobre la rotación de estilos y nadie le avisaba qué se había usado.

**How to apply:**
- Cada proceso automático que crea algo (foto, tema, pieza) tiene que **recibir lo que se hizo en los últimos días** y **controlar con código** que no se repita; no alcanza con pedirlo en el texto del encargo.
- Noticia diaria (`scripts/noticia-diaria.mjs`): recibe `escenas_recientes` (lugar de cada día, de `news/image_style_history`) e `imagenes_recientes` (la escena pedida, que ahora se guarda en `recent_topics.escena`). Se rechaza un lugar usado en los últimos 3 días.
- Thrive (`scripts/beats/thrive.mjs`): se rechaza un título o un rasgo psicológico ya usado. Además, el concepto y el beat reciben la lista de los anteriores.
- Si algo gustó (un recurso, una toma, un tipo de foto), se puede volver a usar **espaciado**, no como fórmula. Ver también [[feedback_composicion_musical]] (punto 4: "tampoco convertir el hallazgo en muletilla").
