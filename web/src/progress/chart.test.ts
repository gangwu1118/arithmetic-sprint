import { describe, expect, it } from 'vitest';
import { chartGeometry } from './chart.ts';

const SIZE = { width: 600, height: 220, padding: 30 };

describe('progress chart geometry', () => {
  it('puts a single round in the middle', () => {
    const chart = chartGeometry([{ solved: 10, usualPace: 10 }], SIZE);

    expect(chart.dots.map((dot) => dot.x)).toEqual([300]);
  });

  it('spreads rounds evenly from one side to the other', () => {
    const chart = chartGeometry(
      [
        { solved: 10, usualPace: 10 },
        { solved: 10, usualPace: 10 },
        { solved: 10, usualPace: 10 },
      ],
      SIZE,
    );

    expect(chart.dots.map((dot) => dot.x)).toEqual([30, 300, 570]);
  });

  it('scales up to the next multiple of five, and at least to 10', () => {
    expect(chartGeometry([{ solved: 3, usualPace: 3 }], SIZE).yMax).toBe(10);
    expect(chartGeometry([{ solved: 23, usualPace: 21 }], SIZE).yMax).toBe(25);
    expect(chartGeometry([{ solved: 25, usualPace: 25 }], SIZE).yMax).toBe(25);
  });

  it('draws 0 at the bottom and the top of the scale at the top', () => {
    const chart = chartGeometry(
      [
        { solved: 0, usualPace: 0 },
        { solved: 10, usualPace: 10 },
      ],
      SIZE,
    );

    expect(chart.dots.map((dot) => dot.y)).toEqual([190, 30]);
  });

  it('draws the usual pace as one line through every round', () => {
    const chart = chartGeometry(
      [
        { solved: 0, usualPace: 0 },
        { solved: 10, usualPace: 5 },
        { solved: 10, usualPace: 10 },
      ],
      SIZE,
    );

    expect(chart.paceLine).toBe('M 30 190 L 300 110 L 570 30');
  });

  it('draws nothing for no rounds', () => {
    const chart = chartGeometry([], SIZE);

    expect(chart.dots).toEqual([]);
    expect(chart.paceLine).toBe('');
  });
});
