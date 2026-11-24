# Worker y Firestore

### Firestore (project `top-secret-fc`)

| Doc | Used by | Contents |
|---|---|---|
| `calendario/estado` | calendario, convo, convocatoria | `results`, `edits`, `suspended`, `custom` match overrides |
| `news/draft` | daily-news pipeline | today's auto-generated article draft |
| `news/image_style_history` | image generator | style rotation (avoid repeats) |
| convocatoria/plantel/reclutamiento docs | convo, convocatoria, reclutamiento | lineup state, roster, applications |
| `plantel/pizarra`, `plantel/pizarra-trazos` | pizarra | moved tokens (`f`; a player's move only counts while the convocatoria lineup in its `l` is still current) and strokes (`t`); empty = convocatoria lineup |

Pages use the Firebase compat SDK 10.12.0 (`convo`, `convocatoria`, `estadisticas`, `plantilla`, `reclutamiento`) or the modular ESM SDK (`calendario`). All Firestore reads have local fallbacks — the site must keep working read-only if Firestore is down.

**Security Rules (2026-08-13)**: no longer a single open wildcard. Reads stay open (`if true`) for every collection. Writes are open (`if true`) per-collection for `calendario`, `reclutamiento`, `plantel`, `news`, `torneos` — **but `convocatoria` writes require `request.auth != null`** (Firebase Anonymous Auth, silent — `convocatoria.html` calls `signInAnonymously()` on load, no login screen). This closed a recurring incident where an old/stale copy of `convocatoria.html` kept writing bogus `resetDate`/`dailyOverrides` values indefinitely; now any write without a valid auth token is rejected outright by Firestore itself. Because rules moved from one blanket wildcard to an explicit per-collection allowlist, **a brand-new Firestore collection needs its own `match` block added to the rules or its writes will silently 403** — this used to work with zero rules changes. The Worker's `dailyConvocatoriaReset()` cron (see below) also authenticates this way, via anonymous sign-in against Identity Toolkit with the project's public Web API key (not a service account — cached in `TS_KV` under `conv_auth_token`, ~55min TTL).

### Cloudflare Worker — `top-secret-worker.js`

Source lives in this repo; **edits require redeploying**: `node scripts/deploy-worker.mjs` (reads credentials from `.env`; keeps the KV + R2 bindings and verifies `/media`). A GitHub Action (`.github/workflows/deploy-worker.yml`) also deploys on push when its repo secrets are set. `/media/_fuentes/*` is deliberately 404 (private working originals). Key routes:

- `/vpn-table`, `/vpn-results`, `/vpn-fixtures`, `/vpug-table` (hardcoded fallback), `/copafacil-pretemporada` — standings/results proxies used by `posiciones.html`. 11x11 is fetched directly: `https://api.virtualprogaming.com/public/leagues/Challengers/table/?season=2`
- `/counter` — visit counter (GET reads, POST increments)
- `/og?id=<article>` — OG meta HTML for sharing news; driven by the `NOTICIAS_OG` map at the top of the file
- `/draft-noticia`, `/publish-noticia`, `/persist-draft-image`, `/draft-image`, `/request-regen`, `/regen-flag`, `/discard-flag` — daily news pipeline. Discarding a draft (`DELETE /draft-noticia`) also queues its generated images for deletion via `/discard-flag`
- `/notify-reclu`, `/reclutamiento-activo`, `/convocatoria-status`, `/img-proxy`, `/ea`, `/kv`, `/log-event`
- Admin endpoints (publish/discard/edit draft, regen) require `env.ADMIN_PIN` — a Worker **secret** with no default in code (the old public `8189` fallback was removed 2026-07-13; the user types the PIN in the noticias UI). The client-side gates in calendario/reclutamiento are cosmetic and separate.
- **Cron Trigger** (`scheduled()` handler, `* * * * *` — every minute): `dailyConvocatoriaReset()` keeps `convocatoria/state` correct server-side (clears expired `dailyOverrides`/`availability`, advances `resetDate`) independent of any browser tab's clock. The same cron also runs `purgarAmistososPasados()`: friendlies (`league:'Amistoso'` in `calendario/estado.custom`) are deleted once their day has passed (user rule — friendlies never get a result), re-indexing the `c<N>` keys of results/edits/suspended. Authenticates via anonymous Firebase sign-in (see Security Rules note above). Registering/changing the schedule is a separate Cloudflare API call from deploying the script — `PUT .../workers/scripts/top-secret-proxy/schedules` with a JSON **array** body like `[{"cron":"* * * * *"}]` (not `{"crons":[...]}`, that 400s).
