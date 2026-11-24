---
name: project_ea_por_chrome
description: EA responde 403 al Worker; los partidos se bajan por el Chrome del pipeline (scripts/ea-traer.mjs, tarea "TopSecret - EA" cada 30 min)
metadata:
  type: project
---

Desde mediados de noviembre de 2026 EA responde 403 al Worker y a pedidos directos; "EA no guardó el partido" era en realidad este bloqueo. La página de EA abierta en Chrome (CDP 9222) sí recibe los datos.

- `scripts/ea-traer.mjs` → KV `ea_crudo` → `syncEaPartidos` del Worker → `/ea-historial` → `cargar-partidos-ea.mjs`. Tarea de Windows "TopSecret - EA", log `scripts/ea-traer.log`. Entre 22:00 y 00:30 solo trae; carga después (también al cerrar retransmitir.mjs).
- Antes de decir que EA no tiene un partido: mirar `sync.errores` en `/ea-historial`.
- El cargador nunca agrega un partido del calendario que ya está cargado con otro resultado ("YA CARGADO").
- VPUG da 1-0 a los rivales que no se presentan (Argentino de Merlo: 7 derrotas 0-1). El hueco puede haberse usado para un amistoso (18/11, Las Palmas 2-0).
