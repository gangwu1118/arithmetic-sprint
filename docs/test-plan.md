# Test plan

This file says how each numbered criterion in [spec.md](spec.md) section 11
is proved. It is written before the code. If a test and this plan
disagree, one of them is fixed in the same commit.

## 1. Principles

1. **Test a rule where it lives.** The rules of the game are pure
   functions, so they get unit tests: fast, exact and with no set-up.
2. **Use the whole stack only for what the whole stack can prove:** who
   may see what, one result per round, and the conditions written in SQL.
   Those get HTTP tests against a real PostgreSQL.
3. **One browser test,** for the one path that matters most: a person
   plays a round and sees it in their progress.
4. **Test first.** A test is written before its code and is seen to fail
   for the right reason.
5. **A test that has never failed proves nothing.** Each rule is broken
   on purpose once after it is built (section 6).
6. **Expected numbers are worked out by hand.** Inputs are small enough
   to check by eye, and no expected value is produced by calling the
   code under test.

## 2. Levels

| Level   | Tool                                             | Where                                                               | Needs                        | When it runs                              |
| ------- | ------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| Unit    | Vitest                                           | Next to the code: `server/src/**/*.spec.ts`, `web/src/**/*.test.ts` | Nothing                      | `npm run check`, before every commit      |
| HTTP    | Vitest and supertest against the real NestJS app | `server/test/*.e2e-spec.ts`                                         | PostgreSQL (`npm run db:up`) | `npm run check:full`                      |
| Browser | Playwright, one test                             | `e2e/`                                                              | The app running, seeded data | `npm run test:browser`, before handing in |

NestJS calls its HTTP tests "e2e", and the file names keep that. In this
plan "browser test" means the real end-to-end test.

## 3. What the tests control

- **Time.** The application reads the time from a clock provider. HTTP
  tests replace it with a clock they move by hand. A 60-second round then
  takes milliseconds, and "too early" and "expired" are tested exactly at
  their limits.
- **Randomness.** The random source is a provider too. Tests replace it
  with a seeded one, so the problems of a round are known in advance.
- **The database.** HTTP tests use their own database, `sprint_test`. It
  is migrated before the run and emptied before each test file.
- **The time zone.** Tests name the zone. Nothing depends on the zone of
  the machine that runs them.

## 4. Test data

- Scoring tests use a hand-made list of four problems, one of each
  operation, so every expected number can be checked by eye.
- HTTP tests build a result with a small helper that answers the first
  _n_ problems of a round correctly at a fixed pace. The expected score
  is then _n_, stated in the test.
- Progress tests pass lists of scores directly, for example
  `[10, 12, 30, 11, 13]`, and state the expected median.

## 5. Each criterion and its tests

| #   | Criterion, in short                                     | Level            | File                                                                               | What the test does                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 120 problems, each block of four has every operation    | Unit             | `domain/problems.spec.ts`                                                          | Generates rounds from several seeds. Checks the length and every block                                                                                                                                                                        |
| 2   | Number ranges, the reverse rule, answers whole and ≥ 2  | Unit             | `domain/problems.spec.ts`                                                          | Checks the operands of every generated problem by operation, and its answer. Checks the answer of one hand-made problem per operation                                                                                                         |
| 3   | No problem repeats the one before                       | Unit             | `domain/problems.spec.ts`                                                          | Checks generated rounds for equal neighbours. Then feeds a random source that would repeat, and checks the generator draws again                                                                                                              |
| 4   | Same random source, same problems                       | Unit             | `domain/problems.spec.ts`                                                          | Two runs with one seed are equal. A different seed gives different problems                                                                                                                                                                   |
| 5   | The score is the problems solved, by replay             | Unit             | `domain/scoring.spec.ts`                                                           | A hand-made round with three right answers scores 3                                                                                                                                                                                           |
| 5   | The same, through the API                               | HTTP             | `test/rounds.e2e-spec.ts`                                                          | Plays a round over HTTP. The response and the stored row show the score counted by hand                                                                                                                                                       |
| 6   | A wrong answer is a mistake and the problem stays       | Unit             | `domain/scoring.spec.ts`                                                           | A wrong then a right answer to one problem gives one mistake and one solved                                                                                                                                                                   |
| 7   | Under 300 ms is not counted, 300 ms is                  | Unit             | `domain/scoring.spec.ts`                                                           | Right answers 299 ms and 300 ms after the problem appeared. The first is too fast: it is counted as too fast, not as solved, it is in no time figure, and the problem after it still appears                                                  |
| 8   | Impossible attempts are rejected                        | Unit             | `domain/scoring.spec.ts`                                                           | An attempt for the wrong problem, an attempt after the last problem, a time that goes backwards, a time of 60,001 ms: each makes the result invalid. A time of exactly 60,000 ms is accepted, and an empty list scores 0                      |
| 8   | And nothing is stored                                   | HTTP             | `test/rounds.e2e-spec.ts`                                                          | Such a result gets 400 `invalid_attempts`, and the round can still be completed afterwards                                                                                                                                                    |
| 9   | Seconds per operation and the three slowest             | Unit             | `domain/scoring.spec.ts`                                                           | Hand-made times give the expected seconds, and the slowest list in order                                                                                                                                                                      |
| 10  | Too early and expired                                   | Unit             | `domain/plausibility.spec.ts`                                                      | The limits: 59,999 ms is too early, 60,000 ms and 120,000 ms are accepted, 120,001 ms is expired                                                                                                                                              |
| 10  | The same, by the server's clock                         | HTTP             | `test/rounds.e2e-spec.ts`                                                          | Moves the test clock: 409 `round_too_early`, then accepted. A second round left too long gets 409 `round_expired`                                                                                                                             |
| 11  | A round accepts one result                              | HTTP             | `test/rounds.e2e-spec.ts`                                                          | A second submission gets 409 `round_already_completed`, and the stored result is the first                                                                                                                                                    |
| 11  | Also when two arrive together                           | HTTP, repository | `test/rounds.repository.e2e-spec.ts`                                               | Calls the completing query twice for one round. Exactly one call reports success. The query is tested directly because two requests in one test never truly overlap                                                                           |
| 12  | The key is returned once, only its hash is stored       | Unit, HTTP       | `players/player-keys.spec.ts`, `test/players.e2e-spec.ts`                          | The hash is stable and is not the key. After creating a player, the row holds the hash, and the key appears in no column                                                                                                                      |
| 13  | 401 without a valid key                                 | HTTP             | `test/players.e2e-spec.ts`                                                         | Every protected route, with no header, a malformed header and an unknown key                                                                                                                                                                  |
| 14  | Each player sees only their own data                    | HTTP             | `test/rounds.e2e-spec.ts`, `test/progress.e2e-spec.ts`                             | B submits for A's round and gets 404 `round_not_found`, the same body as for a random id. A's round is still open. After A plays, B's progress is empty                                                                                       |
| 15  | 13:30 UTC on 10 November is 11 November in Sydney       | Unit             | `domain/days.spec.ts`                                                              | The local day of that instant in `Australia/Sydney`, in a zone west of UTC, and of an instant just after a daylight-saving change                                                                                                             |
| 16  | The week is Monday to Sunday, the goal is 3 days        | Unit             | `domain/days.spec.ts`, `domain/progress.spec.ts`                                   | The week of a Monday, a Wednesday and a Sunday. Days practised against the goal                                                                                                                                                               |
| 17  | Usual pace, starting pace and change                    | Unit             | `domain/progress.spec.ts`                                                          | Medians of 1, 2, 5 and 6 scores. One outlier does not move the median. Starting pace appears at 5 rounds, change at 10 and equals current minus starting pace. The list holds at most 30 rounds, oldest first                                 |
| 18  | Seconds per operation cover the last five rounds        | Unit             | `domain/progress.spec.ts`                                                          | Six rounds of times. The oldest is left out                                                                                                                                                                                                   |
| 19  | An abandoned round appears nowhere                      | HTTP             | `test/progress.e2e-spec.ts`                                                        | Issues a round and never completes it. Progress shows no rounds and no practice day                                                                                                                                                           |
| 20  | The input type is stored and returned                   | HTTP             | `test/rounds.e2e-spec.ts`, `test/progress.e2e-spec.ts`                             | Submits with `touch`. The row and progress carry it. An unknown value gets 400 `invalid_request`                                                                                                                                              |
| 21  | Keyboard alone, touch alone                             | Browser, by hand | `e2e/play-a-round.spec.ts`                                                         | The browser test answers some problems with the keyboard and some with the on-screen keypad. A whole round with each alone is checked by hand                                                                                                 |
| 22  | A hidden page abandons the round                        | Unit (web)       | `web/src/play/round-machine.test.ts`                                               | The round's state machine, given a "hidden" event mid-round, ends as abandoned with nothing to send, and it ignores input after 60 seconds. Also checked by hand in the browser                                                               |
| 23  | Sample players are labelled, and the score is explained | Browser          | `e2e/play-a-round.spec.ts`                                                         | Opens a sample player and finds the "Sample data" label and the sentence that says what the score shows                                                                                                                                       |
| 24  | Set-up commands                                         | By hand          |                                                                                    | Run on a fresh clone before handing in, and timed                                                                                                                                                                                             |
| 25  | A request with the wrong shape gets `invalid_request`   | HTTP             | `test/players.e2e-spec.ts`, `test/rounds.e2e-spec.ts`, `test/progress.e2e-spec.ts` | An empty and a 41-character display name, an unknown time zone, an unknown input type, a round id that is not a UUID, a negative and a fractional attempt field: each gets 400 `invalid_request` with an `issues` list, and nothing is stored |

The web app has three more groups of unit tests that guard what the
player sees: the round's state machine (it records attempts with their
times, and ignores input after 60 seconds), the chart geometry, and the
number and date formatting.

Criterion 22 shapes the code: the logic of a round in the browser is a
pure state machine with no React in it, so it can be tested without a
browser.

## 6. Rules to break on purpose

After a rule is built, it is broken once with the smallest possible edit,
to see the named test fail. The result goes in the table "Rules broken on
purpose" in [ai-notes.md](ai-notes.md).

| The rule                                       | The edit                                                  | The test that must fail                                       |
| ---------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------- |
| Each block of four has every operation         | Pick each operation at random                             | `problems.spec.ts`, criterion 1                               |
| A subtraction is an addition in reverse        | Use two independent numbers                               | `problems.spec.ts`, criterion 2                               |
| No problem repeats the one before              | Remove the redraw                                         | `problems.spec.ts`, criterion 3                               |
| A wrong answer keeps the problem               | Move on after a wrong answer                              | `scoring.spec.ts`, criterion 6                                |
| A right answer at exactly 300 ms counts        | Change `<` to `<=`                                        | `scoring.spec.ts`, criterion 7                                |
| An attempt must be for the current problem     | Remove the check                                          | `scoring.spec.ts`, criterion 8                                |
| A time above the round's 60,000 ms is rejected | Remove the check                                          | `scoring.spec.ts`, criterion 8                                |
| A result cannot arrive before 60 seconds       | Change `<` to `<=`, then remove the check                 | `plausibility.spec.ts` and `rounds.e2e-spec.ts`, criterion 10 |
| A round accepts one result                     | Remove `completed_at is null` from the update             | `rounds.repository.e2e-spec.ts`, criterion 11                 |
| Only the hash of the key is stored             | Store the key                                             | `players.e2e-spec.ts`, criterion 12                           |
| Protected routes need a key                    | Remove the guard from each controller in turn             | `players.e2e-spec.ts`, criterion 13                           |
| A round is looked up for its own player        | Remove the player id from the lookup                      | `rounds.e2e-spec.ts`, criterion 14                            |
| Progress is read for its own player            | Remove the player id from the progress query              | `progress.e2e-spec.ts`, criterion 14                          |
| The day is the player's local day              | Use the UTC date                                          | `days.spec.ts`, criterion 15                                  |
| The week starts on Monday                      | Start it on Sunday                                        | `days.spec.ts`, criterion 16                                  |
| Usual pace is a median                         | Use the mean                                              | `progress.spec.ts`, criterion 17                              |
| Abandoned rounds are left out                  | Remove `completed_at is not null` from the progress query | `progress.e2e-spec.ts`, criterion 19                          |

## 7. Not tested, and why

- **How it looks.** Layout and styling are judged by eye in the browser.
- **Real phones.** The on-screen keypad is exercised with clicks in a
  desktop browser, not on a device.
- **Other browsers.** The browser test runs in Chromium only.
- **Load.** Performance under many players is outside this exercise.
- **The Claude Code Stop hook in a live session** opened in this
  repository. See [ai-notes.md](ai-notes.md).
