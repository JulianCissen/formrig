# GLOBAL CONTRACT — Agent I/O, Artifacts, and Gates

This document is the **single source of truth** for all agents. Each agent **MUST**:

- Accept its input as JSON.
- Return **JSON only** (no prose, no markdown outside of file content, no text outside of JSON).
- Produce or update artifacts in the repository as files.
- Respect gates and never proceed if a gate is not met.

**Exception — ProjectManager final response:** When the ProjectManager reaches `DONE` or
`BLOCKED`, it returns a human-readable text summary directed at the user. All inter-agent
communication remains JSON-only.

---

## Canonical Agent Names

Use these **exact PascalCase names** in `dispatch.agent`, `recommended_agent`, and `runSubagent`
calls:

`ProjectManager` | `Refiner` | `SolutionArchitect` | `Architect` | `Planner` | `Developer` | `Reviewer` | `QA` |
`Security` | `Designer` | `Researcher` | `Integrator` | `Docs`

Frontmatter `name` fields in `.agent.md` files use **kebab-case** for system identification
(`project-manager`, `refiner`, `architect`, etc.). Dispatch and inter-agent references MUST
use PascalCase names from the list above.

---

## Artifact Model

All session artifacts live under a session subfolder:

```
.agents-work/YYYY-MM-DD_<short-slug>/
```

**Session slug format:** `YYYY-MM-DD` is the session start date. `<short-slug>` is a 2–4 word
kebab-case summary of the user goal (e.g. `add-dark-mode`, `fix-login-bug`).

### Core artifacts

| File | Owner | Required |
|------|-------|----------|
| `spec.md` | Refiner | Always |
| `acceptance.json` | Refiner | Always |
| `tasks.json` | Planner | Always |
| `status.json` | Refiner (initial), ProjectManager (updates) | Always |
| `report.md` | Docs | At DONE |
| `solution-architecture.md` | SolutionArchitect | When greenfield / tech stack undecided |
| `architecture.md` | Architect | Full mode only |
| `adr/` | Architect or SolutionArchitect | Optional |
| `design-specs/` | Designer | When UI/UX involved |
| `research/` | Researcher | When research required |
| `approve-spec-history.jsonl` | ProjectManager | On first `changes-requested` at APPROVE_SPEC |
| `approve-design-history.jsonl` | ProjectManager | On first `changes-requested` at APPROVE_DESIGN |

Previous sessions in `.agents-work/` are **read-only**. Agents may reference them for context
but **MUST NOT** modify them.

---

## Universal Input JSON

Every agent receives a dispatch object:

```json
{
  "task": {
    "id": "T-001 | meta",
    "title": "Short title",
    "goal": "What to achieve",
    "non_goals": ["What not to do"],
    "context_files": [
      ".agents-work/<session>/spec.md",
      ".agents-work/<session>/architecture.md",
      ".agents-work/<session>/tasks.json"
    ],
    "session_changed_files": [
      { "path": "src/feature.ts", "change_type": "added" },
      { "path": "src/old.ts", "change_type": "deleted" },
      { "path": "src/renamed.ts", "old_path": "src/prev.ts", "change_type": "renamed" }
    ],
    "constraints": ["Hard constraints that must not be violated"],
    "acceptance_checks": ["cmd: npm test", "manual: verify login flow"],
    "risk_flags": ["security | perf | breaking-change | none"]
  },
  "project_type": "web | api | cli | lib | mixed",
  "repo_state": {
    "branch": "main",
    "ci_status": "unknown | green | red",
    "last_failed_step": "optional string or null"
  },
  "tools_available": ["read", "edit", "execute", "search"],
  "artifact_list": ["optional list of existing session files"]
}
```

**Field notes:**
- `session_changed_files` is **mandatory for Reviewer dispatches**, omit or pass `[]` for all
  others. Each entry has `path`, `change_type` (`added | modified | deleted | renamed`), and
  `old_path` (required when `change_type` is `renamed`).
- `context_files` must include ALL session artifacts the agent needs. Agents MUST read every
  listed file before starting work. If a listed file is missing, return `status: BLOCKED`.

---

## Universal Output JSON

Every agent returns **only** this structure:

```json
{
  "status": "OK | PASS_WITH_NOTES | BLOCKED | NEEDS_INFO | NEEDS_DECISION",
  "summary": "1–3 sentence description of what was done or why it is blocked",
  "artifacts": {
    "files_created_or_updated": ["relative/path/to/file"],
    "files_deleted": [],
    "tests_added_or_updated": [],
    "commands_to_run": ["npm install", "npm test"],
    "manual_steps": [],
    "review_comments": [],
    "findings": [],
    "notes": ["assumptions made, tradeoffs accepted, links to files"]
  },
  "gates": {
    "meets_definition_of_done": true,
    "needs_review": false,
    "needs_tests": false,
    "security_concerns": []
  },
  "next": {
    "recommended_agent": "ProjectManager",
    "recommended_task_id": "T-001 | meta",
    "reason": "Short reason for recommendation"
  }
}
```

**Developer dispatch note:** Developer lists every application source file it creates or
modifies in `artifacts.files_created_or_updated`. The ProjectManager accumulates these
across all Developer dispatches to build the `task.session_changed_files` list passed to
Reviewer inputs.

---

## status.json — Schema

`status.json` is created by Refiner during REFINE (or by ProjectManager in lean mode).
The ProjectManager is its **logical owner** and is responsible for keeping it current.

```json
{
  "current_state": "REFINE | APPROVE_SPEC | DESIGN | APPROVE_DESIGN | PLAN | REVIEW_STRATEGY | IMPLEMENT_LOOP | INTEGRATE | DOCUMENT | DONE | ASK_USER | FIX_REVIEW | FIX_TESTS | FIX_SECURITY | FIX_BUILD | BLOCKED",
  "session": "YYYY-MM-DD_short-slug",
  "mode": "full | lean",
  "assumptions": ["..."],
  "user_decisions": [
    {
      "decision_id": "UD-1 | UD-APPROVE-SPEC | UD-APPROVE-DESIGN | UD-REVIEW-STRATEGY",
      "question": "Question asked to the user",
      "status": "pending | answered | cancelled | skipped",
      "answer": "user answer or null",
      "asked_at": "ISO-8601",
      "resolved_at": "ISO-8601 or null",
      "state_context": "Workflow state active when this was triggered",
      "resolution_reason": "Optional explanation or null"
    }
  ],
  "gate_tracking": {
    "APPROVE_SPEC": {
      "correction_status": "none | queued | dispatched | completed",
      "last_correction_dispatch": { "agent": "Refiner or null", "task_id": "meta or null", "at": "ISO-8601 or null" }
    },
    "APPROVE_DESIGN": {
      "correction_status": "none | queued | dispatched | completed",
      "last_correction_dispatch": { "agent": "Architect | Designer or null", "task_id": "meta or null", "at": "ISO-8601 or null" }
    }
  },
  "runtime_flags": {
    "copilot_instructions_exists": true,
    "copilot_checked_at": "ISO-8601"
  },
  "retry_counts": {
    "T-001": { "FIX_REVIEW": 0, "FIX_TESTS": 0, "FIX_SECURITY": 0, "FIX_BUILD": 0 }
  },
  "session_changed_files": [
    { "path": "src/feature.ts", "change_type": "added | modified | deleted | renamed", "old_path": "src/prev.ts or omit" }
  ],
  "known_issues": ["..."],
  "last_ci_result": "unknown | green | red",
  "last_update": "ISO-8601"
}
```

**Separation of concerns:**
- Per-task status (`not-started → completed`) lives **only** in `tasks.json`.
- Session-level state (workflow position, decisions, retries) lives **only** in `status.json`.
- Do NOT duplicate task status in `status.json`.
- `session_changed_files` is the cumulative list of all files changed by any agent during the
  session. The ProjectManager MUST append Developer's `artifacts.files_created_or_updated`
  to this list after every Developer dispatch and persist it to `status.json`. Integrator and
  Docs read this field from `status.json` when they need the full changed-file list.

`gate_tracking` and `runtime_flags` may be omitted until first use. Missing
`gate_tracking.APPROVE_SPEC.correction_status` or `gate_tracking.APPROVE_DESIGN.correction_status`
MUST be treated as `"none"`.

---

## acceptance.json — Schema

```json
{
  "acceptance_criteria": [
    {
      "id": "AC-1",
      "description": "User can log in with email and password",
      "verify": "cmd: npm test -- --grep 'login'"
    }
  ]
}
```

At least one criterion with `id`, `description`, and `verify` is required.

---

## tasks.json — Schema

```json
{
  "tasks": [
    {
      "id": "T-001",
      "batch_id": "B-001",
      "title": "Short task title",
      "goal": "What this task implements",
      "status": "not-started",
      "dependencies": [],
      "acceptance_checks": ["AC-001"],
      "risk_flags": ["none"],
      "files_to_touch": ["src/feature.ts"],
      "notes": ""
    }
  ]
}
```

Valid `status` values: `not-started | in-progress | implemented | completed | blocked`  
Valid `risk_flags` values: `security | perf | breaking-change | none`

### Task status lifecycle

- `not-started` — initial state, set by Planner
- `in-progress` — set by Developer when work begins
- `implemented` — set by Developer after completing work; awaiting review / QA / security gates
- `completed` — set by **ProjectManager only** after all gates pass
- `blocked` — set by any agent encountering a hard blocker

Developer MUST NOT set `completed`. ProjectManager promotes `implemented → completed` after gates pass.

---

## Status Enum

| Value | Usage |
|-------|-------|
| `OK` | Work completed successfully. Used by all agents. |
| `PASS_WITH_NOTES` | Work is sound and can proceed; non-blocking observations are attached. **Reviewer only.** ProjectManager enters `ASK_USER` so the user can decide which notes to address. |
| `BLOCKED` | Cannot proceed; hard blocker present. Used by all agents. |
| `NEEDS_INFO` | Research incomplete; more information needed. **Researcher only.** |
| `NEEDS_DECISION` | Medium-severity security finding requires a user decision. **Security only.** ProjectManager MUST enter `ASK_USER` on receipt. |

---

## Gates — Hard Blockers

An agent **MUST** return `status: BLOCKED` if:

- A required file from `task.context_files` is missing.
- A task requires running tests but no test runner is available.
- A high/critical security issue was found (Security blocks; Developer must fix).
- Acceptance criteria are not met and cannot be resolved autonomously.

The ProjectManager **MUST NOT** leave any user-decision state (`ASK_USER`, `APPROVE_SPEC`,
`APPROVE_DESIGN`, `REVIEW_STRATEGY`) until all `user_decisions` created during that state have
`status: answered | cancelled | skipped` — never `pending`.

---

## Artifact Content Validation

Gates check **content**, not just file existence:

- `spec.md` — MUST contain sections: Goals, Acceptance Criteria, Definition of Done, Out of Scope.
- `acceptance.json` — MUST contain at least one criterion with `id`, `description`, `verify`.
- `architecture.md` — MUST contain sections: Overview, Components/Modules. (Full mode only.)
- `tasks.json` — MUST contain at least one task with `id`, `status`, `goal`, `acceptance_checks`.
- `status.json` — MUST be valid JSON after every write. Agents MUST use proper JSON serialisation.

If an artifact exists but fails content validation, the consuming agent returns `status: BLOCKED`
with the specific validation failure.

---

## ASK_USER Protocol

This protocol applies identically in `ASK_USER`, `APPROVE_SPEC`, `APPROVE_DESIGN`, and
`REVIEW_STRATEGY` states. Only the `current_state` value and `decision_id` format differ.

1. **Before** calling the `ask_questions` tool, write a `user_decisions[]` entry with
   `status: pending`, `answer: null`, and a stable `decision_id`.
2. Write `current_state` appropriately (`ASK_USER` for ad-hoc, or the gate name for gates).
3. Call `ask_questions`.
4. After the user responds, update the entry to `status: answered` (or `cancelled` if the user
   explicitly defers).
5. Perform **read-after-write verification** by re-reading `status.json` and confirming the entry.
6. Retry failed writes up to **3 times** using the captured response before entering `BLOCKED`.

**Decision ID formats:**
- Ad-hoc: `UD-<N>` (sequential integer, unique per session).
- Well-known gate IDs: `UD-APPROVE-SPEC`, `UD-APPROVE-DESIGN`, `UD-REVIEW-STRATEGY`.
  These are reused across correction cycles (update in-place, never duplicate).

**Gate-specific semantics:**
- `UD-APPROVE-SPEC` — passes only when `answer` starts with `"approved"`.
  `"changes-requested: <detail>"` reopens the correction loop.
- `UD-APPROVE-DESIGN` — same semantics as above.
- `UD-REVIEW-STRATEGY` — passes only when canonical `answer` is `per-batch | single-final`.

**Mandatory gate retry rule:** For `UD-APPROVE-SPEC`, `UD-APPROVE-DESIGN`, and
`UD-REVIEW-STRATEGY`, invalid / missing responses are NOT terminal. Re-ask up to 3 times (in
memory, not persisted). If still unresolved, enter `BLOCKED` with
`blocker: "mandatory_user_decision_missing"`.

**Security decisions:** Auto-cancellation of unanswered Security questions is not allowed.
Re-ask until the user explicitly resolves or consciously defers.

---

## Role Boundaries

The ProjectManager **MUST NOT** create or edit application source code, test code, or
non-session configuration files. Only Developer and Integrator may produce implementation
artifacts.

The ProjectManager's direct file operations are limited to session artifacts inside
`.agents-work/<session>/` (`status.json`, `tasks.json`, `report.md`, and in lean mode also
`spec.md`, `acceptance.json`).

If a subagent dispatch fails after retries, the ProjectManager MUST enter `BLOCKED` — never
silently assume the agent's role.

---

## project_type Checklist Qualification

Agents with context-sensitive checklists (Reviewer, QA, Security) MUST skip items not
applicable to the project type:

- `web` — full checklist (CSRF, XSS, injection, etc.)
- `api` — skip template/UI checks; focus on auth, input validation, rate limiting
- `cli` — skip CSRF, XSS, tenancy; focus on input validation, privilege escalation, secrets
- `lib` — skip CSRF, XSS, tenancy; focus on API safety, input validation, dependency hygiene
- `mixed` — apply all checks relevant to the specific files under review

---

## Style Rules

- **Output:** JSON only (exception: ProjectManager final user-facing response).
- **Artifacts:** regular Markdown, simple and to the point.
- **JSON writes:** always use proper serialisation; never build JSON via string concatenation.
- **Path references:** always repo-relative, forward-slash separated.
