---
name: scope-guard
description: Protocol for handling out-of-scope observations encountered at runtime during implementation, integration, or review. Use when you notice something that should be fixed or addressed but is outside your current task's declared scope.
---

# Scope Guard

During execution you will inevitably notice things outside your current task scope — code quality problems, missing tests in an adjacent module, potential improvements, pre-existing bugs. This skill defines what to do.

## The Rule

**Record and surface. Do not act.**

You are responsible for the work in your current task's `files_to_touch`. Everything else is out of scope. Acting on out-of-scope observations — even well-intentioned clean-ups — introduces unreviewed changes, breaks audit trails, and can cause regressions.

---

## What Counts as Out of Scope

An observation is out of scope if:
- It is in a file not listed in the current task's `files_to_touch`.
- It is a problem that exists independently of the current task's changes.
- It is an improvement that is not required by the task goal or acceptance criteria.
- It would require touching additional files beyond those already in scope.

---

## How to Handle Out-of-Scope Observations

### Step 1 — Continue your current task
Do not stop. Do not modify the out-of-scope file. Complete the task as specified.

### Step 2 — Record the observation
Add an entry to your output `notes` array:

```json
"Out-of-scope observation: <file or location> — <precise one-sentence description of what was noticed> — not addressed in this task; flagged for future consideration."
```

### Step 3 — Do not claim it as work done
Do not include out-of-scope files in `files_created_or_updated`. Do not reference out-of-scope observations as satisfying any acceptance criteria.

---

## Special Case: Blocker Encountered Outside Scope

If the out-of-scope issue is actively **blocking your current task** (e.g. a function you must call has a bug, a dependency is missing), it is no longer purely out of scope. In this case:

1. Record it in `notes` as an out-of-scope blocker.
2. Return `status: BLOCKED` with a clear explanation.
3. Do not try to fix the upstream issue unilaterally — let ProjectManager route the fix.

---

## For Reviewers

When reviewing, check:
- Are any files in `files_created_or_updated` outside the task's `files_to_touch`? If yes, the change must be justified in Developer's `notes`. Unjustified changes outside declared scope → `MAJOR` finding.
- Are there silent fixes to pre-existing code not covered by the current task's ACs? Flag these — they bypass the review and QA pipeline for those changes.
