# solution-architecture.md Template

```markdown
# Solution Architecture: <title matching spec>

## Overview
What is being built, its purpose, and how it fits into the broader system.

## Technology Stack
| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | | |
| Runtime / Platform | | |
| Framework | | |
| Test runner | | |
| Key libraries | | |
| Code style / linting | | |

## Project Structure
Proposed top-level directory layout and the responsibility of each directory.

## Architectural Pattern
The pattern adopted (e.g. layered, hexagonal, event-driven) and why it fits the problem.
Include a brief description of how each layer or zone maps to the project structure above.

## Standards
Rules the entire codebase must follow:
- API style (REST, RPC, event-based, etc.)
- Error handling convention
- Logging convention
- Testing expectations (unit / integration / e2e split, coverage target)
- Any other non-negotiable conventions

## Integration Points
How this component connects to the rest of the system: shared types, APIs called, events emitted or subscribed to, shared infrastructure.

## Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| <description> | low / medium / high | <mitigation> |

## Deferred Decisions
Decisions intentionally not made here — left to Architect or Developer — with a note on what constraint or trigger will resolve them.
```
