---
name: project_overlay_vivo
description: Vivo con overlay gráfico en las 3 transmisiones (Twitch topsecretfc, Kick, YouTube): la PS5 transmite a Enohcaid y la PC arma la señal con OBS + clips de jugadores — scripts/stream/ y retransmitir.mjs
metadata:
  type: project
---

**Pedido de Juan (2026-10-15):** las 3 transmisiones oficiales con gráficos y un jugador animado siempre presente. Desde ese día la PS5 transmite a la cuenta de Twitch **Enohcaid** (señal fuente, sin gráficos); la PC arma la señal con overlay y la manda a topsecretfc, Kick y YouTube.

## Cadena (scripts/retransmitir.mjs, tarea "TopSecret - Retransmitir Twitch", lun-jue 22:30–00:30)
`enohcaid` → streamlink como servidor http (`127.0.0.1:8787`) → **OBS**, una sola instancia con un lienzo de 3000×1920: a la izquierda la horizontal (partido + `overlay.html`), a la derecha la vertical (partido a lo ancho en y=440 + `overlay-vertical.html`). Sale en NVENC a 20 Mbps a **MediaMTX** (`rtmp://127.0.0.1:1935/live/mix`, local, no gasta subida; `scripts/stream/mediamtx.yml`, binario en `fuentes/stream/bin/mediamtx/`). De ahí ffmpeg (`scripts/stream/salidas.mjs`) recorta y codifica: horizontal 1280×720 → tee a topsecretfc, Kick y YouTube; vertical 720×1280 → Instagram. Las dos en 720p30 a 1500 kbps (pedido de Juan: mantener 720 y bajar el resto).
- **Dos instancias de OBS no sirven:** el navegador interno (CEF) no arranca en la segunda y su overlay sale vacío (probado 2026-10-15). Por eso va un solo lienzo.
- Probar sin transmitir: `node scripts/stream/demo-vivo.mjs <video> --dur 110 --gol 36 --golRival 96` → `fuentes/stream/preview/demo-horizontal.mp4` + `demo-vertical.mp4`.
- Si en ~2 min la señal con overlay no aparece en MediaMTX, reenvía Enohcaid directo sin gráficos (con `--sin-overlay`, siempre directo). Con overlay, el corte lo marca Enohcaid (2 chequeos por GQL), porque OBS sigue mandando aunque la PS5 corte.
- **OBS** se configura por archivos: `node scripts/stream/obs-config.mjs [--kbps N]` (perfil y colección "TopSecret", `user.ini` en OBS 31+, sin asistente de primer uso ni confirmaciones). Control por obs-websocket 127.0.0.1:4455 con `OBS_WS_PASSWORD` de `.env` (`scripts/stream/obs-ws.mjs`, también como CLI).
- **Gotcha OBS:** si se lo mata con /F, al abrir muestra "Se ha detectado un error" y se queda esperando. `retransmitir.mjs` borra `%APPDATA%\obs-studio\.sentinel\run_*` antes de abrirlo. `--disable-shutdown-check` no alcanza.
- **Ancho de banda (medido 2026-10-15):** la subida de la PC da ~10 Mbps y la PS5 (misma conexión) manda 720p60 a ~2 Mbps. 4 copias de 1,6 Mbps + la PS5 ≈ 8,6 Mbps. Para más calidad: subir una sola copia y repartirla en la nube.
- **TikTok:** sin LIVE habilitado (6 seguidores al 2026-10-15; suele pedir ~1000). **Facebook:** Juan no lo quiere.
- El vigía (`vigia-vivo.mjs`) y su arranque en `watch-regen.ps1` miran Enohcaid. En cada gol con equipo conocido agrega `{id, tipo:'gol'|'golRival'}` a `fuentes/stream/estado.json`; `retransmitir.mjs` escribe ahí el partido actual (`placa-envivo.mjs --json`).

## Overlay (scripts/stream/overlay.html, 1920×1080)
Mismo lenguaje que el compilado de goles. Pedido de Juan:
- A la vista quedan solo **el marcador de FC27** (con la placa del torneo y el rival al lado) y **la barra de abajo a la derecha**.
- Arriba a la derecha va la placa del club: tapa el panel "J. MARTINEZ".
- **El palco va del lado de NUESTRA barra de FC27** (pedido de Juan): esa barra puede estar a la izquierda o a la derecha, y cambia incluso dentro del mismo partido (no depende de local/visitante). `vigia-vivo.mjs` lo detecta con `scripts/lib/lado-barra.mjs`: cada 2 s hace OCR de los nombres de las dos barras y los compara con el apellido de quien transmite (panel de arriba a la derecha, "6 J. MARTINEZ"; su barra siempre lo muestra) y con los nombres que va aprendiendo de cada lado. Un cambio se acepta con 2 lecturas seguidas y queda en `estado.json` como `lado: 'izq'|'der'`. El overlay muda el palco con un fundido; en la vertical se muda la tapa de la barra. Probado sobre la grabación del 14/10: detectó el cambio 2 s después del corte.
- En el palco siempre hay un jugador encadenando clips de espera (aliento, indicaciones, agitado, sudor, aplaude, pide, calma) con fundido. Cada 3 clips cambia de jugador (entre `estado.jugadores` si viene). **Sin repeticiones:** siempre se elige el clip y el jugador que hace más tiempo que no salen. Con un gol propio sale la franja GOOOL (a media altura, para no taparle la cara al jugador) y gol/festejo; con uno rival, frustrado/reclama.
- Lee `fuentes/stream/clips/indice.json` y `fuentes/stream/estado.json` cada 1,5 s. Para revisar el diseño: `?demo=clip|gol` y `scripts/stream/preview.mjs`.

## Clips de jugadores
- `node scripts/stream/clip-jugador.mjs <gt> <emoción>` → `fuentes/stream/clips/<gt>/<emoción>.webm` (VP9 con alfa). Se genera **de cuerpo entero** (render `Frente4.png` sobre gris, con aire arriba) en Canva "Imagen a video" y después se recorta del pecho para arriba, con un encuadre fijo relativo al cuerpo (ver abajo). Corrección de Juan: con el busto recortado de entrada, el modelo inventaba los brazos y le sacaba los guantes.
- El fondo se saca con rembg `u2net_human_seg` cuadro por cuadro (`quitar-fondo.py`, sin `-I` porque rembg está en el site-packages del usuario). Si el `.mp4` ya existe, no se le vuelve a pedir a Canva (`--rehacer` para forzarlo).
- **Tanda automática** (pedido de Juan: que corra sola durante días): tarea "TopSecret - Clips overlay" cada hora → `lote-clips.mjs` (lock, saltea lo hecho, corta tras 3 fallas seguidas y reintenta a la hora siguiente). Va por rondas: primero aliento, indicaciones, gol y frustrado para los 11 habituales; después el resto. Actualiza el índice. Log: `fuentes/stream/lote-clips.log`. Ritmo con el cupo de Canva agotado: ~11 min por clip.
- Canva entrega ~768×1088, así que el recorte queda en ~400 px: alcanza para el palco, no para pantalla completa. Las emociones de espera piden volver a la postura inicial, pero Canva no siempre lo respeta (de ahí el fundido).
