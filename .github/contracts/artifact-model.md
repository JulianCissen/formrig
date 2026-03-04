# Artifact Model

## Canonical Agent Names

Use these exact PascalCase names in `dispatch.agent`, `recommended_agent`, and dispatch calls:

`ProjectManager` | `Refiner` | `SolutionArchitect` | `Architect` | `Planner` | `Developer` | `Reviewer` | `QA` | `Security` | `Designer` | `Researcher` | `Integrator` | `Docs`

Frontmatter `name` fields use **kebab-case** (`project-manager`, `refiner`, etc.). All dispatch and inter-agent references use PascalCase.

## Session Folder

All session artifacts live under:
```
.agents-work/YYYY-MM-DD_<short-slug>/
```
`<short-slug>` is a 2–4 word kebab-case summary of the user goal. Previous sessions are **read-only**.

## Core Artifacts

| File | Owner | Required |
|------|-------|----------|
| `spec.md` | Refiner | Always |
| `acceptance.json` | Refiner | Always |
| `tasks.json` | Planner (full mode) / Refiner (lean mode) | Always |
| `status.json` | Refiner (initial), ProjectManager (updates) | Always |
| `report.md` | Docs | At DONE |
| `solution-architecture.md` | SolutionArchitect | When greenfield / stack undecided |
| `architecture.md` | Architect | Full mode only |
| `adr/` | Architect or SolutionArchitect | Optional |
| `design-specs/` | Designer | When UI/UX involved |
| `research/` | Researcher | When research required |
| `.agents-context/<topic>.md` | Docs (writes), any agent (reads) | When knowledge worth persisting is produced |

## `.agents-context/` Format

Topic files accumulate project-specific knowledge **across sessions**. Location: `.agents-context/` at repo root. Naming: kebab-case (`testing-patterns.md`, `auth.md`). Only Docs may create or edit them.

Each file starts with `# <Topic Title>` heading. Entries appended as:

```markdown
## <Short entry title>
**Session:** YYYY-MM-DD_slug | **Agent:** <source> | **Added:** YYYY-MM-DD

<2–10 lines of actionable knowledge: patterns, decisions, gotchas, or constraints>
```

Existing entries are **never edited or deleted**.

**Persist when:** established patterns, technology choices with rationale (especially rejected alternatives), non-obvious constraints, security/performance decisions with project-wide scope, permanent items from `assumptions` or `known_issues`.  
**Do not persist:** session-specific outcomes (those belong in `report.md`), information already in project README or architecture docs, temporary workarounds.

**Lean-mode exception:** In lean mode, when `accumulated_knowledge_contributions` is non-empty at DONE, ProjectManager **dispatches the Docs agent** to persist the contributions to `.agents-context/`, following the same format above. ProjectManager does not write to `.agents-context/` directly.

## Content Validation

Gates check content, not just file existence:

- `spec.md` — MUST contain: Goals, Acceptance Criteria, Definition of Done, Out of Scope.
- `acceptance.json` — MUST contain at least one criterion with `id`, `description`, `verify`.
- `architecture.md` — MUST contain: Overview, Components/Modules. (Full mode only.)
- `tasks.json` — MUST contain at least one task with `id`, `status`, `goal`, `acceptance_checks`.
- `status.json` — MUST be valid JSON after every write.

Consuming agent returns `status: BLOCKED` with the specific validation failure if an artifact fails content validation.

## Hard Blocker Gates

An agent MUST return `status: BLOCKED` if:
- A required file from `task.context_files` is missing.
- A task requires running tests but no test runner is available.
- A high/critical security issue was found.
- Acceptance criteria are not met and cannot be resolved autonomously.

ProjectManager MUST NOT leave `ASK_USER`, `APPROVE_SPEC`, or `APPROVE_DESIGN` state until all `user_decisions` created during that state have `status: answered | cancelled | skipped` — never `pending`.
