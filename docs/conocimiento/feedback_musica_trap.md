---
name: musica-trap
description: Regla de Juan (2026-10-01) — toda la música de las publicaciones es TRAP libre de derechos (o trap generado por el club); biblioteca en R2 _fuentes/musica/trap
metadata:
  type: feedback
---

**Regla:** toda publicación lleva música (ver [[publicaciones-con-musica]]) y esa música es **trap, libre de derechos**, pegada al archivo → se puede publicar en todas las redes por automatización, Instagram y Facebook incluidos (`scripts/meta.mjs`). Nada de temas comerciales (Red Right Hand, etc.).

**Why:** Juan eligió música libre para poder automatizar todo, y el trap como identidad sonora del club. Idea suya: a futuro generar trap propio para los videos.

**Biblioteca (2026-10-01):** R2 `_fuentes/musica/trap/` (bajar con `node scripts/r2.mjs sync-down _fuentes/musica fuentes/musica`). Fuente: Biblioteca de audio de YouTube (Studio → Audio library), artista **Anno Domini Beats**, género Hip-Hop & Rap — uso libre en cualquier plataforma: Future (Dark), Ten, Mirror Mirror (Dramatic), Kick It, Cartier, Sacrifices, Talk, Red (Angry), Delirium, Locked In, Whoop (Inspirational). Para sumar más: filtrar "Artist name contains 'Anno Domini Beats'" o buscar "trap" en la biblioteca.

**How to apply:** elegir el beat por el clima de la pieza (Dark/Dramatic para relanzamientos y misterio, Angry para goles y resultados, Inspirational para fichajes/logros), pegarlo con ffmpeg (`loudnorm=I=-14:TP=-1.5`, `aresample=48000`, fundido de entrada 0,5 s y de salida 2 s) y publicar. Decirle a Juan qué beat se usó.
