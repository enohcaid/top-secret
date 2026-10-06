# Compilado de goles desde la transmisión de Twitch (FC27)

Proceso validado el 2026-10-01 con los amistosos del 30/9. Juan lo pide junto con el reporte de cada día de competencia: los datos salen **del vivo en `twitch.tv/topsecretfc`**, ya no de los videos de YouTube.

## 1. Bajar el VOD
```bash
node_modules/yt-dlp-exec/bin/yt-dlp.exe --flat-playlist --dump-json --playlist-end 3 https://www.twitch.tv/topsecretfc/videos   # id, título, duración
node_modules/yt-dlp-exec/bin/yt-dlp.exe -f "best[height<=720]" -o "fuentes/goles/v<id>/source.%(ext)s" https://www.twitch.tv/videos/<id>
```
~2,3 GB por 85 min a 720p, ~12 min de descarga. Va a `fuentes/` (gitignored) y **se borra al terminar**.

## 2. Encontrar los goles (y los resultados para el reporte)
Marcador FC27: caja blanca arriba a la izquierda, dos filas `SIGLA escudo GOLES` + reloj. En 720p: `crop=140:58:60:35`. TOP puede ser la fila de arriba (local) o la de abajo (visita).
1. Recortes cada 10 s → hojas con la hora del VOD → leer el marcador (visión). Ahí salen los partidos de la noche (siglas: INF, S21, OLI, INS…), el resultado final de cada uno y los minutos en que cambia la fila de TOP.
2. En cada cambio de TOP, recortes cada 1 s para el segundo exacto. En FC27 el marcador a veces se actualiza recién con el saque del medio, varios segundos después del gol.
3. Fin del clip: cuadros a 4 fps alrededor del cambio. Termina justo antes del corte de cámara (saque del medio o festejo); si no hay corte, ~0,5 s después del cambio. Inicio: ~15 s antes (penal: desde que el pateador está frente a la pelota, ~10 s).

## 3. Identificar al goleador
- Sobre el jugador que lleva la pelota FC27 muestra su **nombre**: leerlo en el video a resolución completa (no en miniaturas) en los 1-3 s antes del gol.
- El jugador de quien transmite tiene la etiqueta fija (ej. "MARTINEZ") y su nota abajo a la izquierda **sube** tras su gol.
- Festejos o penales con toma cercana: nombre y número en la camiseta. Puede ser un alias: ver `docs/conocimiento/feedback_nombres_en_reportes.md` (ej. ABUELA = nikileo527).
- En penales, mirar al que **patea**, no al que acomoda la pelota.
- El HUD de abajo a la derecha es de un jugador **rival**: no sirve.
- Si queda duda, preguntarle a Juan antes de publicar.

## 4. Armar el video
Copiar `ejemplo-2026-09-30.json` a `fuentes/goles/v<id>/datos.json`, completar los goles y correr:
```bash
node scripts/goles/compilado.cjs fuentes/goles/v<id>/datos.json --subir
```
- **Placas opacas en las 4 esquinas, tapando todo el HUD:** partido arriba a la izquierda, gol y minuto arriba a la derecha, goleador con foto (`Renders/<gt>/Brazos4.png`) + número + gamertag abajo a la izquierda, club abajo a la derecha. Apertura "Los goles" y cierre con el escudo. 1280×720, audio del juego.
- **`hudTopRightHasta`:** hasta qué alto (px) llega lo que hay que tapar arriba a la derecha. Con el ícono del joystick en pantalla era **210**. Juan lo va a sacar de la transmisión: entonces alcanza con ~100 (solo el panel "J. MARTINEZ", y 38-95) y la placa se achica sola.
- **Escudos de rivales:** usar `scripts/lib/escudos.mjs` (busca en VPN, VPUG y 11x11).
- **`--subir`:** lo deja en R2 `videos/goles/<fecha>/compilado.mp4`, servido en `https://top-secret-proxy.juan-c-m-1985.workers.dev/media/videos/goles/<fecha>/compilado.mp4`.

## 5. Limpiar
Borrar `fuentes/goles/v<id>/` entera (source.mp4 incluido). El compilado queda en R2.

## Goles de la semana
Cada noche con goles deja su compilado en R2 `videos/goles/<fecha>/compilado.mp4` (y los datos en `_fuentes/goles/datos/<fecha>.json`) para armar el video de los goles de la semana. Hasta ahora: 2026-09-30 (amistosos), 2026-10-05 (VPUG Liga Pretemporada, 3 goles de nikileo527). Recordar: el video semanal publicado lleva música propia que no se repite (scripts/lib/musica.mjs).
