import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { rounds } from '../src/db/schema.js';
import { answerOf, type Problem } from '../src/domain/problems.js';
import type { Attempt } from '../src/domain/scoring.js';
import { createPlayer, createTestApp, type TestApp } from './test-app.js';
import {
  emptyTables,
  openTestDatabase,
  type TestDatabase,
} from './test-database.js';

type IssuedRound = { id: string; durationMs: number; problems: Problem[] };

const NO_SUCH_ROUND = '00000000-0000-4000-8000-000000000000';

// An honest browser: a 3-second countdown, then the 60-second round.
const COUNTDOWN_AND_ROUND_MS = 63_000;

/** Right answers to the first `count` problems, one every `everyMs`. */
function rightAnswers(
  problems: Problem[],
  count: number,
  everyMs = 2_000,
): Attempt[] {
  return problems.slice(0, count).map((problem, i) => ({
    problemIndex: i,
    answer: answerOf(problem),
    atMs: (i + 1) * everyMs,
  }));
}

describe('rounds', () => {
  let testApp: TestApp;
  let db: TestDatabase;
  let ada: { key: string; id: string };
  let ben: { key: string; id: string };

  beforeAll(async () => {
    testApp = await createTestApp();
    db = openTestDatabase();
  });

  beforeEach(async () => {
    await emptyTables(db);
    testApp.clock.set('2026-11-10T13:28:00.000Z');
    ada = await createPlayer(testApp, 'Ada');
    ben = await createPlayer(testApp, 'Ben');
  });

  afterAll(async () => {
    await testApp.app.close();
    await db.$client.end();
  });

  async function issueRound(key: string): Promise<IssuedRound> {
    const response = await testApp
      .http()
      .post('/api/rounds')
      .set('Authorization', `Bearer ${key}`)
      .expect(201);
    return (response.body as { round: IssuedRound }).round;
  }

  function submit(key: string, roundId: string, body: object) {
    return testApp
      .http()
      .post(`/api/rounds/${roundId}/result`)
      .set('Authorization', `Bearer ${key}`)
      .send(body);
  }

  async function storedRound(roundId: string) {
    const [row] = await db.select().from(rounds).where(eq(rounds.id, roundId));
    return row;
  }

  function resultBody(attempts: Attempt[], extra: object = {}) {
    return { attempts, inputType: 'keyboard', timeZone: 'UTC', ...extra };
  }

  describe('issuing a round', () => {
    it('sends 120 problems and no answers', async () => {
      const round = await issueRound(ada.key);

      expect(round.durationMs).toBe(60_000);
      expect(round.problems).toHaveLength(120);
      expect(Object.keys(round.problems[0]).sort()).toEqual([
        'a',
        'b',
        'operation',
      ]);
    });
  });

  describe('criterion 5: the server scores the round by replaying the attempts', () => {
    it('scores and stores the result: three right answers and one mistake', async () => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      const attempts = [
        ...rightAnswers(round.problems, 3),
        {
          problemIndex: 3,
          answer: answerOf(round.problems[3]) + 1,
          atMs: 7_000,
        },
      ];

      const response = await submit(
        ada.key,
        round.id,
        resultBody(attempts, { timeZone: 'Australia/Sydney' }),
      ).expect(201);
      const { result } = response.body as {
        result: Record<string, unknown> & {
          operations: { solved: number }[];
          slowest: { seconds: number }[];
        };
      };

      expect(result).toMatchObject({
        roundId: round.id,
        solved: 3,
        mistakes: 1,
        tooFast: 0,
        usualPace: 3,
        previousUsualPace: null,
        completedAt: '2026-11-10T13:29:03.000Z',
        // 13:29 UTC is 00:29 the next day in Sydney (criterion 15).
        localDay: '2026-11-11',
      });
      expect(result.operations.map((o) => o.solved)).toHaveLength(4);
      expect(result.operations.reduce((n, o) => n + o.solved, 0)).toBe(3);
      expect(result.slowest.map((s) => s.seconds)).toEqual([2, 2, 2]);

      expect(await storedRound(round.id)).toMatchObject({
        solved: 3,
        mistakes: 1,
        tooFast: 0,
        attempts,
        inputType: 'keyboard',
        localDay: '2026-11-11',
        timeZone: 'Australia/Sydney',
        scoringVersion: 1,
      });
    });

    it('reports the usual pace before and after the round', async () => {
      const first = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      await submit(
        ada.key,
        first.id,
        resultBody(rightAnswers(first.problems, 3)),
      ).expect(201);

      const second = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      const response = await submit(
        ada.key,
        second.id,
        resultBody(rightAnswers(second.problems, 5)),
      ).expect(201);

      // The median of 3 and 5 is 4.
      expect(response.body).toMatchObject({
        result: { solved: 5, previousUsualPace: 3, usualPace: 4 },
      });
    });
  });

  describe('criterion 8: impossible attempts are rejected and nothing is stored', () => {
    it('rejects an attempt for the wrong problem, and the round stays open', async () => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      const wrongProblem = [
        { problemIndex: 1, answer: answerOf(round.problems[1]), atMs: 2_000 },
      ];

      const response = await submit(
        ada.key,
        round.id,
        resultBody(wrongProblem),
      ).expect(400);

      expect(response.body).toMatchObject({ code: 'invalid_attempts' });
      expect((await storedRound(round.id)).completedAt).toBeNull();
      await submit(
        ada.key,
        round.id,
        resultBody(rightAnswers(round.problems, 2)),
      ).expect(201);
    });
  });

  describe('criterion 8: every kind of impossible attempt, over HTTP', () => {
    it.each([
      [
        'a time earlier than the attempt before it',
        (p: Problem[]) => [
          { problemIndex: 0, answer: answerOf(p[0]) + 1, atMs: 3_000 },
          { problemIndex: 0, answer: answerOf(p[0]), atMs: 2_000 },
        ],
        'time_goes_back',
      ],
      [
        "a time past the round's 60,000 ms",
        (p: Problem[]) => [
          { problemIndex: 0, answer: answerOf(p[0]), atMs: 60_001 },
        ],
        'time_outside_round',
      ],
    ])('rejects %s', async (_label, attemptsFor, reason) => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);

      const response = await submit(
        ada.key,
        round.id,
        resultBody(attemptsFor(round.problems)),
      ).expect(400);

      expect(response.body).toMatchObject({ code: 'invalid_attempts', reason });
      expect((await storedRound(round.id)).completedAt).toBeNull();
    });

    it('accepts an answer at exactly 60,000 ms', async () => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      const attempts = [
        { problemIndex: 0, answer: answerOf(round.problems[0]), atMs: 60_000 },
      ];

      const response = await submit(
        ada.key,
        round.id,
        resultBody(attempts),
      ).expect(201);

      expect(response.body).toMatchObject({ result: { solved: 1 } });
    });

    it('accepts an empty list of attempts as a score of 0', async () => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);

      const response = await submit(ada.key, round.id, resultBody([])).expect(
        201,
      );

      expect(response.body).toMatchObject({
        result: { solved: 0, mistakes: 0, usualPace: 0 },
      });
    });
  });

  describe("criterion 10: when a result may arrive, by the server's clock", () => {
    it('rejects a result before 60 seconds, then accepts it at 60', async () => {
      const round = await issueRound(ada.key);
      const body = resultBody(rightAnswers(round.problems, 2));

      testApp.clock.advance(59_999);
      const early = await submit(ada.key, round.id, body).expect(409);
      expect(early.body).toMatchObject({ code: 'round_too_early' });

      testApp.clock.advance(1);
      await submit(ada.key, round.id, body).expect(201);
    });

    it('accepts a result at 120 seconds, and rejects one a millisecond later', async () => {
      const first = await issueRound(ada.key);
      const second = await issueRound(ada.key);

      testApp.clock.advance(120_000);
      await submit(
        ada.key,
        first.id,
        resultBody(rightAnswers(first.problems, 2)),
      ).expect(201);

      testApp.clock.advance(1);
      const late = await submit(
        ada.key,
        second.id,
        resultBody(rightAnswers(second.problems, 2)),
      ).expect(409);
      expect(late.body).toMatchObject({ code: 'round_expired' });
    });
  });

  describe('criterion 11: a round accepts one result', () => {
    it('rejects a second result and keeps the first', async () => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      await submit(
        ada.key,
        round.id,
        resultBody(rightAnswers(round.problems, 3)),
      ).expect(201);

      const again = await submit(
        ada.key,
        round.id,
        resultBody(rightAnswers(round.problems, 5)),
      ).expect(409);

      expect(again.body).toMatchObject({ code: 'round_already_completed' });
      expect((await storedRound(round.id)).solved).toBe(3);
    });
  });

  describe("criterion 14: a player cannot touch another player's round", () => {
    it("answers Ben's result for Ada's round as if the round did not exist", async () => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      const body = resultBody(rightAnswers(round.problems, 2));

      const forAdasRound = await submit(ben.key, round.id, body).expect(404);
      const forNoRound = await submit(ben.key, NO_SUCH_ROUND, body).expect(404);

      expect(forAdasRound.body).toEqual(forNoRound.body);
      expect(forAdasRound.body).toMatchObject({ code: 'round_not_found' });
      expect((await storedRound(round.id)).completedAt).toBeNull();
    });
  });

  describe("the usual pace in a result counts only this player's completed rounds", () => {
    it("criterion 14: leaves out another player's scores", async () => {
      const bens = await issueRound(ben.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      await submit(
        ben.key,
        bens.id,
        resultBody(rightAnswers(bens.problems, 10)),
      ).expect(201);

      const adas = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      const response = await submit(
        ada.key,
        adas.id,
        resultBody(rightAnswers(adas.problems, 3)),
      ).expect(201);

      expect(response.body).toMatchObject({
        result: { usualPace: 3, previousUsualPace: null },
      });
    });

    it('criterion 19: leaves out a round that was never completed', async () => {
      await issueRound(ada.key);
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);

      const response = await submit(
        ada.key,
        round.id,
        resultBody(rightAnswers(round.problems, 3)),
      ).expect(201);

      expect(response.body).toMatchObject({
        result: { usualPace: 3, previousUsualPace: null },
      });
    });
  });

  describe('criterion 20: the input type is stored', () => {
    it('stores touch', async () => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);
      await submit(
        ada.key,
        round.id,
        resultBody(rightAnswers(round.problems, 2), { inputType: 'touch' }),
      ).expect(201);

      expect((await storedRound(round.id)).inputType).toBe('touch');
    });
  });

  describe('criterion 25: a result with the wrong shape changes nothing', () => {
    const valid = { problemIndex: 0, answer: 10, atMs: 2_000 };

    it.each([
      ['an unknown input type', { inputType: 'mouse' }],
      ['an unknown time zone', { timeZone: 'Mars/Olympus_Mons' }],
      ['a fixed offset as the time zone', { timeZone: '+10:00' }],
      ['a negative time', { attempts: [{ ...valid, atMs: -1 }] }],
      ['a fractional time', { attempts: [{ ...valid, atMs: 1.5 }] }],
      ['an answer above 9,999', { attempts: [{ ...valid, answer: 10_000 }] }],
      [
        'a problem index that is text',
        { attempts: [{ ...valid, problemIndex: 'x' }] },
      ],
      ['more than 1,000 attempts', { attempts: Array(1_001).fill(valid) }],
      ['no attempts field', { attempts: undefined }],
    ])('refuses %s', async (_label, change) => {
      const round = await issueRound(ada.key);
      testApp.clock.advance(COUNTDOWN_AND_ROUND_MS);

      const response = await submit(
        ada.key,
        round.id,
        resultBody([], change),
      ).expect(400);

      expect(response.body).toMatchObject({ code: 'invalid_request' });
      expect((await storedRound(round.id)).completedAt).toBeNull();
    });

    it('refuses a round id that is not a UUID', async () => {
      const response = await submit(
        ada.key,
        'not-a-uuid',
        resultBody([]),
      ).expect(400);

      expect(response.body).toMatchObject({ code: 'invalid_request' });
    });
  });
});
