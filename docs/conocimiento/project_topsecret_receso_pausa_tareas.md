---
name: project_topsecret_receso_pausa_tareas
description: Top Secret FC daily automation paused 2026-09-15 for off-season recess — resume when the user says so
metadata: 
  node_type: memory
  type: project
  modified: 2026-09-15T16:37:33.738Z
---

On 2026-09-15 the user said the club is in **receso** (off-season break) and asked to stop Top Secret's daily automated tasks "hasta próximo aviso" (until further notice). Paused:

- **Cloud routine** `trig_01Kz9ev31E5WfSN2mkVrHq7a` ("Top Secret FC — Noticia Diaria", cron `15 12 * * *` UTC = 09:15 ART) — set `enabled: false` via RemoteTrigger. This is the routine that drafts the daily news article to Firestore `news/draft` (see [[reference_topsecret_daily_news_routine.md]]).
- **Windows Scheduled Tasks** (disabled via `Disable-ScheduledTask`):
  - `TopSecretFC-NoticiaDiaria-Imagenes` — runs `run-daily-images.ps1` (image generation pipeline)
  - `TopSecretFC-WatchRegen` — polls the Worker every minute for discard/regen flags
  - `TopSecretFC-TwitchClips-Oneshot` — actually a **weekly** trigger (Sundays 03:00, not truly one-shot despite the name) that captures Twitch match clips; paused since no matches run during recess

**Why:** No matches being played means no daily match content to report on, and running the pipeline anyway would either draft empty/stale content or waste the ChatGPT image-generation cycles for nothing.

**How to apply:** Do not re-enable any of these on your own. When the user says the season/recess is over (new tournament starting, matches resuming), ask if they want these turned back on, then: `RemoteTrigger update {trigger_id: "trig_01Kz9ev31E5WfSN2mkVrHq7a", body: {enabled: true}}` and `Enable-ScheduledTask` for the three task names above. Note `TopSecretFC - Generar Imagenes Diarias` (with spaces) was already disabled before this — that's an old duplicate (see [[project_topsecret_tarea_duplicada_09_30.md]]), not part of this pause, and should stay disabled regardless.
