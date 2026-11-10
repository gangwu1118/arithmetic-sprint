import {
  OPERATIONS,
  PACE_WINDOW,
  RECENT_ROUNDS_SHOWN,
  ROUNDS_FOR_CHANGE,
  WEEKLY_GOAL_DAYS,
  type InputType,
  type Operation,
} from './config.js';
import { weekOf, type LocalDay } from './days.js';
import { secondsPerProblem, type OperationTotals } from './scoring.js';

/** What progress needs to know about one completed round. */
export type CompletedRound = {
  roundId: string;
  completedAt: Date;
  localDay: LocalDay;
  solved: number;
  mistakes: number;
  inputType: InputType;
  operations: OperationTotals;
};

export type OperationPace = {
  operation: Operation;
  solved: number;
  secondsPerProblem: number | null;
};

export type ProgressReport = {
  summary: {
    roundsCompleted: number;
    usualPace: number | null;
    startingPace: number | null;
    change: number | null;
    paceWindow: number;
    roundsForChange: number;
  };
  week: {
    today: LocalDay;
    goalDays: number;
    daysPractised: number;
    days: { date: LocalDay; rounds: number }[];
  };
  operations: OperationPace[];
  rounds: {
    roundId: string;
    completedAt: Date;
    localDay: LocalDay;
    solved: number;
    mistakes: number;
    inputType: InputType;
    usualPace: number;
  }[];
};

/** The middle value, or the mean of the two middle values. */
export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('median of no values');
  const sorted = [...values].sort((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Usual pace after the round at `index`: it and up to four before it. */
function usualPaceAt(scores: readonly number[], index: number): number {
  return median(scores.slice(Math.max(0, index - PACE_WINDOW + 1), index + 1));
}

/** The usual pace after the last of the scores, or null with none. */
export function usualPace(scores: readonly number[]): number | null {
  return scores.length === 0 ? null : usualPaceAt(scores, scores.length - 1);
}

/** Seconds per problem for each operation, over the given rounds. */
export function operationPaces(
  rounds: readonly { operations: OperationTotals }[],
): OperationPace[] {
  return OPERATIONS.map((operation) => {
    let solved = 0;
    let totalMs = 0;
    for (const round of rounds) {
      solved += round.operations[operation].solved;
      totalMs += round.operations[operation].totalMs;
    }
    return {
      operation,
      solved,
      secondsPerProblem: secondsPerProblem({ solved, totalMs }),
    };
  });
}

/**
 * A player's progress from their completed rounds (docs/spec.md, sections
 * 5 and 6). `today` is the local day in the time zone the browser sent.
 */
export function buildProgress(
  rounds: readonly CompletedRound[],
  today: LocalDay,
): ProgressReport {
  const ordered = [...rounds].sort(
    (x, y) => x.completedAt.getTime() - y.completedAt.getTime(),
  );
  const scores = ordered.map((round) => round.solved);

  const current = usualPace(scores);
  const startingPace =
    scores.length >= PACE_WINDOW ? median(scores.slice(0, PACE_WINDOW)) : null;
  const change =
    scores.length >= ROUNDS_FOR_CHANGE &&
    current !== null &&
    startingPace !== null
      ? current - startingPace
      : null;

  const days = weekOf(today).map((date) => ({
    date,
    rounds: ordered.filter((round) => round.localDay === date).length,
  }));

  return {
    summary: {
      roundsCompleted: scores.length,
      usualPace: current,
      startingPace,
      change,
      paceWindow: PACE_WINDOW,
      roundsForChange: ROUNDS_FOR_CHANGE,
    },
    week: {
      today,
      goalDays: WEEKLY_GOAL_DAYS,
      daysPractised: days.filter((day) => day.rounds > 0).length,
      days,
    },
    operations: operationPaces(ordered.slice(-PACE_WINDOW)),
    rounds: ordered
      .map((round, i) => ({
        roundId: round.roundId,
        completedAt: round.completedAt,
        localDay: round.localDay,
        solved: round.solved,
        mistakes: round.mistakes,
        inputType: round.inputType,
        usualPace: usualPaceAt(scores, i),
      }))
      .slice(-RECENT_ROUNDS_SHOWN),
  };
}
