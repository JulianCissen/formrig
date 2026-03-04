---
name: session-context-scan
description: Pre-work protocol for scanning .agents-context/ to retrieve accumulated knowledge from prior sessions that is relevant to the current task. Use at the start of any agent execution before producing substantive output, to avoid re-deriving decisions already made.
---

# Session Context Scan

Before producing substantive output, check whether prior sessions have already answered questions you are about to investigate.

---

## When to Apply

At the **start of execution**, after reading `task.context_files` but before any original research, design, or implementation.

Applies to all agents: Researcher, SolutionArchitect, Architect, Refiner, Planner, Developer, Designer, Reviewer, Security, Integrator — any agent that performs discovery or makes decisions.

---

## Protocol

### Step 1 — Identify relevant topics

From `task.goal` and `spec.md`, identify the key subject areas this task involves:
- Technology or library names
- Module or component names (e.g. `auth`, `payments`, `user-service`)
- Architectural patterns being applied (e.g. `event-sourcing`, `repository-pattern`)
- Cross-cutting concerns (e.g. `error-handling`, `logging`, `testing`)

### Step 2 — Scan `.agents-context/`

List the files in `.agents-context/` and read any whose filename matches or is adjacent to your identified topics.

If `.agents-context/` does not exist or is empty, continue without context — this is normal for new projects.

### Step 3 — Extract relevant prior decisions

For each context file read, note:
- **Decisions already made** — treat as settled unless the current spec explicitly revisits them.
- **Known limitations or debt** — factor into your work; do not design around documented problems.
- **Rejected alternatives** — do not re-propose without new evidence.
- **Discovered codebase patterns** — use to guide convention adherence.

### Step 4 — Record what you found

In output `notes`:
```
Context scan: read .agents-context/authentication.md — prior decision: use jwt.verify() not jwt.decode() (applied).
```
Or if nothing relevant:
```
Context scan: no relevant .agents-context/ files for this task.
```

---

## Precedence

Prior context informs but does not override:
- The current session's `spec.md` and `architecture.md` — these take precedence.
- Explicit instructions in the current task dispatch — these take precedence.

If prior context conflicts with the current spec, note the conflict in `notes` and follow the current session's artefacts.
