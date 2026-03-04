---
name: structured-findings
description: Standard format and severity classification for reporting code review and security audit findings. Use when producing Reviewer or Security output — ensures every finding is specific, actionable, and correctly severity-labelled.
---

# Structured Findings

Every finding MUST be specific and actionable.

**Bad:** "Improve error handling."
**Good:** "`findByEmail` does not handle database connection errors — will propagate as an unhandled exception to callers."

---

## Finding Schema

### Reviewer findings
```json
{
  "severity": "BLOCKER | MAJOR | MINOR",
  "file": "src/users/user.repository.ts",
  "location": "findByEmail, line 42",
  "description": "One sentence describing the issue precisely.",
  "remediation": "One sentence on what should be done to resolve it."
}
```

### Security findings (extends Reviewer schema)
```json
{
  "severity": "critical | high | medium | low | info",
  "category": "injection | auth | authorisation | input-validation | secrets | dependency | cryptography | other",
  "file": "src/users/user.repository.ts",
  "location": "findByEmail, line 42",
  "description": "One sentence describing the vulnerability precisely.",
  "remediation": "One to three sentences on how to fix or mitigate it."
}
```

---

## Severity Vocabulary

### Reviewer

| Label | Meaning | Verdict effect |
|-------|---------|----------------|
| `BLOCKER` | Will cause a bug, test failure, or production incident | → `BLOCKED` |
| `MAJOR` | Significant quality problem; not immediately breaking but high risk | → `PASS_WITH_NOTES` |
| `MINOR` | Low-impact style or clarity note | → `PASS_WITH_NOTES` |

Decision rule: *"Would this cause a bug, test failure, or production incident?"* YES → `BLOCKER`. NO → `MAJOR` or `MINOR`.

### Security

| Label | Meaning | Verdict effect |
|-------|---------|----------------|
| `critical` | Exploitable with no preconditions; direct data loss, account takeover, or RCE | → `BLOCKED` |
| `high` | Exploitable under realistic conditions; significant data or system risk | → `BLOCKED` |
| `medium` | Real risk but requires specific preconditions; a reasonable trade-off exists | → `NEEDS_DECISION` |
| `low` | Best-practice improvement; minimal immediate risk | → `OK` with note |
| `info` | Observation with no direct security impact | → `OK` with note |

**Mixed severity rule:** When both `critical`/`high` and `medium` findings exist, return `BLOCKED`. Re-evaluate medium items in the next Security pass.

---

## Verdict Determination

### Reviewer
| Condition | Verdict |
|-----------|---------|
| Any `BLOCKER` | `BLOCKED` |
| No `BLOCKER`, has `MAJOR` or `MINOR` | `PASS_WITH_NOTES` |
| No findings | `OK` |

### Security
| Condition | Verdict |
|-----------|---------|
| Any `critical` or `high` | `BLOCKED` |
| Only `medium` | `NEEDS_DECISION` |
| Only `low` / `info` | `OK` |

---

## Completeness Rules

- List ALL findings at each severity level — do not omit findings because they might slow the pipeline.
- For `BLOCKED`: every blocking finding must be listed so Developer knows the full fix scope.
- For `NEEDS_DECISION`: every medium finding must be listed together so the user resolves them in one pass.
