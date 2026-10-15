---
name: project_overlay_vivo
description: Vivo con overlay gráfico en las 3 transmisiones (Twitch topsecretfc, Kick, YouTube): la PS5 transmite a Enohcaid y la PC arma la señal con OBS + clips de jugadores — scripts/stream/ y retransmitir.mjs
metadata:
  type: project
---

**Pedido de Juan (2026-10-15):** las 3 transmisiones oficiales con gráficos y un jugador animado siempre presente. Desde ese día la PS5 transmite a la cuenta de Twitch **Enohcaid** (señal fuente, sin gráficos); la PC arma la señal con overlay y la manda a topsecretfc, Kick y YouTube.

## Cadena (scripts/retransmitir.mjs, tarea "TopSecret - Retransmitir Twitch", lun-jue 22:30–00:30)
`enohcaid` → streamlink como servidor http (`127.0.0.1:8787`) → **OBS** (escena "Vivo": partido escalado + `scripts/stream/overlay.html`) → NVENC 720p60 a 2000 kbps → **MediaMTX** (`rtmp://127.0.0.1:1935/live/ts`, `scripts/stream/mediamtx.yml`, binario en `fuentes/stream/bin/mediamtx/`) → ffmpeg `-c copy` con tee a los destinos de `.env` (`TWITCH_STREAM_KEY` de topsecretfc, Kick, YouTube).
- Si en ~2 min la señal con overlay no aparece en MediaMTX, reenvía Enohcaid directo sin gráficos (con `--sin-overlay`, siempre directo). Con overlay, el corte lo marca Enohcaid (2 chequeos por GQL), porque OBS sigue mandando aunque la PS5 corte.
- **OBS** se configura por archivos: `node scripts/stream/obs-config.mjs [--kbps N]` (perfil y colección "TopSecret", `user.ini` en OBS 31+, sin asistente de primer uso ni confirmaciones). Control por obs-websocket 127.0.0.1:4455 con `OBS_WS_PASSWORD` de `.env` (`scripts/stream/obs-ws.mjs`, también como CLI).
- **Gotcha OBS:** si se lo mata con /F, al abrir muestra "Se ha detectado un error" y se queda esperando. `retransmitir.mjs` borra `%APPDATA%\obs-studio\.sentinel\run_*` antes de abrirlo. `--disable-shutdown-check` no alcanza.
- **Ancho de banda (medido 2026-10-15):** la subida de la PC da ~10 Mbps y la PS5 manda 720p60 a ~2 Mbps. Por eso la salida va en 720p y 2000 kbps: 3 copias + la PS5, que comparte la conexión, ≈ 8,5 Mbps. Para más calidad hay que subir una sola copia y repartirla en la nube (Cloudflare Stream con simulcast, Restream).
- El vigía (`vigia-vivo.mjs`) y su arranque en `watch-regen.ps1` miran Enohcaid. En cada gol con equipo conocido agrega `{id, tipo:'gol'|'golRival'}` a `fuentes/stream/estado.json`; `retransmitir.mjs` escribe ahí el partido actual (`placa-envivo.mjs --json`).

## Overlay (scripts/stream/overlay.html, 1920×1080)
Mismo lenguaje que el compilado de goles. Pedido de Juan:
- A la vista quedan solo **el marcador de FC27** (con la placa del torneo y el rival al lado) y **la barra de abajo a la derecha**.
- Arriba a la derecha va la placa del club: tapa el panel "J. MARTINEZ".
- Abajo a la izquierda va **el palco**: tapa esa barra de FC27 y tiene siempre un jugador, chico, encadenando clips de espera (aliento, indicaciones, agitado, sudor, aplaude, pide, calma) con fundido. Cada 3 clips cambia de jugador (entre `estado.jugadores` si viene). Con un gol propio sale la franja GOOOL y el clip gol/festejo; con un gol rival, frustrado/reclama.
- Lee `fuentes/stream/clips/indice.json` y `fuentes/stream/estado.json` cada 1,5 s. Para revisar el diseño: `?demo=clip|gol` y `scripts/stream/preview.mjs`.

## Clips de jugadores
- `node scripts/stream/clip-jugador.mjs <gt> <emoción>` → `fuentes/stream/clips/<gt>/<emoción>.webm` (VP9 con alfa). Se genera **de cuerpo entero** (render `Frente4.png` sobre gris, con aire arriba) en Canva "Imagen a video" y después se recorta del pecho para arriba, con zoom a la caja que ocupa el jugador en todo el clip. Corrección de Juan: con el busto recortado de entrada, el modelo inventaba los brazos y le sacaba los guantes.
- El fondo se saca con rembg `u2net_human_seg` cuadro por cuadro (`quitar-fondo.py`, sin `-I` porque rembg está en el site-packages del usuario). Si el `.mp4` ya existe, no se le vuelve a pedir a Canva (`--rehacer` para forzarlo).
- **Tanda automática** (pedido de Juan: que corra sola durante días): tarea "TopSecret - Clips overlay" cada hora → `lote-clips.mjs` (lock, saltea lo hecho, corta tras 3 fallas seguidas y reintenta a la hora siguiente). Va por rondas: primero aliento, indicaciones, gol y frustrado para los 11 habituales; después el resto. Actualiza el índice. Log: `fuentes/stream/lote-clips.log`. Ritmo con el cupo de Canva agotado: ~11 min por clip.
- Canva entrega ~768×1088, así que el recorte queda en ~400 px: alcanza para el palco, no para pantalla completa. Las emociones de espera piden volver a la postura inicial, pero Canva no siempre lo respeta (de ahí el fundido).
