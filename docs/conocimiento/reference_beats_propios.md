---
name: reference_beats_propios
description: Generar beats de trap propios gratis con ACE-Step 1.5 (MIT) en la GTX 1070 — scripts/beats/generar.mjs + pulir.mjs, estilos en scripts/beats/estilos
metadata:
  type: reference
---

Idea de Juan (2026-10-06): generar trap propio en vez de depender de bibliotecas. Gratis y local.

- **Modelo:** ACE-Step 1.5 (código y pesos MIT → uso libre en redes). Instalado en `fuentes/beats/ACE-Step-1.5` (gitignored): `git clone https://github.com/ace-step/ACE-Step-1.5` + `python -m uv sync` (Python 3.11 lo pone uv; torch 2.7.1+cu128 sí soporta la GTX 1070, Pascal sm_61). Pesos ~10 GB en `checkpoints/`, se bajan solos la primera vez (~1 h con HTTP común; `hf_xet` acelera).
- **Generar:** `node scripts/beats/generar.mjs <estilo> [--n 2] [--duracion 90] [--seed N]` → `fuentes/beats/salida/<estilo>/`. ~10 min por tanda de 2×90 s en la 1070 (DiT 2B turbo + LM 0.6B backend `pt`, vLLM no corre en Pascal). Estilos = `.toml` en `scripts/beats/estilos/` (caption en inglés, bpm, tonalidad).
- **Pulir:** `node scripts/beats/pulir.mjs [estilos]` → `fuentes/beats/escuchar/<estilo>-<n>.mp3`: corta el silencio final (~7 s que deja ACE-Step), -14 LUFS, fundido de 2 s.
- **Gotchas:** con `thinking=true` la CLI de ACE-Step deja el borrador en `instruction.txt` y espera Enter → el script lo borra antes/después y manda el Enter por stdin (si queda uno viejo, lo reusa para otro estilo). Exporta MP3 con ffmpeg del PATH → el script agrega el de `ffmpeg-static`.
- **Referencias de Juan:** Timeless (The Weeknd), Too Many Nights (Metro Boomin), Given Up On Me (The Weeknd) → estilos `nocturno`, `boveda`, `despedida`. Regla: las inspiraciones solo se describen (clima, instrumentos, tempo), nunca se pasa su audio ni nombres de artistas al modelo — que no salga parecido a un tema con derechos (Content ID).
- Lo aprobado va a la biblioteca R2 `_fuentes/musica/trap` y se registra al usarse (ver [[feedback_musica_unica]], [[feedback_musica_trap]]).

**Opción 2 — compuestos por código (2026-10-06, a pedido de Juan después de escuchar los de ACE-Step):** `scripts/beats/componer.py`, todo sintetizado (sin samples ni modelos, cero licencias de terceros): 808 continuo con glides y saturación, bombo, clap, hi-hats con redobles, pad supersaw, arpegio pluck, campana FM, piano oscuro, lead ochentoso; reverb por convolución, delay ping-pong, sidechain del bombo. Estilos en `scripts/beats/propios/<estilo>.json` (bpm, tónica, progresión en grados, patrón de bombo en 1/16, claps, hats, estructura por secciones con sus capas, ganancias). Melodía compuesta por semilla (misma semilla = mismo tema).
- `python -m uv run --no-project --with numpy --with scipy --with soundfile scripts/beats/componer.py <estilo> [--seed N] [--n 2]` → `fuentes/beats/salida/<estilo>-propio/*.wav` (~30 s por tema) → `node scripts/beats/pulir.mjs <estilo>-propio`.
- Revisión sin oídos: espectrograma (`ffmpeg … showspectrumpic`) para ver estructura/graves y `ebur128` para el nivel. Gotcha ya corregido: saturar la suma cruda dejaba todo a -5 LUFS con los graves hechos una pared → normalizar a 0.9 y recién ahí saturar suave.
