# AI notes

This project is built with Claude Code. This file records where the agent
was wrong or unsure, what caught it and what changed. It is kept as the
work goes, not written at the end.

## How the agent is kept in check

- **A contract first.** The design note, then the spec and the test plan,
  are written and confirmed before the code they describe.
- **One gate.** `npm run check` runs formatting, types, lint and unit tests.
  A git pre-commit hook runs it, so a failing change cannot be committed by
  a person or by an agent.
- **A stop hook.** In a Claude Code session opened in this repository,
  Claude is sent back to work when it tries to end a turn with uncommitted
  changes while the checks fail (`.claude/hooks/stop-check.sh`).
- **Rules written down.** `AGENTS.md` holds the rules of the codebase and
  what "done" means.
- **Tests that can fail.** Each rule is broken once on purpose to see a
  check go red (`/break-a-rule`). The results are in the second table.
- **A second reader.** A read-only subagent reviews a change against the
  spec (`.claude/agents/spec-reviewer.md`).
- **The owner confirms every step** before the next one starts.

What has not been exercised is listed at the end.

## What went wrong

| #   | What the agent got wrong or assumed                                                                                                                                                                         | What caught it                                                                                                                                        | What changed                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | It expected the NestJS set-up it knew: Jest, ESLint, CommonJS, a hand-written database provider and a hand-written validation pipe. NestJS 12 has moved on from all five                                    | Generating the project with the official tool instead of typing it, then reading the `AGENTS.md` the template ships and the two chapters it points to | The skeleton follows the template: ESM, Vitest, oxlint, `@nestjs/drizzle` and `StandardSchemaValidationPipe` (commit `fdaf571`)               |
| 2   | The first design note was 1,390 words. The brief asks for one to two pages                                                                                                                                  | Rendering the note to PDF and counting pages, instead of estimating                                                                                   | Cut to 879 words: two A4 pages plus the source list (commit `beb6ec9`)                                                                        |
| 3   | After a row was deleted from the design note, two citation numbers were out of order                                                                                                                        | A script that compares the numbers cited in the text with the source list                                                                             | Renumbered before the note was committed                                                                                                      |
| 4   | A smoke test reported the web dev server as down. The server was fine: it listens on `localhost`, which is IPv6 on this machine, and the test asked `127.0.0.1`                                             | Reading the dev server's log instead of trusting the test                                                                                             | The test was wrong, not the app. Nothing in the app changed                                                                                   |
| 5   | The API listened on every network interface, which is the framework's default                                                                                                                               | Listing the listening sockets after the smoke test                                                                                                    | It listens on `127.0.0.1` unless `HOST` is set (commit `fdaf571`)                                                                             |
| 6   | To prove the hooks block a type error, it added a file with a type error. The hooks did block it, but at the formatting step: the probe used double quotes. So the test proved nothing about the type check | Reading which step failed, not only that something failed                                                                                             | The probe was repeated with correct formatting. The type check then stopped it with `TS2322`. Each step of the gate now has its own row below |
| 7   | It wrote this file with a table that was not formatted the way Prettier formats it                                                                                                                          | The `/check` skill, on its first run in a live session: the gate stopped at the format step and named this file                                       | `npm run format`, then the full gate passed                                                                                                   |

## Rules broken on purpose

Each row is a check that was made to fail once. The probe was removed
afterwards and the checks were run again to green.

| The rule                                                           | The edit                                                                 | What failed                                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Code is formatted with Prettier                                    | A new file with double quotes                                            | `npm run check` stopped at the format step                                                       |
| The code type-checks                                               | `export const wrong: number = 'not a number';`                           | `npm run check` stopped at the typecheck step with `TS2322`                                      |
| A promise is awaited or handled                                    | A function that calls an async function without `await`                  | `npm run check` stopped at the lint step with `typescript(no-floating-promises)`                 |
| The unit tests pass                                                | An expected value in `config.spec.ts` changed from `9999` to `1234`      | `npm run check` stopped at the unit test step: `expected 9999 to be 1234`                        |
| A commit is refused while the checks fail                          | `git commit` with the type error above in the working tree               | The pre-commit hook exited with 1 and `HEAD` did not move                                        |
| The stop hook sends Claude back while the checks fail              | The hook script run by hand with a Stop event and the type error present | Exit code 2, with the failing output on stderr                                                   |
| The stop hook lets Claude stop after it has already been sent back | The same, with `"stop_hook_active": true` in the event                   | Exit code 0. This is the loop guard working, so "failed" here means "did not block", as intended |

## Not exercised yet

- The Stop hook has not fired inside a live Claude Code session opened in
  this repository. The build session was opened in the parent folder, and
  a nested repository's `.claude/settings.json` is not documented to load
  there. The hook script was run by hand with the JSON a Stop event sends.
- The permission rules in `.claude/settings.json` have not been exercised,
  for the same reason.
- The `/break-a-rule` skill has not been invoked as a skill. Its procedure
  was followed by hand for the rows above.
- The `spec-reviewer` subagent has not reviewed anything yet. There is no
  spec yet.

The `/check` skill and this repository's `CLAUDE.md` did load in the build
session, because Claude Code picks those up from a nested folder when it
works on files there.
