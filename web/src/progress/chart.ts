// The arithmetic of the progress chart, apart from React, so it can be
// tested. One dot per round at its score; one line through the usual pace.

export type ChartSize = { width: number; height: number; padding: number };

export type ChartGeometry = {
  /** The top of the scale. */
  yMax: number;
  dots: { x: number; y: number }[];
  /** An SVG path through the usual pace of every round. */
  paceLine: string;
  /** Where to draw the scale's labels. */
  ticks: { y: number; value: number }[];
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function chartGeometry(
  rounds: { solved: number; usualPace: number }[],
  size: ChartSize,
): ChartGeometry {
  const { width, height, padding } = size;
  const highest = Math.max(
    0,
    ...rounds.flatMap((round) => [round.solved, round.usualPace]),
  );
  const yMax = Math.max(10, Math.ceil(highest / 5) * 5);

  const x = (i: number) =>
    rounds.length === 1
      ? width / 2
      : padding + (i * (width - 2 * padding)) / (rounds.length - 1);
  const y = (value: number) =>
    padding + (height - 2 * padding) * (1 - value / yMax);

  const dots = rounds.map((round, i) => ({
    x: round1(x(i)),
    y: round1(y(round.solved)),
  }));
  const paceLine = rounds
    .map(
      (round, i) =>
        `${i === 0 ? 'M' : 'L'} ${round1(x(i))} ${round1(y(round.usualPace))}`,
    )
    .join(' ');

  return {
    yMax,
    dots,
    paceLine,
    ticks: [0, yMax / 2, yMax].map((value) => ({
      y: round1(y(value)),
      value,
    })),
  };
}
