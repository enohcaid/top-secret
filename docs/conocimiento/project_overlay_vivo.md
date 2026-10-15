---
name: project_overlay_vivo
description: Overlay gráfico del vivo (Twitch topsecretfc + Kick + YouTube) con clips de jugadores; la PS5 pasa a transmitir a Enohcaid como señal fuente — scripts/stream/
metadata:
  type: project
---

**Pedido de Juan (2026-10-15):** las 3 transmisiones oficiales con elementos gráficos. La PS5 transmite a la cuenta de Twitch **Enohcaid** (la usaba antes para los vivos) y la PC toma esa señal, le pone el overlay y la manda a topsecretfc (Twitch), Kick y YouTube. Hay que recodificar (hoy `retransmitir.mjs` hace `-c copy`); la GTX 1070 tiene NVENC y el ffmpeg-static lo trae.

**Overlay** (`scripts/stream/overlay.html`, 1920×1080 transparente, pensado como fuente de navegador): mismo estilo que el compilado de goles (`scripts/goles/compilado.cjs`).
- Arriba a la izquierda queda el marcador de FC27 a la vista, con la placa del torneo y el rival al lado. Arriba a la derecha tapa el panel fijo de quien transmite ("J. MARTINEZ") con la placa del club, EN VIVO y los canales.
- **Abajo no se tapa nada** (pedido de Juan: que se vea qué jugador toca la pelota). Las dos barras de FC27 muestran al jugador de cada equipo con la pelota: **la nuestra puede ir a la izquierda o a la derecha** (local/visitante, cambia según el partido), así que ninguna se puede tapar fija.
- Palco: el clip del jugador asoma detrás de una placa (número + gamertag + qué hace), a la derecha, encima de la barra (y≈960), solo mientras dura el clip. La franja "GOOOL" cruza el tercio de abajo.
- `window.overlay.clip({gt, num, emocion})` y `window.overlay.gol()`. Para revisar: `?demo=clip|gol`; `scripts/stream/preview.mjs` lo compone sobre un cuadro del partido.

**Clips de jugadores** (`node scripts/stream/clip-jugador.mjs <gt> <gol|festejo|frustrado|triste|habla|aliento>` → `fuentes/stream/clips/<gt>/<emocion>.webm`, VP9 con alfa):
- Se genera **de cuerpo entero** (render `Frente4.png` sobre gris liso, con aire arriba) con Canva "Imagen a video", y recién después se recorta del pecho para arriba. Corrección de Juan: con el busto recortado de entrada el modelo inventaba los brazos y le sacaba los guantes.
- Fondo: rembg `u2net_human_seg` cuadro por cuadro (`scripts/stream/quitar-fondo.py`; sin `-I`, rembg está en el site-packages del usuario). Zoom automático a la caja que ocupa el jugador en todo el clip.
- Canva entrega ~768×1088, así que el recorte queda en ~410×450 px: alcanza para el palco (560 px), pero no para pantalla completa.
- Primera prueba (Juan_Martinez4, gol y frustrado): muy buena, mantiene escudo, Nike, guantes y cara.
