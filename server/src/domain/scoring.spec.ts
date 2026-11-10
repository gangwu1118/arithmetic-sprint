import { describe, expect, it } from 'vitest';
import type { Problem } from './problems.js';
import {
  scoreRound,
  secondsPerProblem,
  toSeconds,
  type Attempt,
  type RoundScore,
  type ScoringOutcome,
} from './scoring.js';

// A hand-made round, so every expected number can be checked by eye.
const PROBLEMS: Problem[] = [
  { a: 37, b: 48, operation: 'add' }, // 85
  { a: 73, b: 28, operation: 'subtract' }, // 45
  { a: 7, b: 8, operation: 'multiply' }, // 56
  { a: 84, b: 7, operation: 'divide' }, // 12
  { a: 12, b: 9, operation: 'add' }, // 21
  { a: 6, b: 9, operation: 'multiply' }, // 54
  { a: 50, b: 21, operation: 'subtract' }, // 29
  { a: 99, b: 11, operation: 'divide' }, // 9
];

function attempt(problemIndex: number, answer: number, atMs: number): Attempt {
  return { problemIndex, answer, atMs };
}

function scoreOf(outcome: ScoringOutcome): RoundScore {
  if (!outcome.valid) {
    throw new Error(`expected a valid result, got ${outcome.reason}`);
  }
  return outcome.score;
}

describe('criterion 5: the score is the number of problems solved, by replay', () => {
  it('counts three right answers as three, and a wrong one as a mistake', () => {
    const score = scoreOf(
      scoreRound(PROBLEMS, [
        attempt(0, 85, 2_000),
        attempt(1, 44, 4_000),
        attempt(1, 45, 5_000),
        attempt(2, 56, 6_500),
      ]),
    );

    expect(score.solved).toBe(3);
    expect(score.mistakes).toBe(1);
    expect(score.tooFast).toBe(0);
  });

  it('times each problem from when it appeared: the previous right answer', () => {
    const score = scoreOf(
      scoreRound(PROBLEMS, [
        attempt(0, 85, 2_000),
        attempt(1, 45, 5_000),
        attempt(2, 56, 6_500),
      ]),
    );

    expect(score.operations).toEqual({
      add: { solved: 1, totalMs: 2_000 },
      subtract: { solved: 1, totalMs: 3_000 },
      multiply: { solved: 1, totalMs: 1_500 },
      divide: { solved: 0, totalMs: 0 },
    });
  });
});

describe('criterion 6: a wrong answer is a mistake and the same problem stays', () => {
  it('counts the mistake and still solves the problem afterwards', () => {
    const score = scoreOf(
      scoreRound(PROBLEMS, [attempt(0, 84, 1_000), attempt(0, 85, 2_500)]),
    );

    expect(score.mistakes).toBe(1);
    expect(score.solved).toBe(1);
  });

  it('includes the time lost on mistakes in the problem time', () => {
    const score = scoreOf(
      scoreRound(PROBLEMS, [attempt(0, 84, 1_000), attempt(0, 85, 2_500)]),
    );

    expect(score.operations.add).toEqual({ solved: 1, totalMs: 2_500 });
  });
});

describe('criterion 7: a right answer under 300 ms is too fast', () => {
  it('does not count 299 ms, reports it, and still moves to the next problem', () => {
    const score = scoreOf(
      scoreRound(PROBLEMS, [attempt(0, 85, 299), attempt(1, 45, 1_299)]),
    );

    expect(score.tooFast).toBe(1);
    expect(score.solved).toBe(1);
    // The too-fast problem is in no time figure; the next one took 1,000 ms.
    expect(score.operations.add).toEqual({ solved: 0, totalMs: 0 });
    expect(score.operations.subtract).toEqual({ solved: 1, totalMs: 1_000 });
    expect(score.slowest.map((s) => s.problemIndex)).toEqual([1]);
  });

  it('counts exactly 300 ms', () => {
    const score = scoreOf(scoreRound(PROBLEMS, [attempt(0, 85, 300)]));

    expect(score.solved).toBe(1);
    expect(score.tooFast).toBe(0);
  });

  it('measures from when the problem appeared, not from the start of the round', () => {
    // Problem 1 appears at 5,000 ms and is answered 200 ms later.
    const score = scoreOf(
      scoreRound(PROBLEMS, [attempt(0, 85, 5_000), attempt(1, 45, 5_200)]),
    );

    expect(score.solved).toBe(1);
    expect(score.tooFast).toBe(1);
  });

  it('counts a later problem answered exactly 300 ms after it appeared', () => {
    const score = scoreOf(
      scoreRound(PROBLEMS, [attempt(0, 85, 5_000), attempt(1, 45, 5_300)]),
    );

    expect(score.solved).toBe(2);
    expect(score.tooFast).toBe(0);
  });
});

describe('criterion 8: impossible attempts make the result invalid', () => {
  it('rejects an attempt for a problem other than the current one', () => {
    expect(scoreRound(PROBLEMS, [attempt(1, 45, 2_000)])).toEqual({
      valid: false,
      reason: 'wrong_problem',
      attemptIndex: 0,
    });
  });

  it('rejects an attempt after the last problem was solved', () => {
    const oneProblem = PROBLEMS.slice(0, 1);

    expect(
      scoreRound(oneProblem, [attempt(0, 85, 1_000), attempt(1, 45, 2_000)]),
    ).toEqual({ valid: false, reason: 'wrong_problem', attemptIndex: 1 });
  });

  it('rejects a time earlier than the attempt before it', () => {
    expect(
      scoreRound(PROBLEMS, [attempt(0, 84, 2_000), attempt(0, 85, 1_500)]),
    ).toEqual({ valid: false, reason: 'time_goes_back', attemptIndex: 1 });
  });

  it('accepts two attempts at the same time', () => {
    const score = scoreOf(
      scoreRound(PROBLEMS, [attempt(0, 84, 2_000), attempt(0, 85, 2_000)]),
    );

    expect(score.mistakes).toBe(1);
    expect(score.solved).toBe(1);
  });

  it("rejects a time above the round's 60,000 ms", () => {
    expect(scoreRound(PROBLEMS, [attempt(0, 85, 60_001)])).toEqual({
      valid: false,
      reason: 'time_outside_round',
      attemptIndex: 0,
    });
  });

  it('accepts a time of exactly 60,000 ms', () => {
    expect(scoreOf(scoreRound(PROBLEMS, [attempt(0, 85, 60_000)])).solved).toBe(
      1,
    );
  });

  it('accepts an empty list of attempts as a score of 0', () => {
    expect(scoreOf(scoreRound(PROBLEMS, []))).toEqual({
      solved: 0,
      mistakes: 0,
      tooFast: 0,
      operations: {
        add: { solved: 0, totalMs: 0 },
        subtract: { solved: 0, totalMs: 0 },
        multiply: { solved: 0, totalMs: 0 },
        divide: { solved: 0, totalMs: 0 },
      },
      slowest: [],
    });
  });
});

describe('criterion 9: seconds per operation and the three slowest problems', () => {
  // Five solved problems: 2.0 s, 4.0 s, 1.0 s, 4.0 s, 3.0 s.
  const score = scoreOf(
    scoreRound(PROBLEMS, [
      attempt(0, 85, 2_000),
      attempt(1, 45, 6_000),
      attempt(2, 56, 7_000),
      attempt(3, 12, 11_000),
      attempt(4, 21, 14_000),
    ]),
  );

  it('adds up the time and the count for each operation', () => {
    expect(score.operations).toEqual({
      add: { solved: 2, totalMs: 5_000 },
      subtract: { solved: 1, totalMs: 4_000 },
      multiply: { solved: 1, totalMs: 1_000 },
      divide: { solved: 1, totalMs: 4_000 },
    });
  });

  it('lists the three slowest, slowest first, earlier first on a tie', () => {
    expect(score.slowest).toEqual([
      { problemIndex: 1, problem: PROBLEMS[1], answer: 45, ms: 4_000 },
      { problemIndex: 3, problem: PROBLEMS[3], answer: 12, ms: 4_000 },
      { problemIndex: 4, problem: PROBLEMS[4], answer: 21, ms: 3_000 },
    ]);
  });

  it('turns milliseconds into seconds, to one decimal place', () => {
    expect(toSeconds(4_000)).toBe(4);
    expect(toSeconds(1_250)).toBe(1.3);
    expect(toSeconds(1_249)).toBe(1.2);
  });

  it('turns totals into seconds per problem, to one decimal place', () => {
    expect(secondsPerProblem({ solved: 2, totalMs: 5_000 })).toBe(2.5);
    expect(secondsPerProblem({ solved: 4, totalMs: 5_000 })).toBe(1.3);
    expect(secondsPerProblem({ solved: 0, totalMs: 0 })).toBeNull();
  });
});
