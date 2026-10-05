# Videos "Plantel" y "Equipo de hoy"

Reel vertical 1080×1920 a 30 fps. Cada jugador entra grande con su clip (acercamiento a cámara, pose de brazos cruzados `Brazos4`), muestra número, puesto y gamertag, y vuela a su lugar hasta que quedan todos juntos. Cierra con `#TOPSECRETFC`. Lleva música trap libre (regla del club).

- **Plantel** (`--modo plantel`, default): todo `ROSTER_T4` en una grilla de 4 columnas, en el orden de `roster.js` (arqueros → delanteros), última fila centrada. ~29 s. Música default: *Whoop*.
- **Equipo de hoy** (`--modo equipo`): la formación que se armó en la convocatoria (Firestore `convocatoria/state.lineup`: `formation` + `slots`, y `captain`). Las líneas salen de `FORMATIONS` de `convocatoria.html` (delanteros arriba, arquero abajo) y los nombres de puesto de `SLOT_LABEL_ES`. Entran de atrás para adelante. Puestos vacíos no salen (el script los avisa). El capitán lleva "Capitán" y una C. ~18 s. Música default: *Locked In*.

## Pasos

```bash
node scripts/video-plantel/prep.mjs                 # base + cuadros de cada jugador (solo lo que falta)
node scripts/video-plantel/render.mjs               # → fuentes/video-plantel/plantel-t4.mp4
node scripts/video-plantel/render.mjs --modo equipo # → fuentes/video-plantel/equipo-<fecha>.mp4
```

Opciones de `render.mjs`: `--fecha YYYY-MM-DD` (título del equipo; default hoy ART), `--musica "<nombre>"` (empieza con, de `fuentes/musica/trap/`), `--sin-musica`, `--out archivo.mp4`. Tarda ~1 min el plantel y ~45 s el equipo.

## Clips de cada jugador

- Imagen base: `Renders/<gt>/Brazos4.png` sobre fondo dorado (igual que el reel de fichajes) → `fuentes/video-plantel/<gt>.png`.
- Clip: "Imagen a video" de Canva sobre esa imagen, con el prompt seguro por defecto:
  ```bash
  node scripts/canva-imagen-a-video.mjs fuentes/video-plantel/<gt>.png --out fuentes/video-plantel/<gt>.mp4 --r2 _fuentes/video-plantel/<gt>.mp4
  node scripts/video-plantel/prep.mjs <gt>      # rehace sus cuadros con el clip nuevo
  ```
  Necesita el Chrome con CDP y sesión de Canva (`scripts/abrir-chrome-chatgpt.ps1`). Cada clip gasta ~4% del cupo mensual de IA de Canva (`--uso` lo muestra). Revisar inicio/medio/final de cada clip antes de usarlo (la IA a veces deforma caras o inventa humo).
- Si un jugador no tiene clip, `prep.mjs` hace un acercamiento simulado sobre la imagen base para poder armar el video igual, y `render.mjs` avisa quiénes están así.
- Los clips están en R2: `_fuentes/video-plantel/` (y los 6 del reel de fichajes en `_fuentes/video-fichajes/`, que `prep.mjs` reutiliza). En otra PC, antes de correr:
  ```bash
  node scripts/r2.mjs sync-down _fuentes/video-plantel fuentes/video-plantel
  node scripts/r2.mjs sync-down _fuentes/video-fichajes fuentes/video-fichajes
  ```

## Jugador nuevo / cambio de plantel

Agregarlo a `ROSTER_T4` (`roster.js`), tener su `Brazos4.png` en R2 (`Renders/<gt>/`), generar su clip (arriba) y volver a correr `render.mjs`.

## Archivos

- `prep.mjs` — imágenes base, clips y cuadros (`fuentes/video-plantel/frames/<gt>/001–150.jpg`, 720×1280).
- `render.mjs` — datos (roster o Firestore), servidor local, Playwright cuadro por cuadro → ffmpeg, y música.
- `escena.js` — la animación (canvas): tiempos, grilla/formación, tarjetas y textos.
