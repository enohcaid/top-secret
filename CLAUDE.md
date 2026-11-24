# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Top Secret FC** is the official site of a virtual football (EA FC Clubs Pro) esports club competing in three Argentine leagues (VPN, VPUG, and Espacio Gamer — the ex-11x11, renamed from T4). It tracks match results, player stats, standings, news, and team management. Static site — vanilla JS, no build step, no framework. Deployed on **GitHub Pages**: pushing to `main` publishes to **`https://topsecret.ar/`** (own domain since 2026-10-19: `CNAME` file in the repo, DNS in the Cloudflare zone `topsecret.ar` of the same account — CNAME `@`/`www` → `enohcaid.github.io`, proxied, SSL Full, Always Use HTTPS on; the old `enohcaid.github.io/top-secret/…` URLs 301 to the domain). Absolute links in code (og:url, share/convocar links, Worker `SITE`) use `https://topsecret.ar/`.

## Development

There is no dev server, bundler, or build step. Pages use ES module imports (`import { SEED_MATCHES } from './seed_matches.js'`), so **you must serve over HTTP** — opening files via `file://` breaks module loading:

```bash
python -m http.server 8000
```

## Credentials, knowledge and working from any PC

- **The repo is public: never write credentials in code.** They live in `.env` (gitignored; template `.env.example`), loaded by `scripts/lib/env.mjs` (Node) or parsed directly in `.ps1` scripts. Variables: `CF_EMAIL`, `CF_API_KEY`, `CF_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `KV_NAMESPACE_ID`.
- **R2** (all site images + working originals): `node scripts/r2.mjs ls|put|get|sync-up|sync-down` (lib: `scripts/lib/r2.mjs`). Keys mirror repo paths (`logos/…`, `Renders/…`); reference photos (game captures, player cards, kit sheets) are in `_fuentes/fotos/` — scripts find them through `FOTOS_DIR` (drygan's `Documents/TOP SECRET/Fotos` if present, else `fuentes/fotos/` pulled from R2).
- **Project knowledge**: `docs/conocimiento/README.md` indexes the accumulated notes (workflows, user rules, gotchas). Grep it for the topic before non-trivial work (do not read it whole); when you learn something durable about the project, add a note there too (not only to local memory), so other PCs get it.
- **Working from another PC / claude.ai/code**: see `docs/trabajar-desde-otra-pc.md`. ChatGPT image generation needs a local Chrome with CDP: `scripts/abrir-chrome-chatgpt.ps1`.

## Where to read (load only what the task needs)

| Task touches | Read |
|---|---|
| A page, `layout.js`, nav, page-specific behaviour | `docs/claude/paginas.md` |
| Fixture, rival badges, squad, match reports, `seed_matches.js` | `docs/claude/datos.md` |
| Manual articles, news style, publishing to networks | `docs/claude/noticias.md` |
| The automatic daily article or its images | `docs/claude/noticia-diaria.md` |
| Worker routes/cron, Firestore docs and rules | `docs/claude/worker-firestore.md` |
| Images, renders, logos, group photos, page weight, design tokens | `docs/claude/assets.md` |
| New match / article / player in or out / new tournament / layout change | `docs/claude/checklists.md` |
| Anything else learned on the job | grep `docs/conocimiento/README.md` (index), then open only the note |

Large files (`calendario.html`, `convocatoria.html`, `seed_matches.js`, `noticias-data.js`, `top-secret-worker.js`): grep and read ranges, never whole.

## Architecture

Static site (this repo → GitHub Pages) + Firestore `top-secret-fc` (live overrides; every page has a local fallback) + Cloudflare Worker (`top-secret-worker.js` → `https://top-secret-proxy.juan-c-m-1985.workers.dev`; edits need `node scripts/deploy-worker.mjs`).

Non-negotiables:
- **Fixture + badges live only in `torneos-datos.js`; squad + `RENDER_V` only in `plantel-datos.js`.** Never copy them into a page. `RAW` is append-only (its index is a Firestore key). After editing: bump `?v=`, `node scripts/control-datos.mjs`.
- Once per PC: `git config core.hooksPath .githooks` (runs that check on commit).
- **Cache busting is manual**: bump `?v=N` across all pages when a shared file changes.
- **A manual article needs 3 steps**: `NOTICIAS` in `noticias-data.js` → `NOTICIAS_OG` in the Worker → redeploy. **No results, no daily article.**
- **`convocatoria.html` without `?vista` is the live editor**: never open it from automated tests.
- A brand-new Firestore collection needs its own rules block. `/media/` is cached a year: new version = new URL or `RENDER_V`.
- **T4 starts 2026-09-28** (`T4_CUTOFF`; the preseason 29/9–19/10 counts as T4, public name "pretemporada"); official competition since 2026-10-20.
- **Never delete `Renders/<gamertag>/`** of ex-players nor overwrite source masters in `logos/`. Never line players up in rows "like soldiers". Group photos come from ChatGPT, not collage; keep all of them.
- No sidebars, social bubbles or bottom tab bar. Estadísticas: data first, no videos or pinned scroll.
- `.ps1` files with non-ASCII text must be UTF-8 **with BOM**.

## Conventions & Gotchas

- **Vanilla JS only** in pages — no frameworks, no npm dependencies in production code. `package.json` devDependencies (playwright, puppeteer, sharp) are for `scripts/` automation only.
- **Encoding**: all files are UTF-8. On Windows, never write these files with PowerShell `Out-File`/`Set-Content` without `-Encoding utf8` — that has corrupted `seed_matches.js` before (mojibake like `UniÃ³n`). Prefer the Edit/Write tools or Node.
- **Gamertags verbatim**: copy player gamertags exactly as given (`Juan_Martinez4`, `RS32-DaniStone`, `Lautavester7`) — never capitalize, translate, or abbreviate. Report names that differ from gamertags (e.g. "Abuela" = `nikileo527`, "Abuelo" = `adri_cai`; "Crespo" = game bug, never map it): see `docs/conocimiento/feedback_nombres_en_reportes.md` — `name` = what the report shows, `matched` = real gamertag.
- **Rival names must match exactly** (accents included) between `seed_matches.js`, fixtures, and logo maps in calendario/convo/posiciones — a mismatch silently unlinks results.
- **League naming in news prose** (manual `noticias-data.js` entries and the automated daily-news routine, per user instruction 2026-08-19): in any published text — title, excerpt, body, share captions — name a league only by its short form: `VPN`, `VPUG`, or `Espacio Gamer` — **from T4 on (2026-10-13) the old 11x11 league is called "Espacio Gamer"** (division page https://espaciogamer.cl/division/challengers-2-espacio-gamer-argentina/, standings via Worker `/eg-table`; internal code keys stay `11x11`/`e11`; T1–T3 copy keeps "11x11"; see `docs/conocimiento/project_espacio_gamer.md`). Never append season suffixes like `T3`/`T6`/`Temporada 3` (those are fine as internal/code labels, e.g. comments in `seed_matches.js`, just not in reader-facing copy), and **never use an article** — it's "en VPN"/"por VPUG"/"en 11x11", not "en la VPN"/"en el 11x11". Also, the league is the tournament/context, not a subject that "wins" or "loses" — never write "VPN ganó"; the **club** is always the subject, the league is the frame: "Top Secret ganó esta noche en VPN", "cayó 1-2 en VPUG", "goleada por 4-0 en 11x11".
- **GitHub Pages is case-sensitive**: file references must match the git-tracked filename case (local Windows FS won't catch this).
- ART timezone (`America/Argentina/Buenos_Aires`) for all date/time logic.
- CSS: use the design tokens (`--bg`, `--card`, `--gold`, `--vpn`, `--vpug`, `--e11`, `--win/--draw/--loss`), never hard-code colors; no `transition: all`; no emojis in UI text unless requested.
- **`layout.js` owns the `.ts-hero*` class names** (page hero card: min-height 420px, centered with transform). Never reuse them inside a page — estadisticas.html did (`.ts-hero` for the team-stats header) and it opened a 400px gap until 2026-10-16 (renamed `.tsx-head`).
- Keep inline `<script>` blocks under ~500 lines in new code; extract to `.js` files. (Legacy pages exceed this — don't grow them further.)
- Each page is self-contained — no cross-page dependencies beyond `layout.js`, `torneos-datos.js`, `plantel-datos.js`/`roster.js`, `seed_matches.js`, `noticias-data.js`, `auto-noticias.js`.
- Never delete or overwrite code unless explicitly instructed; ask when context is missing.
- Commit when a change is done (user preference: don't wait to be asked). Commit messages in the existing style: `feat:`/`fix:` + short Spanish description.

PRP workflow for large features: see `docs/claude/checklists.md`.
