# Videos "Plantel" y "Equipo de hoy"

Reel vertical 1080×1920 a 30 fps. Cada jugador entra grande con su clip (acercamiento a cámara sobre su **pose de presentación `Gesto4`**: un gesto distinto por jugador, mirando a cámara), muestra número, puesto y gamertag, y vuela a su lugar hasta que quedan todos juntos. El clip se reproduce al revés (del primer plano a la pose completa) para que el gesto se vea entero. **En la grilla cada uno queda con su propia pose** (Juan lo prefirió así). Opción `POSE_GRILLA=Brazos4`: grilla pareja de brazos cruzados, con una transición (fundido + destello dorado) del gesto a los brazos mientras vuela — la IA no puede animar de una pose a otra. Necesita los cuadros de esa pose (`POSE=Brazos4 node scripts/video-plantel/prep.mjs`). Cierra con `#TOPSECRETFC`. Lleva música trap libre (regla del club).

- **Plantel** (`--modo plantel`, default): todo `ROSTER_T4` en una grilla de 4 columnas, en el orden de `roster.js` (arqueros → delanteros), última fila centrada. ~29 s. Música default: *Whoop*.
- **Equipo de hoy** (`--modo equipo`): la formación que se armó en la convocatoria (Firestore `convocatoria/state.lineup`: `formation` + `slots`, y `captain`). Las líneas salen de `FORMATIONS` de `convocatoria.html` (delanteros arriba, arquero abajo) y los nombres de puesto de `SLOT_LABEL_ES`. Entran de atrás para adelante. Puestos vacíos no salen (el script los avisa). El capitán lleva "Capitán" y una C. ~18 s. Música default: *Locked In*.

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
