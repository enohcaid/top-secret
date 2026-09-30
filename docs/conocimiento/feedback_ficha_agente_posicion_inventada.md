---
name: feedback-ficha-agente-posicion-inventada
description: el estilo EXPEDIENTE_FICHA (ficha de agente) de generate-image-chatgpt.mjs inventa el campo POSICION si el brief no lo especifica explicitamente
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-26T14:08:46.533Z
---

El estilo `EXPEDIENTE_FICHA` (`scripts/generate-image-chatgpt.mjs`) genera un campo "POSICIÓN" en la ficha de cada jugador, pero el prompt no tiene ningún dato real de posición — ni `PLAYER_TRAITS` ni `buildScene()` lo proveen. Sin instrucción explícita, ChatGPT inventa un valor por defecto ("DELANTERO" para los tres, visto el 2026-08-26 con Ramiro4588/Lil_Dekuroko/Full_boxxing_, ninguno delantero real). El evaluador de Vision tampoco lo detecta porque su prompt de evaluación no chequea ese campo.

**Fix aplicado ese día**: agregar al `imageBrief` del draft una frase explícita tipo `"Posiciones reales de cada uno (...): Jugador = Posición, ..."`. Funcionó — la ficha regenerada mostró las posiciones correctas.

**A futuro**: si el estilo EXPEDIENTE_FICHA se sigue usando seguido, valdría la pena que el pipeline calcule la posición real jugada (de `seed_matches.js`, campo `played_pos` del partido más reciente) y la inyecte automáticamente en el prompt junto con dorsal/desc, en vez de depender de que el `imageBrief` del draft la mencione a mano. `played_pos` usa nomenclatura EA FC (DFC, DCI, MCD, etc.) que no es 1:1 con el nombre "real" que usa el club (líbero, central, mediocampista defensivo) — el usuario corrigió eso a mano el 2026-08-26, no asumir la traducción literal de la sigla.

Ver también [[feedback_chatgpt_stuck_send_button]].
