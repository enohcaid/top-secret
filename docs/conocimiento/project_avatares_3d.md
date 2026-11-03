---
name: project_avatares_3d
description: Avatares 3D animados del plantel (sitio + overlay) — se trabajan en el repo PRIVADO enohcaid/avatares-3d, canal entre Codex (PCJUAN, modela) y Claude (drygan, revisa); empezando por Juan_Martinez4
type: project
---

Desde 2026-11-02 Juan quiere avatares 3D **animados** de cada jugador, para el sitio (three.js + `.glb`) y el overlay del vivo (mismo `.glb` en una página de OBS). Primero solo Juan_Martinez4; si funciona, el resto.

- **Dónde:** repo privado https://github.com/enohcaid/avatares-3d, clonado en drygan en `top-secret/avatares-3d/` (ignorado por el repo del sitio). Protocolo en su `README.md`: `ESTADO.md`, `PEDIDOS.md` (P-NNN), `referencias/`, `salida/<prueba>/`, siempre pull antes y push después.
- **Quién:** el modelado lo hace **Codex en PCJUAN** (RTX 5070 Laptop 8 GB, 32 GB RAM; Hunyuan3D-2mv + MPFB2 + Blender). Claude revisa los resultados, genera vistas de referencia con ChatGPT y después conecta el `.glb` con el sitio. Se eligió el repo porque la carpeta compartida `Z:` de PCJUAN vive desincronizada.
- **Descartado:** IDOL (de una imagen a un avatar): cara borrosa, el 6 leído como "C", ignora la espalda. Hunyuan3D-2mv solo para el cuerpo entero: mala anatomía y sin esqueleto.
- **Referencias:** las 4 vistas (frente, espalda y perfiles) se generaron con ChatGPT y no coinciden al milímetro, así que hay que alinearlas por puntos de referencia antes de proyectar. En el short, el 6 va grande en la pierna IZQUIERDA del jugador, arriba del swoosh, como en el render; el "pierna derecha" de la nota de las fotos grupales causó un error.
- **Truco:** con prompts largos, `generateImage()` de `scripts/generate-image-chatgpt.mjs` no detecta la imagen y espera 25 min. Funciona bajar directo de la pestaña la `<img>` con alt "Imagen generada" (fetch del blob: dentro de la página).
