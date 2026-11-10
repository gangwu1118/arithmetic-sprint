import type { Progress } from '../api.ts';
import { formatDay, formatPace } from '../format.ts';
import { chartGeometry } from './chart.ts';

const SIZE = { width: 600, height: 220, padding: 30 };

type Props = { rounds: Progress['rounds']; paceWindow: number };

export function ProgressChart({ rounds, paceWindow }: Props) {
  const chart = chartGeometry(rounds, SIZE);
  const last = rounds.at(-1);

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${SIZE.width} ${SIZE.height}`}
        role="img"
        aria-label={
          last
            ? `Scores of your last ${rounds.length} rounds. Your usual pace is now ${formatPace(last.usualPace)}.`
            : 'No rounds yet.'
        }
      >
        {chart.ticks.map((tick) => (
          <g key={tick.value}>
            <line
              className="grid"
              x1={SIZE.padding}
              x2={SIZE.width - SIZE.padding}
              y1={tick.y}
              y2={tick.y}
            />
            <text className="tick" x={SIZE.padding - 8} y={tick.y + 4}>
              {tick.value}
            </text>
          </g>
        ))}
        <path className="pace-line" d={chart.paceLine} />
        {chart.dots.map((dot, i) => {
          const round = rounds[i];
          const keypad = round.inputType === 'touch';
          return (
            <circle
              key={round.roundId}
              className={keypad ? 'dot keypad-round' : 'dot'}
              cx={dot.x}
              cy={dot.y}
              r={5}
            >
              <title>
                {formatDay(round.localDay)}: {round.solved} solved,{' '}
                {keypad ? 'keypad' : 'keyboard'}
              </title>
            </circle>
          );
        })}
      </svg>
      <figcaption>
        Each dot is one round: hollow for the keyboard, filled for the keypad,
        because typing speed is part of the score. The line is your usual pace:
        the median of that round and up to {paceWindow - 1} before it, so one
        bad round barely moves it.
      </figcaption>
    </figure>
  );
}
