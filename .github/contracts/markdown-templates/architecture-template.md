# architecture.md Template

```markdown
# Architecture: <title matching spec>

## Overview
2–5 sentences. What is being built, how it fits into the existing system, and the core approach taken.

## Existing System Context
Brief description of relevant parts of the codebase this work touches or depends on. Reference actual file paths or module names where helpful.

## Components / Modules
For each component involved (new or modified):

### <ComponentName>
- **Responsibility:** What it does and owns.
- **Boundaries:** What it does not do; what it delegates.
- **Interfaces:** Key functions, endpoints, or events it exposes or consumes.
- **Location:** Where it lives in the codebase (new or existing path).

## Data Flow
Step-by-step or diagram describing how data moves through the system for the primary use cases. ASCII diagrams are fine.

## Key Contracts
Function signatures, REST/RPC endpoint shapes, event schemas, or data model definitions that cross component boundaries. Enough detail for Developer to implement without further design decisions.

## Technology Choices
Table or list of significant decisions: option chosen, alternatives considered, rationale.

## Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| <description> | low / medium / high | <mitigation note> |

## Out of Scope (Architecture)
What this architecture explicitly does not address.
```
