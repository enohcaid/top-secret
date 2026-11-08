---
name: feedback_no_publicar_music
description: Nunca más poner topsecret.ar/music (ni "/music") en nada que se publique — créditos, descripciones, placas, historias
metadata:
  type: feedback
---

Juan, 2026-11-07: "no publiques nunca más /music en ningún lado".

La página `music.html` sigue existiendo (y desde ese día tiene botón **Download** por tema, vía `?dl=` del Worker), pero no se la menciona ni se la enlaza en ningún texto o pieza publicada: redes, descripciones de YouTube, placas, historias, noticias, enlaces.

Lo que se cambió ese día:
- `creditoTexto` (`scripts/lib/musica.mjs`, `video-equipo.js`) quedó `Música: "<tema>" — Tacet Sin (The Shorts)`, sin link.
- La descripción de los lyric videos (`scripts/beats/videos-youtube.mjs`) ya no lleva "Full album: …/music". Los 23 videos ya subidos todavía la tienen (no se editaron).
- Se limpiaron los textos de las piezas pendientes en la cola de aprobación (KV `aprobaciones`); lo ya publicado quedó como estaba.

**Why:** decisión de Juan; no explicó el motivo.

**How to apply:** si hace falta mandar a escuchar la música, usar el canal de YouTube `youtube.com/@tacetsin`. Al escribir una pieza nueva, no poner `/music` en ningún texto.
