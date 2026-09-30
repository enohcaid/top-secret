---
name: feedback-chatgpt-stuck-send-button
description: "generate-image-chatgpt.mjs a veces \"envía\" un mensaje de corrección que en realidad queda escrito sin enviar en el composer de ChatGPT, y el script espera igual los 25 min completos sin que nada pase"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-26T14:08:33.324Z
---

En `sendPromptInProject()` (seguimiento de chat, `freshChat:false`), el `sendBtn.click()` de Playwright a veces no registra el envío real en la UI de ChatGPT: el texto de corrección y los adjuntos quedan visibles en el composer, pero el mensaje nunca se manda. El script no lo detecta — sigue el loop de `waitForGeneratedImage()` contando "Generando... Xs" hasta agotar los 25 min y tirar `Timeout esperando imagen`, aunque en realidad ChatGPT nunca empezó a generar nada.

**Cómo diagnosticarlo en caliente**: conectar por CDP a la página de `chatgpt.com` abierta (`chromium.connectOverCDP('http://localhost:9222')`, buscar la page con `url().includes('chatgpt.com')`), sacar screenshot o evaluar si hay `button[data-testid="stop-button"]` en el DOM (`streaming: false` = no está generando nada, aunque el log diga "Generando...").

**Cómo destrabarlo sin perder la corrida**: con la misma conexión CDP, hacer click en `button[data-testid="send-button"]` (`page.locator(...).click()`). Si el mensaje efectivamente estaba pendiente, esto dispara el envío real y el script retoma solo (sigue pollleando el DOM, no le importa quién mandó el click).

**Ojo con el timing**: el timer de 25 min del script arranca en el momento del primer `click()` (el que falló en silencio), no en el momento del click manual de rescate. Si el desbloqueo manual llega tarde (ej. a los 20+ minutos del intento fallido), puede no alcanzar el tiempo restante y ese intento igual tira timeout — pasó el 2026-08-26. Conviene detectar y destrabar esto lo antes posible, no esperar a que el usuario avise "lo veo trabado".

Pasó 3 veces en una sola corrida el 2026-08-26 (intentos 2 y 3 del POST, y en la regeneración de la STORY). Podría valer la pena, a futuro, agregar una verificación automática post-click en el script mismo (confirmar `streaming:true` unos segundos después de enviar, reintentar el click si no).

Ver también [[reference_topsecret_daily_news_routine]] y [[project_topsecret_tareas_imagenes]].
