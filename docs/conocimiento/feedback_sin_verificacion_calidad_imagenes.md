---
name: sin-verificacion-calidad-imagenes-diarias
description: "generate-image-chatgpt.mjs ya no evalúa con ChatGPT Vision ni reintenta por formato en el flujo default — un solo intento por imagen, revisión humana en el preview de publicación"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-09-09T15:14:11.133Z
---

Decisión explícita del usuario (2026-09-09): sacar la verificación de calidad automática del flujo default (sin `--review`) de `scripts/generate-image-chatgpt.mjs`. Antes, cada imagen (post y story) pasaba por `evaluateImage()` (ChatGPT Vision devolviendo "APROBADA"/"RECHAZADA — motivo") y por un chequeo mecánico de proporción (`imageRatio()`) que, si fallaba, mandaba una corrección como seguimiento del mismo chat y regeneraba — hasta `MAX_ATTEMPTS` (post) o 3 intentos (story). Ahora genera UN solo intento de contenido por imagen, con el prompt de `buildPrompt()`/`buildResizePrompt()` como única fuente de verdad (ya especifica identidad de jugadores, color de kit, proporción y título). El chequeo de `imageRatio()` se mantiene SOLO como log de diagnóstico — ya no dispara regeneración. Los reintentos que quedan (hasta `MAX_ATTEMPTS`) son exclusivamente por fallas TÉCNICAS de generación (red, la página del proyecto de ChatGPT que no cargó — ver [[project_topsecret_tareas_imagenes]]), nunca por calidad del contenido.

**Por qué:** el usuario decide si la imagen sirve o no en el preview de publicación (el flujo de noticias.html/admin antes de publicar), no ChatGPT — la evaluación automática ya no aporta valor si de todos modos hay revisión humana después, y el ciclo de corrección (múltiples generaciones + evaluaciones de Vision, cada una de varios minutos) era buena parte de por qué cada corrida podía volverse lenta y trabarse.

**Cómo aplicar:**
- Si en el futuro se propone reintroducir una verificación automática (de calidad o de formato) al flujo default, chequear esta memoria primero — fue una decisión explícita, no un descuido ni una regresión a arreglar.
- El modo interactivo `--review` (revisión humana en vivo: abre la imagen, pregunta si está bien, si no pide feedback y lo manda como seguimiento del mismo chat) se mantuvo intacto — es la vía para iterar cuando alguien corre el script a mano y quiere dirigir el resultado él mismo.
- `evaluateImage()` y `buildEvalPrompt()` NO se borraron del archivo (siguen exportados) porque varios scripts one-off (`sesion-t3-once.mjs`, `fixture-vpug-t6-once.mjs`, `reclutamiento-post-once.mjs`, etc.) los importan directamente para sus propios flujos manuales — solo se dejaron de llamar desde `main()`, el pipeline automático diario.
