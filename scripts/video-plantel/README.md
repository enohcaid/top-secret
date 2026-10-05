# Videos "Plantel" y "Equipo de hoy"

Reel vertical 1080×1920 a 30 fps. Cada jugador entra grande con su clip (acercamiento a cámara sobre su **pose de presentación `Gesto4`**: un gesto distinto por jugador, mirando a cámara), muestra número, puesto y gamertag, y vuela a su lugar hasta que quedan todos juntos. El clip se reproduce al revés (del primer plano a la pose completa) para que el gesto se vea entero. **En la grilla cada uno queda con su propia pose** (Juan lo prefirió así). Opción `POSE_GRILLA=Brazos4`: grilla pareja de brazos cruzados, con una transición (fundido + destello dorado) del gesto a los brazos mientras vuela — la IA no puede animar de una pose a otra. Necesita los cuadros de esa pose (`POSE=Brazos4 node scripts/video-plantel/prep.mjs`). Cierra con `#TOPSECRETFC`. Lleva música trap libre (regla del club).

- **Plantel** (`--modo plantel`, default): todo `ROSTER_T4` en una grilla de 4 columnas, en el orden de `roster.js` (arqueros → delanteros), última fila centrada. ~29 s. Música default: *Whoop*.
- **Equipo de hoy** (`--modo equipo`): la formación que se armó en la convocatoria (Firestore `convocatoria/state.lineup`: `formation` + `slots`, y `captain`). Las líneas salen de `FORMATIONS` de `convocatoria.html` (delanteros arriba, arquero abajo) y los nombres de puesto de `SLOT_LABEL_ES`. Entran de atrás para adelante. Puestos vacíos no salen (el script los avisa). El capitán lleva "Capitán" y una C. Abajo, los **partidos de hoy** (los que muestra la convocatoria publicada, `getTodayMatches`, amistosos incluidos; solo si `--fecha` es hoy). ~19 s. Música default: *Locked In*.
- **Portada:** los 2 primeros cuadros son la imagen final (todos ubicados + partidos), que es la miniatura de WhatsApp y las redes. Se guarda también como `<video>-portada.jpg`.

## Video "Nuevos fichajes"

`node scripts/video-plantel/fichajes.mjs gt1 gt2 ...` (en el orden del video): cada fichaje tiene su momento a pantalla completa, sin recuadros — arranca de brazos cruzados (clip `Brazos4`), un destello dorado lo pasa a su pose (`Gesto4`) y entran nombre, número y puesto. Abre con "NUEVOS FICHAJES" y cierra con los fichajes recortados juntos y "BIENVENIDOS". Escena en `escena-fichajes.js`. Saca también `-portada.jpg` (vertical, = primer cuadro) y `-portada-4x3.jpg` (para la noticia). Necesita los cuadros de las dos poses (`POSE=Brazos4 prep.mjs <gt>` y `prep.mjs <gt>`). Primera versión 2026-10-05: R2 `videos/nuevos-fichajes-t4-v3.mp4`.

## Desde la convocatoria (sin PC)

En `convocatoria.html` → Opciones → **Compartir video**: el navegador arma el video del equipo de hoy (`video-equipo.js` + esta misma `escena.js`, con WebCodecs y mp4-muxer; ~12 s en PC, más en celular) y al terminar ofrece **Compartir (WhatsApp)** o **Descargar**. Usa la formación, el capitán y los dorsales de la página y los partidos de `getTodayMatches()`. Los cuadros de cada jugador vienen de R2 `video-equipo/<VER>/<gt>.webp` (~400 KB c/u) + `musica.mp3`, armados con `node scripts/video-plantel/web-assets.mjs [gt]` (después de `prep.mjs`). Si cambian los cuadros de alguien, subir `VER` en `web-assets.mjs` **y** en `video-equipo.js` (caché immutable de `/media`). Jugador sin hoja de cuadros (p. ej. a prueba) → sale la tarjeta con su nombre, sin imagen.

## Arqueros que juegan de campo

Si un arquero tiene variante de campo (hoy: Ivan_Cabj_La12, `campo:true` en `PLAYERS` de convocatoria.html), fuera del arco el video usa `<gt>-campo` (camiseta negra) y en el arco la normal. Para armar una variante: `Frente4-campo.png` en `Renders/<gt>/` → gesto en `GESTOS_CAMPO` (`poses.mjs`) → `CAMPO=1 node scripts/video-plantel/poses.mjs <gt>` → subir `Gesto4-campo.png` a R2 → `prep.mjs <gt>-campo` → clip de Canva de `fuentes/video-plantel/Gesto4/<gt>-campo.png` → `prep.mjs <gt>-campo` → `web-assets.mjs <gt>-campo`.

## Limpieza

- **En el navegador** (botón de convocatoria): el video vive solo en memoria, no se sube a ningún lado. Al compartirlo, al tocar "Cerrar" o al salir de la página se liberan el archivo, las URLs de vista previa/descarga, el canvas y las imágenes.
- **En la PC**: `render.mjs --modo equipo` borra los videos del equipo de días anteriores (`fuentes/video-plantel/Gesto4/equipo-*` y R2 `videos/equipo-*`). `--sin-limpiar` para conservarlos. El de plantel no se toca (es el publicado).

## Pasos

```bash
node scripts/video-plantel/prep.mjs                 # base + cuadros de cada jugador (solo lo que falta)
node scripts/video-plantel/render.mjs               # → fuentes/video-plantel/plantel-t4.mp4
node scripts/video-plantel/render.mjs --modo equipo # → fuentes/video-plantel/equipo-<fecha>.mp4
```

Opciones de `render.mjs`: `--fecha YYYY-MM-DD` (título del equipo; default hoy ART), `--musica "<nombre>"` (empieza con, de `fuentes/musica/trap/`), `--sin-musica`, `--out archivo.mp4`. Tarda ~1 min el plantel y ~45 s el equipo.

## Poses (Gesto4)

`node scripts/video-plantel/poses.mjs [gt ...]` genera con ChatGPT (Chrome CDP) `Renders/<gt>/Gesto4.png` desde el `Frente4` de cada jugador: misma cara y kit, cuerpo entero, fondo transparente, en "pose fachera" mirando a cámara. El gesto de cada uno está en `GESTOS` (todas distintas — pedido de Juan; varias retoman su Pose3 de la T3, que estaban bien). Para cambiar uno: editar `GESTOS` y `FORCE=1 node scripts/video-plantel/poses.mjs <gt>`. Subir a R2 (`Renders/<gt>/Gesto4.png`). Descartes en `Renders/_descartes-gesto4/`.

`POSE=Brazos4` en `prep.mjs`/`render.mjs` arma la versión vieja de brazos cruzados (material en `fuentes/video-plantel/Brazos4/`, clips en R2 `_fuentes/video-plantel/Brazos4/` + los del reel de fichajes).

## Clips de cada jugador

- Imagen base: `Renders/<gt>/Gesto4.png` sobre fondo dorado (igual que el reel de fichajes) → `fuentes/video-plantel/Gesto4/<gt>.png`. Las poses anchas se achican hasta entrar a lo ancho (máximo al 80%).
- Clip: "Imagen a video" de Canva sobre esa imagen, con el prompt seguro por defecto:
  ```bash
  node scripts/canva-imagen-a-video.mjs fuentes/video-plantel/Gesto4/<gt>.png --out fuentes/video-plantel/Gesto4/<gt>.mp4 --r2 _fuentes/video-plantel/Gesto4/<gt>.mp4
  node scripts/video-plantel/prep.mjs <gt>      # rehace sus cuadros con el clip nuevo
  ```
  Necesita el Chrome con CDP y sesión de Canva (`scripts/abrir-chrome-chatgpt.ps1`). Cada clip gasta ~4% del cupo mensual de IA de Canva (`--uso` lo muestra). Revisar inicio/medio/final de cada clip antes de usarlo (la IA a veces deforma caras o inventa humo).
- Si un jugador no tiene clip, `prep.mjs` hace un acercamiento simulado sobre la imagen base para poder armar el video igual, y `render.mjs` avisa quiénes están así.
- Los clips están en R2: `_fuentes/video-plantel/Gesto4/`. En otra PC, antes de correr:
  ```bash
  node scripts/r2.mjs sync-down _fuentes/video-plantel fuentes/video-plantel
  ```

## Jugador nuevo / cambio de plantel

Agregarlo a `ROSTER_T4` (`roster.js`) con su `Frente4.png` en `Renders/<gt>/`, sumarle un gesto en `GESTOS` (distinto a los demás), correr `poses.mjs <gt>`, `prep.mjs`, generar su clip (arriba), `prep.mjs <gt>` y volver a correr `render.mjs`.

## Archivos

- `poses.mjs` — pose de presentación de cada jugador con ChatGPT.
- `prep.mjs` — imágenes base, clips y cuadros (`fuentes/video-plantel/<POSE>/frames/<gt>/001–150.jpg`, 720×1280).
- `render.mjs` — datos (roster o Firestore), servidor local, Playwright cuadro por cuadro → ffmpeg, y música.
- `escena.js` — la animación (canvas): tiempos, grilla/formación, tarjetas y textos.
