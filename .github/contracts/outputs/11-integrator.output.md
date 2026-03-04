# 11-integrator output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | BLOCKED",
  "summary": "1–3 sentences: what was run, what passed, what failed",
  "artifacts": {
    "commands_run": [
      { "command": "npm ci", "exit_code": 0, "note": "OK" },
      { "command": "npm run build", "exit_code": 0, "note": "OK" },
      { "command": "npm test", "exit_code": 0, "note": "142 passed, 0 failed" },
      { "command": "npm test -- --grep 'login'", "exit_code": 0, "note": "AC-001 passed" }
    ],
    "files_created_or_updated": [
      "package-lock.json"
    ],
    "notes": [
      "Lockfile updated: added @types/node@22.x for new session dependency.",
      ".env.example: added DB_POOL_SIZE=<value> for new env var introduced in T-003.",
      "Pre-existing failure: auth.legacy.spec.ts — not in session_changed_files, not blocking."
    ],
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
    "reason": "Build green, all acceptance checks passed. ProjectManager should advance to DOCUMENT."
  }
}
```
