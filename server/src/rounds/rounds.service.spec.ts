import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { PlayerRow, RoundRow } from '../db/schema.js';
import type { RoundsRepository } from './rounds.repository.js';
import { RoundsService } from './rounds.service.js';

// Unit tests of the service with a fake repository, for what the HTTP tests
// cannot set up: a lost race, and rounds completed at the same moment.

const PLAYER: PlayerRow = {
  id: 'player-1',
  displayName: 'Ada',
  keyHash: 'hash',
  isSample: false,
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
};

const OPEN_ROUND: RoundRow = {
  id: 'round-1',
  playerId: PLAYER.id,
  problems: [{ a: 37, b: 48, operation: 'add' }], // 85
  durationMs: 60_000,
  issuedAt: new Date('2026-11-10T13:28:00.000Z'),
  completedAt: null,
  attempts: null,
  solved: null,
  mistakes: null,
  tooFast: null,
  operationStats: null,
  inputType: null,
  localDay: null,
  timeZone: null,
  scoringVersion: null,
};

const ONE_RIGHT_ANSWER = {
  attempts: [{ problemIndex: 0, answer: 85, atMs: 2_000 }],
  inputType: 'keyboard' as const,
  timeZone: 'UTC',
};

function serviceWith(repository: Partial<RoundsRepository>): RoundsService {
  const now = new Date('2026-11-10T13:29:03.000Z');
  return new RoundsService(
    repository as RoundsRepository,
    { now: () => now },
    () => 0.5,
  );
}

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpException) {
      return { status: error.getStatus(), body: error.getResponse() };
    }
    throw error;
  }
  throw new Error('expected the promise to fail');
}

describe('submitting a result', () => {
  it('criterion 11: reports a result that lost the race to another as already completed', async () => {
    const service = serviceWith({
      findForPlayer: () => Promise.resolve(OPEN_ROUND),
      complete: () => Promise.resolve(false),
      completedRoundScores: () => Promise.resolve([]),
    });

    expect(
      await errorOf(service.submit(PLAYER, OPEN_ROUND.id, ONE_RIGHT_ANSWER)),
    ).toMatchObject({
      status: 409,
      body: { code: 'round_already_completed' },
    });
  });

  it('works out the usual pace before this round from the other rounds, wherever this one sorts', async () => {
    const service = serviceWith({
      findForPlayer: () => Promise.resolve(OPEN_ROUND),
      complete: () => Promise.resolve(true),
      // Another round completed at the same moment sorts after this one.
      completedRoundScores: () =>
        Promise.resolve([
          { roundId: 'round-0', solved: 10 },
          { roundId: OPEN_ROUND.id, solved: 1 },
          { roundId: 'round-2', solved: 12 },
        ]),
    });

    const result = await service.submit(
      PLAYER,
      OPEN_ROUND.id,
      ONE_RIGHT_ANSWER,
    );

    // Before: the median of 10 and 12. After: the median of 10, 12 and 1.
    expect(result).toMatchObject({
      solved: 1,
      previousUsualPace: 11,
      usualPace: 10,
    });
  });
});
