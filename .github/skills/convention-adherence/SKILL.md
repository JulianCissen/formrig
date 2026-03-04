---
name: convention-adherence
description: Checklist for identifying and following existing code conventions when implementing or reviewing changes. Use before writing any new code to understand what conventions to match, or when reviewing code to verify convention compliance was maintained.
---

# Convention Adherence

New code must be indistinguishable from the existing codebase in style and structure. Deviations require an explicit documented reason.

---

## For Developers — Before Writing Code

Find the most similar existing file to the one you are about to create or modify. Read it in full. Then match:

### 1. Import style and module organisation
- Are imports grouped (external → internal → relative)?
- Are path aliases used (e.g. `@/services/...`)?
- Are barrel (`index.ts`) re-exports used? Apply them if the pattern exists.

### 2. Naming conventions
- Files: `kebab-case`, `camelCase`, or `PascalCase`?
- Classes: always `PascalCase` — check suffixes (`Controller`, `Service`, `Repository`, `Handler`).
- Functions / methods: `camelCase` vs `snake_case`?
- Constants: `SCREAMING_SNAKE_CASE` or `camelCase`?
- Test files: `*.spec.ts`, `*.test.ts`, or `__tests__/*.ts`?

### 3. Error handling
- Are errors wrapped in a domain type (e.g. `AppError`, `Result<T>`) or thrown as-is?
- Is there a central error handler, or is try/catch used inline?
- Are messages logged at the throw site or the catch site?

### 4. Export pattern
- Default export or named export?
- Is there a single public-facing export per file, or multiple?

### 5. Test structure
- Co-located next to the source file, or in a separate `__tests__/` directory?
- One `describe` block per file, or flat tests?
- Are shared utilities / mocks in a `test/` or `__helpers__/` folder?

---

## For Reviewers — Convention Compliance Checklist

- [ ] New files placed in the correct directory per the project's structure.
- [ ] Naming of files, classes, functions, and variables matches the project convention.
- [ ] Import style (grouping, aliases, barrel exports) consistent with similar files.
- [ ] Error handling follows the project's established approach — not a new pattern introduced silently.
- [ ] Tests co-located (or in the correct test directory) and named per project pattern.
- [ ] Exported symbols follow the project's export convention (default vs. named).

Any undocumented deviation is a convention violation. Minor style divergence → `MINOR` finding. Divergence that makes the codebase inconsistent → `MAJOR` finding.

---

## When No Comparable File Exists

1. Fall back to conventions in `architecture.md` or `solution-architecture.md`.
2. If neither specifies a convention, document the choice in output `notes`.
