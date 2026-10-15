---
name: project_overlay_vivo
description: Vivo con overlay gráfico en las 3 transmisiones (Twitch topsecretfc, Kick, YouTube): la PS5 transmite a Enohcaid y la PC arma la señal con OBS + clips de jugadores — scripts/stream/ y retransmitir.mjs
metadata:
  type: project
---

**Pedido de Juan (2026-10-15):** las 3 transmisiones oficiales con gráficos y un jugador animado siempre presente. Desde ese día la PS5 transmite a la cuenta de Twitch **Enohcaid** (señal fuente, sin gráficos); la PC arma la señal con overlay y la manda a topsecretfc, Kick y YouTube.

## Cadena (scripts/retransmitir.mjs, tarea "TopSecret - Retransmitir Twitch", lun-jue 22:30–00:30)
`enohcaid` → streamlink como servidor http (`127.0.0.1:8787`) → **OBS**, una sola instancia con un lienzo de 3000×1920: a la izquierda la horizontal (partido + `overlay.html`), a la derecha la vertical (partido a lo ancho en y=330 + `overlay-vertical.html`). Sale en NVENC a 20 Mbps a **MediaMTX** (`rtmp://127.0.0.1:1935/live/mix`, local, no gasta subida; `scripts/stream/mediamtx.yml`, binario en `fuentes/stream/bin/mediamtx/`). De ahí ffmpeg (`scripts/stream/salidas.mjs`) recorta y codifica: horizontal 1280×720 → tee a topsecretfc, Kick y YouTube; vertical 720×1280 → Instagram. Las dos en 720p30 a 1500 kbps (pedido de Juan: mantener 720 y bajar el resto).
- **Dos instancias de OBS no sirven:** el navegador interno (CEF) no arranca en la segunda y su overlay sale vacío (probado 2026-10-15). Por eso va un solo lienzo.
- Probar sin transmitir: `node scripts/stream/demo-vivo.mjs <video> --dur 110 --gol 36 --golRival 96` → `fuentes/stream/preview/demo-horizontal.mp4` + `demo-vertical.mp4`.
- Si en ~2 min la señal con overlay no aparece en MediaMTX, reenvía Enohcaid directo sin gráficos (con `--sin-overlay`, siempre directo). Con overlay, el corte lo marca Enohcaid (2 chequeos por GQL), porque OBS sigue mandando aunque la PS5 corte.
- **OBS** se configura por archivos: `node scripts/stream/obs-config.mjs [--kbps N]` (perfil y colección "TopSecret", `user.ini` en OBS 31+, sin asistente de primer uso ni confirmaciones). Control por obs-websocket 127.0.0.1:4455 con `OBS_WS_PASSWORD` de `.env` (`scripts/stream/obs-ws.mjs`, también como CLI).
- **Gotcha OBS:** si se lo mata con /F, al abrir muestra "Se ha detectado un error" y se queda esperando. `retransmitir.mjs` borra `%APPDATA%\obs-studio\.sentinel\run_*` antes de abrirlo. `--disable-shutdown-check` no alcanza.
- **Ancho de banda (medido 2026-10-15):** la subida de la PC da ~10 Mbps y la PS5 (misma conexión) manda 720p60 a ~2 Mbps. 4 copias de 1,6 Mbps + la PS5 ≈ 8,6 Mbps. Para más calidad: subir una sola copia y repartirla en la nube.
- **TikTok:** sin LIVE habilitado (6 seguidores al 2026-10-15; suele pedir ~1000). **Facebook:** Juan no lo quiere.
- El vigía (`vigia-vivo.mjs`) y su arranque en `watch-regen.ps1` miran Enohcaid. En cada gol con equipo conocido agrega `{id, tipo:'gol'|'golRival'}` a `fuentes/stream/estado.json`; `retransmitir.mjs` escribe ahí el partido actual (`placa-envivo.mjs --json`).

## Instagram (scripts/stream/ig-vivo.mjs)
Sin API: se usa el Live Producer de instagram.com en el Chrome CDP (sesión de @fctopsecret iniciada por Juan el 2026-10-15). En cada sesión, `retransmitir.mjs` abre una ventana propia, toca Crear (`svg[aria-label="Nueva publicación"]`) → "Vídeo en directo", pone el título ("Top Secret FC en vivo · VPUG vs <rival>"), elige audiencia (Público, o "Practicar" con `--prueba`/`--ig-practica`: solo lo ve la cuenta), pasa a "Siguiente" y lee la URL rtmps y la clave (de un solo uso) de los inputs del diálogo. Cuando la vista previa del diálogo avanza más de 3 s (ya llega nuestra señal), toca "Transmitir". Al terminar, "Finalizar vídeo en directo" (el video queda en el archivo de la cuenta; en práctica se descarta).
- **Gotchas:** los botones del diálogo se clickean por JavaScript, porque un clic normal lo tapa una capa. **Instagram no corta el vivo cuando deja de llegar señal:** si queda uno abierto, al reabrir el diálogo aparece ese mismo vivo; `ig-vivo.mjs` lo detecta, lo finaliza y lo descarta. También existe "Administrar clave de streaming permanente" (no se usa: igual hay que tocar Transmitir en la web).
- La salida vertical también va por tee con `onfail=ignore`: si Instagram falla, no se caen las otras redes.
- **Prueba de punta a punta sin publicar:** `node scripts/retransmitir.mjs --prueba --fuente <canal de Twitch en vivo> --hasta HH:MM` (horizontales a `rtmp://127.0.0.1:1935/prueba/h`, Instagram en práctica, sin historia). Probado 2026-10-15: salió al aire en práctica 19 s después de crear el vivo.
- Instagram dibuja encima de la vertical su propia interfaz (arriba perfil y EN VIVO, abajo comentarios): tenerlo en cuenta al mover cosas en `overlay-vertical.html`.

## Overlay (scripts/stream/overlay.html, 1920×1080)
Mismo lenguaje que el compilado de goles. Pedido de Juan:
- A la vista quedan solo **el marcador de FC27** (con la placa del torneo y el rival al lado) y **la barra de abajo a la derecha**.
- Arriba a la derecha va la placa del club: tapa el panel "J. MARTINEZ".
- **El palco va del lado de NUESTRA barra de FC27** (pedido de Juan): esa barra puede estar a la izquierda o a la derecha, y cambia incluso dentro del mismo partido (no depende de local/visitante). `vigia-vivo.mjs` lo detecta con `scripts/lib/lado-barra.mjs`: cada 2 s hace OCR de los nombres de las dos barras y los compara con el apellido de quien transmite (panel de arriba a la derecha, "6 J. MARTINEZ"; su barra siempre lo muestra) y con los nombres que va aprendiendo de cada lado. Un cambio se acepta con 2 lecturas seguidas y queda en `estado.json` como `lado: 'izq'|'der'`. El overlay muda el palco con un fundido; en la vertical se muda la tapa de la barra. Probado sobre la grabación del 14/10: detectó el cambio 2 s después del corte.
- En el palco siempre hay un jugador encadenando clips de espera (aliento, indicaciones, agitado, sudor, aplaude, pide, calma) con fundido. Cada 3 clips cambia de jugador (entre `estado.jugadores` si viene). **Sin repeticiones:** siempre se elige el clip y el jugador que hace más tiempo que no salen. Con un gol propio sale la franja GOOOL (a media altura, para no taparle la cara al jugador) y gol/festejo; con uno rival, frustrado/reclama.
- Lee `fuentes/stream/clips/indice.json` y `fuentes/stream/estado.json` cada 1,5 s. Para revisar el diseño: `?demo=clip|gol` y `scripts/stream/preview.mjs`.

## Modo pausa (scripts/stream/overlay-pausa.js + .css, charlas.json)
Pedido de Juan (2026-10-15): contenido entretenido en los menús, el lobby y la espera entre partidos.
- **Detección:** `vigia-vivo.mjs` escribe `estado.modo`. Es `juego` si hay marcador; `reporte` si vio una pantalla de estadísticas hace 12 s o menos (aparecen solo al final de cada partido, nunca en el entretiempo: verificado en los vivos del 12 y el 14/10); `pausa` después de 25 s sin marcador (con menos, cada festejo o repetición sería pausa). Al primer reporte después de un partido agrega el evento `finPartido` con el resultado según los goles contados: el palco reacciona con triste (derrota), festejo (victoria) o aplaude (empate).
- **Reportes:** se dejan a la vista (son buen contenido). Se podrían tapar sin perder datos: el vigía lee la señal limpia de Enohcaid, no lo que ven los espectadores.
- **Escenas** (rotan; en la vertical, dentro de y 230–1650 por la interfaz de Instagram):
  - charla de dos jugadores con globos que se escriben de a poco (prefiere los clips `habla` y `escucha`);
  - entrevista de "TS TV";
  - próximo partido (`estado.proximos`);
  - números de la etapa actual (`estado.temporada`: PJ/G/E/P/GF/GC y goleador, de `seed_matches.js` vía `datos-vivo.mjs`; la etiqueta sale de `ETAPA`).
  Las líneas no se repiten hasta que pasaron las demás.
- **Guion** en `charlas.json`: marcadores {A} {B} {rival} {hora} {pj}… y `requiere`/`despues` (solo después de una victoria, derrota o empate). Respetar las reglas de nombres de ligas y los gamertags tal cual.
- **Música:** temas propios del club (`fuentes/musica/propios`, R2; lista en `fuentes/stream/musica.json` que arma `datos-vivo.mjs`). Suena solo en la página horizontal (fuente de navegador con `reroute_audio`: el audio de OBS es uno solo para las dos versiones). Volumen 0,10, porque los temas vienen a -14 LUFS: así quedan en ~-34 dB, al nivel del partido. En pausa, `retransmitir.mjs` baja la fuente "Partido" a -22 dB por obs-websocket.
- **Probar:** `demo-vivo.mjs … --modo pausa@25 --modo juego@95`.
- **Datos que se actualizan solos (pedido de Juan, 2026-10-15):**
  - convocados de hoy (`datos-vivo.mjs` → `convocados()`, misma regla que `getStatus()` de convocatoria.html: verde o amarillo), cada 5 min en `estado.jugadores`: solo ellos en el palco y las charlas (si ninguno tiene clips, todos);
  - partidos de la noche a `seed_matches.js` desde EA al terminar el horario del vivo (`scripts/cargar-partidos-ea.mjs --aplicar --commit`), así la temporada del modo pausa y el sitio quedan al día. Quedan con `origen:'ea-auto'` para completarlos con el reporte del video. No carga los `sospechoso` ni los que no cierran (goles de los jugadores ≠ resultado: el 14/10 EA registró un 3-0 de un partido cortado que el Worker no marcó). Esos quedan como "REVISAR A MANO" en el log;
  - **Etapa (automática por fecha, `ETAPAS` en `datos-vivo.mjs`):** pretemporada del 29/9 al 19/10 y **Temporada 4 desde el martes 2026-10-20** (arranca con Espacio Gamer; dato de Juan). Las frases usan `{etapa}` ("la pretemporada" / "la temporada 4"). Para la próxima etapa, agregar una línea a `ETAPAS`.

## Clips de jugadores
- `node scripts/stream/clip-jugador.mjs <gt> <emoción>` → `fuentes/stream/clips/<gt>/<emoción>.webm` (VP9 con alfa). Se genera **de cuerpo entero** (render `Frente4.png` sobre gris, con aire arriba) en Canva "Imagen a video" y después se recorta del pecho para arriba, con un encuadre fijo relativo al cuerpo (ver abajo). Corrección de Juan: con el busto recortado de entrada, el modelo inventaba los brazos y le sacaba los guantes.
- El fondo se saca con rembg `u2net_human_seg` cuadro por cuadro (`quitar-fondo.py`, sin `-I` porque rembg está en el site-packages del usuario). Si el `.mp4` ya existe, no se le vuelve a pedir a Canva (`--rehacer` para forzarlo).
- **Tanda automática** (pedido de Juan: que corra sola durante días): tarea "TopSecret - Clips overlay" cada hora → `lote-clips.mjs` (lock, saltea lo hecho, corta tras 3 fallas seguidas y reintenta a la hora siguiente). Va por rondas: 1) aliento, indicaciones, gol, frustrado; 2) habla, escucha (charlas del modo pausa), agitado, reclama; 3) sudor, pide, aplaude, calma; 4) festejo, triste. **Se pausa durante el vivo** (si MediaMTX está corriendo), porque rembg carga la CPU. Actualiza el índice. Log: `fuentes/stream/lote-clips.log`. Ritmo con el cupo de Canva agotado: ~11 min por clip.
- **Encuadre fijo relativo al cuerpo del render** (720×586: ancho 0,8 × alto del cuerpo; desde 0,2 × alto por encima de la cabeza hasta 0,45 × alto por debajo), así todos los clips y todos los jugadores salen a la misma escala. Antes cada clip se ajustaba a lo que ocupaba el jugador y, si estiraba los brazos, se veía más chico (Juan lo notó en indicaciones de nikileo527). Canva escala la base 1152×1536 por la altura y recorta los costados (sale 768×1088): la fórmula lo tiene en cuenta. Para rehacer el recorte de un clip ya generado: `--solo-alpha`. Alcanza para el palco, no para pantalla completa. Las emociones de espera piden volver a la postura inicial, pero Canva no siempre lo respeta (de ahí el fundido).
