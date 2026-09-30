---
name: project_baja_cat_fel_ltemp_prep_t4
description: "CAT_FEL y lTemp30148 dejaron el club (2026-09-08); prep de Temporada 4 en plantilla.html/roster.js queda pendiente, el usuario pidió posponerla"
metadata: 
  node_type: memory
  type: project
  modified: 2026-09-08T13:46:48.592Z
---

CAT_FEL y lTemp30148 dejaron Top Secret FC (dado de baja 2026-09-08). Se los sacó de `convocatoria.html` (PLAYERS + `PLAYER_TRAITS` en `scripts/generate-image-chatgpt.mjs` + tabla en `scripts/chatgpt-project-instructions.md`) y de Firestore (`plantel/activo.jugadores`, `availability` en `convocatoria/state` y `convocatoria/backup`). Se los dejó **intactos** en `ROSTER_T3` (`roster.js`) porque jugaron esa temporada y ya culminó — ver [[feedback_baja_jugador_limpiar_firestore]].

El usuario pidió además "preparar todo para la temporada 4" pero al preguntar el alcance (¿solo estructura de plantilla tipo transición T2→T3, o también fixtures de liga?) contestó **"dejalo así, después lo hacemos"** — queda explícitamente pospuesto, no asumir que hay que arrancarlo solo.

**Cuando se retome**: el patrón de referencia es la transición T2→T3 (PRP existente, ver `PRPs/` — CLAUDE.md la menciona). Implica al menos: marcar T3 "FINALIZADA" en el season-bar de `plantilla.html`, agregar pill T4, y un `ROSTER_T4` nuevo en `roster.js` (copia del plantel vigente sin los jugadores que se fueron, stats reseteadas a '—'/0). Fixtures de liga (VPN/VPUG/11x11) solo si el usuario ya tiene fechas/torneos anunciados — no inventar calendario.

Pendiente sin resolver en este pase: **actualizar la instancia real del proyecto de ChatGPT** ("TOP Secret FC") con la misma tabla de jugadores editada en `chatgpt-project-instructions.md` — ese archivo es solo un espejo, no se sincroniza solo.
