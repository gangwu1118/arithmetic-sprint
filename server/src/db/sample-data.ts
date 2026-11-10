// Two sample players with a simulated history, so the progress view has
// something to show before anyone has played (docs/spec.md, section 9).
// The history is simulated answers put through the real problem generator
// and the real scoring, with a seeded random source.
import { eq } from 'drizzle-orm';
import {
  ROUND_DURATION_MS,
  SCORING_VERSION,
  type InputType,
} from '../domain/config.js';
import { localDay } from '../domain/days.js';
import {
  answerOf,
  generateProblems,
  type Problem,
} from '../domain/problems.js';
import { randomInt, seededRandom, type Random } from '../domain/random.js';
import {
  scoreRound,
  type Attempt,
  type RoundScore,
} from '../domain/scoring.js';
import { hashPlayerKey } from '../players/player-keys.js';
import type { Database } from './database.js';
import { players, rounds } from './schema.js';

export type SamplePlayer = {
  displayName: string;
  /** Fixed, and written in the web app, which is how "open sample" works. */
  key: string;
  roundCount: number;
  /** How many days back the first round was. */
  spanDays: number;
  seed: number;
  /** Simulated speed, in seconds per problem, at the first and last round. */
  firstSeconds: number;
  lastSeconds: number;
  mistakeRate: number;
  inputType: InputType;
};

export const SAMPLE_PLAYERS: SamplePlayer[] = [
  {
    displayName: 'Alex (sample)',
    key: 'sample-player-alex',
    roundCount: 22,
    spanDays: 26,
    seed: 11,
    firstSeconds: 3.4,
    lastSeconds: 2.2,
    mistakeRate: 0.08,
    inputType: 'keyboard',
  },
  {
    displayName: 'Sam (sample)',
    key: 'sample-player-sam',
    roundCount: 7,
    spanDays: 12,
    seed: 23,
    firstSeconds: 3.1,
    lastSeconds: 2.8,
    mistakeRate: 0.12,
    inputType: 'touch',
  },
];

const SAMPLE_TIME_ZONE = 'Australia/Sydney';
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Simulated play: each problem takes about `seconds`, with some mistakes. */
function simulateAttempts(
  problems: Problem[],
  random: Random,
  seconds: number,
  mistakeRate: number,
): Attempt[] {
  const attempts: Attempt[] = [];
  let atMs = 0;
  for (const [problemIndex, problem] of problems.entries()) {
    // Subtraction and division, the reversed operations, take a bit longer.
    const slower =
      problem.operation === 'subtract' || problem.operation === 'divide';
    const typicalMs = seconds * 1_000 * (slower ? 1.25 : 0.85);
    if (random() < mistakeRate) {
      atMs += Math.round(typicalMs * 0.6);
      if (atMs > ROUND_DURATION_MS) break;
      attempts.push({
        problemIndex,
        answer: answerOf(problem) + randomInt(random, 1, 3),
        atMs,
      });
    }
    atMs += Math.round(typicalMs * (0.6 + random() * 0.8));
    if (atMs > ROUND_DURATION_MS) break;
    attempts.push({ problemIndex, answer: answerOf(problem), atMs });
  }
  return attempts;
}

export type SampleRound = {
  problems: Problem[];
  attempts: Attempt[];
  solved: number;
  score: RoundScore;
  issuedAt: Date;
  completedAt: Date;
  localDay: string;
};

/** A sample player's rounds, oldest first, all before `now`. */
export function sampleHistory(sample: SamplePlayer, now: Date): SampleRound[] {
  const random = seededRandom(sample.seed);
  const history: SampleRound[] = [];
  for (let i = 0; i < sample.roundCount; i += 1) {
    const progress = i / (sample.roundCount - 1);
    const seconds =
      sample.firstSeconds +
      (sample.lastSeconds - sample.firstSeconds) * progress;
    const problems = generateProblems(random);
    const attempts = simulateAttempts(
      problems,
      random,
      seconds,
      sample.mistakeRate,
    );
    const outcome = scoreRound(problems, attempts);
    if (!outcome.valid) {
      throw new Error(`Simulated round ${i} is not valid: ${outcome.reason}`);
    }
    // Spread over the span, ending today. Each round is a few minutes later
    // in its day than the one before, so two on one day stay in order.
    const daysBack = Math.round(sample.spanDays * (1 - progress));
    const completedAt = new Date(
      now.getTime() -
        daysBack * DAY_MS -
        (sample.roundCount - i) * 7 * MINUTE_MS,
    );
    history.push({
      problems,
      attempts,
      solved: outcome.score.solved,
      score: outcome.score,
      issuedAt: new Date(completedAt.getTime() - 63_000),
      completedAt,
      localDay: localDay(completedAt, SAMPLE_TIME_ZONE),
    });
  }
  return history;
}

/** Replaces the sample players and their rounds. Other players are kept. */
export async function seedSampleData(db: Database, now: Date): Promise<void> {
  // One transaction: either both sample players are replaced, or nothing is.
  await db.transaction(async (tx) => {
    for (const sample of SAMPLE_PLAYERS) {
      const keyHash = hashPlayerKey(sample.key);
      await tx.delete(players).where(eq(players.keyHash, keyHash));
      const [player] = await tx
        .insert(players)
        .values({ displayName: sample.displayName, keyHash, isSample: true })
        .returning();
      await tx.insert(rounds).values(
        sampleHistory(sample, now).map((round) => ({
          playerId: player.id,
          problems: round.problems,
          durationMs: ROUND_DURATION_MS,
          issuedAt: round.issuedAt,
          completedAt: round.completedAt,
          attempts: round.attempts,
          solved: round.score.solved,
          mistakes: round.score.mistakes,
          tooFast: round.score.tooFast,
          operationStats: round.score.operations,
          inputType: sample.inputType,
          localDay: round.localDay,
          timeZone: SAMPLE_TIME_ZONE,
          scoringVersion: SCORING_VERSION,
        })),
      );
    }
  });
}
