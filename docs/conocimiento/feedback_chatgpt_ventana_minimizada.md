---
name: feedback_chatgpt_ventana_minimizada
description: Imágenes diarias sin generar — Chrome minimizado dejaba la pestaña de ChatGPT en 0x0 y generate-image-chatgpt.mjs se colgaba para siempre (timeouts infinitos)
type: feedback
---

Síntoma recurrente: la noticia del día queda sin imagen; `scripts/daily-images.log` se corta en `Adjuntos: ...` (o justo antes de enviar) sin ningún error, y el proceso `node generate-image-chatgpt.mjs` sigue vivo horas después.

Causa (diagnosticada 2026-10-07): la ventana del Chrome con CDP (puerto 9222, el mismo que se usa para Kick/redes) estaba minimizada, así que la pestaña de ChatGPT tenía viewport 0x0. Playwright nunca veía "visible" el composer, y como el script usaba `page.setDefaultTimeout(0)` (infinito), `input.click()` esperaba para siempre. El proceso no moría, así que el reintento externo de `run-daily-images.ps1` tampoco corría. El ExecutionTimeLimit de la tarea programada no ayuda, porque el .vbs termina enseguida.

**Why:** cualquier espera sin timeout convierte un problema de UI en un cuelgue silencioso de horas.

**How to apply:**
- `sendPromptInProject()` llama a `ensureWindowVisible()`: restaura la ventana por CDP (`Browser.setWindowBounds`), hace `bringToFront()` y falla rápido si el viewport sigue en 0.
- Los timeouts por acción ahora son `ACTION_TIMEOUT_MS` (2 min), y hay un watchdog de 70 min que hace `process.exit(1)` para que corra el reintento del .ps1.
- Para diagnosticar a mano: `curl localhost:9222/json/list`, y desde Playwright conectado por CDP, `page.evaluate(() => [innerWidth, innerHeight])`. Si da `[0,0]`, la ventana está minimizada.
- Recuperación: matar el node colgado y correr `node scripts/generate-image-chatgpt.mjs` (o `regen-once.ps1`).
