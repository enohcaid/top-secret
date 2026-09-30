---
name: feedback-instagram-post-size
description: "The \"Instagram post\" size for Top Secret FC graphics is 4:5 portrait (~1086x1448), not 1:1 square"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-02T13:44:47.175Z
---

When the user says "tamaño de publicación de Instagram" (Instagram post size) for any Top Secret FC graphic (placas, news images, etc.), the correct format is **4:5 portrait** (~1086×1448px, width ≈ 80% of height), not a 1:1 square.

**Why:** This is the format already configured and enforced in `scripts/generate-image-chatgpt.mjs` (`POST_MIN_RATIO = 0.68`, `POST_MAX_RATIO = 0.90`, target ratio 4:5) for the daily news image pipeline — that generator actively rejects and retries images that come out square or too narrow/wide. The user corrected me after I generated a full batch of 11 "nuevo fichaje" placas at 1080x1080 square instead of matching this established convention.

**How to apply:** Before generating any Instagram "post" graphic for this project, check the current ratio constants in `scripts/generate-image-chatgpt.mjs` rather than assuming 1:1 — the project's definition of "post" size may itself change over time, so treat that file as the source of truth, not this note's specific numbers. Instagram "Story" format in the same file is much narrower/taller (see `STORY_MAX_RATIO`).
