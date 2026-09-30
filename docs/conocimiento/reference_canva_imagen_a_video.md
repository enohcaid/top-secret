---
name: canva-imagen-a-video
description: Automatización de "Imagen a video" de Canva (videos de 5 s desde una imagen) con scripts/canva-imagen-a-video.mjs vía el Chrome CDP
metadata:
  type: reference
---

`node scripts/canva-imagen-a-video.mjs <imagen> [--prompt "…" | --inteligente] [--out x.mp4] [--r2 videos/…mp4]`

- Usa el Chrome con CDP (`scripts/abrir-chrome-chatgpt.ps1`) con la **sesión de Canva iniciada** (se inició 2026-09-30 en drygan). Flujo: diseño de trabajo 1920×1080 reutilizado (URL en `scripts/.canva-design.json`, gitignored) → vacía la página → sube la imagen por el `input[type=file]` de "Subidos" → la agrega → Editar → Herramientas "Imagen a video" → "Personalizar" (textarea "Describí el efecto de movimiento ideal") → "Generar video de 5 segundos" (botón visible; hay otro oculto en la pestaña "Inteligente") → Canva deja un `<video>` con src `ingredient-generation-generated-ingredients.canva.com/…` (URL firmada, se baja directo con fetch, sin exportar).
- Tarda ~25-30 s. Sale en la proporción de la imagen (1536×1024 → 1152×768), 30 fps, 5 s, ~1,5-2 MB. Consume créditos de IA de Canva.
- **Prompt**: pedir solo movimiento de cámara y luz; nunca mencionar humo ni "respirar". Probado con la portada de kits: con esas palabras (y también en modo Inteligente) los jugadores exhalaban nubes de humo por la boca. El default `PROMPT_SEGURO` ("Travelling de cámara muy lento hacia adelante… Las personas posan inmóviles como estatuas, con la boca cerrada") salió limpio: caras, camisetas, números y escudos intactos.
- Prueba buena en R2: `videos/pruebas/kits-t4-travelling.mp4`. Revisar siempre 3 cuadros (inicio, medio, final) con ffmpeg-static antes de publicar.
- 2026-09-30: video "Nuevos fichajes T4" (reel 21 s) en R2 `videos/nuevos-fichajes-t4.mp4`; al usuario le gustó. Plantilla en `scripts/video-fichajes/` (README): para sumar una incorporación, agregarla a `jugadores.json` y correr los pasos. Clips de Canva en R2 `_fuentes/video-fichajes/`.

**Consumo / cupo (medido 2026-09-30):** Canva Pro no cuenta en "usos" sino en % de una asignación mensual compartida por todas las herramientas de IA prémium/ultra (según ayuda de Canva: Pro ≈ 200 usos prémium **o** 20 ultra). Indicador: Configuración → Facturación → "Uso de la IA" (se restablece cada mes el día anterior a la facturación; en esta cuenta, el 2). Al 30/9, tras 9 generaciones de imagen a video ese día: **36% usado**. Cota conservadora: ≤4% por video → ~25 videos/mes. El script ahora mide el consumo real: lee el % antes y después de cada video y lo registra en `fuentes/canva-uso.csv` (copia en R2 `_fuentes/canva-uso.csv`); `node scripts/canva-imagen-a-video.mjs --uso` muestra % usado, fecha de reinicio y videos restantes estimados con el promedio medido. Corta si el uso está ≥99%.
