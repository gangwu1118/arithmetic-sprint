# CLAUDE.md

@AGENTS.md
@server/AGENTS.md

## Claude Code in this repository

- `.claude/settings.json` allows the check and test commands without a
  prompt, denies `git push` and reading `.env` files, and registers a Stop
  hook.
- The Stop hook, `.claude/hooks/stop-check.sh`, runs `npm run check` when a
  turn ends with uncommitted changes. If the checks fail, Claude is sent
  back once with the failure output.
- `/check` runs the gate and reports the first failure. `/check full` adds
  the HTTP tests.
- `/break-a-rule <rule>` proves a rule is tested by breaking it on purpose.
- The `spec-reviewer` subagent reviews a change against the spec. It is
  read-only.
- A git pre-commit hook runs the same checks for everyone, with or without
  Claude Code.
