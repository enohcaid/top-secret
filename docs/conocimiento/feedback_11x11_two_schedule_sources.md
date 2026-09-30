---
name: feedback_11x11_two_schedule_sources
description: 11x11 (and other) fixture dates in top-secret live in TWO separate places that must both be edited to actually change what the site shows
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-20T20:55:27.199Z
---

Rescheduling an 11x11 (or VPN/VPUG) match affects two independent data sources, and editing only one leaves the live site showing the old schedule:

1. **`convocatoria.html`'s hardcoded `E11_T3_SCHEDULE` array** (and equivalent VPN/VPUG arrays) — a static JS array in the repo, only read by convocatoria.html itself.
2. **Firestore `calendario/estado`, field `custom`** — the actual live data calendario.html's "HOY" widget (`renderNextHero()`) reads, merged with `RAW` in the same file. This is what real users on GitHub Pages see. It's editable via the calendario.html admin UI, or directly via the Firestore REST API (`https://firestore.googleapis.com/v1/projects/top-secret-fc/databases/(default)/documents/calendario/estado`) since `calendario` collection writes are open (`if true`, no auth) per the Security Rules note in CLAUDE.md — GET the doc, decode the Firestore JSON value format, patch just the `custom` field with `?updateMask.fieldPaths=custom` to avoid touching other fields (`results`, `edits`, `suspended`).

**Why:** 2026-08-20 — updated `E11_T3_SCHEDULE` in convocatoria.html per user request (move Comunicaciones eSports match, ungroup a triple matchday into doubles) and pushed it, but the live calendario.html page still showed the old/wrong grouping because it doesn't read that array at all — it reads Firestore `custom`, which had its own independent (and buggier) copy of the same schedule missing an entire fixture (Interzonal A leg 2).

**How to apply:** Any time a match date/time changes for an in-progress bracket that both files track (VPN, VPUG, 11x11 schedules), check and update BOTH `E11_T3_SCHEDULE`-style arrays in convocatoria.html AND the Firestore `custom` array — don't assume a git push alone fixes what the live site shows for today's matches. [[project_convocatoria_resets_2026_08_12]] has related Firestore/auth context for this collection.
