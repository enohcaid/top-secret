---
name: feedback_contenido_visual_motion
description: Regla de Juan (2026-10-10) para el contenido de redes — lo principal es que se vea de otro nivel; los videos llevan motion design (no fundidos simples); el club se comunica por audio, no por chat
metadata:
  type: feedback
---

**Regla:** "En general el contenido no tiene algo visualmente llamativo y ese es mi principal objetivo: se tiene que ver de otro nivel, todo se tiene que ver increíble. Agregale animaciones en motion, sobre todo a los videos." (Juan, 2026-10-10, al revisar el simulacro viral.)

**Piso de calidad (Juan, 2026-10-10, al ver el antes y después v2 con motion):** "Mucho mejor. Este tiene que ser el piso de la calidad de las cosas que me propongas; cada nueva propuesta tiene que ser mejor, mejor calidad, más producción. Prefiero publicar más espaciado y con calidad que mucho y que sea feo, plano, reciclado."
- El antes y después v2 (`plantillas/antes-despues.html`) es el MÍNIMO. Nada por debajo de eso se le propone.
- Cada propuesta nueva suma producción respecto de la anterior (una técnica, una capa o un recurso nuevo); no se recicla una plantilla tal cual.
- Menos piezas y mejores: si una pieza no llega al nivel, no se propone (se espacia la publicación, no se rellena).

**Why:** el contenido compite en el feed con cuentas grandes; una placa prolija pero quieta no frena el scroll.

**How to apply:**
- Videos con motion design de verdad, no solo fundidos: tipografía cinética (golpe de escala + desenfoque + temblor de cámara), transiciones distintas por corte (glitch con separación de color, franjas, zoom de paso, estroboscopio), texturas por época/tono (VHS, grano), revelación con destello + onda + partículas + rayos + barrido de luz sobre la silueta, barras de cine, latido al pulso.
- Todo sincronizado a la música: cortes al pulso (bpm del tema del día) y el momento clave en el drop (`dropDelTema()` en `scripts/social/lib/render.mjs` lo calcula de `temas-diarios.json`; `musicaDesde` alinea el audio).
- Render a 60 fps con desenfoque de movimiento (`video(..., { fps: 60, desenfoque: true })` → tmix a 30 fps). Las plantillas dibujan cada cuadro de forma determinística con `mostrar(n, t)`; referencia: `scripts/social/plantillas/antes-despues.html`.
- Revisar siempre cuadros clave (ffmpeg -ss) antes de mostrarle algo: textos que pisan al jugador, palabras pegadas, subtítulos ilegibles a mitad de animación.
- **Sin barras de cine (franjas negras arriba y abajo)** en los videos verticales: en el celular se ven como un defecto y achican la imagen (Juan, 2026-10-10, sobre el Reel del resumen).
- Dato del club para los textos: **se comunican por audio (voz), no por chat**.
