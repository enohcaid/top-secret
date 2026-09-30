---
name: rosters-hardcodeados-desactualizados
description: El sitio tiene varias listas de gamertags hardcodeadas e independientes que se desactualizan cuando cambia el plantel — revisar todas al arrancar temporada o agregar/dar de baja jugadores
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-04T05:28:50.390Z
---

No hay una única fuente de verdad para "quién está en el plantel actual" — cada página/rutina tiene su propia lista hardcodeada de gamertags, y quedan desactualizadas independientemente unas de otras. Encontradas y corregidas el 2026-08-04:

- `estadisticas.html`: constante `ROSTER` (16 jugadores viejos, con nombres de ex-jugadores como Woolfyboyzx2, pauloco10, Zurdo-_CABJ12, Agubostero7, Buraa07, zPibu__, cansitrGd22_ — le faltaban fedeavv9, yzytx0, Eli_No-SKILL, CAT_FEL, Ramiro4588, Lil_Dekuroko, Mauriii-_1891, Ivan_Cabj_La12, Juanchyroman08, kee_viin03). Esto rompía silenciosamente los rankings de Goleadores/Asistencias/Rating de T3 — los jugadores que no estaban en `ROSTER` simplemente no aparecían en ningún lado del "Centro de Estadísticas", sin error visible.
- La rutina cloud "Top Secret FC — Noticia Diaria" (ver [[arranque-temporada-vpn]]): la lista de gamertags en sus REGLAS DE ESCRITURA tenía solo 15 nombres, con `yzytx0` mal escrito como `Yxotx`.

**Por qué pasa**: cada vez que se agrega/da de baja un jugador (checklist de CLAUDE.md "New player joins" / "Player leaves the club"), se actualiza `plantilla.html` (ROSTER_T3) y `convocatoria.html` (PLAYERS) porque son las páginas obvias — pero `estadisticas.html` tiene su propia copia independiente y no está en ese checklist, así que se olvida. Lo mismo con rutinas cloud programadas: su prompt tiene el roster pegado como texto plano, nadie lo actualiza cuando cambia el plantel en el repo.

**Cómo aplicar**: cuando el plantel cambie (alta o baja), además del checklist de CLAUDE.md, buscar `grep -rn "gamertag_ejemplo"` o revisar a mano estos otros lugares con listas propias: `estadisticas.html` (`const ROSTER`), y cualquier rutina cloud programada que mencione jugadores por nombre (`RemoteTrigger` con `action:"list"` para ver los prompts). Si en el futuro aparece un ranking/stat vacío sin razón aparente pese a haber datos en `seed_matches.js`, sospechar primero de una lista de roster desactualizada en esa página antes de asumir un bug de cálculo.
