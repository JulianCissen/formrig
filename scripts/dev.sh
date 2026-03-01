#!/bin/sh
# scripts/dev.sh — Developer convenience commands for the formrig containerised dev environment.
#
# Usage:
#   ./scripts/dev.sh <command> [args]
#
# Commands:
#   build          Build all Docker images with Buildx Bake (no containers started)
#   up             Build images and start all services in detached mode
#   fresh          Build images and recreate all containers (use after npm install changes)
#   down           Stop and remove containers, keep all volume data (safe)
#   down:clean     Stop containers AND delete all volumes — WARNING: destroys DB data
#   logs [svc]     Tail logs for all services, or a specific service (e.g. backend, frontend, watcher)
#   ps             Show container status

set -e

COMMAND="${1:-}"
shift || true

case "$COMMAND" in

  build)
    echo "==> Building all dev images with Buildx Bake..."
    docker buildx bake
    ;;

  up)
    echo "==> Building images and starting all services..."
    docker buildx bake
    docker compose up -d
    echo ""
    echo "Services started. Useful commands:"
    echo "  ./scripts/dev.sh logs            # tail all logs"
    echo "  ./scripts/dev.sh logs backend    # tail backend only"
    echo "  ./scripts/dev.sh ps              # check container status"
    ;;

  fresh)
    echo "==> Rebuilding images and recreating all containers..."
    echo "    Removing node_modules volumes so they are repopulated from the new image."
    docker buildx bake
    docker compose down
    docker volume rm formrig_nm_root formrig_nm_root_be formrig_nm_root_fe formrig_nm_be_app formrig_nm_fe_app formrig_nm_plugin_demo formrig_nm_plugin_minio 2>/dev/null || true
    docker compose up -d
    ;;

  down)
    echo "==> Stopping containers (volumes and data preserved)..."
    docker compose down
    ;;

  down:clean)
    echo ""
    echo "  WARNING: This will delete ALL named volumes, including:"
    echo "    - postgres_data  (all database content)"
    echo "    - minio_data     (all uploaded files)"
    echo "    - All node_modules volumes (will be reinstalled on next 'up')"
    echo ""
    printf "  Type 'yes' to confirm: "
    read -r CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
      docker compose down -v
      echo "==> All containers and volumes removed."
    else
      echo "Aborted."
      exit 1
    fi
    ;;

  logs)
    if [ -n "$1" ]; then
      docker compose logs -f "$1"
    else
      docker compose logs -f
    fi
    ;;

  ps)
    docker compose ps
    ;;

  *)
    echo "formrig dev script"
    echo ""
    echo "Usage: ./scripts/dev.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  build          Build all Docker images (no containers started)"
    echo "  up             Build + start all services in detached mode"
    echo "  fresh          Build + recreate all containers + wipe node_modules volumes (use after npm install)"
    echo "  down           Stop containers, keep all data"
    echo "  down:clean     Stop containers AND remove all volumes  [DESTRUCTIVE]"
    echo "  logs [svc]     Tail logs (all services, or specify: backend/frontend/watcher)"
    echo "  ps             Show container status"
    exit 1
    ;;

esac
