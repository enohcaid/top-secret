---
name: project_videos_youtube_tacet_sin
description: Lyric videos de The Shorts (Vol. 1 y 2) para YouTube y el apartado Videos de topsecret.ar/music — scripts/beats/videos-youtube.mjs, loop con Canva, letra solo de lo cantado
metadata:
  type: project
---

Pedido de Juan (2026-11-05): publicar los temas de The Shorts en YouTube como lyric videos, en el canal de Tacet Sin que crea él. Portada en 16:9 moviéndose como un ecualizador. Los videos no reaccionan al audio: un clip de 10 s + el mismo invertido, repetido todo el tema (un loop por volumen). También van a `topsecret.ar/music`, apartado Videos (lista R2 `musica/videos.json`).

**Comandos** (`scripts/beats/videos-youtube.mjs`): `loops` → `tiempos [slug…]` → `video <slug>|--todos` → `publicar [slug…]`. Salida en `fuentes/musica/youtube/` (gitignored): `vol-N/NN-slug.{mp4,jpg,txt}` (1080p para YouTube, miniatura, título + descripción) y `web/` (720p para la página). La transcripción previa la hace `scripts/beats/palabras-whisper.py`.

**Movimiento (Canva, idea de Juan):** "las barras se mueven, por arriba y por abajo, no un efecto de luces". Se descartó hacerlo por código porque Canva da un resultado mejor. `node scripts/canva-imagen-a-video.mjs fuentes/musica/portadas/the-shorts-N.png --out fuentes/musica/youtube/canva/vN-{a,c}.mp4 --prompt "…"`, 4% de cupo por clip:

> Cámara totalmente fija. Las franjas verticales de luz se mueven como las barras de un ecualizador de audio: cada franja se estira y se encoge verticalmente, por arriba y por abajo, cada una a distinto ritmo, con movimiento rápido y marcado. Las franjas no cambian de lugar a los costados. El fondo negro queda inmóvil. Sin texto, sin objetos nuevos.

- **Los 2 clips salen de la portada original** y se une A invertido + C: se encuentran en la imagen limpia. Generar B desde el último cuadro de A degrada (se lava, aparecen formas en las tiras).
- La firma se estampa después sobre el clip: la IA deforma el texto. Se usa la portada PNG sin firma.
- Bajar los negros del clip (`colorlevels`): Canva levanta el grano y se notaba el corte con el fondo del panel de letra.

**Letra (lo que más costó; Juan: "no condicen con lo que suena"):** `letraFinal` NO sirve de fuente: conserva versos escritos donde la transcripción falla, y varios temas tienen estrofas que Whisper no oye (*The Night Before* no da palabras hasta 0:32, *So Close* hasta 0:40; por confirmar de oído si ahí se canta o no). La regla es que en pantalla va solo lo que se oye:
- Dos transcripciones de la voz separada con Demucs: por ventanas sin pista (`palabras/`) y de corrido con la letra como pista (`palabras/corrido/`). Cada una pierde pasajes distintos.
- Claude cruza las dos con la letra escrita; la letra escrita manda en la ortografía, las transcripciones en qué se canta y cuándo. El código rechaza versos sin nada oído en ese lugar. Resultado versionado: `scripts/beats/letras-tiempos.json`.
- Probado y descartado: alineación forzada con stable-ts (amontona versos) y repartir versos no reconocidos sobre "tramos con voz" (Demucs toma melodías instrumentales como voz: los versos caían sobre partes sin canto).

**Pendiente de Juan:** chequear los pilotos de oído (Claude no oye) antes de armar los otros 20; decidir si se corrige también la letra de `topsecret.ar/music`, que sale de `letraFinal`.

**Worker:** `/media` ahora atiende pedidos `Range` (206), necesarios para adelantar videos y para Safari.
