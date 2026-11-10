import { describe, expect, it } from 'vitest';
import {
  formatChange,
  formatDay,
  formatPace,
  formatProblem,
  formatSeconds,
} from './format.ts';

describe('formatting', () => {
  it('writes problems with the usual signs', () => {
    expect(formatProblem({ a: 37, b: 48, operation: 'add' })).toBe('37 + 48');
    expect(formatProblem({ a: 73, b: 28, operation: 'subtract' })).toBe(
      '73 − 28',
    );
    expect(formatProblem({ a: 7, b: 8, operation: 'multiply' })).toBe('7 × 8');
    expect(formatProblem({ a: 84, b: 7, operation: 'divide' })).toBe('84 ÷ 7');
  });

  it('writes seconds to one decimal place, and a dash for none', () => {
    expect(formatSeconds(2)).toBe('2.0 s');
    expect(formatSeconds(2.5)).toBe('2.5 s');
    expect(formatSeconds(null)).toBe('–');
  });

  it('writes a pace as a whole number or with one decimal place', () => {
    expect(formatPace(23)).toBe('23');
    expect(formatPace(12.5)).toBe('12.5');
    expect(formatPace(null)).toBe('–');
  });

  it('writes a change with its sign', () => {
    expect(formatChange(6)).toBe('+6');
    expect(formatChange(-1.5)).toBe('−1.5');
    expect(formatChange(0)).toBe('0');
  });

  it('writes a calendar date the same way in every time zone', () => {
    expect(formatDay('2026-11-10')).toBe('Tue 10 Nov');
    expect(formatDay('2027-01-03')).toBe('Sun 3 Jan');
  });
});
