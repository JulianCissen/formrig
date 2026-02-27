---
name: knowledge-contribution
description: Protocol for capturing reusable insights during a session that should be persisted to .agents-context/ for future sessions. Use when you have produced findings, decisions, or discovered patterns that would benefit future agents working on the same project.
---

# Knowledge Contribution

Agents work within a session but produce insights that outlast it. This skill defines how to package those insights so the Docs agent can persist them to `.agents-context/` at the end of the session.

---

## What Is Worth Contributing

Contribute knowledge when you have:

- **Evaluated and rejected alternatives** — e.g. Researcher evaluated three libraries and chose one; the reasoning saves future sessions from re-evaluating.
- **Discovered non-obvious codebase patterns** — e.g. "the project uses a custom error wrapping convention not documented anywhere"; saves Developer from needing to re-discover it.
- **Made architectural decisions with trade-offs** — the rationale prevents future sessions from re-litigating settled decisions.
- **Identified known limitations or debt** — e.g. "the legacy `AuthService` has a known concurrency issue under high load; do not add more callers without addressing it first."
- **Mapped entry points or data flows** — especially useful for large codebases where this mapping took significant research effort.

Do NOT contribute:
- Task-specific implementation details that won't generalise.
- Obvious information anyone could infer from the code directly.
- Duplicate information already in `.agents-context/`.

---

## How to Produce a Contribution

In your output JSON, add a top-level `knowledge_contributions` array:

```json
{
  "status": "OK",
  "summary": "...",
  "artifacts": { ... },
  "knowledge_contributions": [
    {
      "topic": "kebab-case-topic-name",
      "title": "Short descriptive title for this contribution",
      "source_agent": "researcher | architect | solution-architect | developer",
      "content": "The full contribution body. Write in clear prose. Include: what was found, why it matters, and any specific caveats or conditions."
    }
  ]
}
```

### Field guidance

| Field | Description |
|-------|-------------|
| `topic` | Determines which `.agents-context/<topic>.md` file this is written to. Use an existing topic if one fits; create a new descriptive kebab-case name if not. |
| `title` | Becomes the `## Heading` in the context file. Be specific — "Database Connection Pool Sizing" is better than "Config Notes". |
| `source_agent` | Which agent produced this contribution. |
| `content` | The actual knowledge. Write for a future agent that has never seen this session. |

---

## How Contributions Are Persisted

ProjectManager collects `knowledge_contributions` from all agent outputs and passes them to the Docs agent at the end of the session. Docs writes each contribution to the appropriate `.agents-context/<topic>.md` file.

You do not write to `.agents-context/` directly — only Docs does.

---

## Example

```json
{
  "topic": "authentication",
  "title": "JWT Verification: verify() vs decode()",
  "source_agent": "security",
  "content": "The project uses jsonwebtoken. Always call jwt.verify() — NOT jwt.decode(). jwt.decode() skips signature validation entirely and will accept any token regardless of its integrity. This was found as a security issue in session 2026-01-15_add-auth-endpoints and fixed in T-003."
}
```
