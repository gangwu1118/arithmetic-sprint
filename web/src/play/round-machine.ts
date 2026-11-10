// The logic of one round in the browser, as a pure reducer with no React in
// it, so it can be unit-tested (docs/test-plan.md, criterion 22). The page
// feeds it events with times measured from when the first problem appeared.
// It never scores: it only records what the player entered and when.
import type { Attempt, InputType, Problem } from '../api.ts';

export type RoundState = {
  phase: 'countdown' | 'playing' | 'finished' | 'abandoned';
  problems: Problem[];
  durationMs: number;
  /** The problem on screen. */
  current: number;
  /** The digits typed so far for the current problem. */
  draft: string;
  lastAnswerWrong: boolean;
  attempts: Attempt[];
  /** How many answers each way of entering them submitted. */
  answersBy: Record<InputType, number>;
};

export type RoundEvent =
  | { type: 'start' }
  | { type: 'digit'; digit: string; source: InputType }
  | { type: 'delete'; source: InputType }
  | { type: 'submit'; atMs: number; source: InputType }
  | { type: 'tick'; atMs: number }
  | { type: 'hidden' };

/** The longest answer is 144, and the API accepts up to 9,999. */
const MAX_DIGITS = 4;

export function initialRound(
  problems: Problem[],
  durationMs: number,
): RoundState {
  return {
    phase: 'countdown',
    problems,
    durationMs,
    current: 0,
    draft: '',
    lastAnswerWrong: false,
    attempts: [],
    answersBy: { keyboard: 0, touch: 0 },
  };
}

/** The right answer, only to decide whether to move on. The server scores. */
function answerOf(problem: Problem): number {
  switch (problem.operation) {
    case 'add':
      return problem.a + problem.b;
    case 'subtract':
      return problem.a - problem.b;
    case 'multiply':
      return problem.a * problem.b;
    case 'divide':
      return problem.a / problem.b;
  }
}

export function roundReducer(state: RoundState, event: RoundEvent): RoundState {
  // A hidden page cannot show the problems on time, so the round is
  // abandoned and never sent (docs/spec.md, section 3).
  if (event.type === 'hidden') {
    return state.phase === 'countdown' || state.phase === 'playing'
      ? { ...state, phase: 'abandoned' }
      : state;
  }
  if (event.type === 'start') {
    return state.phase === 'countdown' ? { ...state, phase: 'playing' } : state;
  }
  if (state.phase !== 'playing') return state;

  switch (event.type) {
    case 'tick':
      return event.atMs >= state.durationMs
        ? { ...state, phase: 'finished' }
        : state;

    case 'digit':
      if (!/^\d$/.test(event.digit) || state.draft.length >= MAX_DIGITS) {
        return state;
      }
      return { ...state, draft: state.draft + event.digit };

    case 'delete':
      return { ...state, draft: state.draft.slice(0, -1) };

    case 'submit': {
      // Input after the round's time is ignored; the round is over.
      if (event.atMs > state.durationMs) return { ...state, phase: 'finished' };
      if (state.draft === '') return state;

      const answer = Number(state.draft);
      const right = answer === answerOf(state.problems[state.current]);
      const next = right ? state.current + 1 : state.current;
      return {
        ...state,
        phase: next >= state.problems.length ? 'finished' : 'playing',
        current: next,
        draft: '',
        lastAnswerWrong: !right,
        attempts: [
          ...state.attempts,
          { problemIndex: state.current, answer, atMs: event.atMs },
        ],
        answersBy: {
          ...state.answersBy,
          [event.source]: state.answersBy[event.source] + 1,
        },
      };
    }
  }
}

/** What to send once the round has ended, or null if nothing should be. */
export function resultToSend(
  state: RoundState,
): { attempts: Attempt[]; inputType: InputType } | null {
  if (state.phase !== 'finished') return null;
  const inputType: InputType =
    state.answersBy.touch > state.answersBy.keyboard ? 'touch' : 'keyboard';
  return { attempts: state.attempts, inputType };
}
