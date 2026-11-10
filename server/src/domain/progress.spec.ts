import { describe, expect, it } from 'vitest';
import {
  buildProgress,
  median,
  usualPace,
  type CompletedRound,
} from './progress.js';
import { emptyTotals } from './scoring.js';

const TODAY = '2026-11-11'; // a Wednesday

/** Round n (1 is the first), completed an hour after the one before. */
function round(
  n: number,
  solved: number,
  extra: Partial<CompletedRound> = {},
): CompletedRound {
  return {
    roundId: `round-${n}`,
    completedAt: new Date(Date.UTC(2026, 10, 1, 8) + n * 3_600_000),
    localDay: '2026-11-02',
    solved,
    mistakes: 0,
    inputType: 'keyboard',
    operations: emptyTotals(),
    ...extra,
  };
}

function roundsWithScores(scores: number[]): CompletedRound[] {
  return scores.map((solved, i) => round(i + 1, solved));
}

describe('criterion 17: usual pace is a median of the most recent five', () => {
  it('takes the middle value, or the mean of the two middle values', () => {
    expect(median([12])).toBe(12);
    expect(median([10, 14])).toBe(12);
    expect(median([10, 12, 30, 11, 13])).toBe(12);
    expect(median([3, 1, 2, 10, 4, 6])).toBe(3.5);
  });

  it('is not moved by one unusual round', () => {
    // The mean of these is 15.2.
    expect(usualPace([10, 12, 30, 11, 13])).toBe(12);
  });

  it('uses only the most recent five scores', () => {
    expect(usualPace([1, 1, 1, 1, 1, 20, 20, 20, 20, 20])).toBe(20);
  });

  it('uses fewer when fewer exist, and is null with none', () => {
    expect(usualPace([7])).toBe(7);
    expect(usualPace([10, 14])).toBe(12);
    expect(usualPace([])).toBeNull();
  });
});

describe('criterion 17: starting pace and change', () => {
  it('has no starting pace before five rounds', () => {
    const { summary } = buildProgress(
      roundsWithScores([10, 12, 30, 11]),
      TODAY,
    );

    expect(summary.startingPace).toBeNull();
    expect(summary.change).toBeNull();
  });

  it('has a starting pace from five rounds, and no change yet', () => {
    const { summary } = buildProgress(
      roundsWithScores([10, 12, 30, 11, 13, 14, 15, 16, 17]),
      TODAY,
    );

    expect(summary.startingPace).toBe(12);
    expect(summary.change).toBeNull();
  });

  it('reports the change from ten rounds: current minus starting pace', () => {
    const { summary } = buildProgress(
      roundsWithScores([1, 1, 1, 1, 1, 20, 20, 20, 20, 20]),
      TODAY,
    );

    expect(summary).toEqual({
      roundsCompleted: 10,
      usualPace: 20,
      startingPace: 1,
      change: 19,
      paceWindow: 5,
      roundsForChange: 10,
    });
  });

  it('orders the rounds by when they were completed', () => {
    const inOrder = roundsWithScores([1, 1, 1, 1, 1, 20, 20, 20, 20, 20]);

    expect(buildProgress([...inOrder].reverse(), TODAY).summary).toEqual(
      buildProgress(inOrder, TODAY).summary,
    );
  });
});

describe('criterion 17: the list of recent rounds', () => {
  // Scores 1 to 35, one per round.
  const scores = Array.from({ length: 35 }, (_, i) => i + 1);
  const listed = buildProgress(roundsWithScores(scores), TODAY).rounds;

  it('holds the 30 most recent, oldest first', () => {
    expect(listed).toHaveLength(30);
    expect(listed[0].roundId).toBe('round-6');
    expect(listed[29].roundId).toBe('round-35');
  });

  it("gives each round's usual pace at that point, from the whole history", () => {
    // Round 6: the median of rounds 2 to 6, two of which are not listed.
    expect(listed[0].usualPace).toBe(4);
    expect(listed[29].usualPace).toBe(33);
  });
});

describe('criterion 18: seconds per problem cover the most recent five rounds', () => {
  it('leaves out older rounds', () => {
    const slowFirstRound = round(1, 10, {
      operations: { ...emptyTotals(), add: { solved: 10, totalMs: 100_000 } },
    });
    const laterRounds = [2, 3, 4, 5, 6].map((n) =>
      round(n, 2, {
        operations: { ...emptyTotals(), add: { solved: 2, totalMs: 3_000 } },
      }),
    );

    // Last five: 10 additions in 15 seconds. With the first: 20 in 115.
    expect(
      buildProgress([slowFirstRound, ...laterRounds], TODAY).operations,
    ).toEqual([
      { operation: 'add', solved: 10, secondsPerProblem: 1.5 },
      { operation: 'subtract', solved: 0, secondsPerProblem: null },
      { operation: 'multiply', solved: 0, secondsPerProblem: null },
      { operation: 'divide', solved: 0, secondsPerProblem: null },
    ]);
  });
});

describe('criterion 16: this week, against the goal of 3 days', () => {
  it("counts the rounds on each day of today's week, Monday to Sunday", () => {
    const rounds = [
      round(1, 10, { localDay: '2026-11-08' }), // Sunday of the week before
      round(2, 10, { localDay: '2026-11-09' }), // Monday
      round(3, 10, { localDay: '2026-11-09' }), // Monday again
      round(4, 10, { localDay: '2026-11-11' }), // Wednesday, today
    ];

    expect(buildProgress(rounds, TODAY).week).toEqual({
      today: '2026-11-11',
      goalDays: 3,
      daysPractised: 2,
      days: [
        { date: '2026-11-09', rounds: 2 },
        { date: '2026-11-10', rounds: 0 },
        { date: '2026-11-11', rounds: 1 },
        { date: '2026-11-12', rounds: 0 },
        { date: '2026-11-13', rounds: 0 },
        { date: '2026-11-14', rounds: 0 },
        { date: '2026-11-15', rounds: 0 },
      ],
    });
  });
});
