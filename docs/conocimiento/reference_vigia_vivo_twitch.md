---
name: reference_vigia_vivo_twitch
description: Vigía del vivo de Twitch — detecta goles (cambios del marcador FC27) y captura las pantallas del reporte post-partido mientras Juan transmite; scripts/vigia-vivo.mjs
metadata:
  type: reference
---

`node scripts/vigia-vivo.mjs` mira twitch.tv/topsecretfc a **1 cuadro/s en 720p** mientras está en vivo y deja todo en `fuentes/vivo/<fecha>-<streamId>/` (gitignored):

- `goles/partido-NN-*`: el marcador apareció tras más de 90 s sin verse (arranque de partido o vuelta del entretiempo). El recorte muestra las siglas del rival.
- `goles/gol-NN-<hhmmss>-marcador.png` + `.jpg`: cambio sostenido 3 s en las cifras del marcador. La hora es **del stream** y sirve para cortar el clip (ver [scripts/goles/README.md](../../scripts/goles/README.md)); `rec/*.ts` es la grabación del vivo en segmentos de 15 min, así no hace falta bajar el VOD.
- `reporte/reporte-NNN-*.png` + `.json`: cada pantalla de estadísticas post-partido (Resumen/Eventos/Rendimiento, una por pestaña o jugador) en 720p, con el OCR de Windows. De ahí sale la carga en `seed_matches.js`: resultado, goleadores con minuto, nota/G/AST por jugador y stats del equipo. Juan abre estas pantallas al final de cada partido oficial; en los amistosos hay que pedirle que las deje ~5 s.
- `resumen.md` y `eventos.jsonl`: el índice de todo lo anterior.

**Arranque automático:** `watch-regen.ps1` (cada minuto) consulta Twitch y, si está en vivo y no hay vigía (lock `fuentes/vivo/.vigia.lock` con PID vivo), lo lanza oculto. Log: `scripts/vigia-vivo.log`. Corta solo cuando termina la transmisión (reintenta si se cae la lectura). Va en paralelo a `retransmitir.mjs` ([[reference_retransmitir_twitch]]); son conexiones independientes a Twitch.

**Prueba sobre un VOD:** `node scripts/vigia-vivo.mjs --vod <id>` (no graba). Con el VOD 2893092714 (2026-10-06, RAF 1-1 y NPS 1-3) detectó los 6 goles y 10 pantallas de reporte en unos 10 min.

Detalles técnicos y gotchas:
- **Marcador FC27 (720p):** caja blanca en x103-163/y38-74 (presencia: >45 % blanco **y** >5 % oscuro, para descartar pantallas blancas); cifras en x166-192/y40-72. Si FC cambia el HUD o la PS5 transmite en otra resolución, recalibrar `SB_*` en el script.
- **Cambio de cifras:** binarizado por fila (local/visita), XOR/unión de píxeles oscuros. Umbral 0,16: el ruido llega a 0,09 y el paso de 2 a 3 da 0,23. Con diferencia de grises simple no se detectaba el 2→3.
- **El OCR de Windows** (`scripts/lib/ocr-windows.ps1`, sin instalar nada, idioma es) lee bien el texto grande, pero en las cifras chicas del marcador confunde 0/O. Por eso los goles se detectan por píxeles y el dato oficial (quién y en qué minuto) sale de la pantalla "Eventos".
- Usar un archivo temporal **distinto por cuadro**: el proceso de OCR puede tener abierto el anterior y sharp falla con "unable to open for write".
- Estado en vivo sin credenciales: GQL de Twitch con el Client-ID público `kimne78kx3ncx6brgo4mv6wki5h1ko`.
- **PS Remote Play no sirve para esto:** al conectarse le saca el control al DualSense de la consola (limitación de la PS5). `scripts/captura-remoteplay.mjs` queda para capturas con la PS5 libre.
