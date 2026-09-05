#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
fi

cleanup() {
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

npm run dev -w backend &
BACKEND_PID=$!

npm run dev -w frontend
