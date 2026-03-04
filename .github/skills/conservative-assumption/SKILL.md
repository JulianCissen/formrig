---
name: conservative-assumption
description: Handling missing or ambiguous information during agent execution — documents assumptions and continues rather than blocking. Use when encountering unclear requirements, missing context, or ambiguous inputs.
---

# Conservative Assumption Protocol

When information is missing or ambiguous, **do not block for non-critical unknowns**. Choose the most conservative safe interpretation, document it, and continue.

## What "Most Conservative" Means

- Minimises unintended side effects
- Requires the least irreversible change
- Is easiest to correct if wrong

## How to Document an Assumption

Record in both places:

**1. In the artefact** (spec.md Assumptions section, architecture.md Risks, etc.):
```
ASSUMPTION: <what was assumed> — <why this interpretation was chosen> — <what must change if this is wrong>
```

**2. In output JSON `notes`:**
```json
"Assumption: X was interpreted as Y because Z was not specified — revisit if the actual requirement differs."
```

**Good:** `ASSUMPTION: The existing AuthService will be extended rather than replaced — minimises breaking changes to callers. If a full replacement is required, the architecture must be revised before implementation.`

**Poor:** `ASSUMPTION: We will use the existing auth system.` *(vague, no reasoning, no correction path)*

## When to Block Instead

Use `status: BLOCKED` (do not apply this protocol) only when:
- The ambiguity is so fundamental that no meaningful output can be produced, AND `ask_questions` did not resolve it.
- Any interpretation would be unsafe or irreversible and the cost of being wrong is high.
- A required input file is simply missing and there is no way to proceed.

For everything else: assume conservatively, document it clearly, and continue.
