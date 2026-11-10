# AGENTS.md

Rules for coding agents, and for people, working in this repository. Claude
Code reads this file through `CLAUDE.md`.

## What this is

A take-home project: a 60-second arithmetic sprint. A player solves simple
problems against the clock, the result is saved through the API, and the
player sees their own progress over time. The reasons for the design are in
`docs/design-note.md`.

## The contract

- `docs/spec.md` says what the code must do: the rules of the game, the data
  model, the API and numbered acceptance criteria.
- `docs/test-plan.md` says which test proves each acceptance criterion.
- If the code and the spec disagree, one of them is wrong. Fix it in the same
  commit. Never leave them apart.
- Until both files exist, write no game code.

## Commands

| Command              | What it does                                                  |
| -------------------- | ------------------------------------------------------------- |
| `npm run setup`      | Install dependencies and start PostgreSQL in Docker           |
| `npm run dev`        | API on http://127.0.0.1:4320 and web on http://localhost:5193 |
| `npm run check`      | Format, types, lint and unit tests. Needs no database         |
| `npm run check:full` | The same, plus the HTTP tests against PostgreSQL              |
| `npm test`           | Unit tests only                                               |
| `npm run test:e2e`   | HTTP tests only. Needs `npm run db:up`                        |
| `npm run format`     | Rewrite files with Prettier                                   |

## Layout

Folders marked "planned" appear when the work reaches them.

- `server/` is the NestJS 12 API (ESM, Vitest, oxlint). Read
  `server/AGENTS.md` before writing NestJS code.
  - `src/domain/` (planned) holds the rules of the game as pure functions:
    no NestJS, no Drizzle, no `pg`, and no clock or randomness except what
    is passed in.
  - `src/db/` (planned) holds the Drizzle schema and the queries.
  - Controllers and providers stay thin: read the request, call the domain
    and the queries, write the response.
- `web/` is React 19 with Vite. It shows the game and draws what the API
  returns. It never computes a score.
- `docs/` holds the design note, the spec, the test plan and the AI notes.

## Rules of the codebase

1. The server is the authority. The browser's opinion of a score is never
   stored.
2. Every query that touches a player's data filters on that player's id.
   The id comes from the player's key, never from the request body or URL.
3. Time and randomness are injected, so tests control them.
4. A number that defines the game lives in one place,
   `server/src/domain/config.ts`.
5. Check the shape of a request with a schema (`@Body({ schema })`). Check
   its meaning in the domain.
6. Read the installed package's types or documentation before calling a
   library. Do not write library calls from memory. Add no dependency
   without a reason in the commit message.

## How to work

1. Read the spec section for the change. If the change is not in the spec,
   change the spec first.
2. Write the test named in the test plan and watch it fail for the right
   reason.
3. Write the code that makes it pass.
4. Run `npm run check`. If the change touches HTTP or SQL, run
   `npm run check:full`.
5. For a new rule, run the `break-a-rule` procedure once: break the rule,
   see a test fail, restore the code.
6. Commit one small step, with a message that says what changed and why.

## Done means

- The checks pass, and you ran them after your last edit.
- Every rule you added has a test that fails without it.
- The spec and the test plan are still true.
- Nothing is reported as verified that was not run. Say what you did not
  check.

## Do not

- Do not push, publish or open pull requests. The owner does that.
- Do not weaken a check to make it pass: no skipped tests, no loosened
  assertions, no disabled lint rules, no `any`.
- Do not edit a migration that is already committed. Generate a new one.
- Do not commit with `--no-verify`.
- Do not read or write `.env` files. Local defaults are in
  `server/src/config.ts`.

## When you are wrong

Add a row to `docs/ai-notes.md`: what was wrong, what caught it and the
commit that fixed it. The owner has to explain this project to other
people, and that file is how they know where the agent was unreliable.
