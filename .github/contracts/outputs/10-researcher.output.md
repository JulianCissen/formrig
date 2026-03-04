# 10-researcher output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | NEEDS_INFO | BLOCKED",
  "summary": "1–3 sentences: what was researched, key conclusion, any open questions",
  "artifacts": {
    "files_created_or_updated": [
      ".agents-work/<session>/research/library-evaluation.md"
    ],
    "notes": [
      "Evaluated three libraries; fastify recommended over express for this use case — see report for full comparison.",
      "One open question: project licence preference (MIT vs Apache-2.0 compatible) — recorded in Open Questions section."
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
    "reason": "Research complete. ProjectManager should dispatch SolutionArchitect or Architect with research/ as context."
  }
}
```

**`NEEDS_INFO`:** State precisely which question could not be answered and what information would resolve it. ProjectManager will enter `ASK_USER` to obtain it, then re-dispatch Researcher.
