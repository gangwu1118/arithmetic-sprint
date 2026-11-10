import { describe, expect, it } from 'vitest';
import { judgeArrival } from './plausibility.js';

const ISSUED_AT = new Date('2026-11-10T09:00:00.000Z');

function msAfterIssue(ms: number): Date {
  return new Date(ISSUED_AT.getTime() + ms);
}

describe("criterion 10: when a result may arrive, by the server's clock", () => {
  it.each([
    [0, 'too_early'],
    [59_999, 'too_early'],
    [60_000, 'in_time'],
    [63_000, 'in_time'],
    [120_000, 'in_time'],
    [120_001, 'expired'],
  ] as const)('%i ms after the round was issued: %s', (ms, expected) => {
    expect(judgeArrival(ISSUED_AT, msAfterIssue(ms))).toBe(expected);
  });
});
