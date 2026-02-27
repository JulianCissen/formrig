---
name: convention-adherence
description: Checklist for identifying and following existing code conventions when implementing or reviewing changes. Use before writing any new code to understand what conventions to match, or when reviewing code to verify convention compliance was maintained.
---

# Convention Adherence

New code must be indistinguishable from the existing codebase in style and structure. Deviations require an explicit documented reason.

---

## For Developers — Before Writing Code

Search for the most similar existing file to the one you are about to create or modify. Read it in full. Then match:

### 1. Import style and module organisation
- Are imports grouped (external → internal → relative)?
- Are path aliases used (e.g. `@/services/...`)?
- Are there barrel (`index.ts`) re-exports? Use them if the pattern exists.

### 2. Naming conventions
- Files: `kebab-case`, `camelCase`, `PascalCase`?
- Classes: always `PascalCase` — but check suffixes (`Controller`, `Service`, `Repository`, `Handler`)?
- Functions / methods: `camelCase` vs `snake_case`?
- Constants: `SCREAMING_SNAKE_CASE` or `camelCase`?
- Test files: `*.spec.ts`, `*.test.ts`, `__tests__/*.ts`?

### 3. Error handling approach
- Are errors wrapped in a domain type (e.g. `AppError`, `Result<T>`) or thrown as-is?
- Is there a central error handler, or is try/catch used inline?
- Are error messages logged at the throw site or the catch site?

### 4. Export pattern
- Default export or named export?
- Is there a single public-facing export per file, or multiple?

### 5. Test file location and structure
- Co-located next to the source file, or in a separate `__tests__/` directory?
- One `describe` block per file, or flat tests?
- Are test utilities / mocks shared in a `test/` or `__helpers__/` folder?

---

## For Reviewers — Convention Compliance Checklist

When evaluating a change, verify each item:

- [ ] New files are placed in the correct directory following the project's structure.
- [ ] Naming of files, classes, functions, and variables matches the project convention.
- [ ] Import style (grouping, aliases, barrel exports) is consistent with similar files.
- [ ] Error handling follows the project's established approach (not a new pattern introduced silently).
- [ ] Tests are co-located (or in the correct test directory) and named per the project pattern.
- [ ] Exported symbols follow the project's export convention (default vs. named).

Any deviation that is not documented in Developer's output `notes` is a convention violation. Minor deviations → `MINOR` finding. Significant deviations that make the codebase inconsistent → `MAJOR` finding.

---

## When No Comparable File Exists

If no similar existing file can be found:
1. Fall back to conventions described in `architecture.md` or `solution-architecture.md`.
2. If neither specifies a convention, document the choice you made in output `notes` so Reviewer and future agents know it was intentional, not accidental.
