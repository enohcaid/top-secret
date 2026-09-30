---
name: feedback-render-review
description: "Antes de commitear renders nuevos, revisar cada imagen visualmente y convertir JPEG a PNG"
metadata: 
  node_type: memory
  type: feedback
---

Antes de hacer `git add` y push de cualquier imagen en `Renders/`, revisar cada archivo:

1. **Leer la imagen con el Read tool** para verla visualmente
2. **Verificar fondo transparente** — debe verse el patrón de cuadros detrás del jugador
3. **Si es JPEG** → convertir a PNG con canal alfa usando System.Drawing (PowerShell), eliminar el JPEG original
4. **Si el fondo no es transparente** → avisar al usuario antes de subir

**Why:** Las imágenes se usan en composiciones de ChatGPT sobre fondos oscuros; un fondo blanco o sólido arruina el resultado.

**How to apply:** Siempre que el usuario diga "agregué imágenes, subílas" o similar, hacer la revisión completa antes del commit. Ver también [[feedback-push-images]].
