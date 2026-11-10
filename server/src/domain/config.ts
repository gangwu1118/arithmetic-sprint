// Every number that defines the game, in one place. docs/spec.md sections
// 4 to 6 say what each one means. Change a rule here, in the spec and in its
// test, in the same commit.

export const OPERATIONS = ['add', 'subtract', 'multiply', 'divide'] as const;
export type Operation = (typeof OPERATIONS)[number];

export const INPUT_TYPES = ['keyboard', 'touch'] as const;
export type InputType = (typeof INPUT_TYPES)[number];

/** A round lasts this long, counted from when the first problem appears. */
export const ROUND_DURATION_MS = 60_000;

/** Problems issued per round: far more than anyone solves in a minute. */
export const PROBLEMS_PER_ROUND = 120;

/** Additions use two numbers from this range. Subtractions reverse them. */
export const ADD_RANGE = { min: 2, max: 50 } as const;

/** Multiplications use two numbers from this range. Divisions reverse them. */
export const MULTIPLY_RANGE = { min: 2, max: 12 } as const;

/** A right answer sooner than this after its problem appeared is too fast. */
export const MIN_ANSWER_MS = 300;

/** A result is still accepted this long after the round's own duration. */
export const LATE_ALLOWANCE_MS = 60_000;

/** Limits on the shape of a submitted result. */
export const MAX_ATTEMPTS = 1_000;
export const MAX_ANSWER = 9_999;

/** Progress. */
export const PACE_WINDOW = 5;
export const ROUNDS_FOR_CHANGE = 10;
export const RECENT_ROUNDS_SHOWN = 30;
export const SLOWEST_SHOWN = 3;
export const WEEKLY_GOAL_DAYS = 3;

/** Players. */
export const MAX_DISPLAY_NAME_LENGTH = 40;

/** Stored with every result. Bump it whenever a scoring rule changes. */
export const SCORING_VERSION = 1;
