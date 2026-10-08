---
name: reference_retransmitir_twitch
description: Retransmisión del vivo de Twitch (sale directo de la PS5) a Kick y YouTube desde la PC — scripts/retransmitir.mjs
metadata:
  type: reference
---

Juan transmite **directo desde la PS5 a Twitch** (twitch.tv/topsecretfc). La PS5 no puede transmitir a dos plataformas ni a Kick, así que la PC toma el vivo de Twitch y lo reenvía:

- `node scripts/retransmitir.mjs [--hasta HH:MM]`: espera a que Twitch esté en vivo, `streamlink` (Python, `python -m pip install --user streamlink`) → `ffmpeg -c copy` con salida `tee` a cada destino. Sin recodificar; ~10–20 s de retraso. Reintenta si se corta. Log en `fuentes/redes/retransmitir.log` (la clave se enmascara).
- Destinos en `.env` (nunca en el repo): `KICK_RTMP_URL` (`rtmps://<host>.global-contribute.live-video.net:443/app/`, Kick usa Amazon IVS) + `KICK_STREAM_KEY`; `YT_RTMP_URL` (`rtmp://a.rtmp.youtube.com/live2`) + `YT_STREAM_KEY` (clave predeterminada reutilizable de YouTube Studio → Emitir en directo, cargada 2026-10-07; inicio/detención automáticos). Las claves se enmascaran en el log.
- **Gotcha:** Twitch entrega HLS en fMP4 (tag `avc1`) y el FLV de salida falla con "Tag avc1 incompatible" → forzar `-tag:v 7 -tag:a 10`.
- Tarea programada "TopSecret - Retransmitir Twitch" (`scripts/retransmitir.vbs`, sin ventana): **lunes a jueves 22:30, corta 00:30** (pedido de Juan 2026-10-07), StartWhenAvailable, IgnoreNew (nunca dos instancias: duplicaría el envío a la misma clave). La PC tiene que estar prendida con sesión iniciada y la subida debe aguantar una copia por destino (~6 Mbps c/u).
- **Historia "EN VIVO" automática (2026-10-07):** al detectar el vivo, una vez por noche (marca `fuentes/redes/envivo-publicada-<fecha>.txt`), genera la placa con `placa-envivo.mjs --fecha <hoy>`, la sube a R2 `logos/placas/envivo-<fecha>.jpg` y la publica con `meta.mjs ig-historia` (etiqueta @vpugvirtual_prouruguay_gaming si hay partido de VPUG). Si falla, borra la marca y reintenta en el próximo arranque del vivo. `--sin-historia` la desactiva.
- Kick del club: https://kick.com/topsecretfc (creado 2026-10-05).

- **Primer uso (2026-10-05):** funcionó (Kick al aire desde las 22:38, con espectadores). Kick sale con título/categoría/idioma por defecto ("My first stream.", Just Chatting, English): cambiarlos en dashboard.kick.com/stream → Información del stream (lápiz) → textarea title, categoría "EA Sports FC 27", idioma "Spanish" → Guardar. Kick los recuerda para los próximos vivos.
- **Aviso de Kick "MAL CONFIGURADO":** pide fotogramas clave cada 2 s; la PS5 manda otro intervalo y con `-c copy` no se puede cambiar. El stream igual se ve. Si diera problemas (cortes, más retraso), recodificar el video (`-c:v h264_nvenc -g 60` si hay GPU NVIDIA, si no `libx264 -preset veryfast -g 60`, pesado en 1080p60).
