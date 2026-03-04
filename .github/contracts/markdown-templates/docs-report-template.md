# Report Template

Filename: `.agents-work/<session>/report.md`

```markdown
# Session Report: <title from spec.md>

## What Was Done
2–4 sentences summarising what the session built or changed and why. Reference the spec goal directly.

## Changes Summary
| Task | Description | Files |
|------|-------------|-------|
| T-001 | <task title> | <key files changed> |
| … | | |

## How to Run
Step-by-step instructions to get the feature running locally.
Include any new environment variables with their purpose and example values.
Reference the commands verified by Integrator.

## How to Test
How to run the test suite and acceptance checks:
- The full test suite command
- Any acceptance check commands from acceptance.json
- Any manual acceptance checks (AC IDs) requiring human verification, with instructions

## Architecture Decisions
Brief summary of key decisions made this session. Reference ADR files in adr/ if present.
For straightforward sessions: "No notable architecture decisions — implementation followed existing patterns."

## Known Issues
Issues from status.json, blocked tasks, deferred work, or pre-existing failures noted by Integrator. If none: "None."

## Assumptions
Assumptions recorded in status.json during the session. If none: "None."
```
