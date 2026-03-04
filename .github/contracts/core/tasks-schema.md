# tasks.json Schema

```json
{
  "tasks": [
    {
      "id": "T-001",
      "batch_id": "B-001",
      "title": "Short task title",
      "goal": "What this task implements and why it is needed",
      "status": "not-started",
      "dependencies": [],
      "acceptance_checks": ["AC-001", "AC-003"],
      "risk_flags": ["none"],
      "files_to_touch": ["src/users/user.model.ts"],
      "notes": ""
    }
  ]
}
```

All fields are required. Use `[]` for empty arrays and `""` for empty strings.
