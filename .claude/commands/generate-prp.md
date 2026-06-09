# Generate PRP

## Feature file: $ARGUMENTS

Generate a complete PRP (Product Requirements Prompt) for the requested feature. Research thoroughly before writing — the PRP is what gets passed to the implementation agent, so all context must be embedded in it.

Read the feature description first (either from $ARGUMENTS as a file path or as inline text). Understand what needs to be built, what pages are affected, and what constraints apply.

## Research Process

1. **Codebase Analysis**
   - Read CLAUDE.md to confirm architecture constraints
   - Identify all HTML/JS files affected by the feature
   - Find existing patterns to replicate (search for similar UI components, data flows)
   - Note CSS variables and design tokens in use on relevant pages
   - Check `seed_matches.js` if the feature touches match/player data

2. **External Research** (if needed)
   - Search for browser API docs, CSS specs, or JS patterns relevant to the feature
   - Include specific URLs in the PRP so the implementing agent can reference them

3. **Clarification** (if needed)
   - Ask the user before assuming scope on ambiguous requirements

## PRP Generation

Use `PRPs/templates/prp_base.md` as the template.

### Critical context to include
- **Affected files**: exact paths of every file that needs to change
- **Existing patterns**: copy real snippets from the codebase that the implementation should mirror
- **Design tokens**: which CSS variables apply
- **Data shape**: relevant fields from `SEED_MATCHES` or Firestore if touched
- **Gotchas**: timezone handling (ART), Firestore fallback pattern, `getToday()` usage, etc.
- **Anti-patterns to avoid**: `transition: all`, emojis in UI, hard-coded colors, `var` instead of `const/let`

### Implementation Blueprint
- Pseudocode showing the approach before any real code
- List of tasks in the order they should be completed
- Error handling strategy

### Validation Gates
```bash
# Serve and open in browser
npx serve . --port 8000

# Manual checks to perform:
# - Open affected page(s) and verify feature works
# - Check browser console for errors
# - Test on narrow viewport (mobile)
# - Verify dark/light theme consistency
```

**BEFORE WRITING THE PRP**: Think hard about the full scope, edge cases, and implementation order.

## Output
Save as: `PRPs/{feature-name}.md`

## Quality Checklist
- [ ] All affected files listed
- [ ] Existing code patterns referenced (with snippets)
- [ ] Design tokens documented
- [ ] Data shape clarified if seed_matches.js or Firestore is involved
- [ ] Implementation tasks ordered correctly
- [ ] Validation steps are concrete and manual-testable

Score the PRP 1–10 on confidence for one-pass implementation success.