---
name: reference_ia_local
description: IA de texto de las tareas automáticas (scripts/lib/ia.mjs) — Claude en una llamada liviana + Ollama local de respaldo; resultados de la comparación de modelos del 2026-10-26 y por qué lo creativo/público sigue en Claude
metadata:
  type: reference
---

Pedido de Juan (2026-10-26): bajar el consumo de Claude en **todo** lo que se hace con la cuenta, con una IA gratuita, **sin bajar la calidad** ("de hecho debe subir").

## Qué se hizo

- **Ollama** en drygan (`winget install Ollama.Ollama`), modelos en `D:\ollama\models` (variable de usuario `OLLAMA_MODELS`): `gemma3:12b` (los otros que se probaron se borraron). La GTX 1070 (8 GB) tiene lugar para un 8B entero; los de 12–14B se reparten entre la placa y la RAM y tardan entre 4 y 6 minutos por respuesta.
- **`scripts/lib/ia.mjs`**: `pedirJSON` / `pedirTexto` con dos motores y `orden` configurable; el que no va primero queda de respaldo. `ollama()` libera la placa al terminar (`keep_alive: 0`) porque de noche la usa ACE-Step, y usa streaming porque sin él el fetch de Node corta a los 5 minutos.
- **La mayor parte del ahorro**: `claude()` corre `claude -p` **sin herramientas, con un system prompt corto y desde una carpeta neutra** (`os.tmpdir()`). Medido: una llamada desde el repo cargaba **~47.400 tokens** de contexto (system prompt de Claude Code + herramientas + CLAUDE.md + memorias) antes del encargo; así carga **~940**. Mismo modelo y misma calidad.
- El tema diario dejó de ser 2 sesiones de Opus en modo agente (20–25 minutos cada una) y pasó a ser **una** llamada de texto (Thrive, `scripts/beats/thrive.mjs`).
- `watch-regen.ps1` dispara la rutina de noticias con `--model haiku`: solo aprieta un botón.

## Comparación (2026-10-26; el script de comparación y los 3 modelos descartados se borraron después: queda solo `gemma3:12b`)

Dos tareas reales: la letra de Thrive (`thrive-encargo.md`) y los textos de redes del resumen semanal (`textos-encargo.md`).

| modelo | letra Thrive | textos de redes |
|---|---|---|
| qwen3:8b (~2 min) | rimas flojas, descripción del sonido en castellano (se pedía inglés), imagen genérica | casi el mismo texto en todas las redes, inventa ("artista de la noche"), hashtag en el título de YouTube |
| qwen3:14b (~5 min) | buenas imágenes concretas, pero **los versos no riman** y el título salió en castellano | correcto y fiel a los datos, pero plano; pone "👇" en un reel, "su primer semana" |
| gemma3:12b (~4 min) | **la mejor local**: rima, coherente; cae en clichés ("fractured heart") | con energía, pero usa "Desliza" en lugar del rioplatense "Deslizá", exagera con los emojis y pone #Fifa |
| deepseek-r1:8b | JSON inválido | **inventa resultados** (un 3-3 contra Sub 21) y asistencias; castellano roto y "puso" (doble sentido). Descartado |

**Conclusión**: con 8 GB de placa, los modelos locales no llegan al nivel de Claude en textos públicos con muchas reglas (rima, idioma, datos exactos, reglas del club). Por eso lo creativo y lo público va **Claude primero** (llamada liviana) y el local de respaldo, para que la tarea salga aunque Claude no tenga cupo. Lo local sirve para tareas internas: clasificar, extraer, resumir y borradores.

## Cómo aplicarlo en tareas nuevas

- Generación de texto sin herramientas → `pedirJSON(prompt, { claves, orden: ['claude','local'] })`, nunca `spawnSync(claude, ['-p', …])` con `cwd: ROOT`.
- Tareas que necesitan leer o editar archivos (por ejemplo `social/producir.mjs`) siguen siendo un agente de Claude. Si se puede, juntar los datos con código y pedirle a la IA solo el texto.
- Noticia diaria (2026-10-26): `scripts/noticia-diaria.mjs`. El código junta todos los datos y controla la nota; Claude escribe en una llamada liviana, con hasta 3 vueltas de corrección y el modelo local de respaldo. La rutina en la nube se desactivó.

## Modelo local primero + ejemplos para entrenarlo (2026-10-27)

Juan: "¿qué pasó con la IA que instalamos para hacerse cargo de partes del proceso sin consumir tokens? Aunque las primeras versiones no estén a la altura, podemos entrenar el modelo y perfeccionarlo".

- **Local primero donde el código controla la calidad**:
  - Letra de Thrive: Gemma escribe y `rimas.py` controla, hasta 3 vueltas. Si no rima, escribe Claude Sonnet. Queda anotado quién la escribió en `letraPor` (`thrive.json`).
  - Letra final (`letra-final.mjs`): Gemma primero.
  - Lo público con muchas reglas (noticia diaria, textos de redes) y lo más creativo (concepto, beat) siguen con Claude primero.
- **Dataset**: cada respuesta de Claude que pasa los controles se guarda en `fuentes/ia/dataset/<tarea>.jsonl` como `{fecha, prompt, respuesta}` (`guardarEjemplo` en `scripts/lib/ia.mjs`). Tareas: `noticia-diaria`, `textos`, `noticia`, `thrive-concepto`, `thrive-beat`, `thrive-letra`, `letra-final`. Queda solo en drygan (`fuentes/` está en .gitignore).
- **Entrenamiento (pendiente, con unos cientos de ejemplos por tarea)**: la GTX 1070 (8 GB) no alcanza para entrenar un 12B. El plan es LoRA sobre un modelo de 4 a 8B en una GPU gratuita (Google Colab), exportarlo a GGUF y correrlo con Ollama. Después se compara a ciegas contra Claude, tarea por tarea, antes de pasarle más trabajo.

## Demo "todo local" de Thrive (2026-10-31, `node scripts/beats/thrive.mjs --local`)

Juan quiso ver cuánto tarda y qué logra el método de Thrive solo con la IA local. `--local` (`IA_SOLO_LOCAL=1` en `ia.mjs`) deja todo en `pruebas/thrive-local/` y no toca thrive.json, R2, aprobar.html ni git. Resultado: **"Static Bloom"** (3:08).

| etapa | tiempo | resultado |
|---|---|---|
| concepto (Gemma) | ~10 min, 2 intentos | sirve: amor obsesivo por una ciudad, racionalización, 72 BPM; el 1.er intento puso 142 BPM |
| beat por código (Gemma, contexto 40K) | **3 vueltas de ~65 min** | **no compone**: devuelve el archivo de ejemplo casi idéntico (otro tema, otro tempo y otra duración). Respaldo: ACE-Step text2music (21 min) |
| letra (Gemma) | 4 min, 1 vuelta, rimas OK | prolija pero llena de clichés ("gilded cage", "fractured"); versos en pareados AABB, que Juan pidió evitar (todo rima) |
| voces (ACE-Step cover) | 16 min | igual que siempre |
| letra final (Whisper + Gemma) | 6 min | **peor que la escrita**: copia lo que Whisper oyó mal ("musee", "laced with roots") en vez de usar la letra escrita, y corta un estribillo |

Total ~4 h 10 min (contra ~55 min con Claude escribiendo el beat). Conclusión: con la 1070, Gemma 12B no puede componer el beat (un encargo de ~20K tokens con código largo lo supera); concepto y letra salen usables pero planos. La letra final local hace más daño que bien.

Gotchas que salieron: (1) `fetch` de Node corta a los 5 min sin cabeceras y Ollama no manda nada hasta leer todo el encargo → `ollama()` usa `http`; el pedido abandonado seguía ocupando la placa y por eso ACE-Step no generó nada en la primera corrida. (2) Un tema `.py` fuera de `scripts/beats/temas/` no encuentra `componer.py` → `render()` pasa `PYTHONPATH`.
