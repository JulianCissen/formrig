---
name: lean-mode
description: Rules and invariants for lean-mode sessions — low-complexity, fast tasks that skip the full REFINE → DESIGN → PLAN pipeline. Use when status.json shows mode lean or when lean true is present in the task input.
---

# Lean Mode

Lean mode is a streamlined workflow for low-complexity, unambiguous tasks. It skips the architecture and planning phases but **does not lower quality standards** — verification, testing, and artefact integrity are still required.

---

## Lean Mode Criteria

A session is eligible for lean mode ONLY when **ALL** of the following are true:

- The task is unambiguous (no spec interpretation needed).
- ≤ 3 files affected.
- No architectural decisions required.
- No UI/UX design decisions required.
- No security implications at intake time.
- Estimated effort ≤ 5 minutes.

If any criterion is uncertain, use full mode. **When in doubt, use full mode.**

---

## What Lean Mode Changes

| Phase | Full mode | Lean mode |
|-------|-----------|-----------|
| REFINE | Full interview → spec.md + acceptance.json + status.json | Skip interview → trimmed spec.md + acceptance.json + tasks.json + status.json |
| DESIGN | Researcher → SolutionArchitect/Architect → APPROVE_DESIGN | **Skipped** |
| PLAN | Planner → tasks.json | **Skipped** (Refiner writes tasks.json directly) |
| IMPLEMENT_LOOP | Full batch protocol | One batch, 1–3 tasks |
| INTEGRATE | Integrator agent | ProjectManager runs acceptance checks directly |
| DOCUMENT | Docs agent writes report.md | ProjectManager writes report.md |

---

## What Lean Mode Does NOT Change

These rules apply in lean mode identically to full mode:

- **Verification must pass** before marking a task `implemented`.
- **Tests must be written** alongside implementation.
- **Read-after-write** verification applies to all artefacts written.
- **Output JSON** must be returned with all required fields populated.
- **Gates still apply** — `BLOCKED` on verification failure, missing dependency, etc.

---

## Lean Artefacts

### `spec.md` (lean)
Required sections only:
- `## Goals`
- `## Acceptance Criteria`

### `acceptance.json` (lean)
One or two focused criteria. Same schema as full mode.

### `tasks.json` (lean)
Single batch. Typically 1–3 tasks. All standard task fields are still required.

### `status.json` (lean)
Standard initial structure with `"mode": "lean"`.

---

## Exiting Lean Mode

If, during implementation, you discover that the task is more complex than the lean criteria allow (more files affected, an architectural decision is needed, a security implication emerges), **stop immediately**:

1. Set the in-progress task `status: blocked` in `tasks.json`.
2. Return `status: BLOCKED` with a clear explanation in `notes`.
3. ProjectManager will restart from full REFINE.

Do not attempt to complete a task that has outgrown lean mode.
