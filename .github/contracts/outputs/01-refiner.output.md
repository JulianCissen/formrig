# 01-refiner output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | BLOCKED",
  "summary": "1–3 sentences: what spec was produced, or why it is blocked",
  "artifacts": {
    "files_created_or_updated": [
      ".agents-work/<session>/spec.md",
      ".agents-work/<session>/acceptance.json",
      ".agents-work/<session>/status.json"
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
    "reason": "Spec complete. ProjectManager should enter APPROVE_SPEC."
  }
}
```

**Notes:** Apply the [read-after-write skill](../../skills/read-after-write/SKILL.md) after writing each output file (`spec.md`, `acceptance.json`, `status.json`) to confirm the write succeeded before returning output JSON.
