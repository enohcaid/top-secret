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

**Regla clave:** las dos ligas **heredan de EA** cuando nadie reporta a mano (VPN arma el reporte automático desde EA; EG toma todo de EA). Si EA guardó el partido corrupto, la página también lo está: en el 1-1 con Misky Mayu (11/11) la web de VPN solo tenía el gol del rival. Por eso la liga se usa solo si sus goles suman nuestro resultado; si no, decide la ficha del vivo. Si liga y ficha no coinciden → "REVISAR A MANO" en el log y no se escribe. Nunca baja goles ya cargados.

Probado 2026-11-14 contra el seed sin los goles de la semana: Misky Mayu → Elianja20 (ficha), Division Palermo → Guiidow + asist. nikileo527 (VPN), ALL BOYS → NicoBJ_96 + asist. pepolemmo2710 (EG, confirmado por la ficha).
