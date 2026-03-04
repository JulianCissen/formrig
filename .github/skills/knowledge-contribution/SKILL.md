---
name: knowledge-contribution
description: Protocol for capturing reusable insights during a session that should be persisted to .agents-context/ for future sessions. Use when you have produced findings, decisions, or discovered patterns that would benefit future agents working on the same project.
---

# Knowledge Contribution

Agents work within a session but produce insights that outlast it. This skill defines how to package those insights for persistence to `.agents-context/`.

---

## What Is Worth Contributing

Contribute when you have:
- **Evaluated and rejected alternatives** — future sessions won't re-evaluate settled decisions.
- **Discovered non-obvious codebase patterns** — saves future Developer from re-discovering them.
- **Made architectural decisions with trade-offs** — rationale prevents re-litigation.
- **Identified known limitations or debt** — e.g. "do not add callers to X until concurrency issue is fixed."
- **Mapped entry points or data flows** — especially valuable for large codebases.

Do NOT contribute:
- Task-specific implementation details that won't generalise.
- Obvious information inferable directly from the code.
- Information already present in `.agents-context/`.

---

## How to Produce a Contribution

Add entries to `artifacts.knowledge_contributions` in your output JSON:

```json
{
  "status": "OK",
  "artifacts": {
    "files_created_or_updated": [],
    "knowledge_contributions": [
      {
        "topic": "kebab-case-topic-name",
        "title": "Short descriptive title",
        "source_agent": "researcher | architect | solution-architect | developer | security",
        "content": "What was found, why it matters, and any specific caveats or conditions. Write for a future agent that has never seen this session."
      }
    ]
  }
}
```

### Field guidance

| Field | Description |
|-------|-------------|
| `topic` | Target file: `.agents-context/<topic>.md`. Use an existing topic if one fits; create a descriptive kebab-case name if not. |
| `title` | Becomes the `## Heading` in the context file. Be specific — "Database Connection Pool Sizing" beats "Config Notes". |
| `source_agent` | Agent that produced the contribution. |
| `content` | The actionable knowledge body. |

---

## How Contributions Are Persisted

ProjectManager collects `knowledge_contributions` from all agent outputs and passes them to Docs via `accumulated_knowledge_contributions` in the dispatch input. Docs writes each entry to the appropriate `.agents-context/<topic>.md` file.

In lean mode (no Docs dispatch), ProjectManager writes contributions directly at DONE.

You do not write to `.agents-context/` directly.

---

## Example

```json
{
  "topic": "authentication",
  "title": "JWT Verification: verify() vs decode()",
  "source_agent": "security",
  "content": "Always call jwt.verify() — NOT jwt.decode(). jwt.decode() skips signature validation and accepts any token regardless of integrity. Found as a security defect in session 2026-01-15_add-auth-endpoints, fixed in T-003."
}
```
