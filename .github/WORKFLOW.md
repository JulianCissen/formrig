# GLOBAL WORKFLOW

State machine, dispatch rules, and repair loops for the ProjectManager.

**Source-of-truth boundaries:**
- This file → workflow states, transitions, gate behaviour.
- `.github/contracts/` → schemas, protocols, output contracts, and templates.

---

## State Machine Overview

**Full workflow:**
```
REFINE → APPROVE_SPEC → DESIGN → APPROVE_DESIGN → PLAN → REVIEW_STRATEGY
       → IMPLEMENT_LOOP → INTEGRATE → DOCUMENT → DONE
```
_(REVIEW_STRATEGY is an automatic step — no user input required.)_

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

## Followup Requests and Steering

Classify every user message before acting:

**Category A — New goal** (distinct feature/fix/change, unrelated to active session): create a new session folder, start from REFINE or REFINE_LEAN. Previous session remains untouched.

**Category B — Steering** (correction, clarification, or priority change for the active session):
1. Read `status.json` → `current_state` and the `in-progress` task (if any).
2. If a Developer task is `in-progress` and input is relevant to it → re-dispatch Developer for the same task with input appended to `task.goal` as `"Steering amendment: <paraphrased input>"`, including all `session_changed_files` so far.
3. If input targets a different state/agent → record as `pending_steering` in `status.json` (schema: [status-schema.md](contracts/core/status-schema.md)) and inject when that state is next entered.
4. If input would change already-approved spec/architecture → enter `ASK_USER` first: summarise the change, confirm scope change vs. clarification, then re-run REFINE/DESIGN/PLAN as needed.

**Routing reference:**

| Input type | Target |
|---|---|
| Scope or AC change | REFINE |
| Architecture concern or new constraint | Architect (DESIGN) |
| Task breakdown or sequencing change | Planner (PLAN) |
| Code correction for active task | Developer (current task) |
| Code correction for completed task | FIX_REVIEW |
| Review / quality concern | Reviewer |
| Test concern | QA |
| Security concern | Security |

---

## States

### REFINE
**Agent:** Refiner | **Produces:** `spec.md`, `acceptance.json`, `status.json` | **Gate:** all three exist and pass content validation (see [artifact-model.md](contracts/artifact-model.md)).

### REFINE_LEAN _(lean only)_
Dispatch Refiner with `lean: true` for minimal artifacts (short `spec.md`, `acceptance.json`, single-task `tasks.json`, `status.json`). Only if Refiner returns `BLOCKED` or is demonstrably unavailable may ProjectManager create these directly — the sole permitted exception. Complexity found by Developer → exit lean, restart full REFINE.

### APPROVE_SPEC _(full mode only)_
ProjectManager uses `ask_questions` directly (not via subagent). `current_state: APPROVE_SPEC`. Decision ID: `UD-APPROVE-SPEC` (update in-place). Present `spec.md` + `acceptance.json` summary.

**Gate:** `UD-APPROVE-SPEC` `status: answered` AND `answer` starts with `"approved"`. `"changes-requested: <detail>"` → route to Refiner, set `gate_tracking.APPROVE_SPEC.correction_status = queued`, re-enter APPROVE_SPEC.

### DESIGN
**Agents:** Researcher (conditional) → SolutionArchitect (conditional) → Architect → Designer (conditional)  
**Produces:** `architecture.md`, optionally `solution-architecture.md`, `adr/`, `design-specs/`, `research/`  
**Gate:** `architecture.md` consistent with `spec.md`; conditional artifacts present if triggered.

- **Researcher trigger:** technology/library evaluation, codebase analysis, best-practices research, root-cause investigation, dependency evaluation.
  - **If Researcher returns `NEEDS_INFO`:** enter `ASK_USER` — present the open question and what information Researcher needs, then re-dispatch Researcher with the user's answer injected into `task.goal` as a steering amendment. If the user cannot provide the information, enter `BLOCKED`.
- **SolutionArchitect trigger:** all of — target project doesn't yet exist, stack not mandated, building new service/app/lib/component. When used, Architect treats `solution-architecture.md` as fixed constraints.
- **Designer trigger:** new screen/view/layout, changed navigation or interaction flow, new reusable UI component.
  - **If Designer returns `NEEDS_INFO`:** enter `ASK_USER` — present the open questions and what information Designer needs, then re-dispatch Designer with the user's answer injected into `task.goal`. If the user cannot provide the information, enter `BLOCKED`.

### APPROVE_DESIGN _(full mode only)_
Same mechanism as APPROVE_SPEC. Decision ID: `UD-APPROVE-DESIGN`. Present `spec.md`, `architecture.md`, `solution-architecture.md` (if SolutionArchitect ran), and `design-specs/` (if Designer ran). Changes-requested → route to Architect/Designer/Refiner as appropriate; set `gate_tracking.APPROVE_DESIGN.correction_status = queued`, re-enter APPROVE_DESIGN.

### PLAN
**Agent:** Planner | **Produces:** `tasks.json` (all `not-started`) | **Gate:** at least one task with `id`, `status`, `goal`, `acceptance_checks`, `dependencies`.

### REVIEW_STRATEGY _(full mode only, automatic)_
No user input. ProjectManager sets `runtime_flags.review_strategy`:
- **per-batch** — ≥ 5 tasks OR any task has `security`, `perf`, or `breaking-change` risk flag.
- **single-final** — < 5 tasks AND all tasks have only `none` risk flags.

Record in `status.json` and advance immediately to IMPLEMENT_LOOP. Gate: `runtime_flags.review_strategy` is set.

---

### IMPLEMENT_LOOP

**Per-batch strategy** (and lean mode): for each task whose dependencies are `completed`:
1. Developer: `in-progress` → implement → `implemented`.
2. Reviewer (provide ALL `session_changed_files`).
3. QA — dispatched for every task. (All tasks map to at least one AC per Planner rules.)
4. Security if `risk_flags` contains `security` or change touches auth/input/network. `NEEDS_DECISION` → ASK_USER. Security is also dispatched when Reviewer's output has a non-empty `gates.security_concerns` array — regardless of task `risk_flags`.
5. ProjectManager promotes `implemented → completed` once all gates pass.

**Partially-blocked batch:** if a Developer batch returns with some tasks `implemented` and some `blocked`, accept the implemented tasks (advance them through the normal review gate — Reviewer, QA, Security as applicable) and enter the FIX path only for the blocked tasks.

After ALL tasks `completed` (per-batch only) — **cross-task final review**: dispatch Reviewer with `task.id: "meta"` for comprehensive read of all session-changed files. Gate: Reviewer OK or PASS_WITH_NOTES → ASK_USER. BLOCKED → FIX_REVIEW.

**Single-final strategy:** all tasks — Developer implements each (`in-progress` → `implemented`) with no per-task review. After ALL `implemented`: dispatch combined Reviewer + QA + Security (`task.id: "meta"`, `session_changed_files` = ALL session files). Gates: same as per-batch. Gates for single-final: `PASS_WITH_NOTES` triggers ASK_USER (present notes to the user for decision); `BLOCKED` triggers FIX_REVIEW. Promote all to `completed`. Proceed to INTEGRATE. _(The combined review serves as the cross-task final review — do not run it again.)_

**Full-scope context rule:** Reviewer always receives `session_changed_files` listing ALL files changed by ANY agent during the session. Per-task mode: Reviewer focuses on current task's files, checks others for cross-task interactions. Final/meta mode: reads ALL non-deleted files in full.

### INTEGRATE
**Agent:** Integrator (full) / ProjectManager directly (lean) | **Gate:** CI green, or `acceptance_checks` pass locally. In lean mode, ProjectManager runs checks directly; failure → FIX_BUILD.

### DOCUMENT _(full mode only)_
**Agent:** Docs | **Produces:** `report.md`, updated README | **Gate:** `report.md` contains: what was done, how to run, how to test, known issues.

### DONE
**Before declaring DONE:** if `runtime_flags.accumulated_knowledge_contributions` is non-empty, verify that `.agents-context/` files appear in `session_changed_files` or that Docs was dispatched and returned `OK`. If neither holds, enter `BLOCKED` with known issue: 'DONE gate failed: knowledge contributions not persisted'.

ProjectManager returns human-readable summary (not JSON) to the user pointing to `report.md` and key artifacts. Set `status.json` `current_state: DONE`.

**Lean-mode DONE:** If `runtime_flags.accumulated_knowledge_contributions` is non-empty, dispatch Docs to persist them before returning the human-readable DONE summary.

### ASK_USER
`current_state: ASK_USER`.

**Enter when:** ambiguous requirements; Reviewer `PASS_WITH_NOTES` (user decides which to address); design trade-offs with no clear winner; scope creep risk; Security `NEEDS_DECISION` (deterministic trigger).  
**Do not enter for:** trivial decisions; technical implementation details; anything resolvable by assumption + documentation.  
After user responds, return to the `state_context` recorded in the decision entry.

---

## Repair Loops

| Loop | Trigger | Dispatched | Resolution |
|------|---------|-----------|------------|
| `FIX_REVIEW` | Reviewer `BLOCKED` | Developer → Reviewer | Reviewer `OK` |
| `FIX_TESTS` | QA `BLOCKED` | Developer/QA | QA `OK` |
| `FIX_SECURITY` | Security `BLOCKED` | Developer → Security | Security `OK` |
| `FIX_BUILD` | CI/build red | Integrator (full mode) or Developer (lean mode) | CI green |

**Developer auto-retry:** If Developer or the first Reviewer pass returns `BLOCKED` and the implementation is fundamentally off-track (wrong direction, not incremental quality issues), re-dispatch Developer once with blocking findings injected into `task.goal` as `"Steering amendment: <findings>"`. Record in `retry_counts.<task-id>.auto_retry` (cap: 1). If still blocked, enter the normal repair loop. Do not apply for incremental quality issues (style, test gaps, minor correctness).

**Retry budget:** Max 3 iterations per loop type per task. After 3 failures → `ASK_USER`: describe the loop, attempts made, and offer options (different approach / accept with known issues / reduce scope / user guidance). Counts in `status.json` `retry_counts` — see [status-schema.md](contracts/core/status-schema.md).

---

## Lean Mode

**Criteria — ALL must apply:** unambiguous task; ≤ 3 files affected; no architectural decisions; no UI/UX decisions; no security implications at intake; estimated effort ≤ 5 minutes.

**Rules:**
- APPROVE_SPEC, APPROVE_DESIGN, DESIGN skipped. REVIEW_STRATEGY auto-selects `single-final`.
- Reviewer is **never** skipped.
- Security dispatched if change touches auth/input/network.
- Integrator not dispatched — ProjectManager runs acceptance checks directly.
- Docs is dispatched only if `accumulated_knowledge_contributions` is non-empty; otherwise ProjectManager writes `report.md` directly.
- Complexity found by Developer → exit lean, restart full REFINE.

---

## Dispatch Rules

**Mandatory core agents (full mode):** Refiner, Architect, Planner, Developer, Reviewer, QA, Security, Integrator, Docs.  
**Conditional agents:** SolutionArchitect (greenfield, undecided stack), Designer (UI/UX changes), Researcher (research needed).  
**Mandatory user checkpoints (full mode):** APPROVE_SPEC, APPROVE_DESIGN.

Security CAN return `OK` with no findings — it must still be dispatched.

---

## Definition of Done

- All criteria in `acceptance.json` satisfied (or explicitly waived with documented reasons).
- CI green, or `acceptance_checks` commands pass locally.
- `report.md` contains: what was done, how to run, how to test, known issues.
- `status.json` has `current_state: DONE` and no `user_decisions` with `status: pending`.
- If `runtime_flags.accumulated_knowledge_contributions` is non-empty: `.agents-context/` files appear in `session_changed_files` or Docs was dispatched and returned `OK`.

---

## Project-Level Instructions

**`copilot-instructions.md`:** At session start, check if `.github/copilot-instructions.md` exists. Persist in `status.json` `runtime_flags.copilot_instructions_exists` and `runtime_flags.copilot_checked_at`. Re-check from disk (not memory) before every dispatch. If it exists, instruct every subagent to read it.

**Precedence (highest → lowest):** Contract schema files → agent spec files → WORKFLOW.md → `.github/copilot-instructions.md`. Conflicts resolve in favour of higher-priority sources; log in `artifacts.notes`.

**Knowledge base:** At session start, scan `.agents-context/` for topic files relevant to the goal. Persist paths in `status.json` `runtime_flags.context_topics`. Include relevant files in `context_files` for Refiner, Researcher, Architect, SolutionArchitect, and Developer dispatches.
