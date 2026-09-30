---
name: feedback-commit-changes
description: "Siempre commitear cambios de código automáticamente al hacerlos, sin esperar que el usuario lo pida"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-18T13:29:56.210Z
---

Siempre commitear los cambios de código al terminar de hacerlos, sin que el usuario tenga que pedirlo explícitamente — y siempre pushear ese commit a `main`/remoto en el mismo paso, SIN esperar confirmación del usuario, nunca dejarlo solo en local.

**Why:** El usuario lo pidió explícitamente — quiere que el historial git quede limpio automáticamente. Reforzado el 2026-08-13 en top-secret: un fix quedó commiteado pero sin pushear, y como GitHub Pages sirve el sitio desde el remoto (no desde el working directory), el usuario vio el cambio como "no está online" — el commit local no alcanza. **Se repitió el 2026-08-17**: se volvió a preguntar "¿lo pusheo?" en vez de pushear directo. **Se repitió una tercera vez el 2026-08-18** ("pushea los cambios a online siempre", mensaje espontáneo a mitad de una tarea que sí se estaba pusheando) — el usuario no está corrigiendo un error puntual, está fijando la regla de forma duradera porque le importa que nunca se relaje. Tratar esto como no-negociable, no como algo a re-evaluar caso por caso.

**How to apply:** Después de cualquier edición de código (Edit/Write), hacer git add + git commit, y ACTO SEGUIDO `git push` (a `main` u la rama que corresponda) sin preguntar — no ofrecer "¿lo pusheo?" ni esperar respuesta, antes de reportar el trabajo como terminado. Aplica a todos los proyectos, no solo Argos/top-secret. Si el push falla (conflictos, remoto adelantado, rama protegida), avisar al usuario en vez de dejarlo pendiente silenciosamente. Esto sobreescribe la guía general de "confirmar antes de push"; una acción realmente inusual (force-push, reescribir historia) sigue mereciendo aviso previo.
