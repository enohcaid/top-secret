# Execute PRP

Implement a feature using the specified PRP file.

## PRP File: $ARGUMENTS

## Execution Process

1. **Load PRP**
   - Read the specified PRP file completely
   - Understand all context, constraints, and requirements
   - Re-read CLAUDE.md to confirm project rules
   - Do additional codebase exploration or web searches if the PRP leaves gaps

2. **Plan**
   - Think hard before writing any code
   - Use TodoWrite to break the work into discrete, trackable steps
   - Identify the correct implementation order (CSS before JS, data before UI, etc.)

3. **Execute**
   - Implement each task from the PRP in order
   - Follow existing code patterns — don't invent new conventions
   - Use CSS variables, never hard-coded colors
   - No `transition: all` — specific properties only
   - Mark each todo complete as soon as it's done

4. **Validate**
   - Run each validation step from the PRP
   - Open the affected page(s) in a browser and manually verify
   - Check browser console for errors
   - Test mobile viewport if the feature has UI
   - Fix any issues found before reporting done

5. **Complete**
   - Re-read the PRP to confirm every requirement is implemented
   - Update TASK.md with completed work and any discovered sub-tasks
   - Report completion status with a summary of what changed

Note: If you hit a blocker, reference the PRP's "Gotchas" section first, then ask the user.