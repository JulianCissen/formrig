---
name: lean-mode
description: Rules and invariants for lean-mode sessions — low-complexity, fast tasks that skip the full REFINE → DESIGN → PLAN pipeline. Use when status.json shows mode lean or when lean true is present in the task input.
---

# Lean Mode

Lean mode is a streamlined workflow for low-complexity, unambiguous tasks. It skips the architecture and planning phases but **does not lower quality standards** — verification, testing, and artefact integrity still apply.

---

## Criteria — ALL must be true

- Task is unambiguous (no spec interpretation needed).
- ≤ 3 files affected.
- No architectural decisions required.
- No UI/UX design decisions required.
- No security implications at intake time.
- Estimated effort ≤ 5 minutes.

When any criterion is uncertain, use full mode. **If in doubt: full mode.**

---

## What Changes in Lean Mode

| Phase | Full mode | Lean mode |
|-------|-----------|-----------|
| REFINE | Full interview → spec.md + acceptance.json + status.json | Skip interview → trimmed spec.md + acceptance.json + tasks.json + status.json |
| DESIGN | Researcher → SolutionArchitect/Architect → APPROVE_DESIGN | **Skipped** |
| PLAN | Planner → tasks.json | **Skipped** — Refiner writes tasks.json directly |
| IMPLEMENT_LOOP | Full batch protocol | One batch, 1–3 tasks |
| INTEGRATE | Integrator agent | ProjectManager runs acceptance checks directly |
| DOCUMENT | Docs agent writes report.md + .agents-context/ | ProjectManager writes report.md and persists knowledge contributions directly |

---

## What Does NOT Change

- Verification must pass before marking a task `implemented`.
- Tests must be written alongside implementation.
- Read-after-write verification applies to all written artefacts.
- Output JSON must be returned with all required fields.
- Gates apply identically — `BLOCKED` on verification failure, missing dependency, etc.

---

## Lean Artefacts

### `spec.md`
Required sections only: `## Goals`, `## Acceptance Criteria`.

### `acceptance.json`
One or two focused criteria. Same schema as full mode.

### `tasks.json`
Single batch, 1–3 tasks. All standard task fields required.

### `status.json`
Standard initial structure with `"mode": "lean"`.

---

## Exiting Lean Mode

If, during implementation, you discover the task exceeds lean criteria (more files affected, architectural decision needed, security implication emerges), **stop immediately**:

1. Set the in-progress task `status: blocked` in `tasks.json`.
2. Return `status: BLOCKED` with a clear explanation in `notes`.
3. ProjectManager restarts from full REFINE.

Do not attempt to complete a task that has outgrown lean mode.
