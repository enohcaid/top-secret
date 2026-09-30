---
name: nombres-en-reportes
description: Tabla de alias — nombres que muestran los reportes de partido (EA FC) que no coinciden con el gamertag real del jugador
metadata:
  type: feedback
---

En los reportes de partido el juego a veces muestra un nombre distinto al gamertag. Al cargar un partido en `seed_matches.js`, poner en `name` lo que dice el reporte y en `matched` el gamertag real:

| Nombre en el reporte | Gamertag (`matched`) | Desde |
|---|---|---|
| Abuela | `nikileo527` | 2026-09-30 (indicado por el usuario) |
| Abuelo | `adri_cai` | 2026-09-30 (indicado por el usuario) |
| M. Crespo / Crespo | — no mapear (bug del juego, corrección del usuario 2026-06-16) | |

Ejemplo: `{name:'Abuela', matched:'nikileo527', rating:…}`.

**Why:** el usuario lo pidió para que los reportes futuros se carguen al jugador correcto; un nombre sin mapear deja las estadísticas fuera del ranking sin avisar (ver [[feedback_rosters_hardcodeados_desactualizados]]).
**How to apply:** si aparece en un reporte un nombre que no es un gamertag del plantel y no está en esta tabla, preguntar antes de asignarlo. Sumar acá cada alias nuevo que confirme el usuario.
