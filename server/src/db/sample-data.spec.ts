import { describe, expect, it } from 'vitest';
import { median } from '../domain/progress.js';
import { scoreRound } from '../domain/scoring.js';
import { SAMPLE_PLAYERS, sampleHistory } from './sample-data.js';

const NOW = new Date('2026-11-11T02:00:00.000Z');

describe('sample data', () => {
  it('has two sample players with fixed keys', () => {
    expect(SAMPLE_PLAYERS.map((p) => p.displayName)).toEqual([
      'Alex (sample)',
      'Sam (sample)',
    ]);
    expect(new Set(SAMPLE_PLAYERS.map((p) => p.key)).size).toBe(2);
  });

  it.each(SAMPLE_PLAYERS.map((p) => [p.displayName, p] as const))(
    "%s: every round is a real, valid round scored by the game's own rules",
    (_name, sample) => {
      for (const round of sampleHistory(sample, NOW)) {
        const replayed = scoreRound(round.problems, round.attempts);
        expect(replayed.valid).toBe(true);
        if (replayed.valid) expect(replayed.score.solved).toBe(round.solved);
      }
    },
  );

  it.each(SAMPLE_PLAYERS.map((p) => [p.displayName, p] as const))(
    '%s: rounds are in order, all before now, with the stated count',
    (_name, sample) => {
      const history = sampleHistory(sample, NOW);
      const times = history.map((round) => round.completedAt.getTime());

      expect(history).toHaveLength(sample.roundCount);
      expect([...times].sort((x, y) => x - y)).toEqual(times);
      expect(Math.max(...times)).toBeLessThan(NOW.getTime());
    },
  );

  it('shows Alex improving: the last five rounds beat the first five', () => {
    const scores = sampleHistory(SAMPLE_PLAYERS[0], NOW).map((r) => r.solved);

    expect(median(scores.slice(-5))).toBeGreaterThan(
      median(scores.slice(0, 5)),
    );
  });

  it('is the same every time for the same moment', () => {
    expect(sampleHistory(SAMPLE_PLAYERS[1], NOW)).toEqual(
      sampleHistory(SAMPLE_PLAYERS[1], NOW),
    );
  });
});
