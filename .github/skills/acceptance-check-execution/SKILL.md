---
name: acceptance-check-execution
description: Protocol for executing acceptance criteria verify commands from acceptance.json, distinguishing cmd versus manual checks, diagnosing authoring errors from real defects, and recording per-AC results. Use during QA verification or integration acceptance checks.
---

# Acceptance Check Execution Protocol

## Command Types

| Prefix | Action |
|--------|--------|
| `cmd: <command>` | Execute in the terminal. |
| `manual: <description>` | Cannot be automated. Record as `skipped (manual)` and surface in `notes` for user verification. Manual ACs **never block** the pipeline. |

## Execution Steps (per `cmd:` AC)

1. Run the command.
2. Record: AC ID, full command, exit code, one-line stdout/stderr summary on failure.
3. Diagnose failure as **authoring error** or **implementation defect**:
   - **Authoring error** — a one-line fix (wrong expected value, case mismatch, missing test import). Fix it, re-run, note the correction in output `notes`.
   - **Implementation defect** — the code does not satisfy the AC. Record the failure and continue to the next AC; do not stop early.
4. After all per-AC commands, run the full test suite once for regressions.

## What You May Fix

**Only authoring errors:**
- Wrong string casing in an assertion (`"not found"` → `"Not Found"`)
- Wrong numeric literal in an assertion
- Missing test import causing a syntax error
- Test setup referencing a renamed symbol

**Do NOT fix:**
- Test logic that is wrong because the implementation is wrong → return `BLOCKED`
- Any application code

## Result Format

```json
{ "ac_id": "AC-001", "command": "npm test -- --grep 'login'", "result": "pass | fail | skipped (manual)", "detail": "14 tests passed" }
```

Full test suite:
```json
{ "command": "npm test", "result": "pass | fail", "counts": { "passed": 142, "failed": 0, "skipped": 3 } }
```

## Gate

- `BLOCKED` — any `cmd:` verify command exits non-zero after self-correction, OR full test suite has failures.
- `OK` — all `cmd:` commands pass and full test suite is green.
