---
name: feedback_musica_the_shorts
description: Regla de Juan (2026-10-28) — toda la música (videos, video del equipo de la noche, modo pausa del vivo) son los temas cantados de The Shorts de Tacet Sin; rotan sin repetir seguido y cada video dice qué tema suena
metadata:
  type: feedback
---

**Regla (2026-10-28):** "que no se usen más los beats de Anno Domini, ahora todo lo que se usará será temas de The Shorts". Reemplaza a las reglas viejas de trap libre (2026-10-01) y de "un tema por video, nunca repetido" (2026-10-05).

- **Qué suena:** solo las versiones **cantadas** de The Shorts (vol. 1 y 2, catálogo público `musica/catalogo.json`, `album: 'the-shorts'`). Ni Anno Domini, ni las instrumentales propias (`_fuentes/musica/propios`), ni Thrive. Todo queda en R2 como archivo.
- **Rotación:** los temas se pueden repetir, pero nunca uno de los últimos 8 videos (`historial` en `scripts/musica-usada.json`; `usados`/`fijos` son de la regla vieja).
- **Voz en off arriba:** la música cantada va más baja que la voz. `agregarVoz` limita la música a 0,35 y la baja más mientras se habla (sidechain).
- **Cada video dice qué tema suena:** un rótulo en pantalla ("MÚSICA · TACET SIN — Título", del segundo 0,6 al 5,5) y una línea en el texto de cada publicación (`Música: "Título" — Tacet Sin (The Shorts) · topsecret.ar/music`, la agrega `agregarLote` a las piezas que tienen `musica`).
- **Video del equipo de la noche:** ya no es fijo con *Locked In*. Cada vez que se arma (botón de convocatoria, `video-equipo.js`) elige otro tema y lo nombra en el video y en el texto al compartir.

**Why:** The Shorts es la música propia de Tacet Sin, el artista del club; usarla en todo le da identidad y la promociona.

**How to apply:** `scripts/lib/musica.mjs` (`await elegirMusica(id)`, `infoTema`, `filtroRotulo`, `creditoTexto`, `bajarTheShorts`) para cualquier video nuevo; `scripts/social/lib/render.mjs` ya pone el rótulo cuando el video lleva música. El modo pausa del vivo usa la misma biblioteca (`scripts/stream/datos-vivo.mjs`). Commitear `scripts/musica-usada.json` después de cada video.
