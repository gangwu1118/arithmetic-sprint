import type { Result } from '../api.ts';
import {
  formatPace,
  formatProblem,
  formatSeconds,
  OPERATION_NAME,
} from '../format.ts';

type Props = {
  result: Result;
  starting: boolean;
  onPlayAgain: () => void;
  onBack: () => void;
};

export function ResultScreen({ result, starting, onPlayAgain, onBack }: Props) {
  return (
    <main>
      <h1>You solved {result.solved}</h1>
      <section className="card">
        <p className="big-number">
          {result.solved}
          <span> in 60 seconds</span>
        </p>
        <p>
          {result.previousUsualPace === null
            ? 'Your first round: your usual pace starts here.'
            : `Your usual pace was ${formatPace(result.previousUsualPace)} and is now ${formatPace(result.usualPace)}.`}
        </p>
        <p>
          {result.mistakes} {result.mistakes === 1 ? 'mistake' : 'mistakes'}.
          {result.tooFast > 0 &&
            ` ${result.tooFast} answered faster than anyone can read a problem, so not counted.`}
        </p>
      </section>

      {result.slowest.length > 0 && (
        <section className="card">
          <h2>Your slowest problems</h2>
          <ul className="slowest">
            {result.slowest.map((problem, i) => (
              <li key={i}>
                <span>
                  {formatProblem(problem)} = {problem.answer}
                </span>
                <span>{formatSeconds(problem.seconds)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Seconds per problem</h2>
        <table>
          <tbody>
            {result.operations.map((pace) => (
              <tr key={pace.operation}>
                <th scope="row">{OPERATION_NAME[pace.operation]}</th>
                <td>{pace.solved} solved</td>
                <td>{formatSeconds(pace.secondsPerProblem)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={onPlayAgain}
          disabled={starting}
        >
          {starting ? 'Starting…' : 'Play again'}
        </button>
        <button type="button" onClick={onBack}>
          Back to progress
        </button>
      </div>
    </main>
  );
}
