---
name: read-after-write
description: Verifying that a file write succeeded by reading it back immediately after creation or update. Use whenever writing a critical artefact — tasks.json, status.json, spec.md, acceptance.json — to confirm the write was not silently lost or corrupted.
---

# Read-After-Write Verification

Whenever you write a critical artefact, **read it back immediately** and confirm the expected content is present before proceeding.

## Protocol

After every `edit` call that writes a critical file:

1. Issue a `read` call for the same file path.
2. Verify the expected content is present (see per-file checklist below).
3. If the content is missing or wrong: attempt the write once more, then read again.
4. If the second attempt also fails: return `status: BLOCKED` with the detail recorded in `notes`.

## Per-Artefact Verification Checklist

### `tasks.json`
- Task count matches what you intended to write.
- Every task has all required fields (`id`, `batch_id`, `title`, `goal`, `status`, `dependencies`, `acceptance_checks`, `risk_flags`, `files_to_touch`, `notes`).
- Every AC ID from `acceptance.json` appears in at least one task's `acceptance_checks`.
- JSON is syntactically valid (no trailing commas, balanced brackets).

### `status.json`
- The field you just wrote is present with the correct value.
- `current_state` is set to the expected state.
- Any new `user_decisions` or `known_issues` entry is present.

### `spec.md`
- All required sections are present: Goals, Out of Scope, Acceptance Criteria, Definition of Done, Constraints, Assumptions.
- Acceptance Criteria list references AC IDs that match `acceptance.json`.

### `acceptance.json`
- Every criterion has `id`, `description`, and `verify` fields.
- `verify` values begin with `cmd:` or `manual:`.
- AC IDs are unique.

### Any other file
- Key content you authored is readable and not empty.
- If you wrote structured data (JSON, YAML), confirm it parses without error.

## Example

```
# After writing tasks.json:
write → tasks.json (5 tasks)
read  → tasks.json
check → 5 tasks present, all ACs covered, JSON valid ✓
```

If the read shows only 3 tasks, re-write and re-check before proceeding.
