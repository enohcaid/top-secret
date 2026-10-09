---
name: reference-topsecret-daily-news-routine
description: "How to find and edit the cloud routine that writes Top Secret FC's daily news draft"
metadata: 
  node_type: memory
  type: reference
  modified: 2026-08-19T13:17:33.021Z
---

The daily news article (Firestore `news/draft`, consumed by `noticias.html` and the local image-generation pipeline) is written by a scheduled **cloud routine** — not local code in this repo. Routine id: `trig_01Kz9ev31E5WfSN2mkVrHq7a`, name "Top Secret FC — Noticia Diaria", fires daily at `0 9 * * *` UTC (06:00 ART). Model: `claude-opus-5-5` since 2026-10-09 (was Sonnet 4.6).

**Revisión 2026-10-09 (pedido de Juan: "buena noticia y buena imagen en coherencia con la noticia")**:
- Se sacó el bloque de una sola vez del homenaje a Messi (07/10) y los datos del debut que estaban escritos a mano en el contexto (los resultados y su orden salen solo de `seed_matches.js`).
- Regla nueva **FECHAS Y DIAS DE LA SEMANA**: cada día de la semana se calcula con `date -d 'YYYY-MM-DD' +%A`; "el debut", "esa misma noche", etc. tienen que coincidir con las fechas reales (la nota del 09/10 dijo "domingo 12/10", que era lunes).
- `imageBrief` reescrito: lugar explícito (cancha de noche/estadio, túnel, vestuario, estudio solo para kits o fichajes), escena de equipo por defecto (2-3 jugadores haciendo algo juntos), escena acorde al ángulo (ganado → festejo, perdido → vestuario serio, previa → túnel o arenga) y gesto concreto.
- **CONTROL ANTES DE GUARDAR**: checklist de 6 puntos (datos contra seed_matches, días, gamertags, ligas, largo, coherencia del brief) antes del PATCH.
- Del lado del generador (`generate-image-chatgpt.mjs`), el lugar que nombra el brief elige el estilo (`styleFromBrief`) y la escena manda sobre el estilo en el prompt; la rotación queda solo para briefs sin lugar.

To inspect or edit it: use the `schedule` skill, or call the `RemoteTrigger` tool directly (`ToolSearch select:RemoteTrigger` to load it) — `action: "get"` with that trigger_id returns the full config including the system prompt (`job_config.ccr.events[0].data.message.content`, a huge ~36K-char Spanish prompt covering data-gathering steps, angle selection, writing rules, and Firestore write-back). `action: "update"` does a partial update at the top level, but `job_config` itself is replaced wholesale if supplied — there's no deep merge, so any edit requires resubmitting the entire `job_config` (environment_id, events, session_context) with only the target text changed.

**Editing the prompt safely**: it's too large and risky to retype by hand in one shot. Do the text surgery programmatically: write the exact prompt (copied verbatim from a `get` response) to a local JSON file via the Write tool, use a Python script to `json.load` it, do a scoped `str.replace` on a unique anchor string, verify the length delta matches the inserted text's length, then use the resulting string as the `content` value in the `update` call. Sanity-check fidelity by counting known landmark substrings (section headers like `=== PASO 1:`, rule names) before/after — this catches a dropped section without needing a full diff.

This routine is separate from — and has no access to — local repo state beyond what it clones (`https://github.com/enohcaid/top-secret`) at run time. See [[feedback_league_naming_news]] for an example edit (added a league-naming style rule under `REGLAS DE ESCRITURA`).
