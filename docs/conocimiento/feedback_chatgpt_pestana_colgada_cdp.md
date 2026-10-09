---
name: feedback_chatgpt_pestana_colgada_cdp
description: Imágenes diarias sin generar — una pestaña colgada en el Chrome CDP (ej. Kick) hace que connectOverCDP no conecte nunca; el log dice "Chrome no está disponible" aunque Chrome está abierto
type: feedback
---

Síntoma (2026-10-09): `scripts/daily-images.log` muestra 3 intentos seguidos con `Chrome no está disponible en localhost:9222`, pero el Chrome con CDP está abierto y `localhost:9222/json/version` responde.

Causa: el Chrome del puerto 9222 también se usa para Kick/redes. La pestaña "Profile - Kick Streaming" estaba colgada (no contestaba ni `Runtime.evaluate`). `chromium.connectOverCDP()` se engancha a todas las pestañas y espera a cada una, así que vencía a los 30 s. El script se tragaba el error real y mostraba el mensaje genérico.

**Why:** una sola pestaña ajena colgada tiraba la tanda entera de imágenes del día, y el mensaje de error mandaba a buscar el problema en el lugar equivocado.

**How to apply:**
- `generate-image-chatgpt.mjs` ahora llama a `closeHungTabs()` antes de conectarse: prueba cada pestaña por websocket CDP y cierra las que no responden en 8 s. Además loguea el error real del connect.
- Para diagnosticar a mano: hacer `curl localhost:9222/json/list` y mandarle `Runtime.evaluate` al `webSocketDebuggerUrl` de cada pestaña. La que no contesta se cierra con `curl localhost:9222/json/close/<id>`.
- Ver también [[feedback_chatgpt_ventana_minimizada]] (el otro modo de cuelgue del mismo Chrome).
