---
name: feedback-league-naming-news
description: "News writing style: leagues get short names only (VPN/VPUG/11x11, no season suffixes), and the club is always the grammatical subject"
metadata: 
  node_type: memory
  type: feedback
  modified: 2026-08-19T13:36:07.268Z
---

When writing or generating any Top Secret FC news content — manual entries in `noticias-data.js` or the automated daily-news cloud routine (`trig_01Kz9ev31E5WfSN2mkVrHq7a`, "Top Secret FC — Noticia Diaria") — leagues must be named only by their short form in reader-facing text: **VPN**, **VPUG**, or **11x11**. Never append season suffixes like "T3", "T6", "Temporada 3" — those stay fine as internal/code labels (comments in `seed_matches.js`, this repo's CLAUDE.md, etc.) but must never leak into a title, excerpt, body paragraph, or share caption.

**No article, ever**: it's "en VPN", "por VPUG", "en 11x11" — never "en la VPN", "por la VPUG", "en el 11x11". Treat the league name like a proper noun that takes no article, the same way you wouldn't say "el Argentina" for the country.

Also: the league is the tournament/frame, not a subject that performs an action. "VPN ganó" is a grammar error — a league doesn't play or win, the **club** does. Always phrase it with the club as subject and the league as context ("en"/"por"): "Top Secret ganó esta noche en VPN", "cayó 1-2 en VPUG", "goleada por 4-0 en 11x11".

**Why:** user corrected this twice on 2026-08-19 — first flagging "la VPN ganó" as a redaction error (club must be the subject), then a second, separate correction dropping the article entirely ("no es 'en la VPN' es solamente 'en VPN'"). Both corrections apply "de ahora en adelante" to automatic and manual news alike.

**How to apply:** For manual articles, apply this directly when writing `noticias-data.js` entries. For automatic articles, the rule is now baked into the daily routine's system prompt (added as a bullet under REGLAS DE ESCRITURA, right after REGLA DE ROSTER) — see [[reference_topsecret_daily_news_routine]] if it needs touching again. Not retroactive — only applies going forward, existing published articles were left as-is.
