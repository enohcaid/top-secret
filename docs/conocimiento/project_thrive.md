---
name: project_thrive
description: Álbum Thrive (un tema con voz por noche a las 2:00) y The Shorts (los 23 temas anteriores, vol. 1 y 2) en topsecret.ar/music — reglas de Juan, pipeline y portadas
metadata:
  type: project
---

Pedido de Juan (2026-10-26):
- **Un tema por día, sin excepción.** Se genera a las **2:00** (tarea `TopSecretFC-Thrive`, reintento a las 5:00, `scripts/run-thrive-hidden.vbs`, log `scripts/thrive.log`) y dura **más de 2:30 y como máximo 3:30**.
- **Temática Thrive**: amor, pasión, sentimiento, entrega y sacrificio, trabajados desde los **rasgos psicológicos de querer algo que no siempre nos hace bien** (refuerzo intermitente, idealización, costo hundido, recaída, fusión de identidad…). Lejos de lo deportivo: nada de fútbol en ningún verso. Letras en inglés, con rima (ver [[feedback_composicion_musical]]).
- **The Shorts**: los 23 temas cortos con voz anteriores (`scripts/beats/letras.json`). Vol. 1 = los primeros 12, Vol. 2 = el resto (`SHORTS_VOL1` en `scripts/beats/catalogo.mjs`).
- **Portadas abstractas, sin ninguna referencia al fútbol**, generadas con ChatGPT: `node scripts/beats/portadas-albumes.mjs [id…]` → R2 `musica/portadas/<id>.webp`. Shorts 1 = franjas de luz ámbar; Shorts 2 = la pareja fría en azul tinta con bordes rasgados; Thrive = una flor de tinta carmesí envuelta en hilos oscuros.

Pipeline (`scripts/beats/thrive.mjs`): letra, concepto y sonido con `thrive-encargo.md` (Claude en una llamada liviana; si no hay cupo, gemma3:12b local, ver [[reference_ia_local]]) → controles (duración 160–205 s, rima con estructura, cero palabras deportivas, en inglés, sin títulos repetidos) → ACE-Step text2music en la GTX 1070 → -14 LUFS → R2 `musica/thrive/<slug>.mp3` → registro `scripts/beats/thrive.json` → catálogo (`catalogo.mjs`) → commit. Si falla ACE-Step, la letra queda guardada y la próxima corrida retoma.

Cada tema tiene también una **versión instrumental**, con el mismo sonido, tempo y tonalidad y sin voz: aparece en la página como "Instrumental" y entra a la música de los videos (`_fuentes/musica/propios/<fecha> - <Título>.mp3`, ver [[feedback_musica_unica]]). Thrive reemplazó al beat diario de Claude: `diario.mjs` y su tarea se borraron el 2026-10-26.
