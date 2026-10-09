---
name: reference_vigia_vivo_twitch
description: Vigía del vivo de Twitch — detecta goles (cambios del marcador FC27) y captura las pantallas del reporte post-partido mientras Juan transmite; scripts/vigia-vivo.mjs
metadata:
  type: reference
---

`node scripts/vigia-vivo.mjs` mira twitch.tv/topsecretfc a **1 cuadro/s en 720p** mientras está en vivo y deja todo en `fuentes/vivo/<fecha>-<streamId>/` (gitignored):

- `goles/partido-NN-*`: el marcador apareció tras más de 90 s sin verse (arranque de partido o vuelta del entretiempo). El recorte muestra las siglas del rival.
- `goles/gol-NN-<hhmmss>-marcador.png` + `.jpg`: cambio sostenido 3 s en las cifras del marcador. La hora es **del stream** y sirve para cortar el clip (ver [scripts/goles/README.md](../../scripts/goles/README.md)); `rec/*.ts` es la grabación del vivo en segmentos de 15 min, así no hace falta bajar el VOD.
- **Clips de goles (2026-10-08):** al terminar la sesión une `rec/*.ts` en `fuentes/goles/v<clave>/source.mp4` (clave = id del VOD o `vivo-<fecha>`) y corta un clip por cada gol **de TOP** en `goles/gol-NN.mp4` (15 s), más un borrador `fuentes/goles/v<clave>/datos.json` para `scripts/goles/compilado.cjs`. Hay que completar minuto, goleador, número y escudo con la pantalla "Eventos" del reporte. `--solo-clips <carpeta>` rehace los clips de una sesión ya vigilada. A favor o en contra: el OCR lee las siglas del marcador 6 s después de que aparece (en la animación de entrada no lee nada) para saber en qué fila está TOP, y se reintenta con el recorte de cada gol.
- **Cómo se ubica el gol:** en FC27 online no hay repetición. El marcador cambia **a veces en el momento del gol y a veces recién con el saque del medio**. Cada gol se re-ubica en `source.mp4` buscando el cambio de cifras a 4 fps, por si el contador del vigía se corrió o hubo reconexiones. El clip termina justo antes del primer corte de cámara (arranca el festejo) entre 14 s antes y 4 s después del cambio: se midieron cortes hasta 2,4 s después. Si no hay corte (gol sin festejo, transición suave al saque), termina en el cambio + 0,3 s. Escena de ffmpeg a 60 fps: juego ≤ 0,02, corte al festejo ~0,27; el umbral está en 0,12 (con 0,35 no veía ningún corte).
- `reporte/reporte-NNN-*.png` + `.json`: cada pantalla de estadísticas post-partido (Resumen/Eventos/Rendimiento, una por pestaña o jugador) en 720p, con el OCR de Windows. De ahí sale la carga en `seed_matches.js`: resultado, goleadores con minuto, nota/G/AST por jugador y stats del equipo. Juan abre estas pantallas al final de cada partido oficial; en los amistosos hay que pedirle que las deje ~5 s.
- `resumen.md` y `eventos.jsonl`: el índice de todo lo anterior.

**Horario (pedido de Juan 2026-10-08): solo lunes a jueves 22:30–00:30**, la misma ventana que la retransmisión. Fuera de esa ventana ni siquiera se consulta Twitch, y el vigía se corta solo a las 00:30 (`--hasta HH:MM` para cambiarlo) aunque el vivo siga. Si cambian los días u horarios de partido, actualizar `$ventanaVigia` en `watch-regen.ps1` y el default de `--hasta`.

**Arranque automático:** dentro de esa ventana, `watch-regen.ps1` (cada minuto) consulta Twitch y, si está en vivo y no hay vigía (lock `fuentes/vivo/.vigia.lock` con PID vivo), lo lanza oculto. Log: `scripts/vigia-vivo.log`. Corta solo cuando termina la transmisión (reintenta si se cae la lectura). Va en paralelo a `retransmitir.mjs` ([[reference_retransmitir_twitch]]); son conexiones independientes a Twitch.

**Prueba sobre un VOD:** `node scripts/vigia-vivo.mjs --vod <id>` (no graba). Con el VOD 2893092714 (2026-10-06, RAF 1-1 y NPS 1-3) detectó los 6 goles y 10 pantallas de reporte en unos 10 min.

Detalles técnicos y gotchas:
- **Marcador FC27 (720p):** caja blanca en x103-163/y38-74 (presencia: >45 % blanco **y** >5 % oscuro, para descartar pantallas blancas); cifras en x166-192/y40-72. Si FC cambia el HUD o la PS5 transmite en otra resolución, recalibrar `SB_*` en el script.
- **Cambio de cifras** (detector en `scripts/lib/marcador.mjs`, rehecho 2026-10-09): binarizado por fila (local/visita), XOR/unión de píxeles oscuros. Con diferencia de grises simple no se detectaba el 2→3. El 2026-10-08 la versión anterior (cuadro suelto contra la base, umbral 0,16, 3 s) dio **9 cambios con 5 falsos**: con poco bitrate un cuadro suelto llega a 0,23 de ruido, el marcador se ve borroso en las transiciones y en los últimos segundos antes de que se corte la señal sale roto. Ahora:
  - compara la **mediana de los últimos 5 cuadros** (el ruido de compresión se cancela);
  - un gol cambia **una sola fila** (> 0,19 y la otra < 0,12); si cambian las dos es borroso/transición y se ignora (si dura 20 cuadros se toma como base nueva). Margen chico: el 2→3 da 0,21–0,24 y lo borroso llega a 0,18 (con 0,25 se perdía el 2→3 del VOD 2893092714; con 0,17 aparecía un falso el 2026-10-08);
  - **sostenido 6 cuadros** en vivo (8 a 4 fps al re-ubicar el clip); los goles reales aguantan 8+;
  - descarta el cuadro si la caja de siglas (TOP/PKE) no se parece a la del arranque del partido (correlación < 0,5; normal ≥ 0,89).
  - Cada gol guarda su `fila`; si las siglas se leyeron recién en un gol posterior, `leerEventos()` completa los "¿de quién?" anteriores del mismo partido (antes se clipeaban también goles en contra).
  - **Probar un cambio:** `node scripts/probar-marcador.mjs <video.mp4 | url HLS> [--salida <carpeta>]` corre solo el detector (sin OCR ni clips); opciones del detector con `MARCADOR_OPC='{"sostener":6}'`, métricas por cuadro con `MARCADOR_DEBUG=1`. Referencias: el `source.mp4` del 2026-10-08 (`fuentes/goles/vvivo-2026-10-08/`) tiene que dar 4 goles (16:11, 20:20, 20:51, 31:54) y el VOD 2893092714 (URL con `yt-dlp -g`), 6.
- **El OCR de Windows** (`scripts/lib/ocr-windows.ps1`, sin instalar nada, idioma es) lee bien el texto grande, pero en las cifras chicas del marcador confunde 0/O. Por eso los goles se detectan por píxeles y el dato oficial (quién y en qué minuto) sale de la pantalla "Eventos".
- Usar un archivo temporal **distinto por cuadro**: el proceso de OCR puede tener abierto el anterior y sharp falla con "unable to open for write".
- Estado en vivo sin credenciales: GQL de Twitch con el Client-ID público `kimne78kx3ncx6brgo4mv6wki5h1ko`.
- **PS Remote Play no sirve para esto:** al conectarse le saca el control al DualSense de la consola (limitación de la PS5). `scripts/captura-remoteplay.mjs` queda para capturas con la PS5 libre.
