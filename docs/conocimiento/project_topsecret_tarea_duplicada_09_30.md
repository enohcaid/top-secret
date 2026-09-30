---
name: topsecret-tarea-duplicada-09-30
description: Tarea de Task Scheduler duplicada (09:30) causaba fallas silenciosas del pipeline de imágenes diarias; deshabilitada el 2026-08-10
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-10T19:06:37.250Z
---

El 2026-08-10 se descubrió que además de la tarea oficial `TopSecretFC-NoticiaDiaria-Imagenes` (09:35, corre `run-daily-images.ps1`, documentada en CLAUDE.md), existía una segunda tarea no documentada `TopSecretFC - Generar Imagenes Diarias` (09:30, creada 2/7, corre `node generate-image-chatgpt.mjs` **directo** vía `run-generate-images-hidden.vbs`) — sin esperar el draft, sin chequear/levantar Chrome por CDP, y sin redirigir salida a ningún log.

**Por qué importaba:** ambas tareas apuntan al mismo Chrome CDP (puerto 9222, perfil `scripts/.chrome-profile`). Si Chrome ya estaba abierto (ej. una pestaña colgada de una corrida anterior), la tarea de las 09:30 se conectaba a la misma sesión que iba a usar la de las 09:35 cinco minutos después, generando condiciones de carrera invisibles (descargas corruptas, lock del log, chats sin cerrar). Evidencia indirecta: en `daily-images.log`, varios días (4/8, 6/8, 7/8) mostraban 2-3 bloques "Leyendo draft..." el mismo día, cuando el pipeline oficial solo invoca `node` una vez — indicaba una segunda invocación paralela.

**Fix aplicado:** `Disable-ScheduledTask -TaskName "TopSecretFC - Generar Imagenes Diarias"`. Se dejó deshabilitada, no borrada, por si hace falta revisar su configuración después.

**Además:** se habilitó el log operativo de Task Scheduler (`wevtutil sl "Microsoft-Windows-TaskScheduler/Operational" /e:true`, requiere PowerShell elevada / UAC) — estaba deshabilitado, por eso [[project_topsecret_tareas_imagenes]] no pudo confirmar con certeza el patrón de fallas del 16/7 ni el de esta vez. De ahora en más el Visor de Eventos debería mostrar si Task Scheduler lanza/mata los procesos del pipeline.

**Cómo aplica:** si vuelve a fallar el pipeline de imágenes diarias, primero revisar `Microsoft-Windows-TaskScheduler/Operational` en el Visor de Eventos para esa franja horaria antes de reconstruir todo por inferencia.
