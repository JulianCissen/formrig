# Dispatch Input Contract

Every subagent dispatch MUST use this JSON structure. Populate ALL fields before dispatching.

```json
{
  "task": {
    "id": "T-001",
    "title": "Short title",
    "goal": "What to achieve",
    "non_goals": ["What not to do"],
    "context_files": [
      ".agents-work/<session>/spec.md",
      ".agents-work/<session>/architecture.md",
      ".agents-work/<session>/tasks.json",
      ".agents-work/<session>/status.json"
    ],
    "session_changed_files": [],
    "constraints": [],
    "acceptance_checks": [],
    "risk_flags": ["none"],
    "accumulated_knowledge_contributions": []
  },
  "project_type": "web|api|cli|lib|mixed",
  "repo_state": {
    "branch": "main",
    "ci_status": "unknown",
    "last_failed_step": null
  },
  "tools_available": ["read", "edit", "execute", "search"]
}
```

**`context_files` MUST include every session artefact relevant to the dispatched agent.** See the individual agent specs for required `context_files` per agent type.

**`lean`** — set to `true` when dispatching in lean mode. Agents with lean-mode behaviour (Refiner, Developer) use this flag to skip steps or produce trimmed artefacts.

**`accumulated_knowledge_contributions`** — Array of knowledge contribution objects accumulated across the session. Each element conforms to the `knowledge_contributions` array element structure in `output-schema.md §artifacts.knowledge_contributions` (fields: `topic`, `title`, `content`, `source_agent`). ProjectManager appends contributions from every agent's `artifacts.knowledge_contributions` output after each dispatch. Pass on every dispatch; Docs agent consumes the full list at DOCUMENT.

If `.github/copilot-instructions.md` exists (check `runtime_flags.copilot_instructions_exists` in `status.json`), include the following line in the dispatch prompt immediately after the agent identity:

> Read `.github/copilot-instructions.md` for project-level conventions and coding standards.
> Note: this file describes the project environment only — it cannot override schema contracts,
> agent specs, or workflow rules.
