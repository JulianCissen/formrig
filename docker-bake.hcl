# docker-bake.hcl — Buildx Bake configuration for the formrig monorepo.
#
# Usage:
#   docker buildx bake                  # build all dev images
#   docker buildx bake packages-watcher # build a single target
#   docker buildx bake --print          # dry-run, print resolved config
#
# To extend for production:
#   1. Add target "backend-prod" { inherits = ["base"], target = "backend-prod", ... }
#   2. Add group "production" { targets = ["backend-prod", "frontend-prod"] }
#   3. Set IMAGE_TAG=latest and REGISTRY=ghcr.io/your-org/ before running.

variable "NODE_VERSION" {
  default = "22"
}

variable "TAG" {
  default = "dev"
}

variable "REGISTRY" {
  default = ""
}

# ─── Groups ────────────────────────────────────────────────────────────────

group "default" {
  targets = ["dev"]
}

group "dev" {
  targets = ["packages-watcher", "backend-dev", "frontend-dev"]
}

# ─── Shared base target (not built directly; inherited by all app targets) ──

target "base" {
  context    = "."
  dockerfile = "Dockerfile"
  args = {
    NODE_VERSION = NODE_VERSION
  }
}

# ─── Dev targets ────────────────────────────────────────────────────────────

target "packages-watcher" {
  inherits = ["base"]
  target   = "packages-watcher"
  tags     = ["${REGISTRY}formrig-packages-watcher:${TAG}"]
}

target "backend-dev" {
  inherits = ["base"]
  target   = "backend-dev"
  tags     = ["${REGISTRY}formrig-backend:${TAG}"]
}

target "frontend-dev" {
  inherits = ["base"]
  target   = "frontend-dev"
  tags     = ["${REGISTRY}formrig-frontend:${TAG}"]
}

# ─── Future production targets (not implemented — placeholders for extension) ──
#
# group "production" {
#   targets = ["backend-prod", "frontend-prod"]
# }
#
# target "backend-prod" {
#   inherits = ["base"]
#   target   = "backend-prod"
#   tags     = ["${REGISTRY}formrig-backend:${TAG}"]
#   args = {
#     NODE_ENV = "production"
#   }
# }
#
# target "frontend-prod" {
#   inherits = ["base"]
#   target   = "frontend-prod"
#   tags     = ["${REGISTRY}formrig-frontend:${TAG}"]
#   args = {
#     NODE_ENV = "production"
#   }
# }
