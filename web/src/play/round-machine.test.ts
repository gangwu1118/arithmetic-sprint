import { describe, expect, it } from 'vitest';
import type { Problem } from '../api.ts';
import {
  initialRound,
  resultToSend,
  roundReducer,
  type RoundEvent,
  type RoundState,
} from './round-machine.ts';

const PROBLEMS: Problem[] = [
  { a: 37, b: 48, operation: 'add' }, // 85
  { a: 73, b: 28, operation: 'subtract' }, // 45
  { a: 7, b: 8, operation: 'multiply' }, // 56
];

function run(events: RoundEvent[], state = initialRound(PROBLEMS, 60_000)) {
  return events.reduce<RoundState>(roundReducer, state);
}

const type = (digits: string, source: 'keyboard' | 'touch' = 'keyboard') =>
  [...digits].map((digit): RoundEvent => ({ type: 'digit', digit, source }));

const submit = (
  atMs: number,
  source: 'keyboard' | 'touch' = 'keyboard',
): RoundEvent => ({ type: 'submit', atMs, source });

describe('the round in the browser', () => {
  it('ignores input during the countdown', () => {
    const state = run([...type('85'), submit(500)]);

    expect(state.phase).toBe('countdown');
    expect(state.attempts).toEqual([]);
  });

  it('records each answer with its time since the first problem appeared', () => {
    const state = run([
      { type: 'start' },
      ...type('85'),
      submit(2_000),
      ...type('45'),
      submit(4_500),
    ]);

    expect(state.attempts).toEqual([
      { problemIndex: 0, answer: 85, atMs: 2_000 },
      { problemIndex: 1, answer: 45, atMs: 4_500 },
    ]);
    expect(state.current).toBe(2);
  });

  it('keeps the problem after a wrong answer, marks it, and clears the entry', () => {
    const state = run([{ type: 'start' }, ...type('84'), submit(2_000)]);

    expect(state.current).toBe(0);
    expect(state.lastAnswerWrong).toBe(true);
    expect(state.draft).toBe('');
    expect(state.attempts).toEqual([
      { problemIndex: 0, answer: 84, atMs: 2_000 },
    ]);
  });

  it('does not submit an empty entry', () => {
    expect(run([{ type: 'start' }, submit(1_000)]).attempts).toEqual([]);
  });

  it('takes at most four digits and can delete the last one', () => {
    const state = run([
      { type: 'start' },
      ...type('12345'),
      { type: 'delete', source: 'keyboard' },
    ]);

    expect(state.draft).toBe('123');
  });

  it('ends the round at 60 seconds', () => {
    const state = run([{ type: 'start' }, { type: 'tick', atMs: 60_000 }]);

    expect(state.phase).toBe('finished');
  });

  it('ignores an answer after the 60 seconds, and ends the round', () => {
    const state = run([{ type: 'start' }, ...type('85'), submit(60_001)]);

    expect(state.phase).toBe('finished');
    expect(state.attempts).toEqual([]);
  });

  it('accepts an answer at exactly 60 seconds', () => {
    const state = run([{ type: 'start' }, ...type('85'), submit(60_000)]);

    expect(state.attempts).toHaveLength(1);
  });

  it('ends the round when every problem is solved', () => {
    const state = run([
      { type: 'start' },
      ...type('85'),
      submit(1_000),
      ...type('45'),
      submit(2_000),
      ...type('56'),
      submit(3_000),
    ]);

    expect(state.phase).toBe('finished');
  });

  describe('criterion 22: a hidden page abandons the round', () => {
    it('abandons a round in play, with nothing to send', () => {
      const state = run([
        { type: 'start' },
        ...type('85'),
        submit(2_000),
        { type: 'hidden' },
      ]);

      expect(state.phase).toBe('abandoned');
      expect(resultToSend(state)).toBeNull();
    });

    it('abandons a round during the countdown', () => {
      expect(run([{ type: 'hidden' }]).phase).toBe('abandoned');
    });

    it('does not undo a finished round', () => {
      const state = run([
        { type: 'start' },
        { type: 'tick', atMs: 60_000 },
        { type: 'hidden' },
      ]);

      expect(state.phase).toBe('finished');
    });
  });

  describe('what is sent when the round ends', () => {
    it('sends the attempts, and nothing before the round has ended', () => {
      const playing = run([{ type: 'start' }, ...type('85'), submit(2_000)]);
      const finished = run([{ type: 'tick', atMs: 60_000 }], playing);

      expect(resultToSend(playing)).toBeNull();
      expect(resultToSend(finished)).toEqual({
        attempts: [{ problemIndex: 0, answer: 85, atMs: 2_000 }],
        inputType: 'keyboard',
      });
    });

    it('reports touch when the on-screen keypad entered most answers', () => {
      const state = run([
        { type: 'start' },
        ...type('85', 'touch'),
        submit(2_000, 'touch'),
        ...type('45', 'touch'),
        submit(4_000, 'touch'),
        ...type('56'),
        submit(6_000),
        { type: 'tick', atMs: 60_000 },
      ]);

      expect(resultToSend(state)?.inputType).toBe('touch');
    });
  });
});
