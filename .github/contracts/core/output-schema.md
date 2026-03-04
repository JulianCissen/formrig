# Universal Output Schema

Every agent returns **only** this JSON structure:

```json
{
  "status": "OK | PASS_WITH_NOTES | BLOCKED | NEEDS_INFO | NEEDS_DECISION",
  "summary": "1–3 sentence description of what was done or why it is blocked",
  "artifacts": {
    "files_created_or_updated": ["relative/path/to/file"],
    "files_deleted": [],
    "findings": [],
    "notes": ["assumptions made, tradeoffs accepted, links to files"],
    "knowledge_contributions": [
      {
        "topic": "testing-patterns",
        "title": "Short descriptive title",
        "content": "The actionable knowledge to persist — 2–10 lines.",
        "source_agent": "Developer"
      }
    ]
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

## Status Values

| Value | Usage |
|-------|-------|
| `OK` | Work completed successfully. All agents. |
| `PASS_WITH_NOTES` | Sound and can proceed; non-blocking observations attached. **Reviewer only.** |
| `BLOCKED` | Cannot proceed; hard blocker present. All agents. |
| `NEEDS_INFO` | More information is required from the user before work can proceed. **Researcher** (research incomplete) and **Designer** (required design inputs unavailable) only. |
| `NEEDS_DECISION` | Medium-severity security finding requires user decision. **Security only.** |

## Notes

- Developer lists every application source file created or modified in `artifacts.files_created_or_updated`. ProjectManager accumulates these across all Developer dispatches to build `task.session_changed_files` for Reviewer.
- `knowledge_contributions` are accumulated by ProjectManager across the session and passed to Docs at DONE via `accumulated_knowledge_contributions` in the dispatch input. In lean mode, ProjectManager writes them directly at DONE.
- `security_concerns` in `gates` is **only populated by Reviewer** — to flag code that may be a security issue for the Security agent to assess. All other agents leave it empty. Security does not self-populate this field.
- ProjectManager final response at `DONE` or `BLOCKED` is human-readable text (not JSON) — the only exception to the JSON-only rule.
- `files_deleted` — Developer populates this when files are removed during a task. ProjectManager uses it to mark entries in `session_changed_files` with `change_type: "deleted"`. All other agents leave it empty.
