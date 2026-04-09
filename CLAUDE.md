# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Top Secret FC** is a static website for a football club competing in three Argentine esports virtual football leagues (VPN, VPUG, 11x11). It tracks match results, player statistics, league standings, and team management. No build system, no package manager, no compilation — files are served directly.

## Development

Open HTML files directly in a browser. There is no dev server, bundler, or build step. To preview changes, open the relevant `.html` file in a browser or use a simple static server:

```bash
python -m http.server 8000
# or
npx serve .
```

## Architecture

### Data Layer

`seed_matches.js` is the single source of truth for all historical match data. It exports `SEED_MATCHES` — an array of match objects with this shape:

```js
{
  rival, league, date, match_result,  // "win" | "draw" | "loss"
  team_stats: { possession, shots, ... },
  players: [{ name, rating, goals, assists, passes, distance_km, tackles, ... }]
}
```

**When a new match is played, add it to `SEED_MATCHES` in `seed_matches.js`.**

### Firestore Integration

`index.html` listens to a Firestore document (`CAL_DOC`) for real-time overrides:
- `results` — match result overrides
- `edits` — edits to match data
- `suspended` — suspended matches
- `partidos` / `fixture` / `matches` — schedule overrides

All pages fall back to locally-computed data when Firestore is unavailable.

### External APIs (posiciones.html)

League standings are fetched from:
- **VPN**: `https://top-secret-proxy.juan-c-m-1985.workers.dev/vpn-table`
- **11x11**: `https://api.virtualprogaming.com/public/leagues/Challengers/table/?season=2`
- **VPUG**: `https://top-secret-proxy.juan-c-m-1985.workers.dev/vpug-table` (has hardcoded fallback data)

### Shared Navigation

`nav.js` is loaded by all pages and injects the fixed header nav bar. It auto-detects the current page from `window.location.href` to highlight the active link. Include it with:

```html
<script src="nav.js"></script>
```

### Design System

CSS variables are defined inline per page (no shared stylesheet). Key tokens:

| Variable | Value | Meaning |
|---|---|---|
| `--bg` | `#0a0b0e` | Page background |
| `--card` | `#101318` | Card/panel background |
| `--gold` | `#c8a84b` | Club accent color |
| `--vpn` | `#f5c518` | VPN league (yellow) |
| `--vpug` | `#3ecf8e` | VPUG league (green) |
| `--e11` | `#4a9eff` | 11x11 league (blue) |
| `--win` | `#3ecf8e` | Win indicator |
| `--loss` | `#e8502e` | Loss indicator |
| `--draw` | `#f5c518` | Draw indicator |

Fonts: Barlow and Barlow Condensed (loaded from Google Fonts).

### Pages

| File | Purpose |
|---|---|
| `index.html` | Dashboard: quick stats, league cards, top performers, upcoming fixtures |
| `plantilla.html` | Squad roster with position filter (POR/DEF/MED/LAT/DEL) and player cards |
| `estadisticas.html` | Per-match and per-player stats breakdown |
| `calendario.html` | Match schedule calendar |
| `convocatoria.html` | Team call-up/lineup selection UI |
| `posiciones.html` | Live league standings tables |

### Assets

Player avatar SVGs live in `Renders/`. Club logo is `Top-Secret.png`.
