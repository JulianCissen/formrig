# 05-developer output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | BLOCKED",
  "summary": "1–3 sentences: what was implemented, any notable decisions or deviations",
  "artifacts": {
    "files_created_or_updated": [
      "src/users/user.model.ts",
      "src/users/user.model.spec.ts"
    ],
    "tasks_implemented": ["T-001", "T-002"],
    "tasks_blocked": [],
    "notes": [],
    "knowledge_contributions": []
  },
  "gates": {
    "meets_definition_of_done": true,
    "needs_review": true,
    "needs_tests": false,
    "security_concerns": []
  },
  "next": {
    "recommended_agent": "ProjectManager",
    "recommended_task_id": "meta",
    "reason": "Batch implemented. ProjectManager should dispatch Reviewer per the chosen review strategy."
  }
}
```

`needs_review` MUST always be `true` — every Developer pass triggers a Reviewer dispatch via ProjectManager.
