# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Top Secret FC** is the official site of a virtual football (EA FC Clubs Pro) esports club competing in three Argentine leagues (VPN, VPUG, 11x11). It tracks match results, player stats, standings, news, and team management. Static site — vanilla JS, no build step, no framework. Deployed on **GitHub Pages**: pushing to `main` publishes to `https://enohcaid.github.io/top-secret/`.

## Development

There is no dev server, bundler, or build step. Pages use ES module imports (`import { SEED_MATCHES } from './seed_matches.js'`), so **you must serve over HTTP** — opening files via `file://` breaks module loading:

```bash
python -m http.server 8000
```

## Architecture

Three layers:

1. **Static site** (this repo → GitHub Pages) — 10 self-contained HTML pages + shared JS.
2. **Firestore** (project `top-secret-fc`) — real-time overrides and app state; every page falls back to locally computed data when unavailable.
3. **Cloudflare Worker** (`top-secret-worker.js` → `https://top-secret-proxy.juan-c-m-1985.workers.dev`) — API proxy, OG previews, visit counter, news pipeline endpoints.

### Pages

| File | Purpose |
|---|---|
| `index.html` | Dashboard: hero slider, quick stats, latest news, top performers, fixtures |
| `plantilla.html` | Squad roster (position filters, player cards from `Renders/`) |
| `estadisticas.html` | Per-match and per-player stats |
| `calendario.html` | Match calendar; admin editing writes to Firestore `calendario/estado` |
| `convocatoria.html` | Call-up/lineup tool. **Two modes**: plain URL (direct link only, never linked in the UI) = full editor; `?vista` (what the nav links to) = read-only — `EDIT_MODE` gates all Firestore writes (`saveState`/`_saveBackup`) and hides edit controls |
| `convo.html` | Retired 2026-07-13 — now just redirects to `convocatoria.html?vista` (it was the public read-only copy) |
| `posiciones.html` | Live league standings (fetched via Worker/API) |
| `noticias.html` | News feed + article view (`?id=<article-id>`) |
| `reclutamiento.html` | Recruitment form (posts to Worker `/notify-reclu`) |
| `plan-de-juego.html` | Game plan (password-gated, PDF) |

Every page loads `layout.js?v=5` and `mobile-nav.js?v=5` at the end of `<body>`:
- **`layout.js`** injects topbar, left nav sidebar, right social sidebar, the 3-theme system (`t3` default = dark gray/blue, `dark` = black/silver, `light`), and the visit counter (Worker `/counter`). New pages must be added to `PAGES` here.
- **`mobile-nav.js`** injects the bottom tab bar and mobile overrides for screens ≤ 640px. Has its own `PAGES` list — keep both in sync.
- **Cache busting is manual**: bump the `?v=N` query across all pages when editing these files, or GitHub Pages visitors get stale JS. `seed_matches.js` imports are sometimes versioned too (`?v=20260612` in calendario.html).

### Data Layer — `seed_matches.js`

Single source of truth for historical match data. ES module exporting `SEED_MATCHES`, imported by index, plantilla, estadisticas, calendario, and noticias. Real shape:

```js
{
  rival: 'La Unión FC',          // exact name — must match fixture/logo references in other pages
  league: 'VPUG',                // 'VPN' | 'VPUG' | '11x11'
  date: '2026-03-04',            // ART date
  match_result: '8-1',           // OUR goals first, as a score string (NOT win/draw/loss)
  isHome: true,                  // optional
  uploadedAt: '2026-03-04T00:00:00.000Z',
  notes: '',                     // e.g. 'W.O.', 'Cuartos de Final · Ida (Visita)'
  torneo: '...',                 // optional (playoffs etc.)
  team_stats: {                  // Spanish field names, null when unknown
    posesion, tiros, tiros_arco, goles_esperados, pases, precision_pases,
    entradas, entradas_exito, intercepciones, paradas, faltas, fuera_juego,
    corneres, regates_exito, precision_tiro
  },
  players: [{                    // English field names; empty array for W.O. matches
    name, matched, rating, goals, assists, passes, pass_accuracy,
    distance_km, sprints, tackles, interceptions
  }]
}
```

**When a match is played, append it to `SEED_MATCHES`.** Match reports arrive as images in `reportes/` (read them directly — see workflow memories). Walkover wins: `match_result:'1-0'`, `notes:'W.O.'`, `players:[]`.

### News — `noticias-data.js` + `auto-noticias.js`

- `noticias-data.js`: plain script defining `NOTICIAS` (manual articles, newest first, `pinned` supported). Each entry: `id`, `category`, `title`, `date`, `dateLabel`, `excerpt`, `image`, `body` (HTML paragraph array), `shareCaption(s)`.
- `auto-noticias.js`: ES module that auto-generates result news from `SEED_MATCHES`; exports result-image pools (`RESULT_IMAGES`, per-period overrides).
- **Publishing a manual article requires 3 steps or the WhatsApp share preview breaks**: (1) add to `NOTICIAS`, (2) add the id to `NOTICIAS_OG` in `top-secret-worker.js`, (3) redeploy the Worker.

### Firestore (project `top-secret-fc`)

| Doc | Used by | Contents |
|---|---|---|
| `calendario/estado` | calendario, convo, convocatoria | `results`, `edits`, `suspended`, `custom` match overrides |
| `news/draft` | daily-news pipeline | today's auto-generated article draft |
| `news/image_style_history` | image generator | style rotation (avoid repeats) |
| convocatoria/plantel/reclutamiento docs | convo, convocatoria, reclutamiento | lineup state, roster, applications |

Pages use the Firebase compat SDK 10.12.0 (`convo`, `convocatoria`, `estadisticas`, `plantilla`, `reclutamiento`) or the modular ESM SDK (`calendario`). All Firestore reads have local fallbacks — the site must keep working read-only if Firestore is down.

### Cloudflare Worker — `top-secret-worker.js`

Source lives in this repo; **edits require redeploying** (credentials/commands in memory: "Cloudflare Worker deploy config"). Key routes:

- `/vpn-table`, `/vpn-results`, `/vpn-fixtures`, `/vpug-table` (hardcoded fallback), `/copafacil-pretemporada` — standings/results proxies used by `posiciones.html`. 11x11 is fetched directly: `https://api.virtualprogaming.com/public/leagues/Challengers/table/?season=2`
- `/counter` — visit counter (GET reads, POST increments)
- `/og?id=<article>` — OG meta HTML for sharing news; driven by the `NOTICIAS_OG` map at the top of the file
- `/draft-noticia`, `/publish-noticia`, `/persist-draft-image`, `/draft-image`, `/request-regen`, `/regen-flag`, `/discard-flag` — daily news pipeline. Discarding a draft (`DELETE /draft-noticia`) also queues its generated images for deletion via `/discard-flag`
- `/notify-reclu`, `/reclutamiento-activo`, `/convocatoria-status`, `/img-proxy`, `/ea`, `/kv`, `/log-event`

### Daily News Pipeline (automated)

1. A scheduled cloud agent (09:15 ART) writes the day's article to Firestore `news/draft`.
2. Windows Task Scheduler runs `scripts/run-daily-images.ps1` → `scripts/generate-image-chatgpt.mjs`: drives a logged-in Chrome (CDP on `localhost:9222`, profile in `scripts/.chrome-profile/`, gitignored) against the ChatGPT project "TOP Secret FC" (has club logo, kits, and T3-Frentes renders uploaded), generates post/story images with style rotation + AI review loop, saves to `Renders/Daily News/`, commits and pushes. Every ChatGPT chat the pipeline creates (generation attempts, evals) is deleted after its image is downloaded or the attempt is rejected.
3. `scripts/watch-regen.ps1` polls the Worker every minute: `/discard-flag` (news discarded in the browser → deletes its images locally and from GitHub) and `/regen-flag` (browser requested a full regen → re-runs the article agent + image pipeline).
4. `scripts/*.vbs` are hidden-window launchers for Task Scheduler.
5. **`.ps1` files with non-ASCII text must be UTF-8 WITH BOM** — PowerShell 5.1 reads BOM-less files as CP1252 and em-dashes silently break parsing (this made `watch-regen.ps1` a no-op for weeks). ASCII-only scripts like `run-daily-images.ps1` are safe either way.

### Assets

- `Renders/<gamertag>/` — player render folders. **Never delete ex-player folders** (historical archive). `T2-Frentes/`, `T3-Frentes/` are gitignored source frames, not players.
- `logos/` — club logos, league logos, news images. Convention: heavy PNGs get a `.webp` sibling for web use.
- `Top-Secret.png` — club crest (favicon on all pages). Theme logos: `logos/TOP Secret Blue.png` (t3), `logos/Top Secret white.png` (dark), `Top-Secret.png` (light).
- **Commit images to git together with the code that references them** — GitHub Pages serves only what's committed.
- Optimize before committing: images displayed small must not be multi-MB. `sharp` is available in `node_modules` (devDependency, scripts only — never in page code).

### Design System

CSS variables defined inline per page; `layout.js` overrides them per theme. Base tokens (t3 theme is the live default — blue accent `#4a9eff` on `#0d1117`):

`--bg`, `--card`, `--gold` (accent — silver/blue/gold depending on theme), `--vpn` `#f5c518`, `--vpug` `#3ecf8e`, `--e11` `#4a9eff`, `--win`/`--draw`/`--loss`.

Fonts: Barlow + Barlow Condensed (body/headings), Bebas Neue (brand). Loaded from Google Fonts.

## Conventions & Gotchas

- **Vanilla JS only** in pages — no frameworks, no npm dependencies in production code. `package.json` devDependencies (playwright, puppeteer, sharp) are for `scripts/` automation only.
- **Encoding**: all files are UTF-8. On Windows, never write these files with PowerShell `Out-File`/`Set-Content` without `-Encoding utf8` — that has corrupted `seed_matches.js` before (mojibake like `UniÃ³n`). Prefer the Edit/Write tools or Node.
- **Gamertags verbatim**: copy player gamertags exactly as given (`Juan_Martinez4`, `RS32-DaniStone`, `Lautavester7`) — never capitalize, translate, or abbreviate. "M. Crespo" in match reports = `Juan_Martinez4`.
- **Rival names must match exactly** (accents included) between `seed_matches.js`, fixtures, and logo maps in calendario/convo/posiciones — a mismatch silently unlinks results.
- **GitHub Pages is case-sensitive**: file references must match the git-tracked filename case (local Windows FS won't catch this).
- ART timezone (`America/Argentina/Buenos_Aires`) for all date/time logic.
- CSS: use the design tokens, never hard-code colors; no `transition: all`; no emojis in UI text unless requested.
- Keep inline `<script>` blocks under ~500 lines in new code; extract to `.js` files. (Legacy pages exceed this — don't grow them further.)
- Each page is self-contained — no cross-page dependencies beyond `layout.js`, `mobile-nav.js`, `seed_matches.js`, `noticias-data.js`, `auto-noticias.js`.
- Never delete or overwrite code unless explicitly instructed; ask when context is missing.
- Commit when a change is done (user preference: don't wait to be asked). Commit messages in the existing style: `feat:`/`fix:` + short Spanish description.

## Common Tasks — Checklists

**New match played**
1. Read the report (image in `reportes/` or user-provided) → append the match object to `SEED_MATCHES`.
2. Verify rival name matches existing fixture entries. Commit.

**New manual news article**
1. Add entry at the top of `NOTICIAS` in `noticias-data.js` (exact gamertags; image committed to `logos/` or `Renders/`).
2. Add id → `{t, i}` to `NOTICIAS_OG` in `top-secret-worker.js`.
3. Redeploy the Worker. Commit everything.

**New player joins**
1. Create `Renders/<gamertag>/` with renders (PNG, transparent background — review each image visually before committing).
2. Add to `plantilla.html` roster data with the gamertag verbatim.

**Edit shared UI (`layout.js` / `mobile-nav.js`)**
1. Make the change (both `PAGES` lists if nav changed).
2. Bump `?v=N` on every page's script tags. Commit.

## PRP Workflow

For larger features: `/generate-prp <feature>` → review the PRP in `PRPs/` (gitignored, local) → `/execute-prp PRPs/<feature>.md`. Existing PRPs: daily news automation, T3 theme, T2→T3 transition.
