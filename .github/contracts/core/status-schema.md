# status.json Schema

```json
{
  "current_state": "REFINE | REFINE_LEAN | APPROVE_SPEC | DESIGN | APPROVE_DESIGN | PLAN | REVIEW_STRATEGY | IMPLEMENT_LOOP | INTEGRATE | DOCUMENT | DONE | ASK_USER | FIX_REVIEW | FIX_TESTS | FIX_SECURITY | FIX_BUILD | BLOCKED",
  "session": "YYYY-MM-DD_short-slug",
  "mode": "full | lean",
  "assumptions": ["..."],
  "user_decisions": [
    {
      "decision_id": "UD-1 | UD-APPROVE-SPEC | UD-APPROVE-DESIGN",
      "question": "Question asked to the user",
      "status": "pending | answered | cancelled | skipped",
      "answer": "user answer or null",
      "asked_at": "ISO-8601",
      "resolved_at": "ISO-8601 or null",
      "state_context": "Workflow state active when this was triggered",
      "resolution_reason": "Optional explanation or null"
    }
  ],
  "gate_tracking": {
    "APPROVE_SPEC": {
      "correction_status": "none | queued | dispatched | completed",
      "last_correction_dispatch": { "agent": "Refiner or null", "task_id": "meta or null", "at": "ISO-8601 or null" }
    },
    "APPROVE_DESIGN": {
      "correction_status": "none | queued | dispatched | completed",
      "last_correction_dispatch": { "agent": "Architect | Designer or null", "task_id": "meta or null", "at": "ISO-8601 or null" }
    }
  },
  "runtime_flags": {
    "copilot_instructions_exists": true,
    "copilot_checked_at": "ISO-8601",
    "context_topics": [".agents-context/testing-patterns.md"],
    "review_strategy": "per-batch | single-final"
  },
  "retry_counts": {
    "T-001": { "FIX_REVIEW": 0, "FIX_TESTS": 0, "FIX_SECURITY": 0, "FIX_BUILD": 0, "auto_retry": 0 }
  },
  "session_changed_files": [
    { "path": "src/feature.ts", "change_type": "added | modified | deleted | renamed", "old_path": "src/prev.ts or omit" }
  ],
  "known_issues": ["..."],
  "last_ci_result": "unknown | green | red",
  "last_update": "ISO-8601",
  "pending_steering": [
    {
      "id": "PS-1",
      "input": "Original user text",
      "target_state": "DESIGN",
      "target_agent": "Architect",
      "recorded_at": "ISO-8601",
      "status": "pending | injected"
    }
  ]
}
```

## Separation of Concerns

- Per-task status (`not-started → completed`) lives **only** in `tasks.json`.
- Session-level state (workflow position, decisions, retries) lives **only** in `status.json`.
- Do NOT duplicate task status in `status.json`.
- `session_changed_files` is the cumulative list of all files changed by any agent. ProjectManager MUST append Developer's `artifacts.files_created_or_updated` after every Developer dispatch.

`gate_tracking` and `runtime_flags` may be omitted until first use. Missing `gate_tracking.APPROVE_SPEC.correction_status` MUST be treated as `"none"`.

## Notes

- `REVIEW_STRATEGY` is automatic — no user input required.
- ProjectManager injects all `pending_steering` entries with `status: pending` targeting a given state into the agent dispatch when that state is entered, then sets their status to `"injected"`.
