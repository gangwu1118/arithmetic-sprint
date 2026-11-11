import { useEffect, useState } from 'react';
import { api, ApiError, type Progress } from '../api.ts';
import {
  formatChange,
  formatDay,
  formatPace,
  formatSeconds,
  OPERATION_NAME,
} from '../format.ts';
import { ProgressChart } from '../progress/ProgressChart.tsx';
import { WeekStrip } from '../progress/WeekStrip.tsx';
import type { SavedPlayer } from '../storage.ts';

type Props = {
  player: SavedPlayer;
  notice: string | null;
  starting: boolean;
  onStart: () => void;
  onSwitch: () => void;
};

export function HomeScreen({
  player,
  notice,
  starting,
  onStart,
  onSwitch,
}: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .progress(player.key)
      .then((loaded) => {
        if (!cancelled) setProgress(loaded);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : 'The server could not be reached.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [player.key]);

  const summary = progress?.summary;
  const roundsNewestFirst = progress ? [...progress.rounds].reverse() : [];

  return (
    <main>
      <header className="top">
        <div>
          <h1 className="brand">Arithmetic sprint</h1>
          <p className="player">
            {player.displayName}
            {player.isSample && <span className="badge">Sample data</span>}
          </p>
        </div>
        <button type="button" className="link" onClick={onSwitch}>
          Switch player
        </button>
      </header>

      {player.isSample && (
        <p className="notice">
          Sample data: these rounds were simulated by the set-up script. Nobody
          played them.
        </p>
      )}
      {notice && <p className="notice">{notice}</p>}

      <section className="card start">
        <p>
          Solve as many as you can before the time runs out. Type the answer and
          press Enter, or use the keypad. A wrong answer stays until you get it
          right.
        </p>
        <button
          type="button"
          className="primary"
          onClick={onStart}
          disabled={starting}
        >
          {starting ? 'Starting…' : 'Start'}
        </button>
      </section>

      {error && <p className="error">{error}</p>}
      {!progress && !error && <p>Loading your progress…</p>}

      {progress && summary && (
        <>
          <WeekStrip week={progress.week} />

          <section className="card">
            <h2>Your pace</h2>
            {summary.usualPace === null ? (
              <p>Play your first round to see your pace.</p>
            ) : (
              <>
                <p className="big-number">
                  {formatPace(summary.usualPace)}
                  <span> problems a minute, usually</span>
                </p>
                <p>
                  The median of your last {summary.paceWindow} rounds.{' '}
                  {summary.change !== null && summary.startingPace !== null
                    ? `${formatChange(summary.change)} since your first ${summary.paceWindow} (${formatPace(summary.startingPace)}).`
                    : `Your change shows after ${summary.roundsForChange} rounds: ${summary.roundsForChange - summary.roundsCompleted} to go.`}
                </p>
                <ProgressChart
                  rounds={progress.rounds}
                  paceWindow={summary.paceWindow}
                />
              </>
            )}
            <p className="caveat">
              This shows practice at mental arithmetic. Scores rise with
              practice; they are not a measure of intelligence or health.
            </p>
          </section>

          {summary.roundsCompleted > 0 && (
            <section className="card">
              <h2>Where the time goes</h2>
              <p>
                Seconds per problem over your last {summary.paceWindow} rounds.
              </p>
              <table>
                <tbody>
                  {progress.operations.map((pace) => (
                    <tr key={pace.operation}>
                      <th scope="row">{OPERATION_NAME[pace.operation]}</th>
                      <td>{formatSeconds(pace.secondsPerProblem)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {roundsNewestFirst.length > 0 && (
            <section className="card">
              <h2>Recent rounds</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Day</th>
                    <th scope="col">Solved</th>
                    <th scope="col">Mistakes</th>
                    <th scope="col">Usual pace</th>
                    <th scope="col">Input</th>
                  </tr>
                </thead>
                <tbody>
                  {roundsNewestFirst.map((round) => (
                    <tr key={round.roundId}>
                      <td>{formatDay(round.localDay)}</td>
                      <td>{round.solved}</td>
                      <td>{round.mistakes}</td>
                      <td>{formatPace(round.usualPace)}</td>
                      <td>
                        {round.inputType === 'touch' ? 'Keypad' : 'Keyboard'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </main>
  );
}
