#!/usr/bin/env bash
# The one gate every change goes through: formatting, types, lint and unit
# tests. It needs no database, so it is fast enough to run before every
# commit. With --full it also runs the HTTP tests, which need the database
# from docker-compose.yml (npm run db:up).
set -euo pipefail
cd "$(dirname "$0")/.."

step() {
  printf '\n== %s ==\n' "$1"
}

step 'format'
npm run --silent format:check

step 'typecheck'
npm run --silent typecheck

step 'lint'
npm run --silent lint

step 'unit tests'
npm run --silent test

if [[ "${1:-}" == "--full" ]]; then
  step 'HTTP tests (real PostgreSQL)'
  npm run --silent test:e2e
fi

printf '\nAll checks passed.\n'
