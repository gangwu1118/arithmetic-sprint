import { useEffect, useReducer, useRef, useState } from 'react';
import type { Attempt, InputType, Round } from '../api.ts';
import { formatProblem } from '../format.ts';
import { initialRound, resultToSend, roundReducer } from './round-machine.ts';

const COUNTDOWN_SECONDS = 3;
const KEYPAD = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'delete',
  '0',
  'ok',
];

type Props = {
  round: Round;
  onFinished: (result: { attempts: Attempt[]; inputType: InputType }) => void;
  onAbandoned: () => void;
};

export function PlayScreen({ round, onFinished, onAbandoned }: Props) {
  const [state, dispatch] = useReducer(roundReducer, round, (r) =>
    initialRound(r.problems, r.durationMs),
  );
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsedMs, setElapsedMs] = useState(0);
  // When the first problem appeared, on the browser's monotonic clock.
  const startedAt = useRef<number | null>(null);
  const ended = useRef(false);

  const now = () =>
    startedAt.current === null
      ? 0
      : Math.round(performance.now() - startedAt.current);

  // The countdown, then the first problem.
  useEffect(() => {
    if (state.phase !== 'countdown') return;
    if (countdown === 0) {
      startedAt.current = performance.now();
      dispatch({ type: 'start' });
      return;
    }
    const timer = setTimeout(() => setCountdown((n) => n - 1), 1_000);
    return () => clearTimeout(timer);
  }, [countdown, state.phase]);

  // The clock, while the round is in play.
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const timer = setInterval(() => {
      const atMs = now();
      setElapsedMs(atMs);
      dispatch({ type: 'tick', atMs });
    }, 100);
    return () => clearInterval(timer);
  }, [state.phase]);

  // The keyboard: digits, Backspace and Enter.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (/^\d$/.test(event.key)) {
        dispatch({ type: 'digit', digit: event.key, source: 'keyboard' });
      } else if (event.key === 'Backspace') {
        dispatch({ type: 'delete', source: 'keyboard' });
      } else if (event.key === 'Enter') {
        dispatch({ type: 'submit', atMs: now(), source: 'keyboard' });
      } else {
        return;
      }
      event.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // A hidden page abandons the round (docs/spec.md, section 3).
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') dispatch({ type: 'hidden' });
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Hand the round back exactly once when it ends.
  useEffect(() => {
    if (ended.current) return;
    if (state.phase === 'finished') {
      const result = resultToSend(state);
      if (result) {
        ended.current = true;
        onFinished(result);
      }
    } else if (state.phase === 'abandoned') {
      ended.current = true;
      onAbandoned();
    }
  }, [state, onFinished, onAbandoned]);

  function press(key: string) {
    if (key === 'delete') dispatch({ type: 'delete', source: 'touch' });
    else if (key === 'ok')
      dispatch({ type: 'submit', atMs: now(), source: 'touch' });
    else dispatch({ type: 'digit', digit: key, source: 'touch' });
  }

  const problem = state.problems[state.current];
  const timeLeft = Math.max(0, 1 - elapsedMs / state.durationMs);

  return (
    <main className="play">
      <div
        className="time-bar"
        role="progressbar"
        aria-label="Time left"
        aria-valuemin={0}
        aria-valuemax={60}
        aria-valuenow={Math.ceil((timeLeft * state.durationMs) / 1_000)}
      >
        <div style={{ width: `${timeLeft * 100}%` }} />
      </div>

      {state.phase === 'countdown' && (
        <p className="countdown" aria-live="assertive">
          {countdown > 0 ? countdown : 'Go'}
        </p>
      )}

      {state.phase === 'playing' && problem && (
        <>
          <p className="solved-count">{state.current} solved</p>
          <p
            className="problem"
            data-testid="problem"
            data-a={problem.a}
            data-b={problem.b}
            data-operation={problem.operation}
          >
            {formatProblem(problem)} =
          </p>
          <p
            className={state.lastAnswerWrong ? 'entry wrong' : 'entry'}
            data-testid="entry"
          >
            {state.draft || '?'}
          </p>
          <p className="hint" aria-live="polite">
            {state.lastAnswerWrong ? 'Not quite. Try again.' : ' '}
          </p>
          <div className="keypad">
            {KEYPAD.map((key) => (
              <button
                key={key}
                type="button"
                tabIndex={-1}
                className={key === 'ok' ? 'key ok' : 'key'}
                aria-label={
                  key === 'delete' ? 'Delete' : key === 'ok' ? 'OK' : key
                }
                // Keep focus off the keypad, so Enter on a keyboard never
                // presses a key of it too.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => press(key)}
              >
                {key === 'delete' ? '⌫' : key === 'ok' ? 'OK' : key}
              </button>
            ))}
          </div>
        </>
      )}

      {state.phase === 'finished' && (
        <p className="countdown" aria-live="assertive">
          Time is up
        </p>
      )}
    </main>
  );
}
