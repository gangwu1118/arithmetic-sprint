import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { answerOf, type Problem } from '../src/domain/problems.js';
import { createPlayer, createTestApp, type TestApp } from './test-app.js';
import {
  emptyTables,
  openTestDatabase,
  type TestDatabase,
} from './test-database.js';

type Progress = {
  player: { id: string; displayName: string; isSample: boolean };
  summary: Record<string, number | null>;
  week: {
    today: string;
    goalDays: number;
    daysPractised: number;
    days: { date: string; rounds: number }[];
  };
  operations: { operation: string }[];
  rounds: {
    roundId: string;
    completedAt: string;
    solved: number;
    inputType: string;
    usualPace: number;
  }[];
};

describe('progress', () => {
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

  async function issueRound(
    key: string,
  ): Promise<{ id: string; problems: Problem[] }> {
    const response = await testApp
      .http()
      .post('/api/rounds')
      .set('Authorization', `Bearer ${key}`)
      .expect(201);
    return (response.body as { round: { id: string; problems: Problem[] } })
      .round;
  }

  /** Issues a round, waits it out, and answers the first `solved` problems. */
  async function playRound(
    key: string,
    solved: number,
    inputType = 'keyboard',
  ): Promise<string> {
    const round = await issueRound(key);
    testApp.clock.advance(63_000);
    const attempts = round.problems.slice(0, solved).map((problem, i) => ({
      problemIndex: i,
      answer: answerOf(problem),
      atMs: (i + 1) * 2_000,
    }));
    await testApp
      .http()
      .post(`/api/rounds/${round.id}/result`)
      .set('Authorization', `Bearer ${key}`)
      .send({ attempts, inputType, timeZone: 'UTC' })
      .expect(201);
    return round.id;
  }

  async function progressOf(key: string, timeZone = 'UTC'): Promise<Progress> {
    const response = await testApp
      .http()
      .get('/api/progress')
      .query({ timeZone })
      .set('Authorization', `Bearer ${key}`)
      .expect(200);
    return response.body as Progress;
  }

  it('describes the player, the summary, the week and the rounds', async () => {
    const roundId = await playRound(ada.key, 4);
    const progress = await progressOf(ada.key);

    expect(progress.player).toMatchObject({ id: ada.id, displayName: 'Ada' });
    expect(progress.summary).toEqual({
      roundsCompleted: 1,
      usualPace: 4,
      startingPace: null,
      change: null,
      paceWindow: 5,
      roundsForChange: 10,
    });
    expect(progress.week.goalDays).toBe(3);
    expect(progress.week.daysPractised).toBe(1);
    expect(progress.week.days.map((day) => day.date)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(progress.operations).toHaveLength(4);
    expect(progress.rounds).toEqual([
      {
        roundId,
        completedAt: '2026-11-10T13:29:03.000Z',
        localDay: '2026-11-10',
        solved: 4,
        mistakes: 0,
        inputType: 'keyboard',
        usualPace: 4,
      },
    ]);
  });

  it('works out today in the requested time zone', async () => {
    testApp.clock.set('2026-11-10T13:30:00.000Z');

    expect((await progressOf(ada.key, 'UTC')).week.today).toBe('2026-11-10');
    expect((await progressOf(ada.key, 'Australia/Sydney')).week.today).toBe(
      '2026-11-11',
    );
  });

  it("criterion 14: shows a player none of another player's rounds", async () => {
    await playRound(ada.key, 4);

    expect((await progressOf(ada.key)).rounds).toHaveLength(1);
    const bens = await progressOf(ben.key);
    expect(bens.rounds).toEqual([]);
    expect(bens.summary.roundsCompleted).toBe(0);
    expect(bens.week.daysPractised).toBe(0);
  });

  it('criterion 19: leaves out a round that was issued and never completed', async () => {
    await issueRound(ada.key);
    testApp.clock.advance(10 * 60_000);
    const progress = await progressOf(ada.key);

    expect(progress.rounds).toEqual([]);
    expect(progress.summary.roundsCompleted).toBe(0);
    expect(progress.summary.usualPace).toBeNull();
    expect(progress.week.daysPractised).toBe(0);
  });

  it('criterion 20: returns the input type of each round', async () => {
    await playRound(ada.key, 4, 'touch');

    expect((await progressOf(ada.key)).rounds[0].inputType).toBe('touch');
  });

  describe('criterion 25: the time zone is required and must be an IANA name', () => {
    it.each([
      ['missing', undefined],
      ['unknown', 'Mars/Olympus_Mons'],
      ['a fixed offset', '+10:00'],
    ])('refuses a time zone that is %s', async (_label, timeZone) => {
      const response = await testApp
        .http()
        .get('/api/progress')
        .query(timeZone === undefined ? {} : { timeZone })
        .set('Authorization', `Bearer ${ada.key}`)
        .expect(400);

      expect(response.body).toMatchObject({ code: 'invalid_request' });
    });
  });
});
