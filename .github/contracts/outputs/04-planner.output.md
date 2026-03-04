# 04-planner output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | BLOCKED",
  "summary": "1–3 sentences: how many tasks, how many batches, any notable risks or assumptions",
  "artifacts": {
    "files_created_or_updated": [
      ".agents-work/<session>/tasks.json"
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
    "reason": "Task plan complete. ProjectManager should advance to REVIEW_STRATEGY then IMPLEMENT_LOOP."
  }
}
```
