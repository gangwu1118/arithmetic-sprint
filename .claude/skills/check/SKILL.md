---
name: check
description: Run this project's checks and report what fails. Use before saying a change is done, before a commit, or when asked whether the build is green.
argument-hint: '[full]'
allowed-tools: Bash(npm run check) Bash(npm run check:full)
---

Run the project's gate and report the result.

1. If the argument is `full`, run `npm run check:full`. It adds the HTTP
   tests, which need the database (`npm run db:up`). Otherwise run
   `npm run check`.
2. If everything passes, say so in one line and stop.
3. If a step fails, report the first failing step, the file and line, and
   the message, copied from the output. Do not summarise from memory.
4. Fix the cause in the code. Never make a check pass by weakening it:
   no skipped tests, no loosened assertions, no disabled lint rules, no
   `any`. If the check itself is wrong, say why before changing it.
5. Run the same command again and report the new result.

Arguments: $ARGUMENTS
