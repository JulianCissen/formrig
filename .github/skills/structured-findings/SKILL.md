---
name: structured-findings
description: Standard format and severity classification for reporting code review and security audit findings. Use when producing Reviewer or Security output — ensures every finding is specific, actionable, and correctly severity-labelled.
---

# Structured Findings Format

Every finding MUST be specific and actionable. Vague findings are not acceptable.

**Bad:** "Improve error handling."
**Good:** "`findByEmail` does not handle the case where the database throws a connection error — it will propagate as an unhandled exception to callers."

---

## Finding Object Schema

```json
{
  "severity": "<see severity vocabulary below>",
  "file": "src/users/user.repository.ts",
  "location": "line 42, or function findByEmail, or general",
  "description": "One sentence describing the issue precisely.",
  "suggestion": "One sentence on what should be done to resolve it."
}
```

For security findings, add:
```json
{
  "category": "injection | auth | authorisation | input-validation | secrets | dependency | cryptography | other",
  "remediation": "One to three sentences on how to fix or mitigate it."
}
```

---

## Severity Vocabulary

### Reviewer severity

| Label | Meaning | Verdict effect |
|-------|---------|----------------|
| `BLOCKER` | Issue that will cause a bug, test failure, or production incident | → `BLOCKED` |
| `MAJOR` | Significant quality problem; not immediately breaking but high risk | → `PASS_WITH_NOTES` |
| `MINOR` | Low-impact style or clarity note | → `PASS_WITH_NOTES` |

Ask: *"Would this cause a bug, test failure, or production incident?"*
- YES → `BLOCKER`
- NO → `MAJOR` or `MINOR`

### Security severity

| Label | Meaning | Verdict effect |
|-------|---------|----------------|
| `critical` | Exploitable with no preconditions; direct data loss, account takeover, or RCE | → `BLOCKED` |
| `high` | Exploitable under realistic conditions; significant data or system risk | → `BLOCKED` |
| `medium` | Real risk but requires specific preconditions; a reasonable trade-off exists | → `NEEDS_DECISION` |
| `low` | Best-practice improvement; minimal immediate risk | → `OK` with note |
| `info` | Observation with no direct security impact | → `OK` with note |

**Mixed severity rule:** When both `critical`/`high` and `medium` findings exist, return `BLOCKED`. Fix the blocking items first; medium items are re-evaluated in the next Security pass.

---

## Verdict Determination

### Reviewer
- Any `BLOCKER` finding → `BLOCKED`
- No `BLOCKER`, but `MAJOR` or `MINOR` findings → `PASS_WITH_NOTES`
- No findings → `OK`

### Security
- Any `critical` or `high` → `BLOCKED`
- Only `medium` findings → `NEEDS_DECISION`
- Only `low` or `info` → `OK`

---

## Completeness Rules

- Do not omit findings because they are uncomfortable or might slow the pipeline.
- List ALL findings of each severity level, not just the first one found.
- For `BLOCKED` verdicts: every blocking finding must be listed so Developer knows the full fix scope.
- For `NEEDS_DECISION`: every medium finding must be listed together so the user can decide in one pass.
