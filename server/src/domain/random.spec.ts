import { describe, expect, it } from 'vitest';
import { randomInt, seededRandom, shuffled } from './random.js';

describe('seededRandom', () => {
  it('gives the same numbers for the same seed', () => {
    const first = seededRandom(42);
    const second = seededRandom(42);
    const a = [first(), first(), first()];
    const b = [second(), second(), second()];

    expect(a).toEqual(b);
  });

  it('gives different numbers for a different seed', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });

  it('stays from 0 up to, but not including, 1', () => {
    const random = seededRandom(7);
    for (let i = 0; i < 10_000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomInt', () => {
  it('returns every whole number in the range, both ends included', () => {
    const random = seededRandom(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1_000; i += 1) seen.add(randomInt(random, 2, 4));

    expect([...seen].sort()).toEqual([2, 3, 4]);
  });
});

describe('shuffled', () => {
  it('returns the same items in some order and leaves the input alone', () => {
    const items = ['a', 'b', 'c', 'd'];
    const result = shuffled(seededRandom(5), items);

    expect([...result].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(items).toEqual(['a', 'b', 'c', 'd']);
  });

  it('can put any item first, including the one that was first', () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      firsts.add(shuffled(seededRandom(seed), ['a', 'b', 'c', 'd'])[0]);
    }

    expect([...firsts].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
