# Project Instructions for Copilot

## Conventions

- Don't consider backwards compatibility in specs and designs as we're still in a prototyping stage. We want to be able to iterate quickly and make breaking changes without worrying about existing users or data.
- For the frontend, we use Angular with Material 3. When making frontend designs, make sure to follow Material 3 design principles and use standard Material Web components where appropriate. We aim for a very modern, simple and clean UI. WCAG 2.1 AA is the accessibility standard we target and should be considered in all frontend designs.
- For various functionalities in the application we use [@moduul](https://github.com/JulianCissen/moduul). It's a new and not widely adopted library. You likely know very little about it. Don't worry about that. If you need to know anything about moduul, read the documentation through the link above or ask me. If the library has any shortcomings or missing features that make it difficult to implement something, I can easily implement those features. Just let me know what you need.
- When we need to generate migrations for database schema changes, we use MikroORM's migration system. The appropriate commands to generate new migrations are in the backend's package.json file.

## Tech Stack

- **Backend:** NestJS (Node.js), MikroORM, PostgreSQL
- **Frontend:** Angular 19+, Angular Material 3, SCSS
- **Shared packages:** TypeScript workspace packages (`@formrig/shared`, `@formrig/sdk`, `@formrig/dev-fixtures`)
- **File storage:** MinIO (S3-compatible), plugin-based storage engine
- **Plugin system:** Form-type plugins and storage-engine plugins bundled with [@moduul](https://github.com/JulianCissen/moduul)
- **Infrastructure:** Docker Compose for local development; all services containerised
- **Testing:** Jest (backend + shared packages)

## Project Structure

```
apps/
  backend/      NestJS API — entities, modules, controllers, migrations
  frontend/     Angular SPA — Material 3 UI, standalone components, signal-based state
packages/
  shared/       @formrig/shared — domain types, DTOs, validation utils (used in prod)
  sdk/          @formrig/sdk — plugin SDK types and base classes
  dev-fixtures/ @formrig/dev-fixtures — mock user definitions for local dev only (never in prod)
plugins/
  form/         Form-type plugins (bundled with moduul)
  storage/      Storage-engine plugins (MinIO)
scripts/
  dev.sh        All developer lifecycle commands (up, down, fresh, logs, …)
```

**Key backend directories:**
- `apps/backend/src/common/` — `BaseEntity` (UUID PK, createdAt, updatedAt)
- `apps/backend/src/dev-auth/` — dev-only user middleware; not loaded in production
- `apps/backend/src/form/` — form CRUD, validation, file handling
- `apps/backend/src/file-storage/` — plugin-based file pipeline (antivirus, quarantine)
- `apps/backend/src/migrations/` — MikroORM migrations

**Key frontend directories:**
- `apps/frontend/src/app/dev-auth/` — dev-only auth (guard, interceptor, switcher, login) — compiled out of production bundles via `angular.json` `fileReplacements`
- `apps/frontend/src/app/app-shell/` — main layout component (toolbar, nav)
- `apps/frontend/src/app/pages/` — route page components
- `apps/frontend/src/environments/` — `environment.ts` (dev) / `environment.prod.ts` (prod)
