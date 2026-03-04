# acceptance.json Schema

```json
{
  "acceptance_criteria": [
    { "id": "AC-1", "description": "...", "verify": "cmd: <test command>" },
    { "id": "AC-2", "description": "...", "verify": "manual: <step>" }
  ]
}
```

Prefer `cmd:` verification; use `manual:` only when automation is impractical.
