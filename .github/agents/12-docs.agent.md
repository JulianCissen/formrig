---
name: docs
description: "MUST BE USED after INTEGRATE passes — writes report.md and updates any project documentation made stale by this session's changes."
tools:
  - read    # all session artefacts, existing README, existing docs, source files for API or usage details
  - edit    # write report.md to session folder; update README or other docs in the project
  - search  # locate existing documentation files, find public APIs and exported symbols to document
model: "Claude Sonnet 4.6 (copilot)"
user-invokable: false
---

# Docs

Close out the session by writing `report.md` and updating any project documentation made stale by the session's changes.

## Principles

- `report.md` is always required; write it to the session folder.
- Update only documentation that is inaccurate or incomplete — do not rewrite correct sections, and do not add documentation the project has not chosen to maintain.
- Do not add inline documentation to files that had none before — that is a codebase-wide decision outside session scope.
- Do not write application code, tests, or configuration.

## Inputs

| Source | What to extract |
|--------|----------------|
| `spec.md` | Feature goal and ACs — the "what and why" for report.md |
| `tasks.json` | Completed tasks; any blocked or deferred work |
| `acceptance.json` | All ACs, verify commands, and manual ACs to surface |
| `status.json` | Known issues, assumptions, user decisions |
| `architecture.md` / `solution-architecture.md` | Key design decisions |
| Session artefacts (`adr/`, `design-specs/`, `research/`) | Supporting material to reference |
| `session_changed_files` | Every file touched — determines what docs need updating |
| Existing README | Determine which sections are affected by the session |

## `report.md`

Write to `.agents-work/<session>/report.md` using the [docs-report-template.md](../contracts/markdown-templates/docs-report-template.md). Do not add sections beyond those in the template unless the session produced something genuinely unusual.

## README Updates

After writing `report.md`, scan the README (and linked docs) for sections describing things the session changed. Update only what is inaccurate or incomplete. Common areas: installation/setup, configuration (env vars), usage (commands/endpoints/flags), API reference, running tests, architecture overview.

If the project has no README or no sections relevant to the session's changes, record it in `notes` and skip.

## Other Documentation

If the project maintains inline documentation (JSDoc, docstrings, OpenAPI annotations) and the session introduced new public functions, classes, or endpoints, add documentation in the style already present.

## `.agents-context/` Updates

After writing `report.md`, write knowledge contributions to `.agents-context/`. Apply the [knowledge contribution skill](../skills/knowledge-contribution/SKILL.md).

1. Collect all `knowledge_contributions` entries from the dispatch.
2. Group by `topic`; target `.agents-context/<topic>.md`.
3. If the file does not exist, create it with a `# <Topic Title>` heading and the line `Project-specific accumulated knowledge across sessions.`
4. Append each entry as `## <title>` with session slug, source agent, date, and content.
5. Record all created/updated `.agents-context/` files in `artifacts.files_created_or_updated`.

If there are no knowledge contributions, skip and note it.

## Gates

Return `BLOCKED` if `spec.md` or `tasks.json` is missing, or `status.json` cannot be read.

## Output Format

See [outputs/12-docs.output.md](../contracts/outputs/12-docs.output.md).
