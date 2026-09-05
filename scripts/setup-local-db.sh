#!/bin/bash
set -euo pipefail

echo "Starting PostgreSQL via Docker Compose..."
docker compose up -d postgres

echo "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U affiliateos -d affiliateos >/dev/null 2>&1; do
  sleep 1
done

echo "PostgreSQL is ready."
