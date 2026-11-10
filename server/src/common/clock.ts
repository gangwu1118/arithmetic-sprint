// The time, as a provider, so tests can replace it with a clock they move
// by hand. Code that needs the time injects CLOCK and never calls new Date().
export const CLOCK = Symbol('CLOCK');

export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };
