import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CLOCK, type Clock } from '../common/clock.js';
import { AppError } from '../common/errors.js';
import { RANDOM } from '../common/random.js';
import type { PlayerRow } from '../db/schema.js';
import {
  ROUND_DURATION_MS,
  SCORING_VERSION,
  type InputType,
} from '../domain/config.js';
import { localDay } from '../domain/days.js';
import { judgeArrival } from '../domain/plausibility.js';
import { generateProblems, type Problem } from '../domain/problems.js';
import {
  operationPaces,
  usualPace,
  type OperationPace,
} from '../domain/progress.js';
import type { Random } from '../domain/random.js';
import { scoreRound, toSeconds, type Attempt } from '../domain/scoring.js';
import { RoundsRepository } from './rounds.repository.js';

/** What the browser needs to show a round. It holds no answers. */
export type Round = { id: string; durationMs: number; problems: Problem[] };

export type ResultInput = {
  attempts: Attempt[];
  inputType: InputType;
  timeZone: string;
};

export type Result = {
  roundId: string;
  completedAt: string;
  localDay: string;
  solved: number;
  mistakes: number;
  tooFast: number;
  usualPace: number;
  previousUsualPace: number | null;
  operations: OperationPace[];
  slowest: (Problem & { answer: number; seconds: number })[];
};

const roundNotFound = () =>
  new AppError(
    HttpStatus.NOT_FOUND,
    'round_not_found',
    'This player has no round with that id.',
  );

const alreadyCompleted = () =>
  new AppError(
    HttpStatus.CONFLICT,
    'round_already_completed',
    'This round already has a result.',
  );

@Injectable()
export class RoundsService {
  constructor(
    private readonly rounds: RoundsRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(RANDOM) private readonly random: Random,
  ) {}

  async issue(player: PlayerRow): Promise<Round> {
    const row = await this.rounds.issue({
      playerId: player.id,
      problems: generateProblems(this.random),
      durationMs: ROUND_DURATION_MS,
      issuedAt: this.clock.now(),
    });
    return { id: row.id, durationMs: row.durationMs, problems: row.problems };
  }

  /** Checks, scores and stores a result (docs/spec.md, sections 4.2, 4.3). */
  async submit(
    player: PlayerRow,
    roundId: string,
    input: ResultInput,
  ): Promise<Result> {
    const now = this.clock.now();

    // Another player's round is reported exactly like a missing one.
    const round = await this.rounds.findForPlayer(player.id, roundId);
    if (!round) throw roundNotFound();
    if (round.completedAt) throw alreadyCompleted();

    const arrival = judgeArrival(round.issuedAt, now, round.durationMs);
    if (arrival === 'too_early') {
      throw new AppError(
        HttpStatus.CONFLICT,
        'round_too_early',
        'The round cannot have been played yet.',
      );
    }
    if (arrival === 'expired') {
      throw new AppError(
        HttpStatus.CONFLICT,
        'round_expired',
        'The round ended too long ago to accept a result.',
      );
    }

    const outcome = scoreRound(
      round.problems,
      input.attempts,
      round.durationMs,
    );
    if (!outcome.valid) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'invalid_attempts',
        'These attempts could not have come from playing the round.',
        { reason: outcome.reason, attemptIndex: outcome.attemptIndex },
      );
    }
    const { score } = outcome;
    const day = localDay(now, input.timeZone);

    const stored = await this.rounds.complete(player.id, round.id, {
      completedAt: now,
      attempts: input.attempts,
      solved: score.solved,
      mistakes: score.mistakes,
      tooFast: score.tooFast,
      operationStats: score.operations,
      inputType: input.inputType,
      localDay: day,
      timeZone: input.timeZone,
      scoringVersion: SCORING_VERSION,
    });
    // Another result for this round was stored between the check and now.
    if (!stored) throw alreadyCompleted();

    const scores = await this.rounds.completedScores(player.id);
    return {
      roundId: round.id,
      completedAt: now.toISOString(),
      localDay: day,
      solved: score.solved,
      mistakes: score.mistakes,
      tooFast: score.tooFast,
      usualPace: usualPace(scores) ?? score.solved,
      previousUsualPace: usualPace(scores.slice(0, -1)),
      operations: operationPaces([score]),
      slowest: score.slowest.map((solved) => ({
        ...solved.problem,
        answer: solved.answer,
        seconds: toSeconds(solved.ms),
      })),
    };
  }
}
