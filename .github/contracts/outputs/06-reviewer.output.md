# 06-reviewer output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | PASS_WITH_NOTES | BLOCKED",
  "summary": "1–3 sentences: overall verdict and the most important finding if any",
  "artifacts": {
    "findings": [
      {
        "severity": "BLOCKER | MAJOR | MINOR",
        "file": "src/users/user.repository.ts",
        "location": "findByEmail, line 42",
        "description": "Does not handle database connection errors — will propagate as unhandled exception.",
        "remediation": "Wrap db call in try/catch and throw a domain-layer error."
      }
    ],
    "notes": [],
    "knowledge_contributions": []
  },
  "gates": {
    "meets_definition_of_done": false,
    "needs_review": false,
    "needs_tests": false,
    "security_concerns": [
      "Optional: path near a query appears to use unsanitised input — Security agent should confirm."
    ]
  },
  "next": {
    "recommended_agent": "ProjectManager",
    "recommended_task_id": "meta",
    "reason": "BLOCKED: 1 blocking finding. ProjectManager should enter FIX_REVIEW loop."
  }
}
```

**`security_concerns`:** Use for code that *may* be a security issue but you are not certain (unsanitised input near a query, incomplete permission check, apparent hard-coded secret). Do not use `BLOCKED` for these — Security agent makes the definitive call. If non-empty, ProjectManager MUST dispatch Security before proceeding regardless of verdict.

**Finding severity:** `BLOCKER` must be fixed before proceeding; `MAJOR` significant quality problem; `MINOR` low-impact note. See [structured-findings skill](../skills/structured-findings/SKILL.md) for the full schema and completeness requirements.
