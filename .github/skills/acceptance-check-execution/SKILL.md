---
name: acceptance-check-execution
description: Protocol for executing acceptance criteria verify commands from acceptance.json, distinguishing cmd versus manual checks, diagnosing authoring errors from real defects, and recording per-AC results. Use during QA verification or integration acceptance checks.
---

# Acceptance Check Execution Protocol

## Command Types

Every AC `verify` value begins with one of two prefixes:

| Prefix | Action |
|--------|--------|
| `cmd: <command>` | Execute the command directly in the terminal. |
| `manual: <description>` | Cannot be automated. Record as `skipped (manual)` and include the description in the report so the user can verify it themselves. `manual` ACs **do not block** the pipeline. |

---

## Execution Steps (per AC)

For each `cmd:` verify command:

1. Execute the command.
2. Record: AC ID, the full command string, exit code, and a one-line summary of stdout/stderr if it failed.
3. Diagnose any failure as either an **authoring error** or an **implementation defect**:
   - **Authoring error:** a one-line fix (wrong expected value, case mismatch in test assertion, missing import in test file). Fix it, re-run, and note the correction in output `notes`.
   - **Implementation defect:** the code does not satisfy the AC. Record the failure and **continue to the next AC** — do not stop early.
4. After all ACs, run the project's full test suite once to catch regressions.

---

## Scope: what you may fix

You may only fix **authoring errors** — minor test assertion mistakes that do not reflect a real logic defect:
- Wrong string casing (`"not found"` vs `"Not Found"`)
- Wrong numeric literal in an assertion
- Missing test import that causes a syntax error
- Test setup that references a renamed symbol

You MUST NOT fix:
- Test logic that is wrong because the implementation is wrong — return `BLOCKED` for these.
- Application code of any kind.

---

## Result Recording Format

```json
{
  "ac_id": "AC-001",
  "command": "npm test -- --grep 'login'",
  "result": "pass | fail | skipped (manual)",
  "detail": "14 tests passed"
}
```

---

## Full Test Suite

After all per-AC commands, run the full test suite:
- Use the command designated in `acceptance.json` as the full-suite command, if one is present.
- Otherwise infer the standard command for the project type (e.g. `npm test`, `pytest`, `go test ./...`).

Record:
```json
{
  "command": "npm test",
  "result": "pass | fail",
  "counts": { "passed": 142, "failed": 0, "skipped": 3 }
}
```

---

## Gate

Return `BLOCKED` if, after all self-corrections:
- Any `cmd:` AC verify command exits non-zero.
- The full test suite has failures.

Return `OK` if all `cmd:` commands pass and the full test suite is green.
