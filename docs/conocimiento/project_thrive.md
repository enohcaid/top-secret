---
name: project_thrive
description: Álbum Thrive (un tema por noche a las 2:00: instrumental → letra para esa instrumental con rimas por sonido → voces en dúo) y The Shorts (los 23 temas anteriores, vol. 1 y 2) en topsecret.ar/music — reglas de Juan, proceso y página
metadata:
  type: project
---

Pedidos de Juan (2026-10-26):
- **Un tema por día, sin excepción.** Se genera a las **2:00** (tarea `TopSecretFC-Thrive`, reintento a las 5:00, límite de 5 horas, `scripts/run-thrive-hidden.vbs`, log `scripts/thrive.log`). Dura **más de 2:30 y como máximo 3:30**.
- **Temática**: amor, pasión, sentimiento, entrega y sacrificio, trabajados desde los **rasgos psicológicos de querer algo que no siempre nos hace bien**. Lejos de lo deportivo. Letras en inglés.
- **Referencias del disco**: duetos de The Weeknd con mujeres: *Lust for Life*, *The Abyss*, *Love Me Harder* y *One of the Girls*. Cada tema es un **dúo masculino-femenino** de alt-R&B / synth-pop oscuro y cinematográfico. Los nombres de artistas nunca van en la descripción del sonido que recibe el modelo.
- **"Too Far In"** (26/10, el primero) **queda como está**: tiene `fijo: true` en `thrive.json` y ningún proceso lo toca.

## Proceso (orden definido por Juan)
1. **Instrumental primero**, porque marca el estilo. Claude define el concepto y el sonido (`thrive-concepto.md`) y ACE-Step turbo genera la instrumental.
2. **La letra se escribe para esa instrumental.** El código mide sus secciones (sonoridad por compás → secciones y energía) y Claude escribe (`thrive-letra.md`) con un verso cada 2 compases y la etiqueta de quién canta (`[verse - female]`, `[chorus - male & female]`).
3. **Las rimas se controlan por pronunciación**, no por escritura (`scripts/beats/rimas.py`, diccionario fonético CMU: "love/move" no riman, "through/blue" sí). Los versos que fallan vuelven a Claude, hasta 4 vueltas.
4. **La voz va al final**: ACE-Step **base** (`acestep-v15-base`), tarea `lego` (pista de voces sobre la instrumental). Si devuelve solo la voz, se mezcla con la instrumental. Si lego falla, el respaldo es `cover` con el turbo.
5. **La letra publicada es lo que realmente se canta**: `scripts/beats/letra-final.mjs` (Whisper turbo en la GTX 1070 + Claude cruza la transcripción con la letra escrita). Guarda `letraFinal`.
6. La instrumental **no se publica**: va solo a la música de los videos (`_fuentes/musica/propios/<fecha> - <Título>.mp3`).

Cada paso queda guardado en `scripts/beats/thrive.json` y en `fuentes/beats/thrive/<slug>/`, y la corrida siguiente retoma desde donde quedó. Claude escribe en llamadas livianas, con el modelo local de respaldo ([[reference_ia_local]]). Herramientas de Python: `fuentes/beats/whisper/.venv` (torch cu128, openai-whisper, pronouncing).

## Página topsecret.ar/music
- **Discos por orden de lanzamiento** (la fecha de su primer tema), **desplegables**: arrancan cerrados y cada visitante los encuentra como los dejó (localStorage).
- **Sin versiones instrumentales**: solo el botón "Letra", que muestra `letraFinal`.
- **The Shorts**: los 23 temas cortos con voz de `scripts/beats/letras.json`. Vol. 1 son los primeros 12 (`SHORTS_VOL1` en `scripts/beats/catalogo.mjs`).
- **Portadas** abstractas, sin fútbol, hechas con ChatGPT: `node scripts/beats/portadas-albumes.mjs [id…]` → R2 `musica/portadas/<id>.webp`.
