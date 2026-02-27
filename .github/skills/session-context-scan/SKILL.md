---
name: session-context-scan
description: Pre-work protocol for scanning .agents-context/ to retrieve accumulated knowledge from prior sessions that is relevant to the current task. Use at the start of any agent execution before producing substantive output, to avoid re-deriving decisions already made.
---

# Session Context Scan

Before producing substantive output, check whether prior sessions have already answered questions you are about to investigate.

---

## When to Apply This Skill

Apply this scan at the **start of your execution**, after reading `task.context_files` but before doing any original research, design work, or implementation.

**Applies to:** Researcher, SolutionArchitect, Architect, Developer (and any other agent that performs discovery or makes decisions).

---

## Protocol

### Step 1 — Identify relevant topics

From `task.goal` and `spec.md`, identify the key subject areas this task involves. Examples:
- Technology or library names
- Module or component names (e.g. `auth`, `payments`, `user-service`)
- Architectural patterns being applied (e.g. `event-sourcing`, `repository-pattern`)
- Cross-cutting concerns (e.g. `error-handling`, `logging`, `testing`)

### Step 2 — Scan `.agents-context/`

List the files in `.agents-context/` and read any whose filename matches or is adjacent to your identified topics.

If `.agents-context/` does not exist or is empty: continue without context — this is normal for new projects.

### Step 3 — Extract relevant prior decisions

For each context file read, note:
- **Decisions already made** — treat these as settled unless the current task's spec explicitly revisits them. Do not re-litigate.
- **Known limitations or debt** — factor these into your work; do not design around problems that are already documented as existing.
- **Evaluated and rejected alternatives** — do not re-propose rejected options unless you have new evidence that changes the evaluation.
- **Discovered codebase patterns** — use these to guide convention adherence.

### Step 4 — Record what you found

In your output `notes`, include a brief line:

```
Context scan: read .agents-context/authentication.md — prior decision: use jwt.verify() not jwt.decode() (applied).
```

Or if nothing was found:

```
Context scan: no relevant .agents-context/ files for this task.
```

---

## Precedence Rules

Prior context informs but does not override:
- The current session's approved `spec.md` and `architecture.md` — these take precedence.
- Explicit instructions in the current task dispatch — these take precedence.
- Your own reasoning when prior context is outdated or inapplicable.

If prior context conflicts with the current spec or architecture, note the conflict in your output `notes` and follow the current session's artefacts.
