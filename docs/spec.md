# Spec

This is the contract the code is built to. If the code and this file
disagree, one of them is wrong and is fixed in the same commit. The reasons
behind the choices are in [design-note.md](design-note.md). The tests that
prove each numbered criterion in section 11 are listed in
[test-plan.md](test-plan.md).

## 1. Scope

A person creates a player, plays 60-second arithmetic rounds in the
browser, each result is saved through the API, and the player sees their
own progress over time.

**Not in scope:** real sign-in (passwords, single sign-on), organisations
or teams, employer or admin views, any comparison between players,
streaks, leaderboards, reminders, other games, difficulty levels,
deployment and analytics.

## 2. Terms

| Term       | Meaning                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Problem    | Two whole numbers and an operation, for example 37 + 48, 73 − 28, 7 × 8 or 84 ÷ 7                                 |
| Round      | 60 seconds of problems, shown one at a time, for one player                                                       |
| Attempt    | One answer the player submitted: which problem, the number entered, and the time since the first problem appeared |
| Solved     | A problem answered correctly within the round                                                                     |
| Mistake    | A wrong answer. The same problem stays on screen                                                                  |
| Score      | The number of problems solved in the round                                                                        |
| Usual pace | The median score of a player's most recent five rounds, or of fewer when fewer exist                              |
| Input type | How the answers were entered: `keyboard`, or `touch` for the on-screen keypad                                     |
| Player key | A random secret given to the browser once, when the player is created. It identifies the player from then on      |

## 3. User flows

1. **Choose a player.** The first screen lists the players saved in this
   browser, a form to create a player (a display name), a field to add an
   existing player by key, and the sample players. The browser keeps the
   key and the display name of each player saved in it.
2. **Home.** Shows a Start button, this week's practice days against the
   goal, the progress view and the recent rounds.
3. **Play.** Start asks the server for a round. After a 3-second countdown
   the first problem appears. The player enters an answer and submits it
   with Enter, or with the OK key of the on-screen keypad. A right answer
   brings the next problem. A wrong answer is marked and the same problem
   stays. A bar shows the time left. At 60 seconds input stops.
4. **Result.** The browser sends the attempts. The server scores them and
   returns the result: the score, how it compares with the player's usual
   pace, the mistakes, the slowest problems with their answers, and
   seconds per problem for each operation. From here: play again, or go
   back to Home.
5. **Switch player.** Returns to the first screen. Each player sees only
   their own data.

If the page is hidden during a round (another tab, a locked phone), the
round is abandoned: input stops, nothing is sent, and the player returns
to Home. An abandoned round is never counted anywhere.

## 4. The game

Every number in this section is defined once, in
`server/src/domain/config.ts`.

### 4.1 Problems

- There are four operations: `add`, `subtract`, `multiply`, `divide`.
- An **addition** is `a + b`, with `a` and `b` each from 2 to 50.
- A **multiplication** is `a × b`, with `a` and `b` each from 2 to 12.
- A **subtraction** is an addition in reverse: for `x + y = s` the problem
  is `s − y`, and the answer is `x`.
- A **division** is a multiplication in reverse: for `x × y = p` the
  problem is `p ÷ y`, and the answer is `x`.
- So every answer is a whole number of at least 2.
- A round is issued with 120 problems, far more than anyone solves in a
  minute. They come in blocks of four. Each block holds one problem of
  each operation, in random order, so the mix is the same in every round.
- Two problems in a row never have the same operation, so no problem is
  identical to the one before it. When a block would start with the
  operation that ended the block before, that operation swaps places with
  a random later one.
- The problems come from an injected random source, so the same source
  gives the same problems.

### 4.2 Scoring

The server scores a round by replaying its attempts, in order, against
the problems it stored.

- The replay starts at the first problem, which appeared at 0 ms.
- Each attempt must be for the current problem. A **right answer** solves
  it, and the next problem appears at that attempt's time. A **wrong
  answer** is a mistake, and the current problem stays.
- A right answer that comes **less than 300 ms** after its problem
  appeared is recorded as too fast and is not counted as solved. The next
  problem still appears. A right answer at exactly 300 ms counts.
- The **score** is the number of problems solved.
- The time spent on a problem runs from when it appeared to its right
  answer, mistakes included. From these times the result reports, for
  each operation, the average seconds per solved problem, and the three
  solved problems that took longest.

An empty list of attempts is valid: the round is completed with a score
of 0. A problem that was answered too fast, or that is still unsolved when
the round ends, is in no time figure.

The shape of a result is checked first: at most 1,000 attempts, and in
each one the problem index, the answer and the time are whole numbers of
at least 0, with the answer at most 9,999. Anything else is
`invalid_request`.

Then the replay rejects attempts that an honest browser cannot produce.
They make the whole result invalid (`invalid_attempts`), and nothing is
stored:

- an attempt for a problem other than the current one, which includes any
  attempt after the last of the 120 problems has been solved;
- an attempt whose time is earlier than that of the attempt before it;
- an attempt whose time is above the round's 60,000 ms. A time of exactly
  60,000 ms is accepted.

### 4.3 Plausibility

Measured with the server's clock, from the moment the round was issued:

- A result that arrives before 60 seconds have passed is rejected: the
  round cannot have been played.
- A result that arrives more than 60 seconds after those 60 seconds ended
  is rejected: the round has expired. The allowance covers the countdown
  and a slow connection.
- Both limits are inclusive: a result that arrives exactly 60 seconds, or
  exactly 120 seconds, after the round was issued is accepted.
- A round accepts one result. A second one is rejected, also when two
  arrive at the same moment.

The countdown comes after the round is issued, so an honest result arrives
at least 63 seconds after issue. The server asks for 60. The times inside
the attempts are measured by the browser from the moment the first problem
appeared. The server uses them for scoring only, and its own clock for
the limits above.

### 4.4 What the server cannot know

The browser is given the problems, so a script can answer them at a
human-looking pace. The server checks that a result is possible, not that
a person produced it. Scores are private and nothing depends on them.

## 5. Days, weeks and the goal

- A **day** is the player's local calendar day. The browser sends its IANA
  time zone (for example `Australia/Sydney`) with each result. The server
  takes its own clock, works out the date in that zone, and stores it
  with the round.
- A **week** runs from Monday to Sunday in local dates.
- The days of a week are counted from each round's stored local day. The
  time zone sent with a progress request decides only which day is today
  and which week is the current one.
- The **goal** is to practise on 3 different days in a week. There is no
  streak, and nothing is lost when a week is missed.

## 6. Progress

Only completed rounds count.

- **Usual pace** of a round: the median score of that round and up to
  four completed rounds before it. With an even number of rounds the
  median is the mean of the two middle scores. The player's current usual
  pace is that of their latest round.
- **Starting pace:** the median score of the player's first five rounds.
  It exists once there are five.
- **Change:** current usual pace minus starting pace. It is reported once
  the player has ten rounds, so the two groups of five do not overlap.
- **Seconds per problem by operation:** over the most recent five rounds,
  the total time spent on solved problems of an operation divided by how
  many were solved.
- **This week:** for each of the seven local days of the current week,
  the number of rounds completed, and how many of those days have at
  least one.
- The progress view also lists the most recent 30 rounds, each with its
  score, mistakes, input type and the usual pace at that point.

A player is never compared with another player. The progress view says in
words what the score is: practice at arithmetic, not a measure of
intelligence or health.

## 7. Data model (PostgreSQL)

`players`

| Column       | Type                          | Notes                                              |
| ------------ | ----------------------------- | -------------------------------------------------- |
| id           | uuid, primary key             | generated                                          |
| display_name | text, not null                | 1 to 40 characters after trimming. Not unique      |
| key_hash     | text, not null, unique        | SHA-256 of the player key. The key is never stored |
| is_sample    | boolean, not null, default no | true only for players created by the sample script |
| created_at   | timestamptz, not null         |                                                    |

`rounds` holds one row per round issued. The result columns are null until
the round is completed.

| Column          | Type                                                  | Notes                                                                    |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| id              | uuid, primary key                                     | generated                                                                |
| player_id       | uuid, not null, references players, on delete cascade |                                                                          |
| problems        | jsonb, not null                                       | the 120 problems as issued: `[{ "a": 37, "b": 48, "operation": "add" }]` |
| duration_ms     | integer, not null                                     | the round length when it was issued                                      |
| issued_at       | timestamptz, not null                                 |                                                                          |
| completed_at    | timestamptz                                           | null means issued and not finished                                       |
| attempts        | jsonb                                                 | the raw attempts: `[{ "problemIndex": 0, "answer": 85, "atMs": 1830 }]`  |
| solved          | integer                                               | the score                                                                |
| mistakes        | integer                                               |                                                                          |
| too_fast        | integer                                               | right answers under 300 ms, not counted                                  |
| operation_stats | jsonb                                                 | per operation: problems solved and total milliseconds                    |
| input_type      | text                                                  | `keyboard` or `touch`                                                    |
| local_day       | date                                                  | the player's local date at completion                                    |
| time_zone       | text                                                  | the zone used to work out `local_day`                                    |
| scoring_version | integer                                               | 1 for the rules in this file                                             |

Index: `rounds (player_id, completed_at)`.

The problems are stored as issued, and the attempts as received, so a
round can be scored again if the rules change. `scoring_version` says
which rules produced the stored numbers.

## 8. API

JSON over HTTP under `/api`.

**Identity.** Creating a player returns a random player key, once. Every
other request sends `Authorization: Bearer <playerKey>`. The server finds
the player from the hash of the key and uses that player's id in every
query. No route takes a player id from the URL or the body. This is not
sign-in: the brief does not ask for it. A product would use real sign-in
(NestJS ships `@nestjs/authentication` for that).

| Method and path                    | Key | Request                                                                                                                        | Success                     | Errors                                                                                                                                               |
| ---------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                  | no  |                                                                                                                                | 200 `{ "ok": true }`        |                                                                                                                                                      |
| `POST /api/players`                | no  | `{ "displayName": "Ada" }`                                                                                                     | 201 `{ player, playerKey }` | 400 `invalid_request`                                                                                                                                |
| `GET /api/me`                      | yes |                                                                                                                                | 200 `{ player }`            | 401 `unauthorized`                                                                                                                                   |
| `POST /api/rounds`                 | yes |                                                                                                                                | 201 `{ round }`             | 401                                                                                                                                                  |
| `POST /api/rounds/:roundId/result` | yes | `{ "attempts": [{ "problemIndex": 0, "answer": 85, "atMs": 1830 }], "inputType": "keyboard", "timeZone": "Australia/Sydney" }` | 201 `{ result }`            | 400 `invalid_request`, 400 `invalid_attempts`, 401, 404 `round_not_found`, 409 `round_too_early`, 409 `round_expired`, 409 `round_already_completed` |
| `GET /api/progress?timeZone=...`   | yes |                                                                                                                                | 200 `Progress`              | 400 `invalid_request`, 401                                                                                                                           |

- An error raised by this application has the body
  `{ "code": "...", "message": "..." }`. A request whose shape is wrong
  (a missing field, a wrong type, a time zone that is not an IANA name) gets
  `invalid_request`, with an `issues` list that names each field.
- A round that belongs to another player is reported as 404
  `round_not_found`, the same as a round that does not exist. A round id
  that is not a UUID gets `invalid_request`.
- Errors raised by the framework itself (an unknown route, a body that is
  not JSON) keep NestJS's own shape.

```ts
type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

// "a operation b". The answer is not sent.
type Problem = { a: number; b: number; operation: Operation };

type Player = { id: string; displayName: string; isSample: boolean };

type Round = { id: string; durationMs: number; problems: Problem[] };

type Attempt = { problemIndex: number; answer: number; atMs: number };

type InputType = 'keyboard' | 'touch';

type OperationPace = {
  operation: Operation;
  solved: number;
  secondsPerProblem: number | null; // null when none was solved
};

type Result = {
  roundId: string;
  completedAt: string; // ISO timestamp
  localDay: string; // YYYY-MM-DD
  solved: number; // the score
  mistakes: number;
  tooFast: number;
  usualPace: number; // including this round
  previousUsualPace: number | null; // before this round; null for a first round
  operations: OperationPace[]; // always four, in the order of Operation
  slowest: (Problem & { answer: number; seconds: number })[]; // up to three
};

type Progress = {
  player: Player;
  summary: {
    roundsCompleted: number;
    usualPace: number | null; // null with no rounds
    startingPace: number | null; // null until 5 rounds
    change: number | null; // null until 10 rounds
    paceWindow: number; // 5
    roundsForChange: number; // 10
  };
  week: {
    today: string; // YYYY-MM-DD in the requested time zone
    goalDays: number; // 3
    daysPractised: number;
    days: { date: string; rounds: number }[]; // Monday to Sunday
  };
  operations: OperationPace[]; // over the most recent five rounds
  rounds: {
    // the most recent 30 completed rounds, oldest first
    roundId: string;
    completedAt: string;
    localDay: string;
    solved: number;
    mistakes: number;
    inputType: InputType;
    usualPace: number;
  }[];
};
```

Seconds are rounded to one decimal place. The numbers a screen needs to
explain itself (`durationMs`, `goalDays`, `paceWindow`, `roundsForChange`)
come from the API, so the browser repeats no rule.

## 9. Sample data

`npm run seed` creates two sample players with a simulated history, so the
progress view has something to show before anyone has played. `npm run
reset` empties the tables and seeds again.

- The history is produced by simulated answers that go through the real
  problem generator and the real scoring, with a seeded random source, so
  it is the same every time.
- Sample players have `is_sample` true, and the app labels them as sample
  data wherever they appear.
- Their keys are fixed and written in the web app, which is how the
  "open sample player" buttons work. They exist only in a database that
  has been seeded.

## 10. Structure

- `server/src/domain/` holds the rules as pure functions: problems,
  scoring, plausibility, days and weeks, progress. No NestJS, no database,
  and no clock or randomness except what is passed in. Most unit tests
  are here.
- `server/src/db/` holds the Drizzle schema. Migrations are generated from
  it as SQL files in `server/drizzle/` and committed.
- Each feature is a NestJS module with a thin controller, and a repository
  provider that holds its queries: `players/`, `rounds/`, `progress/`.
  Every repository method takes the player's id.
- A guard turns the player key into the current player before any
  protected route runs. It is global: every route needs a key unless it is
  marked public, so a new route cannot forget it. A parameter decorator hands that player to the
  controller.
- The clock and the random source are providers, so tests replace them.
- `web/` is the React app. It shows problems, records attempts and draws
  what the API returns. It computes no score.

## 11. Acceptance criteria

**Problems**

1. A round has 120 problems, and each block of four holds one problem of
   each operation.
2. Additions use two numbers from 2 to 50, and multiplications two
   numbers from 2 to 12. Subtractions and divisions are those in reverse.
   Every answer is a whole number of at least 2.
3. Two problems in a row never have the same operation, so no problem
   repeats the one before it.
4. The same random source gives the same problems.

**Scoring**

5. The score is the number of problems solved, found by replaying the
   attempts in order.
6. A wrong answer is a mistake and the same problem stays.
7. A right answer under 300 ms after its problem appeared is not counted,
   and the next problem still follows. It is reported as too fast. At
   exactly 300 ms it counts.
8. A result with an attempt for the wrong problem, a time that goes
   backwards, or a time above the round's 60,000 ms is rejected, and
   nothing is stored. A time of exactly 60,000 ms is accepted, and an
   empty list of attempts scores 0.
9. The result reports seconds per solved problem for each operation and
   the three slowest solved problems.

**Authority and plausibility**

10. A result that arrives before the round's 60 seconds have passed on the
    server's clock is rejected, and so is one that arrives more than 60
    seconds after they ended.
11. A round accepts one result. A second is rejected, also when two arrive
    together.

**Players**

12. Creating a player returns the key once. The database stores only its
    hash.
13. Every route except health and player creation answers 401 without a
    valid key.
14. Player B cannot submit a result for player A's round, and gets the
    same answer as for a round that does not exist. B's progress contains
    none of A's rounds.

**Days and the goal**

15. A round completed at 13:30 UTC on 10 November counts as 11 November
    for a player in `Australia/Sydney`.
16. A week runs from Monday to Sunday in the player's local dates, and the
    goal is 3 practice days.

**Progress**

17. Usual pace is the median of the most recent five scores, or of fewer
    when fewer exist. Starting pace is the median of the first five.
    Change is the current usual pace minus the starting pace, and is
    reported from ten rounds on. Progress lists at most the 30 most recent
    rounds, oldest first.
18. Seconds per problem for each operation cover the most recent five
    rounds.
19. A round that was issued and never completed appears nowhere.
20. Each round stores its input type, and progress returns it.

**The web app**

21. A round can be played with a keyboard alone, and with touch alone.
22. If the page is hidden during a round, the round is abandoned and
    nothing is sent. The browser ignores input after the round's 60
    seconds.
23. Sample players are labelled as sample data, and the progress view
    states that the score shows practice at arithmetic, not intelligence
    or health.

**Set-up**

24. Set-up is `npm run setup`, then `npm run dev`. `npm run reset`
    restores the sample data.

**Request shapes**

25. A request with the wrong shape gets 400 `invalid_request` and changes
    nothing: a display name that is empty or longer than 40 characters, a time zone that is not an IANA name (such as `+10:00`), an unknown input type, a round id that is not a
    UUID, or an attempt field that is not a whole number of at least 0.
