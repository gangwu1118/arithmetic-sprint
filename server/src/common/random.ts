// The random source, as a provider, so tests can replace it with a seeded
// one and know the problems of a round in advance.
import type { Random } from '../domain/random.js';

export const RANDOM = Symbol('RANDOM');

export const systemRandom: Random = () => Math.random();
