import { describe, expect, it } from 'vitest';
import { hashPlayerKey, keyFromHeader, newPlayerKey } from './player-keys.js';

describe('criterion 12: player keys', () => {
  it('makes a new, long, URL-safe key every time', () => {
    const first = newPlayerKey();
    const second = newPlayerKey();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('stores a SHA-256 hash that is stable and is not the key', () => {
    // SHA-256 of "abc", from the standard's published test vectors.
    expect(hashPlayerKey('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(hashPlayerKey('abc')).toBe(hashPlayerKey('abc'));
  });
});

describe('reading the key from the Authorization header', () => {
  it.each([
    ['Bearer abc123', 'abc123'],
    [undefined, null],
    ['', null],
    ['Bearer ', null],
    ['Basic abc123', null],
    ['Bearer abc 123', null],
  ])('%j gives %j', (header, expected) => {
    expect(keyFromHeader(header)).toBe(expected);
  });
});
