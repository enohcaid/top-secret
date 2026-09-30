---
name: triage-antes-de-debug-profundo
description: "Antes de multiplicar hipótesis debugueando un fallo que puede ser externo (no de este lado), hacer 2-3 chequeos mínimos de triage primero"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-09-09T15:13:57.218Z
---

Cuando un fallo puede ser de un servicio externo (ChatGPT, una API de terceros, etc.) y no de la sesión/código local, hacer la triage MÍNIMA primero — no explorar muchas hipótesis en paralelo antes de confirmar que vale la pena seguir cavando.

Triage mínima recomendada, en este orden:
1. ¿Funciona la versión "genérica"/base del servicio, sin el elemento específico que falla? (ej.: ¿carga chatgpt.com plano, aunque el proyecto específico no cargue?)
2. ¿Responde la capa de datos/API subyacente directamente, bypaseando la UI que falla? (ej.: pegarle a `/backend-api/gizmos/<id>` en vez de navegar la página)

Si ambas contestan "sí, el resto funciona bien", la conclusión ya está: es una falla externa transitoria, no hay nada que arreglar de este lado. Ahí hay que PARAR — no seguir probando limpiar caché, borrar service worker, abrir pestañas nuevas, rutas alternativas, navegar por el sidebar, etc. buscando una forma de destrabarlo, porque no la hay.

**Por qué:** el 2026-09-09, diagnosticando por qué la página del proyecto de ChatGPT ("TOP Secret FC") no cargaba el composer, se gastaron cerca de 10 llamadas de herramientas probando hipótesis (limpiar caché y service worker, pestaña nueva, ruta alternativa del gizmo, navegación por sidebar) cuando 2 chequeos (chatgpt.com plano carga bien + `/backend-api/gizmos/<id>` responde 200 con los datos intactos) ya alcanzaban para la conclusión correcta: bug del lado de ChatGPT, esperar. El usuario cuestionó explícitamente ese gasto de esfuerzo en algo "insignificante".

**Cómo aplicar:** frente a cualquier fallo nuevo de una herramienta o servicio externo, hacer la triage mínima de arriba ANTES de generar más hipótesis. Si la triage apunta a "falla externa, no accionable", cerrar la investigación ahí — documentar el hallazgo (memoria de proyecto si aplica) y, si corresponde, armar un mecanismo de reintento acotado en el código, no seguir una investigación exhaustiva en vivo que no va a cambiar la conclusión.

Ver [[project_topsecret_tareas_imagenes]] para el caso concreto que originó esta memoria.
