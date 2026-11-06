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

**Letra (lo que más costó; Juan: "no condicen con lo que suena"):** `letraFinal` NO sirve de fuente: conserva versos escritos donde la transcripción falla, y varios temas tienen estrofas que Whisper no oye (*The Night Before* no da palabras hasta 0:32, *So Close* hasta 0:40; Juan confirmó de oído el 2026-11-05 que antes de eso no se canta ninguna estrofa). La regla es que en pantalla va solo lo que se oye:
- Dos transcripciones de la voz separada con Demucs: por ventanas sin pista (`palabras/`) y de corrido con la letra como pista (`palabras/corrido/`). Cada una pierde pasajes distintos.
- Claude cruza las dos con la letra escrita; la letra escrita manda en la ortografía, las transcripciones en qué se canta y cuándo. El código rechaza versos sin nada oído en ese lugar. Resultado versionado: `scripts/beats/letras-tiempos.json`.
- Probado y descartado: alineación forzada con stable-ts (amontona versos) y repartir versos no reconocidos sobre "tramos con voz" (Demucs toma melodías instrumentales como voz: los versos caían sobre partes sin canto).

**Letra oficial (2026-11-05, Juan):** estas letras son también las de `/music` y las de las descripciones de YouTube. `letras-web` las copia a `letraFinal` en `letras.json` con sus secciones y rearma el catálogo; `letraOida:true` evita que `letra-final.mjs` las pise. Para corregir una: editar `scripts/beats/letras-tiempos.json`, correr `letras-web`, `video <slug>` y `publicar <slug>`. Thrive sigue usando `letra-final.mjs` (conserva versos escritos donde la transcripción falla), así que puede tener el mismo problema.

**Estado:** los 23 publicados en `/music`. Clips de Canva respaldados en R2 `_fuentes/musica/youtube-canva/`. Claude no oye: la letra se chequea de oído por Juan.

**Worker:** `/media` ahora atiende pedidos `Range` (206), necesarios para adelantar videos y para Safari.

**Perfiles de Tacet Sin (Juan, 2026-11-05):** solo en inglés, ni una palabra en español, y sin mencionar IA en títulos, descripciones ni playlists. Una playlist por disco, con las letras en las descripciones. El campo "AI use" de YouTube Studio es otra cosa: YouTube pide responder Sí para música generada con IA que sea el foco del video; no responder No sin decisión de Juan.

**YouTube (estado 2026-11-06):** canal `@tacetsin`, `UC1tHhG-3UeEPK7iOmw23wHw` (`studio.youtube.com/channel/tacetsin` redirige al canal del club). Publicador: `scripts/beats/subir-youtube-tacet.mjs`, registro `scripts/beats/youtube-tacet.json`. Subidos 18 de 23, verificados en público sin sesión (orden y miniaturas): Vol. 1 completo y Vol. 2 pistas 1-6. Faltan Mirror, Shadow, Splinters, Before the Sun y Scar. Para seguir: `node scripts/beats/subir-youtube-tacet.mjs subir --todos`, saltea lo ya subido. Playlists: Vol. 1 `PLdhmPMqLIi50`, Vol. 2 `PLEstfdWmtMH8`, The Shorts (Complete) `PLcp4iebzMeH4`, Tacet Sin: All Songs `PLTQvzN6G34CA` (cada video nuevo entra en su volumen y en estas dos; si se sube música que no sea The Shorts, va solo en All Songs y hay que ajustar `GENERALES`), orden "Date added (oldest)". La página pública de YouTube en el Chrome CDP está con la sesión de Top Secret: los cambios de Tacet Sin se hacen desde Studio.

**Topes de YouTube:** sin la verificación avanzada del canal (es del dueño, no se automatiza) hay dos topes por 24 h: subidas ("Daily upload limit reached", el 2026-11-06 cortó tras 9 videos) y miniaturas propias (cartel "One-time verification needed"). Con el segundo el script cancela, sigue sin miniatura y deja `miniatura:false` en el registro; el comando `miniaturas` pone solo las pendientes. Si un intento se corta a mitad de la subida puede quedar un borrador: terminarlo con `terminar-borrador <slug>`, no volver a subirlo.

**Presentación desde el club (Juan, 2026-11-06: "algo conceptual, con arte, como todo lo que rodea a Tacet Sin"):** pieza `scripts/social/piezas/2026-11-07-tacet-sin.mjs` + `plantillas/tacet.html`, lote `viral-tacet-sin-2026-11-07`, sale el 7/11 a las 20:00 si se aprueba. Dice "completo en YouTube": aprobarla recién con los 23 subidos. Tacet = orden de no sonar en una partitura: silencio real, 23 franjas movidas por el espectro real del tema, club en larga exposición (curva que hunde el pasto y deja la luz) y el disco se abre al cantarse "No sound came out". Es una excepción, no una plantilla ([[feedback_no_repetir]]). Lleva crédito propio del tema en vez de la píldora "Sonando ahora" (a confirmar por Juan). Los textos en español son los de las cuentas del club; los perfiles de Tacet Sin siguen solo en inglés.
