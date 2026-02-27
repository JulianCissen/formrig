---
name: conservative-assumption
description: Handling missing or ambiguous information during agent execution — documents assumptions and continues rather than blocking. Use when encountering unclear requirements, missing context, or ambiguous inputs.
---

# Conservative Assumption Protocol

When information is missing or ambiguous, **do not block the workflow for non-critical unknowns**. Instead, apply this protocol:

## Rule

Choose the most conservative safe interpretation, document it as an **ASSUMPTION**, and continue.

"Most conservative" means:
- The interpretation that minimises unintended side effects
- The interpretation that requires the least irreversible change
- The interpretation that is easiest to correct if wrong

## How to Document an Assumption

Record assumptions in two places:

1. **In your artefact** (e.g. `spec.md` Assumptions section, `architecture.md` Risks section, output `notes` field):

   ```
   **ASSUMPTION:** <what was assumed> — <why the conservative interpretation was chosen> — <what would need to change if this is wrong>
   ```

2. **In your output JSON** `notes` array:

   ```json
   "Assumption: X was interpreted as Y because Z was not specified — revisit if the actual requirement is different"
   ```

## Examples

**Good assumption (specific, safe, reversible):**
> ASSUMPTION: The existing `AuthService` will be extended rather than replaced — this minimises breaking changes to callers. If a full replacement is required, the architecture must be revised before implementation.

**Poor assumption (vague, doesn't explain reasoning):**
> ASSUMPTION: We'll use the existing auth system.

## When to Block Instead

Apply `status: BLOCKED` (do not use this protocol) when:

- The ambiguity is so fundamental that no meaningful output can be produced at all, AND asking the user (via `ask_questions`) did not resolve it.
- Continuing with any interpretation would be unsafe or irreversible and the cost of getting it wrong is high.
- A required file or input is simply missing and there is no way to proceed.

For everything else: assume conservatively, document it clearly, and continue.
