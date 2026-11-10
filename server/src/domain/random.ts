// A source of random numbers from 0 up to, but not including, 1, like
// Math.random. The game takes one as an argument, so tests and sample data
// can pass a seeded one and get the same problems every time.
export type Random = () => number;

/**
 * mulberry32, a small seeded generator. Good enough to shuffle a game, and
 * not meant for anything secret.
 */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** A whole number from min to max, both included. */
export function randomInt(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

/** A shuffled copy of the items (Fisher-Yates). */
export function shuffled<T>(random: Random, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(random, 0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
