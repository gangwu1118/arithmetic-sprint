import { LATE_ALLOWANCE_MS, ROUND_DURATION_MS } from './config.js';

export type Arrival = 'too_early' | 'in_time' | 'expired';

/**
 * Judges when a result arrives, by the server's own clock (docs/spec.md,
 * section 4.3). It cannot arrive before the round could have been played,
 * nor long after it ended. Both limits are inclusive.
 */
export function judgeArrival(
  issuedAt: Date,
  arrivedAt: Date,
  durationMs: number = ROUND_DURATION_MS,
): Arrival {
  const elapsedMs = arrivedAt.getTime() - issuedAt.getTime();
  if (elapsedMs < durationMs) return 'too_early';
  if (elapsedMs > durationMs + LATE_ALLOWANCE_MS) return 'expired';
  return 'in_time';
}
