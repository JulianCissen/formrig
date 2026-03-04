---
name: scope-guard
description: Protocol for handling out-of-scope observations encountered at runtime during implementation, integration, or review. Use when you notice something that should be fixed or addressed but is outside your current task's declared scope.
---

# Scope Guard

During execution you will notice things outside your current task's scope — code quality problems, adjacent missing tests, pre-existing bugs, potential improvements. **Record and surface. Do not act.**

Acting on out-of-scope observations — even well-intentioned clean-ups — introduces unreviewed changes, breaks audit trails, and can cause regressions.

---

## What Counts as Out of Scope

An observation is out of scope if:
- It is in a file not listed in the current task's `files_to_touch`.
- It is a problem existing independently of the current task's changes.
- It is an improvement not required by the task goal or acceptance criteria.
- It would require touching additional files beyond those already in scope.

---

## How to Handle Out-of-Scope Observations

1. **Continue your current task.** Do not stop or modify the out-of-scope file.
2. **Record in output `notes`:**
   ```
   Out-of-scope observation: <file or location> — <precise one-sentence description> — not addressed in this task; flagged for future consideration.
   ```
3. **Do not claim it as work done.** Do not include out-of-scope files in `files_created_or_updated`. Do not reference them as satisfying any AC.

---

## Special Case: Out-of-Scope Blocker

If an out-of-scope issue is actively **blocking your current task** (e.g. a function you must call has a bug):

1. Record it in `notes` as an out-of-scope blocker.
2. Return `status: BLOCKED` with a clear explanation.
3. Do not fix the upstream issue unilaterally — let ProjectManager route the fix.

---

## For Reviewers

- File in `files_created_or_updated` but not in the task's `files_to_touch`? Must be justified in Developer's `notes`. Unjustified → `MAJOR` finding.
- Silent fixes to pre-existing code not covered by current ACs? Flag them — they bypass the review and QA pipeline for those changes.
