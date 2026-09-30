---
name: calendario-dead-code
description: "calendario.html tiene funciones de renderizado muertas (nunca invocadas) que pueden confundir — dónde está el widget \"HOY\" real"
metadata: 
  node_type: memory
  type: reference
  modified: 2026-08-09T19:29:24.849Z
---

`calendario.html` tiene un `render_legacy_unused()` (con el comentario explícito "legacy functions kept below for admin compat — not called from here") que contiene `renderTodayCard()`, `renderWeekStrip()` y el bloque de tarjetas de mes con badge "+ Agregado". Ninguna de esas tres corre en el sitio real — `render()` solo llama a `renderNextHero()`, `renderYearGrid()`, `updateStats()`. El `<div id="todayCard" style="display:none">` en el HTML nunca se muestra.

**El widget "HOY" que ve el usuario en producción es `renderNextHero()`** (~línea 1957), que llena `#nextHero`. Ya soporta `m.round` de forma genérica para cualquier liga/fuente (RAW, `custom` de Firestore, y `_preData` de la pretemporada) — el badge `J{n}` sale solo con que el objeto del partido tenga `round` seteado, sin importar la liga.

**Por qué importa:** antes de tocar el "partidos de hoy"/calendario, verificar primero si la función que se va a editar realmente se llama desde `render()` — si no, es ruido que no cambia nada en vivo (pasó: se editó `render_legacy_unused` por error antes de descubrir esto, sin ningún efecto).

Consecuencia práctica ya aplicada: como los partidos de VPN/11x11 de la temporada en curso se cargan como `custom` vía el modal "＋ Agregar entrada" (no vía `RAW`), ese modal no tenía forma de guardar el número de jornada — por eso solo VPUG (cargado directo en `RAW` con `round` explícito) mostraba `J1` y las otras ligas no mostraban nada. Se agregó un campo "Jornada (opcional)" al modal (`addRound` → `entry.round`) que alimenta directo a `renderNextHero()`.
