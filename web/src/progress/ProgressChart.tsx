import type { Progress } from '../api.ts';
import { formatDay, formatPace } from '../format.ts';
import { chartGeometry } from './chart.ts';

const SIZE = { width: 600, height: 220, padding: 30 };

export function ProgressChart({ rounds }: { rounds: Progress['rounds'] }) {
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
        {chart.dots.map((dot, i) => (
          <circle
            key={rounds[i].roundId}
            className="dot"
            cx={dot.x}
            cy={dot.y}
            r={5}
          >
            <title>
              {formatDay(rounds[i].localDay)}: {rounds[i].solved} solved
            </title>
          </circle>
        ))}
      </svg>
      <figcaption>
        Each dot is one round. The line is your usual pace: the median of that
        round and up to four before it, so one bad round barely moves it.
      </figcaption>
    </figure>
  );
}
