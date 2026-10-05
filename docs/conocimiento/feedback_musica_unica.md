---
name: feedback_musica_unica
description: Regla de Juan (2026-10-05): cada video publicado lleva su propia música y ningún tema se repite en otro video; registro en scripts/musica-usada.json
metadata:
  type: feedback
---

**Regla:** de ahora en más, cada video tiene su música y ese tema no se puede usar en otro video. Excepción decidida por Juan: el video del equipo de la noche (botón "Compartir video" de convocatoria y `render.mjs --modo equipo`) es plantilla fija y siempre usa *Locked In*.

**Why:** Juan quiere que cada pieza tenga identidad propia; repetir un tema la vuelve genérica (pasó con *Whoop* en el plantel y en los fichajes, el mismo día, antes de la regla).

**How to apply:** usar `scripts/lib/musica.mjs` (`elegirMusica(id)`) para cualquier video nuevo — ya lo hacen `scripts/video-plantel/render.mjs` y `fichajes.mjs` — y commitear `scripts/musica-usada.json`. Para videos armados a mano, anotar el tema ahí antes de publicar. Si quedan pocos temas libres (el script avisa con ≤3), sumar trap libre de la Biblioteca de audio de YouTube a R2 `_fuentes/musica/trap` (ver [[feedback_musica_trap]]). Nunca música comercial.
