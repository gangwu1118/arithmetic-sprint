import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { players } from '../src/db/schema.js';
import { emptyTotals } from '../src/domain/scoring.js';
import { RoundsRepository } from '../src/rounds/rounds.repository.js';
import {
  emptyTables,
  openTestDatabase,
  type TestDatabase,
} from './test-database.js';

// Two HTTP requests in one test never truly overlap, so the guard against a
// second result is tested here, on the query itself (docs/test-plan.md).
describe('criterion 11: completing a round is one conditional update', () => {
  let db: TestDatabase;
  let repository: RoundsRepository;
  let playerId: string;
  let otherPlayerId: string;
  let roundId: string;

  const result = {
    completedAt: new Date('2026-11-10T13:29:03.000Z'),
    attempts: [],
    solved: 0,
    mistakes: 0,
    tooFast: 0,
    operationStats: emptyTotals(),
    inputType: 'keyboard' as const,
    localDay: '2026-11-10',
    timeZone: 'UTC',
    scoringVersion: 1,
  };

  beforeAll(() => {
    db = openTestDatabase();
    repository = new RoundsRepository(db);
  });

  beforeEach(async () => {
    await emptyTables(db);
    const [ada, ben] = await db
      .insert(players)
      .values([
        { displayName: 'Ada', keyHash: 'hash-of-ada' },
        { displayName: 'Ben', keyHash: 'hash-of-ben' },
      ])
      .returning();
    playerId = ada.id;
    otherPlayerId = ben.id;
    const round = await repository.issue({
      playerId,
      problems: [],
      durationMs: 60_000,
      issuedAt: new Date('2026-11-10T13:28:00.000Z'),
    });
    roundId = round.id;
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it('lets exactly one of two simultaneous completions succeed', async () => {
    const outcomes = await Promise.all([
      repository.complete(playerId, roundId, result),
      repository.complete(playerId, roundId, result),
    ]);

    expect(outcomes.filter(Boolean)).toHaveLength(1);
  });

  it('refuses to complete a round twice', async () => {
    expect(await repository.complete(playerId, roundId, result)).toBe(true);
    expect(await repository.complete(playerId, roundId, result)).toBe(false);
  });

  it("refuses to complete another player's round", async () => {
    expect(await repository.complete(otherPlayerId, roundId, result)).toBe(
      false,
    );
    expect(await repository.findForPlayer(playerId, roundId)).toMatchObject({
      completedAt: null,
    });
  });
});
