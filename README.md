# Arithmetic sprint

A small brain-training game: **60 seconds of mental arithmetic.** A player
solves as many simple problems as they can (addition, subtraction,
multiplication and division), the server scores the round and saves it, and
the player sees their own progress over time.

- **Why this game:** [docs/design-note.md](docs/design-note.md), two pages
  with sources.
- **What the code must do:** [docs/spec.md](docs/spec.md), with 25 numbered
  acceptance criteria.
- **How each criterion is tested:** [docs/test-plan.md](docs/test-plan.md).
- **Where the AI agent was wrong, and what caught it:**
  [docs/ai-notes.md](docs/ai-notes.md).

## Run it locally

You need **Node.js 22.12 or newer** (24 is in `.nvmrc`; tested on
24.18), **npm**, and **Docker Desktop running**. Ports 4320 (API), 5193 (web) and 54331
(PostgreSQL) must be free.

```bash
npm run setup
npm run dev
```

Then open **http://localhost:5193**. Create a player, or open one of the two
sample players: Alex has about four weeks of simulated history, Sam about
two.

- `npm run setup` installs the packages, starts PostgreSQL 17 in Docker,
  applies the migrations and adds the sample players. It is safe to run
  again. On a fresh clone it took **8 seconds** on this machine, which already
  had the npm cache and the PostgreSQL image; a first run also downloads the
  image (about 400 MB on disk) and the packages.
- `npm run reset` puts the database back to the two sample players. It
  deletes every other player.
- `npm run db:down` stops PostgreSQL. The data stays in a Docker volume.

No `.env` file is needed. The defaults are in
[server/src/config.ts](server/src/config.ts); `DATABASE_URL`, `API_PORT` and
`API_HOST` override them. The HTTP tests always use their own `sprint_test`
database on the default local server.

### Tests

```bash
npm run check          # format, types, lint, unit tests. No database. ~10 s
npm run check:full     # the same, plus the HTTP tests against PostgreSQL. ~11 s
npm run test:browser   # 18 cases in Chrome, on their own servers and database. ~2.5 min
npm run test:browser:report  # every step of every case, with a screenshot
```

`check` also runs before every commit (a git hook). The browser tests drive
the Chrome installed on the machine. They start their own API and web app,
on ports 4321 and 5194, against their own database (`sprint_e2e`, rebuilt
and seeded on every run), so they never touch the development data and can
run while `npm run dev` is up. They need PostgreSQL from `npm run setup`.

At the last commit: 120 unit tests (95 server, 25 web), 62 HTTP tests, and 18
browser cases. All pass.

## How it fits together

```
docs/            design note, spec, test plan, AI notes
server/          NestJS 12 API (ESM, Vitest, oxlint)
  src/domain/    the rules of the game as pure functions, with unit tests
  src/db/        Drizzle schema, migrations runner, sample data, scripts
  src/common/    clock and random providers, error shape, @Public()
  src/players/   POST /api/players, GET /api/me, the player-key guard
  src/rounds/    POST /api/rounds, POST /api/rounds/:roundId/result
  src/progress/  GET /api/progress
  drizzle/       SQL migrations generated from the schema
  test/          HTTP tests against a real PostgreSQL
web/             React 19 + Vite
  src/play/      the round as a pure state machine (tested), the play screen
  src/progress/  chart arithmetic (tested), the chart, the week
  src/screens/   players, home (with the progress view), result
e2e/             the browser tests (Playwright), a file per screen
AGENTS.md        rules for coding agents and people; CLAUDE.md imports it
.claude/         Claude Code settings, a stop hook, two skills, a reviewer
```

**A round, end to end.** Start asks the server for a round; the server
stores 120 problems (blocks of four, one of each operation) and sends them
without answers. The browser shows them one at a time and records every
attempt: the problem, the number entered and the milliseconds since the first
problem appeared. When the 60 seconds are up it sends the attempts. The
server checks the arrival time with its own clock, replays the attempts
against the problems it stored, and saves the result with one conditional
`UPDATE`.

**Data model.** Two tables. `players`: a display name and the SHA-256 hash
of the player key. `rounds`: one row per round issued; the problems as
issued, the attempts as received, the counts, the player's local day and
time zone, the input type and a scoring version. The result columns are null
until the round is completed, so an abandoned round is simply a row that
never completes. Details in [docs/spec.md](docs/spec.md), section 7.

## Key decisions and trade-offs

- **The server is the authority.** The browser never sends a score, only raw
  attempts, which the server replays. That rules out a made-up score, and the
  stored problems and attempts let a round be scored again if the rules
  change (`scoring_version`). The cost is that the browser must be given the
  problems, so a script can still answer them at a human pace; the design
  note says why low stakes are the answer to that.
- **The rules are pure functions** in `server/src/domain`: problems,
  scoring, the arrival check, local days and progress. They take the clock
  and the random source as arguments, so they are tested without a framework
  or a database. The linter refuses NestJS, Drizzle, `pg` and Express imports
  in that folder, so it stays that way.
- **NestJS as the framework says to use it.** The project was generated with
  the official CLI and follows its current template: ESM, Vitest, oxlint,
  `@nestjs/drizzle` for the database and `StandardSchemaValidationPipe` with
  Zod for request shapes. Feature modules keep thin controllers; queries live
  in repository providers that always take the player's id.
- **A player key, not sign-in.** The brief does not ask for login. Creating a
  player returns a random key once; the database keeps only its hash; the
  browser sends it as a Bearer token. A **global guard** checks it before
  every route that is not marked `@Public()`, so a new route cannot forget
  it. Another player's round is answered with the same 404 as a round that
  does not exist.
- **One result per round, enforced by the database.** The `UPDATE` that
  stores a result only matches a round with no result yet. Tests call that query
  directly, twice at once and twice in a row, because two HTTP requests in a
  test never truly overlap. Breaking the condition on purpose showed that only
  these tests catch it: the HTTP test does not, because the service checks for
  a result first.
- **"Today" is the player's day.** The browser sends its IANA time zone; the
  server works out the local date from its own clock and stores it with the
  round. Weeks run Monday to Sunday from those stored days.
- **Progress is a median.** Usual pace is the median of the last five
  rounds, so one distracted round barely moves it; the change is shown from
  ten rounds on, against the first five. Players are only ever compared with
  themselves.
- **The clock and the random source are providers.** HTTP tests replace them,
  so a 60-second round takes milliseconds and the 60- and 120-second limits
  are tested exactly.
- **The browser's round is a pure reducer** (`web/src/play/round-machine.ts`)
  with no React in it, so the rules a player sees (wrong answers stay, a
  hidden page abandons the round, input after 60 seconds is ignored) have
  unit tests. No router and no state library: four screens switched in
  `App.tsx`. The chart is hand-written SVG, with its arithmetic tested.
- **Drizzle migrations are generated and committed as SQL**
  ([server/drizzle/0000_init.sql](server/drizzle/0000_init.sql)), and the
  HTTP tests rebuild their own database from them on every run, so the
  migrations are exercised too.

## Testing

Tests were written before the code they test: each module was run first
against an empty or naive version, to see its tests fail for the right
reason (the one exception, the sample data, is recorded in the AI notes).
Then every rule was **broken on purpose** at least once (37 breaks covering
33 rules, plus 8 checks of the gate and hooks, all listed in
[docs/ai-notes.md](docs/ai-notes.md)) to check that a test with the rule's
name fails. After each layer, a separate read-only agent reviewed
the code against the spec; its findings are in the AI notes too.

| Level   | What it proves                                                                                                 | Where                                             |
| ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Unit    | The rules: problems, scoring, timing, days, progress; the browser's round, chart and formats                   | `server/src/**/*.spec.ts`, `web/src/**/*.test.ts` |
| HTTP    | Who may see what, one result per round, the conditions in the SQL, request shapes                              | `server/test/*.e2e-spec.ts`                       |
| Browser | Every screen, step by step: players, progress, rounds by keyboard and by touch, a hidden page, failed requests | `e2e/*.spec.ts` (18 cases)                        |

## Assumptions

- A player plays on one device at a time. The key can be added in another
  browser, but nothing stops two rounds at once.
- Problems stay simple (two numbers, answers up to 144) and the mix is the
  same in every round, so scores from different days compare. Difficulty does
  not adapt; the score itself moves as a player gets faster.
- The time limits are judgement calls written in the spec: an answer under
  300 ms after its problem appeared is not counted, and a result is accepted
  from 60 to 120 seconds after the round was issued.
- Scores are private. Nothing is ranked, and no reward depends on them.

## Known limitations

- **No real sign-in.** The key sits in `localStorage`, where any script on
  the page could read it, and it cannot be rotated or revoked. There is no
  way to delete a player's data.
- **A script can still score well**, at a human-looking pace. The server
  checks that a result is possible, not that a person produced it.
- **Typing speed is part of the score**, and phones are slower than
  keyboards. Each round records its input type and the chart marks keypad
  rounds, but there is no adjustment.
- **Practice raises scores.** The app says so; it does not claim the score
  measures anything beyond arithmetic fluency.
- **Accessibility is basic:** keyboard and on-screen keypad, labelled
  controls, new problems announced to screen readers. There has been no
  audit, focus does not move when the screen changes, and a timed task is
  hard for some people by nature. Input methods that do not send key events
  (some dictation and IME tools) cannot type answers; the keypad works.
- **Abandoned rounds stay in the database**, and nothing limits how often a
  player starts one. Progress reads all of a player's completed rounds, which
  is fine for hundreds.
- **The sample players have fixed, public keys** (`sample-player-alex`,
  `sample-player-sam`), so anyone can open them in a seeded database. They
  are labelled as sample data everywhere.
- **Development set-up only:** no production build, deployment or CI.
- The API types are written twice, in `server` and in `web/src/api.ts`; the
  spec is the contract between them.
- `@nestjs/drizzle` is new (version 0.0.2). `npm audit` reports four moderate
  advisories, all in `drizzle-kit`'s development-only esbuild; the production
  dependencies report none.

## What I would do next

1. Generate the API types from the Zod schemas (or OpenAPI), so the browser
   and the server cannot drift.
2. Real sign-in with an HttpOnly session cookie (`@nestjs/authentication`),
   and a "delete my data" endpoint.
3. Measure test-retest reliability on real players before trusting the
   change figure, and tune the problem ranges with that data.
4. Rate limiting (`@nestjs/throttler`) and a clean-up of abandoned rounds.
5. A production build and a CI pipeline that runs `check:full` and the
   browser tests.
6. An accessibility review with screen-reader users.

## Time spent

The work ran from the evening of 10 November 2026 into the 11th, in one
Claude Code session, one step at a time. Times are from the commit history; the first row
starts when the session did:

| Step                                            | Time         | Wall clock            |
| ----------------------------------------------- | ------------ | --------------------- |
| Research and design, design note                | about 1 h    | 21:05 – 23:09         |
| Repository, skeleton, AI tooling                | 13 min       | 23:09 – 23:22         |
| Spec and test plan, reviewed                    | 9 min        | 23:22 – 23:31         |
| Rules of the game, test first                   | 17 min       | 23:31 – 23:48         |
| Database, API and HTTP tests                    | 21 min       | 23:48 – 00:09         |
| Web app and browser test                        | 22 min       | 00:09 – 00:31         |
| README and a check from a fresh clone           | about 15 min | 00:31 – 00:45         |
| Fixes found in review, and the web app's styles | about 40 min | 11 Nov, 01:10 – 12:15 |
| Browser tests for every case                    | about 30 min | 11 Nov, 12:28 – 12:57 |

The research row includes an hour's pause. Its first proposal was an n-back
task; I set it aside and asked for a survey of the games brain-training
products actually ship, and most of the research on scoring, feedback and
progress carried over to the game I chose.

The last row came after the README: two fixes found while checking the
repository (rows 18 and 19 of the AI notes) and a restyle of the web app, in
short sessions with long breaks between them.

## How AI tools were used

Claude Code (models Claude Fable 5.2, then Claude Opus 5.5) did the research,
wrote the design note, the spec and test plan, the code and the tests, and
ran every check. Each agent commit carries a `Co-Authored-By: Claude` line.

**What I decided.** I had it work one step at a
time and confirmed each step before the next: research, repository and
tooling, spec and test plan, game rules, API and database, web app, README.
I turned down its first proposal (an n-back task) and asked for a survey of
the games real products ship before choosing again; I chose the arithmetic
sprint from three candidates. I chose NestJS, which I had not used before,
because it is your stack, and PostgreSQL with Drizzle, which is also new to
me. I asked for a fresh repository with
nothing reused from an earlier attempt, and for a harness and a test design
for the agent.

**How the agent was kept in check.**

- **Contract first.** The design note, spec and test plan were written and
  confirmed before any game code; the code was built to them.
- **One gate.** `npm run check` runs before every commit through a git hook,
  for the agent and for people alike.
- **Rules and tools in the repository:** [AGENTS.md](AGENTS.md) (the rules
  and what "done" means), a Claude Code stop hook that sends the agent back
  while the checks fail, a `/check` skill, a `/break-a-rule` skill, and a
  read-only `spec-reviewer` subagent. The AI notes say which of these have
  not yet run in a live session.
- **Library APIs checked, not remembered.** Its NestJS knowledge was out of
  date (it expected Jest, ESLint and CommonJS), so it generated the project
  with the official CLI and read the current documentation before each
  NestJS feature.
- **Tests that can fail.** Test first, then every rule broken on purpose.

**Where it was wrong.** [docs/ai-notes.md](docs/ai-notes.md) has 20
entries, each with what caught it. Three examples:

- Its first spec rule, "no problem repeats the one before", could only be
  tested by scripting the random source to match the code's internals.
  Writing the test first exposed it; the rule became "two problems in a row
  never share an operation", which is stronger and easy to test.
- Reviews found tests that passed for the wrong reason: "too fast" was only
  tested on the first problem, where the time since the start equals the time
  since the problem appeared; a test of the score had no mistakes in it.
- The API read `PORT`, which the tool that starts the dev servers sets for
  the web server, so both started on one port number. Opening the app in a
  browser caught it; the API now reads `API_PORT`.
