# formrig

A form rendering and management platform.

**Stack:** NestJS (backend) · Angular (frontend) · PostgreSQL · MinIO · Docker

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with **BuildKit enabled** (default since Docker Desktop 4.x)
- Git

No local Node.js installation is required — everything runs inside containers.

---

## Quick Start

```sh
./scripts/dev.sh up
```

This builds all images and starts all services. On first run it may take a few minutes while Docker downloads the base image and installs npm packages. Subsequent starts are fast.

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:4200       |
| Backend  | http://localhost:3000       |
| MinIO UI | http://localhost:9001       |

---

## Developer Scripts

All common tasks are available via `scripts/dev.sh`:

```sh
./scripts/dev.sh <command> [args]
```

| Command | Description |
|---|---|
| `build` | Build all Docker images with Buildx Bake (no containers started) |
| `up` | Build images and start all services in detached mode |
| `fresh` | Build images and **recreate** all containers — use after `npm install` or `package.json` changes |
| `down` | Stop and remove containers — **volume data is preserved** |
| `down:clean` | Stop containers and **delete all volumes** — ⚠ destroys database and file storage data |
| `logs [service]` | Tail logs for all services, or a specific service (`backend`, `frontend`, `watcher`) |
| `ps` | Show container status |

### Common Workflows

**Start development:**
```sh
./scripts/dev.sh up
```

**View backend logs:**
```sh
./scripts/dev.sh logs backend
```

**Stop everything (keep data):**
```sh
./scripts/dev.sh down
```

**After installing a new npm package:**
```sh
npm install <package> --workspace apps/backend
./scripts/dev.sh fresh
```

**Full reset (clean slate — ⚠ deletes database):**
```sh
./scripts/dev.sh down:clean
./scripts/dev.sh up
```

---

## Port Reference

| Port | Service |
|------|---------|
| 4200 | Angular frontend (dev server) |
| 3000 | NestJS backend |
| 5432 | PostgreSQL |
| 9000 | MinIO S3 API |
| 9001 | MinIO web console |

---

## Project Structure

```
apps/
  backend/      NestJS API server
  frontend/     Angular SPA
packages/
  shared/       Shared domain types (compiled, watched by watcher sidecar)
  sdk/          Plugin SDK (compiled, watched by watcher sidecar)
  dev-fixtures/ Mock user definitions for local development (dev only, never in production)
plugins/
  form/         Form-type plugins (demo-form bundled by moduul)
  storage/      Storage-engine plugins (MinIO)
scripts/
  dev.sh        Developer convenience script (this)
  watcher-entrypoint.sh  Watcher sidecar startup (runs inside Docker)
```

---

## Architecture Notes

### How the dev environment works

1. **Watcher sidecar** — starts first, compiles `packages/shared` and `packages/sdk`, then watches for changes and recompiles on every file save.
2. **Backend** — waits for the watcher sidecar to produce compiled output, then starts with NestJS `--watch` mode.
3. **Frontend** — waits for the watcher sidecar, then starts the Angular dev server with live reload.

Source files are **bind-mounted** from your local disk, so edits in VS Code are reflected immediately inside the containers. `node_modules` directories are stored in named Docker volumes to prevent the container-installed packages from being overwritten by the host.

### Adding npm packages

Because `node_modules` live in Docker volumes, you must rebuild the image after changing dependencies:

```sh
npm install <package> --workspace apps/backend   # update package.json + lock file
./scripts/dev.sh fresh                           # rebuild image + recreate container
```

### Non-Docker development

If you need to run services locally without Docker, note that `apps/frontend/proxy.conf.json` has been updated to point to `backend:3000` (the Docker service name). For local-only development you will need to revert this to `localhost:3000`.

---

## Dev Container (VS Code / GitHub Codespaces)

A Dev Container configuration is included at `.devcontainer/devcontainer.json`. Open the repository in VS Code and choose **Reopen in Container** to develop fully inside the containerised environment with all ports forwarded automatically.
