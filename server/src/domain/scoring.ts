import {
  MIN_ANSWER_MS,
  ROUND_DURATION_MS,
  SLOWEST_SHOWN,
  type Operation,
} from './config.js';
import { answerOf, type Problem } from './problems.js';

/**
 * One answer the player submitted: which problem, the number entered, and
 * the time in milliseconds since the first problem appeared.
 */
export type Attempt = { problemIndex: number; answer: number; atMs: number };

/** For each operation: problems solved, and the time they took in total. */
export type OperationTotals = Record<
  Operation,
  { solved: number; totalMs: number }
>;

export type SolvedProblem = {
  problemIndex: number;
  problem: Problem;
  answer: number;
  /** From when the problem appeared to its right answer, mistakes included. */
  ms: number;
};

export type RoundScore = {
  /** The score. */
  solved: number;
  mistakes: number;
  /** Right answers under MIN_ANSWER_MS, which are not counted. */
  tooFast: number;
  operations: OperationTotals;
  /** The solved problems that took longest, slowest first. */
  slowest: SolvedProblem[];
};

export type InvalidReason =
  'wrong_problem' | 'time_goes_back' | 'time_outside_round';

export type ScoringOutcome =
  | { valid: true; score: RoundScore }
  | { valid: false; reason: InvalidReason; attemptIndex: number };

export function emptyTotals(): OperationTotals {
  return {
    add: { solved: 0, totalMs: 0 },
    subtract: { solved: 0, totalMs: 0 },
    multiply: { solved: 0, totalMs: 0 },
    divide: { solved: 0, totalMs: 0 },
  };
}

/** Milliseconds as seconds, to one decimal place, as the API reports them. */
export function toSeconds(ms: number): number {
  return Math.round(ms / 100) / 10;
}

/** Average seconds per solved problem, to one decimal place. */
export function secondsPerProblem(totals: {
  solved: number;
  totalMs: number;
}): number | null {
  if (totals.solved === 0) return null;
  return toSeconds(totals.totalMs / totals.solved);
}

/**
 * Scores a round by replaying its attempts, in order, against the problems
 * the server issued (docs/spec.md, section 4.2). Attempts that an honest
 * browser cannot produce make the whole result invalid.
 */
export function scoreRound(
  problems: readonly Problem[],
  attempts: readonly Attempt[],
  durationMs: number = ROUND_DURATION_MS,
): ScoringOutcome {
  const operations = emptyTotals();
  const solved: SolvedProblem[] = [];
  let mistakes = 0;
  let tooFast = 0;
  // The problem on screen, and when it appeared.
  let current = 0;
  let appearedAtMs = 0;

  for (const [attemptIndex, attempt] of attempts.entries()) {
    if (attempt.atMs < 0 || attempt.atMs > durationMs) {
      return { valid: false, reason: 'time_outside_round', attemptIndex };
    }
    if (attemptIndex > 0 && attempt.atMs < attempts[attemptIndex - 1].atMs) {
      return { valid: false, reason: 'time_goes_back', attemptIndex };
    }
    if (attempt.problemIndex !== current || current >= problems.length) {
      return { valid: false, reason: 'wrong_problem', attemptIndex };
    }

    const problem = problems[current];
    if (attempt.answer !== answerOf(problem)) {
      mistakes += 1;
      continue;
    }

    const ms = attempt.atMs - appearedAtMs;
    if (ms < MIN_ANSWER_MS) {
      tooFast += 1;
    } else {
      operations[problem.operation].solved += 1;
      operations[problem.operation].totalMs += ms;
      solved.push({
        problemIndex: current,
        problem,
        answer: attempt.answer,
        ms,
      });
    }
    current += 1;
    appearedAtMs = attempt.atMs;
  }

  const slowest = [...solved]
    .sort((x, y) => y.ms - x.ms || x.problemIndex - y.problemIndex)
    .slice(0, SLOWEST_SHOWN);

  return {
    valid: true,
    score: { solved: solved.length, mistakes, tooFast, operations, slowest },
  };
}
