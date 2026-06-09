# PRP: {Feature Name}

## Overview
{One paragraph describing what this feature does and why it's needed}

## Affected Files
| File | Change type | Description |
|------|------------|-------------|
| `page.html` | modify | ... |

## Context & Patterns

### Existing pattern to mirror
```js
// Paste real snippet from codebase that this feature should replicate
```

### CSS tokens in use
```css
/* Relevant variables from the affected page */
--gold: #C9A84C;
--card: #F5F5F0;
```

### Data shape (if seed_matches.js or Firestore is touched)
```js
// Relevant fields
{ name, rating, goals, assists, played_pos, matched }
```

## Requirements
- [ ] Requirement 1
- [ ] Requirement 2

## Gotchas
- **Timezone**: Always use `getToday()` for current date; ART = `America/Argentina/Buenos_Aires`
- **Firestore fallback**: Every Firestore read needs a `.catch()` that falls back to seed data
- **No `transition: all`**: List specific CSS properties only
- **Tabular nums**: Add `font-variant-numeric: tabular-nums` on any numeric display
- {Add feature-specific gotchas here}

## Implementation Blueprint

```
// Pseudocode showing approach — not real code yet
1. ...
2. ...
```

## Tasks (in order)
1. [ ] Task 1
2. [ ] Task 2
3. [ ] Task 3

## Validation
```
Manual steps:
1. npx serve . --port 8000
2. Open http://localhost:8000/{page}.html
3. Verify: ...
4. Check console for errors
5. Resize to 375px and verify mobile layout
```

## References
- {URL to relevant docs or examples}

---
**PRP Score**: ?/10  
**Confidence**: {reason}
