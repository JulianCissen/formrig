# Contracts

All schemas, protocols, templates, and output contracts live in `.github/contracts/`.

---

## JSON Contracts

_Files that define JSON formats agents produce and consume._

### Core Schemas & Protocols

| Contract | Contents |
|----------|----------|
| [dispatch-input.md](contracts/core/dispatch-input.md) | Universal agent input JSON (includes `lean` and `accumulated_knowledge_contributions`) |
| [output-schema.md](contracts/core/output-schema.md) | Universal agent output JSON + status enum |
| [status-schema.md](contracts/core/status-schema.md) | `status.json` schema |
| [acceptance-schema.md](contracts/core/acceptance-schema.md) | `acceptance.json` schema |
| [tasks-schema.md](contracts/core/tasks-schema.md) | `tasks.json` schema |
| [artifact-model.md](contracts/artifact-model.md) | Canonical agent names, artifact table, content validation, hard blocker gates |

### Agent Output Contracts _(grouped by pipeline phase)_

| Contract | Agents covered |
|----------|----------------|
| [outputs/01-refiner.output.md](contracts/outputs/01-refiner.output.md) | Refiner |
| [outputs/02-solution-architect.output.md](contracts/outputs/02-solution-architect.output.md) | SolutionArchitect |
| [outputs/03-architect.output.md](contracts/outputs/03-architect.output.md) | Architect |
| [outputs/04-planner.output.md](contracts/outputs/04-planner.output.md) | Planner |
| [outputs/05-developer.output.md](contracts/outputs/05-developer.output.md) | Developer |
| [outputs/06-reviewer.output.md](contracts/outputs/06-reviewer.output.md) | Reviewer |
| [outputs/07-qa.output.md](contracts/outputs/07-qa.output.md) | QA |
| [outputs/08-security.output.md](contracts/outputs/08-security.output.md) | Security |
| [outputs/09-designer.output.md](contracts/outputs/09-designer.output.md) | Designer |
| [outputs/10-researcher.output.md](contracts/outputs/10-researcher.output.md) | Researcher |
| [outputs/11-integrator.output.md](contracts/outputs/11-integrator.output.md) | Integrator |
| [outputs/12-docs.output.md](contracts/outputs/12-docs.output.md) | Docs |

---

## Markdown Templates

_Files that define the structure of documents agents write._

| Contract | Contents |
|----------|----------|
| [spec-template.md](contracts/markdown-templates/spec-template.md) | `spec.md` required sections |
| [architecture-template.md](contracts/markdown-templates/architecture-template.md) | `architecture.md` required sections |
| [solution-architecture-template.md](contracts/markdown-templates/solution-architecture-template.md) | `solution-architecture.md` required sections |
| [adr-template.md](contracts/markdown-templates/adr-template.md) | ADR document structure |
| [designer-spec-template.md](contracts/markdown-templates/designer-spec-template.md) | Per-screen/component design spec structure |
| [researcher-report-template.md](contracts/markdown-templates/researcher-report-template.md) | Research report structure |
| [docs-report-template.md](contracts/markdown-templates/docs-report-template.md) | `report.md` required sections |
