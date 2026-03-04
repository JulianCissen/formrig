# 12-docs output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | BLOCKED",
  "summary": "1–3 sentences: report written, what documentation was updated, any manual checks outstanding",
  "artifacts": {
    "files_created_or_updated": [
      ".agents-work/<session>/report.md",
      "README.md",
      ".agents-context/testing-patterns.md"
    ],
    "notes": [
      "README: updated Environment Variables section with DB_POOL_SIZE added in T-003.",
      "Manual AC outstanding: AC-003 requires browser verification of the login flow — see report.md How to Test section.",
      "No ADRs produced this session — implementation followed existing patterns."
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
    "reason": "Documentation complete. ProjectManager should advance to DONE."
  }
}
```
