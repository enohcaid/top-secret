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
