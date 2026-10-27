---
name: project_thrive
description: Álbum Thrive de Tacet Sin (un tema por noche a las 2:00: beat compuesto por código → letra para ese beat con rimas por sonido → ACE-Step cover canta el dúo y pule) y The Shorts (23 temas, vol. 1 y 2) en topsecret.ar/music
metadata:
  type: project
---

Pedidos de Juan (2026-10-26):
- **Un tema por semana** (Juan, 2026-10-27: el consumo de Claude no da para uno por día). Se genera los **domingos a las 2:00** (tarea `TopSecretFC-Thrive`, reintento el domingo a las 5:00, límite de 5 horas, `scripts/run-thrive-hidden.vbs`, log `scripts/thrive.log`). Dura **más de 2:30 y como máximo 3:30**.
- **Temática**: amor, pasión, sentimiento, entrega y sacrificio, trabajados desde los **rasgos psicológicos de querer algo que no siempre nos hace bien**. Lejos de lo deportivo. Letras en inglés.
- **Referencias del disco**: duetos de The Weeknd con mujeres: *Lust for Life*, *The Abyss*, *Love Me Harder* y *One of the Girls*. Cada tema es un **dúo masculino-femenino** de alt-R&B / synth-pop oscuro y cinematográfico. Los nombres de artistas nunca van en la descripción del sonido que recibe el modelo.
- **"Too Far In"** (26/10, el primero) **queda como está**: tiene `fijo: true` en `thrive.json` y ningún proceso lo toca.

## Proceso (Juan, 2026-10-26: "para la instrumental es mejor lo que generamos con código, pero cuando ACE-Step agrega voces y pule el beat queda perfecto; esa es la combinación que busco, la de The Shorts")
1. **Concepto y sonido**: lo define Claude (`thrive-concepto.md`).
2. **Instrumental compuesta por código**. Claude escribe el `.py` en **una** llamada (`thrive-componer.md`, con `componer.py`, un tema de ejemplo y las reglas de [[feedback_composicion_musical]]). El código lo renderiza y lo controla: duración, una línea `SECCIONES=` con las secciones reales, dinámica por sección (intro y outro 6–8 dB debajo del estribillo, verso debajo del estribillo) y que no sature. Si algo falla, le devuelve los errores, hasta 3 vueltas. El `.py` queda en `scripts/beats/temas/thrive_<fecha>.py`. Respaldo si no sale: instrumental de ACE-Step (text2music).
3. **Letra para esa instrumental**: sobre las secciones y compases que declara el beat (`thrive-letra.md`), con la etiqueta de quién canta. Las rimas se controlan por pronunciación (`scripts/beats/rimas.py`, diccionario fonético CMU), hasta 4 vueltas.
4. **ACE-Step "cover" sobre la instrumental** (turbo, fuerza 0,5, igual que `cantar.mjs` en The Shorts): canta el dúo y pule el beat. (`lego` con el modelo base se probó el 26/10 y se descartó; el modelo se borró.)
5. **Letra publicada = lo que realmente se canta** (`scripts/beats/letra-final.mjs`: Whisper turbo + Claude). Se guarda en `letraFinal`.
6. La instrumental **no se publica en la página**: va a la música de los videos (`_fuentes/musica/propios/<fecha> - <Título>.mp3`). Esto devuelve los beats compuestos por código a los videos.

Cada paso queda guardado en `scripts/beats/thrive.json` y en `fuentes/beats/thrive/<slug>/`, y la corrida siguiente retoma desde donde quedó. Herramientas de Python: `fuentes/beats/whisper/.venv` (torch cu128, openai-whisper, pronouncing). Modelos: el beat lo compone **Sonnet 5.5** (Opus pensaba más de 18 min y no llegaba a escribir el código); la **letra** y la letra final también van con **Sonnet** (Juan, 2026-10-27: "en esta etapa solo importa que tenga rimas", y las rimas las controla `rimas.py`); el **concepto** sigue con **Opus**. Para más de un tema el mismo día: `--parte 2`.

## Página topsecret.ar/music
- **Discos por orden de lanzamiento** (la fecha de su primer tema), **desplegables**: arrancan cerrados y cada visitante los encuentra como los dejó (localStorage).
- **Sin versiones instrumentales**: solo el botón "Letra", que muestra `letraFinal`.
- **The Shorts**: los 23 temas cortos con voz de `scripts/beats/letras.json`. Vol. 1 son los primeros 12 (`SHORTS_VOL1` en `scripts/beats/catalogo.mjs`).
- **Portadas** abstractas, sin fútbol, hechas con ChatGPT: `node scripts/beats/portadas-albumes.mjs [id…]` → R2 `musica/portadas/<id>.webp`.
