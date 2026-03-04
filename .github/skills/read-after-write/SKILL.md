---
name: read-after-write
description: Verifying that a file write succeeded by reading it back immediately after creation or update. Use whenever writing a critical artefact — tasks.json, status.json, spec.md, acceptance.json — to confirm the write was not silently lost or corrupted.
---

# Read-After-Write Verification

After every `edit` call that writes a critical file, read it back immediately and confirm the expected content is present before proceeding.

## Protocol

1. Issue a `read` for the same file path.
2. Verify expected content is present (see checklist below).
3. If content is missing or wrong: attempt the write once more, then re-read.
4. If the second attempt also fails: return `status: BLOCKED` with detail in `notes`.

## Per-Artefact Checklist

### `tasks.json`
- Task count matches intent.
- Every task has all required fields: `id`, `batch_id`, `title`, `goal`, `status`, `dependencies`, `acceptance_checks`, `risk_flags`, `files_to_touch`, `notes`.
- Every AC ID from `acceptance.json` appears in at least one task's `acceptance_checks`.
- JSON is syntactically valid (no trailing commas, balanced brackets).

### `status.json`
- The field you just wrote is present with the correct value.
- `current_state` is set to the expected state.
- Any new `user_decisions` or `known_issues` entry is present.

### `spec.md`
- All required sections present: Goals, Out of Scope, Acceptance Criteria, Definition of Done, Constraints, Assumptions.
- AC IDs in the spec match those in `acceptance.json`.

### `acceptance.json`
- Every criterion has `id`, `description`, and `verify` fields.
- `verify` values begin with `cmd:` or `manual:`.
- AC IDs are unique.

### Any other file
- Key content you authored is readable and non-empty.
- Structured data (JSON, YAML) parses without error.
