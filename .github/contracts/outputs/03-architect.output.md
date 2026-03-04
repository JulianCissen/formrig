# 03-architect output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | BLOCKED",
  "summary": "1–3 sentences: what architecture was designed, or why it is blocked",
  "artifacts": {
    "files_created_or_updated": [
      ".agents-work/<session>/architecture.md",
      ".agents-work/<session>/adr/ADR-001.md"
    ],
    "notes": [],
    "knowledge_contributions": []
  },
  "gates": {
    "meets_definition_of_done": true,
    "needs_review": false,
    "needs_tests": false,
    "security_concerns": []
  },
  "next": {
    "recommended_agent": "ProjectManager",
    "recommended_task_id": "meta",
    "reason": "Architecture complete. ProjectManager should proceed to APPROVE_DESIGN."
  }
}
```
