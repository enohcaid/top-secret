---
name: reference_retransmitir_twitch
description: Retransmisión del vivo de Twitch (sale directo de la PS5) a Kick y YouTube desde la PC — scripts/retransmitir.mjs
metadata:
  type: reference
---

Juan transmite **directo desde la PS5 a Twitch** (twitch.tv/topsecretfc). La PS5 no puede transmitir a dos plataformas ni a Kick, así que la PC toma el vivo de Twitch y lo reenvía:

- `node scripts/retransmitir.mjs [--hasta HH:MM]`: espera a que Twitch esté en vivo, `streamlink` (Python, `python -m pip install --user streamlink`) → `ffmpeg -c copy` con salida `tee` a cada destino. Sin recodificar; ~10–20 s de retraso. Reintenta si se corta. Log en `fuentes/redes/retransmitir.log` (la clave se enmascara).
- Destinos en `.env` (nunca en el repo): `KICK_RTMP_URL` (`rtmps://<host>.global-contribute.live-video.net:443/app/`, Kick usa Amazon IVS) + `KICK_STREAM_KEY`; `YT_RTMP_URL` + `YT_STREAM_KEY` cuando YouTube termine la habilitación de 24 h (pedida 2026-10-05).
- **Gotcha:** Twitch entrega HLS en fMP4 (tag `avc1`) y el FLV de salida falla con "Tag avc1 incompatible" → forzar `-tag:v 7 -tag:a 10`.
- Tarea programada "TopSecret - Retransmitir Twitch" (`scripts/retransmitir.vbs`, sin ventana). La PC tiene que estar prendida y la subida debe aguantar una copia por destino (~6 Mbps c/u).
- Kick del club: https://kick.com/topsecretfc (creado 2026-10-05).
