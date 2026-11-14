---
name: reference_goleadores_ligas
description: De dónde salen goleadores y asistentes cuando EA no los trae — web de cada liga y ficha del gol en la grabación del vigía; scripts/completar-goleadores.mjs al final de cada noche
metadata:
  type: reference
---

Juan, 2026-11-14: "en las páginas de las ligas siempre están los autores de los goles y los asistentes". `scripts/completar-goleadores.mjs` (lo corre `retransmitir.mjs` al final de la noche, después de `cargar-partidos-ea.mjs`; `--aplicar --commit`, `--desde`, `--seed <copia>`, `--sin-vigia`) completa los partidos del seed con goles sin autor.

**Fuentes, en orden:**
- **VPN:** `https://api.virtualpronetwork.com/matches/{id}` (público; ids de `/vpn-results` del Worker). `events.home|away[uid]` con `eid` 1 = gol, 2 = asistencia, 4 = figura (lista en `/events`); `players.home|away[].player.identity` = gamertag. TOP Secret = equipo 28524.
- **Espacio Gamer:** `espaciogamer.cl/partido/?partido_id=N` (ids del fixture vía admin-ajax `metrica=fixture`; los jugados traen la clase `eg-fx-jugado`). Tabla por equipo: jugador, posición, nota (0–100), goles, asistencias.
- **VPUG:** la API (`vpug-liga-api.onrender.com/v1/partidos/{id}`) pide el token de la sesión de Juan (localStorage del Chrome del pipeline, que vence). Todavía no se vio el formato del detalle: hoy VPUG usa solo la ficha del vivo.
- **Ficha del gol del vivo:** después de cada gol el juego muestra una tarjeta abajo a la izquierda (en 720p, nombre en x64–198, y600–645) con el nombre del juego ("ELI", "NICOBJ 96"). Se busca en `fuentes/goles/vvivo-<fecha>/source.mp4` desde el `seg` de cada gol a favor de `eventos.jsonl` (30 s a 2 cuadros/s), se lee con `scripts/lib/ocr-windows.ps1` y se resuelve solo contra los jugadores del partido. Si se saltean el festejo (pasó con Division Palermo, 11/11) no hay ficha.

**Regla clave:** las dos ligas **heredan de EA** cuando nadie reporta a mano (VPN arma el reporte automático desde EA; EG toma todo de EA), así que una noche con EA corrupto la página también queda mal (1-1 con Misky Mayu, 11/11: la web de VPN solo tenía el gol del rival). **Pero la liga siempre termina cargando lo correcto** (pide corregirlo; a veces tarda — Juan, 2026-11-14). Entonces: si la liga ya suma nuestro resultado, manda la liga. Si no, se usan las fichas del vivo y el partido queda marcado en `notes` como `GOLEADORES PROVISORIOS (ficha del vivo): falta que la liga los cargue.`; cada noche se vuelve a mirar la liga (30 días) y cuando la liga lo tiene completo se reemplaza por lo de la liga (goles y asistencias exactos, con "Confirmado por …" en notes), aunque difiera de la ficha. Sin liga ni ficha que cierren → "REVISAR A MANO". Nunca baja goles ya cargados (salvo la confirmación de la liga).

Probado 2026-11-14 contra el seed sin los goles de la semana: Misky Mayu → Elianja20 (ficha), Division Palermo → Guiidow + asist. nikileo527 (VPN), ALL BOYS → NicoBJ_96 + asist. pepolemmo2710 (EG, confirmado por la ficha).

**Lo que confirma Juan es lo final (2026-11-14).** Juan pasó los datos confirmados de VPN: Misky Mayu = gol de Elianja20 con asistencia de nikileo527; Division Palermo = gol de Guiidow con asistencia de **pepolemmo2710**. Ese día la API pública de VPN (`/matches/785067`) seguía mostrando la asistencia a nombre de nikileo527 y el partido con Misky sin nuestro gol: la API puede ir atrasada respecto de lo que la liga confirma. Un partido que no está marcado como provisorio no lo vuelve a tocar el script, así que una corrección a mano queda.
