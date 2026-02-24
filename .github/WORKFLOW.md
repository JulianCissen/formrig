# GLOBAL WORKFLOW — State Machine, Dispatch, and Loops

## Purpose

This document is the canonical source for workflow states, transitions, gate behaviour,
and repair loops. The ProjectManager implements this state machine.

**Source-of-truth boundaries:**
- This file → workflow states, transitions, gate behaviour.
- `CONTRACT.md` → persistence schema, ASK_USER protocol, retry/write semantics, resume rules.

---

## State Machine Overview

**Full workflow:**
```
REFINE → APPROVE_SPEC → DESIGN → APPROVE_DESIGN → PLAN → REVIEW_STRATEGY
       → IMPLEMENT_LOOP → INTEGRATE → DOCUMENT → DONE
```

**Lean workflow (trivial, low-risk tasks):**
```
REFINE_LEAN → IMPLEMENT_LOOP → INTEGRATE → DONE
```

**Repair loops (entered from IMPLEMENT_LOOP or INTEGRATE):**
```
FIX_REVIEW | FIX_TESTS | FIX_SECURITY | FIX_BUILD
```

**Ad-hoc gates:**
```
ASK_USER | BLOCKED
```

---

## States

### REFINE

**Agent:** Refiner  
**Produces:** `spec.md`, `acceptance.json`, `status.json` (initial creation)  
**Gate:** All three files exist and pass content validation (see CONTRACT.md).

Refiner interviews the user (via `ask_questions`) to establish:
- What the user wants to achieve (goals)
- What they explicitly do NOT want (out of scope)
- Acceptance criteria (testable and unambiguous)
- Definition of Done
- Constraints and assumptions

Refiner writes output to `.agents-work/<session>/` and returns JSON. ProjectManager moves
to `APPROVE_SPEC` once the gate passes.

---

### REFINE_LEAN _(lean mode only)_

ProjectManager dispatches Refiner with a `lean: true` flag to create **minimal** artifacts:
- Short `spec.md` (goal + acceptance criteria only)
- `acceptance.json`
- Single-task `tasks.json`
- Initial `status.json`

If Refiner is unavailable in lean mode, ProjectManager MAY create these minimal artifacts
directly as the **sole exception** to the no-edit rule.

Gate: artifacts exist. If Developer discovers complexity, exit lean mode and restart from
full REFINE.

---

### APPROVE_SPEC _(mandatory user gate, full mode only)_

**Trigger:** Automatically after REFINE completes.  
**Mechanism:** ProjectManager uses `ask_questions` directly (NOT via subagent).  
**`current_state`:** MUST be set to `APPROVE_SPEC` (not `ASK_USER`).  
**Decision ID:** `UD-APPROVE-SPEC` (well-known, update in-place across correction cycles).

ProjectManager presents a summary of `spec.md` and `acceptance.json` and asks the user to:
1. Approve the specification as-is, OR
2. Request changes with details.

**Gate:** `UD-APPROVE-SPEC` has `status: answered` AND `answer` starts with `"approved"`.  
`"changes-requested: <detail>"` reopens the loop: ProjectManager routes corrections to
Refiner, appends an audit entry to `approve-spec-history.jsonl`, sets
`gate_tracking.APPROVE_SPEC.correction_status = queued`, and re-enters `APPROVE_SPEC`.

Workflow MUST NOT proceed to `DESIGN` without explicit approval.

---

### DESIGN

**Agents:** Researcher (conditional) → SolutionArchitect (conditional) → Architect → Designer (conditional)  
**Produces:** `solution-architecture.md` (if greenfield), `architecture.md`, `adr/` (optional),
`design-specs/` (if UI involved), `research/` (if Researcher involved)  
**Gate:** `architecture.md` consistent with `spec.md`. Risks recorded. Conditional artifacts
exist if their trigger conditions were met.

**Researcher trigger:** Call Researcher before SolutionArchitect/Architect when any applies:
- Technology or library evaluation needed
- Existing codebase analysis required
- Best-practices research for an unfamiliar domain
- Root-cause investigation for a complex bug
- Dependency evaluation

**SolutionArchitect trigger:** Call SolutionArchitect before Architect when ALL of these apply:
- Target component or project does not yet exist as a codebase
- Technology stack is not mandated by an existing system
- The task involves building a new service, app, library, or standalone component

When SolutionArchitect runs, Architect MUST read `solution-architecture.md` and treat it as
fixed constraints. Architect does not re-litigate tech stack choices.

**Designer trigger:** Call Designer (after Architect) when any applies:
- New screen, view, template, or layout
- Changed navigation or interaction flow
- New reusable UI component or major visual change

---

### APPROVE_DESIGN _(mandatory user gate, full mode only)_

Same mechanism as `APPROVE_SPEC`. Decision ID: `UD-APPROVE-DESIGN`.

ProjectManager presents:
- `spec.md` — scope, acceptance criteria, assumptions
- `architecture.md` — modules, data flows, key decisions / ADRs
- `design-specs/` (if Designer was involved) — layouts, interactions, components

Gate passes when `UD-APPROVE-DESIGN` has `status: answered` AND `answer` starts with
`"approved"`. Changes-requested routes back to Architect / Designer / Refiner as appropriate.
Appends to `approve-design-history.jsonl` on each `changes-requested`.

---

### PLAN

**Agent:** Planner  
**Produces:** `tasks.json` (with all tasks: `not-started`)  
**Gate:** at least one task with `id`, `status`, `goal`, `acceptance_checks`, `dependencies`.
Tasks have realistic dependencies and each has a clear `done_when` condition encoded in
`acceptance_checks`.

---

### REVIEW_STRATEGY _(mandatory user gate, full mode only)_

**Trigger:** Automatically after PLAN completes.  
**Mechanism:** ProjectManager uses `ask_questions` directly.  
**`current_state`:** `REVIEW_STRATEGY`.  
**Decision ID:** `UD-REVIEW-STRATEGY`.

ProjectManager presents:
1. Total number of planned tasks and a brief scope summary.
2. The two strategies:
   - **Per-batch:** Reviewer + QA + Security after each task. More thorough; catches issues early.
   - **Single-final:** All tasks coded first; one combined review pass at the end. Faster but
     late-discovered issues may require more rework.
3. Recommendation: per-batch for ≥ 5 tasks or high risk; single-final for < 5 tasks, low risk.

Gate: `UD-REVIEW-STRATEGY` has canonical `answer`: `per-batch | single-final`.

---

### IMPLEMENT_LOOP

Behaviour depends on the chosen review strategy (lean mode always uses per-batch).

#### Per-batch strategy

For each task whose dependencies are `completed`:

1. Developer sets task `status: in-progress`, implements the task, sets `status: implemented`.
2. Reviewer reviews (with ALL session-changed files provided via `session_changed_files`).
3. QA (if task touches behaviour / logic or acceptance criteria).
4. Security (if `risk_flags` contains `security` or change touches auth / input / network).

**Gates per task:**
- Reviewer `OK` (or `PASS_WITH_NOTES` — see ASK_USER trigger below)
- QA `OK` (if dispatched)
- Security `OK` (if dispatched). `NEEDS_DECISION` → enter `ASK_USER` before proceeding.
- ProjectManager promotes task: `implemented → completed`.

#### Single-final strategy

For each task (in dependency order):

1. Developer sets `in-progress`, implements, sets `implemented`. No review yet.

After ALL tasks reach `implemented`:

1. ProjectManager dispatches combined Reviewer (`task.id: "meta"`, `task.goal: "Single-final
   review of all session changes"`) + QA + Security (if applicable).
2. `session_changed_files` MUST list ALL files changed by any agent during the session.
3. Gates (applied once): Reviewer OK, QA OK, Security OK. Repair loops as normal.
4. After combined review passes, ProjectManager promotes all tasks `implemented → completed`.
5. Proceed directly to INTEGRATE — no additional final review step.

#### Full-scope context rule for Reviewer

ProjectManager MUST provide Reviewer with `session_changed_files` listing ALL files changed
during the session by ANY agent.

- **Per-task review (incremental):** Reviewer focuses deep reading on the current task's files.
  Checks `session_changed_files` selectively for cross-task interactions.
- **Final review (comprehensive):** Reviewer reads ALL non-deleted files in full. Deleted files
  reviewed via diff only (intentional removal + no dangling references).

#### Cross-task final review _(per-batch strategy only)_

After ALL tasks reach `completed`, BEFORE entering INTEGRATE:

1. ProjectManager dispatches Reviewer with `task.id: "meta"` and a goal of cross-cutting review.
2. Reviewer reads all session-changed files comprehensively.
3. Gate: Reviewer OK (or PASS_WITH_NOTES → ASK_USER decision). If BLOCKED → FIX_REVIEW.

_In single-final mode the combined review already serves as the cross-task final review. Do NOT
run it a second time._

---

### INTEGRATE

**Agent:** Integrator (full mode) or ProjectManager directly (lean mode)  
**Purpose:** Green build, dependency resolution, CI/pipeline checks  
**Gate:** CI green, OR if no CI, `acceptance_checks` commands pass locally.

In lean mode, ProjectManager runs `acceptance_checks` commands directly without dispatching
Integrator. If checks fail → FIX_BUILD.

---

### DOCUMENT _(full mode only)_

**Agent:** Docs  
**Produces:** Updated README (if applicable), `report.md`  
**Gate:** `report.md` exists and contains: what was done, how to run, how to test, known issues.

---

### DONE

ProjectManager returns a **human-readable** final summary (not JSON) to the user, pointing to
`report.md`, key artifacts, and any known issues.

`status.json` is updated with `current_state: DONE`.

---

### ASK_USER _(ad-hoc decisions only)_

`current_state: ASK_USER`. Mechanism and persistence: see CONTRACT.md.

**Enter ASK_USER when:**
- Ambiguous requirements with multiple valid interpretations.
- Reviewer returns `PASS_WITH_NOTES` and user should decide which notes to address.
- Design trade-offs with no clear winner.
- Scope creep risk (confirm before expanding).
- Security returns `NEEDS_DECISION` (medium risk) — **deterministic trigger**.

**Do NOT enter ASK_USER for:**
- Trivial decisions the ProjectManager can make autonomously.
- Technical implementation details.
- Anything resolved by best-effort + documented assumption.

After user responds, return to the `state_context` recorded in the decision entry.

---

## Repair Loops

| Loop | Trigger | Agents dispatched | Resolution |
|------|---------|-------------------|------------|
| `FIX_REVIEW` | Reviewer returns `BLOCKED` | Developer fixes → Reviewer re-reviews | Reviewer `OK` |
| `FIX_TESTS` | QA returns `BLOCKED` | Developer/QA fix → QA re-runs | QA `OK` |
| `FIX_SECURITY` | Security returns `BLOCKED` (high/critical) | Developer fixes → Security re-audits | Security `OK` |
| `FIX_BUILD` | CI/build red in INTEGRATE | Integrator or Developer fixes → INTEGRATE reruns | CI green |

### Retry Budget

Each repair loop has a maximum of **3 iterations** per loop type per task.

After 3 failed attempts, ProjectManager enters `ASK_USER` with:
- What the loop is and how many attempts were made.
- What was tried each time and why it failed.
- Options: (a) try a different approach, (b) accept with known issues, (c) reduce scope, (d) user
  provides guidance.

Retry counts tracked in `status.json` under `retry_counts`:

```json
"retry_counts": {
  "T-001": { "FIX_REVIEW": 2, "FIX_TESTS": 0, "FIX_SECURITY": 0, "FIX_BUILD": 0 }
}
```

---

## Lean Mode

Lean mode is for **trivial, well-scoped, low-risk changes** (typo fix, config change,
single-line bug fix, version bump).

### Criteria — ALL must apply

- Task is unambiguous; no spec interpretation needed.
- ≤ 3 files affected.
- No architectural decisions required.
- No UI/UX design decisions required.
- No security implications at intake time.
- Estimated effort ≤ 5 minutes.

### Lean workflow

```
REFINE_LEAN → IMPLEMENT_LOOP → INTEGRATE → DONE
```

- `APPROVE_SPEC`, `APPROVE_DESIGN`, `REVIEW_STRATEGY`, DESIGN, DOCUMENT are **skipped**.
- Reviewer is **never skipped**, even in lean mode.
- Security is called if the change touches auth / input / network.
- Integrator is **not dispatched**; ProjectManager runs acceptance checks directly.
- Docs is **not dispatched**; ProjectManager writes `report.md` directly.
- If Developer discovers the task is more complex than assessed, ProjectManager MUST exit lean
  mode and restart from full REFINE.

---

## Dispatch Rules

In a full run, the ProjectManager MUST dispatch every core agent at least once:

**Mandatory core agents (full mode):**
`Refiner, Architect, Planner, Developer, Reviewer, QA, Security, Integrator, Docs`

**Conditional agents (dispatched only when their trigger condition is met):**
`SolutionArchitect` (greenfield, undecided stack), `Designer` (UI/UX changes), `Researcher` (research needed)

**Mandatory user checkpoints (full mode):**
`APPROVE_SPEC` (after REFINE), `APPROVE_DESIGN` (after DESIGN), `REVIEW_STRATEGY` (after PLAN)

Note: Security CAN return `OK` with no findings — it must still be dispatched.

---

## Definition of Done

`DONE` only when:

- All criteria in `acceptance.json` are satisfied (or explicitly waived with documented reasons).
- CI green (if available), or `acceptance_checks` commands pass locally.
- `report.md` contains: what was done, how to run, how to test, known issues.
- `status.json` has `current_state: DONE` and no `user_decisions` with `status: pending`.

---

## Project-Level Instructions

If `.github/copilot-instructions.md` exists, the ProjectManager MUST instruct every subagent
to read it before starting work.

**Detection and persistence:**
1. At session start, check if `.github/copilot-instructions.md` exists.
2. Persist in `status.json`: `runtime_flags.copilot_instructions_exists` and
   `runtime_flags.copilot_checked_at`.
3. Before every subagent dispatch, read this value from disk (not memory).
4. If missing/uncertain (after resume or context compression), re-check and re-persist.

**Precedence (highest first):**
1. `CONTRACT.md` — I/O schema, gates, role boundaries.
2. Agent spec files — role behaviour.
3. `WORKFLOW.md` — process rules.
4. `.github/copilot-instructions.md` — project conventions (lowest priority).

Conflicts MUST be resolved in favour of higher-priority sources, with the conflict noted in
`artifacts.notes`.
