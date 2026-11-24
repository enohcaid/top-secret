# Checklists

## Common Tasks — Checklists

**New match played**
1. Read the report (image in `reportes/` or user-provided) → append the match object to `SEED_MATCHES`. **Since 2026-10-15 official matches may already be there**, loaded automatically from EA at the end of each live night (`scripts/cargar-partidos-ea.mjs`, run by `retransmitir.mjs`) with `origen:'ea-auto'`: in that case complete THAT entry with the video report (possession, xG, corners, goal minutes, exact positions, names as shown in the report; the video wins on any difference) and remove `origen`, instead of adding a duplicate. Matches EA recorded inconsistently (e.g. a cut match logged as 3-0 with no goals) are skipped and reported as "REVISAR A MANO" in `fuentes/redes/retransmitir.log`.
2. Verify rival name matches existing fixture entries.
3. Run `node scripts/ea-completar.mjs` (then `--aplicar`) to fill the per-player stats the video lacks from EA (stored by the Worker, see `docs/conocimiento/reference_ea_proclubs_api.md`). EA only keeps 5 matches per type in its API, but the Worker cron saves every official calendar match. If a knockout series (ida/vuelta) ended won-one-lost-one by the same goal difference, the Worker auto-adds the 3rd match to the calendar; load its report as a separate entry with `notes` containing "Desempate (3er partido)". Commit.

**New manual news article**
1. Add entry at the top of `NOTICIAS` in `noticias-data.js` (exact gamertags; image committed to `logos/` or `Renders/`).
2. Add id → `{t, i}` to `NOTICIAS_OG` in `top-secret-worker.js`.
3. Redeploy the Worker. Commit everything.

**New player joins**
1. Create `Renders/<gamertag>/` with renders (PNG, transparent background — review each image visually before committing).
2. Add to `ROSTER_T4` in `plantel-datos.js` with the gamertag verbatim (with `conv:{n,pos}` so the convocatoria lists him), bump its `?v=`, run `node scripts/control-datos.mjs`.

**Player leaves the club**
1. Remove them from `ROSTER_T4` in `plantel-datos.js` (bump its `?v=`), from any hardcoded slot in `autoLineup()` of `convocatoria.html`, and from Firestore (`plantel/activo`, see `docs/conocimiento/feedback_baja_jugador_limpiar_firestore.md`).
2. Delete `Renders/T4-Frentes/<gamertag>.png` and `Renders/T4-Frentes-K2/<gamertag>.png` (gitignored, local-only), their entry in `PLAYER_TRAITS` in `scripts/generate-image-chatgpt.mjs` — this is what stops the daily news image generator from picking them as a featured player. **Never delete `Renders/<gamertag>/`** (the per-player render source folder) — historical archive, same as any other ex-player.
3. Remove their row from the table in `scripts/chatgpt-project-instructions.md` (reference only — since 2026-09 the ChatGPT project "TOP Secret FC" has no instructions of its own, so there is nothing to update there).
4. The article-writing routine (the scheduled cloud agent that drafts `news/draft`) is external to this repo and can still write an ex-player's name into an article's text from stale knowledge — steps 1-3 only stop them from appearing as an image protagonist, not from being mentioned in prose. If that happens, discard/regenerate the draft.

**Edit shared UI (`layout.js`)**
1. Make the change (`NAV` if navigation changed).
2. Bump `?v=N` on every page's script tags. Commit.

**Reprogramar una fecha del Campeonato de Invierno VPUG (pretemporada)**
1. Edit the `SCHEDULE` array in `top-secret-worker.js` (`/copafacil-pretemporada` handler) — this is the single source of truth for round dates/times; both `calendario.html` and `convocatoria.html` fetch it live. Redeploy the Worker.
2. (The local fallback `INVIERNO_SCHEDULE` was removed 2026-11-24: that tournament is over and the live fetch is the only source.)
3. **Push to `main`** — GitHub Pages only serves what's pushed; a local commit alone leaves the live site stale (this bit us: `convocatoria.html` kept showing the old triple date until pushed).
4. If a match result needs correcting and the external CopáFácil API hasn't caught up (e.g. wrong/missing score), use `RESULT_OVERRIDES` in the same Worker handler rather than editing `SEED_MATCHES` — this bracket's data is API-driven, not part of `SEED_MATCHES`.

**Nueva temporada/torneo de CopáFácil (VPUG)**

A new VPUG competition (regular season, pretemporada, playoffs, whatever CopáFácil calls it) shows up as a link like `https://copafacil.com/{eventId}@{tournamentCode}`. That URL is a Flutter web app — `WebFetch`/scraping only sees the loading screen — so pull data from Firebase RTDB directly (see [[reference_copafacil_api.md]] for the full pattern) or, if you need to eyeball something the API doesn't expose (see step 2), screenshot it with Playwright (`playwright` is already a devDependency — launch headless, `goto` the URL, it's normal server-rendered HTML/CSS despite being Flutter, not canvas, so screenshots are crisp and `page.content()` returns readable DOM).

1. **Get the tournament identity.** `GET https://copafacil-web.firebaseio.com/events/{eventId}@{code}/info.json` → `info.sub_title` is the tournament's display name (e.g. `"#1 Primera División VPUG (T6)"`) and `d_i` is the start date (epoch ms).
2. **Get TOP Secret's fixture.** `GET https://copafacil-web.firebaseio.com/events/{eventId}/matchs.json` (note: **event ID only**, no `@code` — matches for every tournament under that community live in one flat node), filter entries where `evt === "{eventId}@{code}"`. Group by `m_set` (sorted ascending = chronological round order) to get fecha/round numbers. Find the entries where `team1` or `team2` is TOP Secret's team key (look it up in `teams.json` below, or reuse the key from a prior tournament — it's stable across seasons) — `team1` = home, `team2` = away.
   - **CopáFácil does not store calendar dates or kickoff times per match** — only the pairing and round order. Firebase has nothing to scrape here; the real cadence (which weekday(s), what time) has to come from the user/organizer. Ask before inventing a schedule. Once you have the cadence, project it forward Mon–Thu (or whatever the pattern is) starting from `d_i` — see the 2026-08 VPUG T6 season for a worked example.
3. **Get team names/logos.** `GET https://copafacil-web.firebaseio.com/events/{eventId}@{code}/teams.json` → `{name, url (logo)}` per team key. Standings (`w/d/l/gf/gc/pts`) live in each team's `dt` snapshot object, keyed by timestamp — **absent until at least one match in that tournament has been scored**, so a brand-new season legitimately returns teams with no `dt` at all (not a bug).
4. **Wire it into the site** (all of these, or the fetch will silently show stale/wrong data on one page while looking fine on another):
   - `top-secret-worker.js`: if the tournament will run for a while (not a one-off playoff leg), add a dedicated proxy endpoint like `/vpug-table-t3` mirroring `/vpug-table`'s stats-parsing (`dt` string format `"0=pts#1=gp#2=w#..."`) — don't reuse an existing endpoint hardcoded to a different event key. Redeploy (`node scripts/deploy-worker.mjs`, see `docs/conocimiento/reference_cloudflare_y_r2.md`).
   - `posiciones.html`: check for a `PRÓXIMAMENTE` placeholder pane already reserved for this — the site pre-builds "Temporada 1/2/3" tab slots ahead of time (`t1-pane-vpug`, `t2-pane-vpug`, `t3-pane-vpug`, etc.) precisely so the next VPUG season has a home. Replace the placeholder `<div>` with a `<table id="tN-vpug-table">`, add a `fetchTNVPUG()` following the `fetchT2VPUG()` pattern (live fetch with a hardcoded all-zero fallback array for when the Worker is down), reuse `normVPUG()` (it already flags the `TOP Secret` row via regex).
   - `torneos-datos.js` (only place): append TOP Secret's fixture rows **at the end of `RAW`** (only TS's matches, one per line) under a new `// ══ VPUG T? — <name> ══` header, and the rival badges to a `VPUG_T?_BADGES` map wired into `vpugBadge()` (export it in `TSTorneos`). calendario, convocatoria, the Worker and the scripts read it from there. Bump `?v=` in both pages and run `node scripts/control-datos.mjs`. Months auto-bucket by date against the season cutoffs.
5. **Push to `main`** — GitHub Pages only serves what's pushed.

## PRP Workflow

For larger features: `/generate-prp <feature>` → review the PRP in `PRPs/` (gitignored, local) → `/execute-prp PRPs/<feature>.md`. Existing PRPs: daily news automation, T3 theme, T2→T3 transition.
