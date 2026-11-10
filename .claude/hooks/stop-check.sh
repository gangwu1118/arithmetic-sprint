#!/usr/bin/env bash
# Claude Code "Stop" hook. When Claude is about to end its turn with
# uncommitted changes, run the fast checks. If they fail, exit with code 2:
# Claude Code then keeps the turn going and gives Claude what this script
# wrote to stderr.
set -uo pipefail

input="$(cat)"

# Claude is already continuing because of a stop hook: let it stop this
# time, so a failure it cannot fix does not loop. The commit hook is the
# hard gate.
if printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" || exit 0

# Dependencies are not installed: the checks cannot run, so do not judge.
[ -d node_modules ] || exit 0

# Nothing changed since the last commit: nothing to check.
if git diff --quiet && git diff --cached --quiet &&
  [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi

if output="$(bash scripts/check.sh 2>&1)"; then
  exit 0
fi

{
  echo 'The project checks fail, so this change is not finished.'
  echo 'Fix the cause, not the check. Then run: npm run check'
  echo
  printf '%s\n' "$output" | tail -n 40
} >&2
exit 2
