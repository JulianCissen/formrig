# 09-designer output.json

> Conforms to [output-schema.md](../core/output-schema.md).

```json
{
  "status": "OK | BLOCKED | NEEDS_INFO",
  "summary": "1–3 sentences: how many specs produced, any standards overrides or accessibility notes",
  "artifacts": {
    "files_created_or_updated": [
      ".agents-work/<session>/design-specs/login-screen.md",
      ".agents-work/<session>/design-specs/user-profile-card.md"
    ],
    "notes": [
      "Brand palette provided in architecture.md — colour tokens mapped to MD3 roles in each spec.",
      "Login form: WCAG 2.1 AA contrast ratio verified for all text/background combinations using MD3 default light theme."
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
    "reason": "Design specs complete. ProjectManager should advance to APPROVE_DESIGN."
  }
}
```

**`NEEDS_INFO`:** Designer cannot complete one or more design specs because information required from the user is unavailable (e.g., brand palette not specified, design system choice unclear or contradictory). Enumerate the specific questions in `artifacts.notes`. ProjectManager enters `ASK_USER`, presents the open questions, then re-dispatches Designer with the answers injected into `task.goal`.
