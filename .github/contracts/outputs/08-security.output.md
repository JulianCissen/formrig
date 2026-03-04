# 08-security output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | NEEDS_DECISION | BLOCKED",
  "summary": "1–3 sentences: overall result, severity counts, most critical finding if any",
  "artifacts": {
    "findings": [
      {
        "severity": "critical | high | medium | low | info",
        "category": "injection | broken-access-control | auth | crypto | misconfiguration | dependency | other",
        "file": "src/users/user.repository.ts",
        "location": "findByEmail, line 42",
        "description": "Email parameter is concatenated directly into a SQL string rather than passed as a bound parameter.",
        "remediation": "Use a parameterised query: `db.query('SELECT * FROM users WHERE email = $1', [email])`."
      }
    ],
    "skipped_categories": [
      "cryptography — no cryptographic operations in changed files",
      "dependency — no new dependencies introduced"
    ],
    "notes": [
      "Low: auth.controller.ts line 12 — error response includes the internal exception message; consider sanitising in production."
    ],
    "knowledge_contributions": []
  },
  "gates": {
    "meets_definition_of_done": false,
    "needs_review": false,
    "needs_tests": false,
    "security_concerns": []
  },
  "next": {
    "recommended_agent": "ProjectManager",
    "recommended_task_id": "meta",
    "reason": "BLOCKED: 1 high finding. ProjectManager should enter FIX_SECURITY loop."
  }
}
```

**Verdict rules:** `BLOCKED` on any `critical` or `high` finding. `NEEDS_DECISION` on `medium` only (no critical/high present). `OK` on `low`/`info` only. Mixed critical+medium → `BLOCKED` first.

**`NEEDS_DECISION` guidance:** List every medium finding clearly. For each, frame the decision: what is the risk if left as-is, and what is the cost of fixing it. ProjectManager will surface these via `ASK_USER`. The user's answer will come back to ProjectManager, who either accepts the risk (documents it in `status.json` `known_issues`) or routes back to Developer.

**`security_concerns` field:** Leave empty — that field is for Reviewer's use when flagging issues that need Security review. Security does not self-flag.
