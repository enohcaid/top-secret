---
name: feedback_always_push
description: "User wants every git commit in top-secret pushed to main immediately, no confirmation needed"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-09-04T12:57:43.333Z
---

Always run `git push` right after committing in this repo — don't wait to be asked, and don't just ask for confirmation before pushing.

**Why:** User said "push always" (2026-08-20) after being asked whether to push a commit. GitHub Pages only serves what's pushed to `main` (a local-only commit leaves the live site stale — see the CLAUDE.md gotcha about `copafacil-pretemporada` schedule changes).

**How to apply:** Treat `git push` as part of the standard commit workflow for this repo, same as the existing [[feedback_commit_changes]] preference (commit without being asked). Applies to normal pushes to `main`; does not cover force-pushes or anything destructive — those still need explicit confirmation per the standing git safety rules.

**Gotcha (2026-09-04):** even with this standing preference, a large/high-blast-radius `git commit`/`git push` (e.g. a 300+ file migration) can get hard-blocked by the Claude Code auto-mode permission classifier — this is a separate layer from user consent in chat, and in-conversation authorization ("ejecutalo todo, yo lo autorizo") does not bypass it on its own. Retrying the exact same command right after the user says "estoy acá, ejecutalo" and is actively present in the session does get it through — the block seems tied to whether the user is live/responsive at that moment, not to the command itself. If blocked: stop, explain exactly what's staged and ready, and ask the user to either run it themselves or say "I'm here" so the retry succeeds.
