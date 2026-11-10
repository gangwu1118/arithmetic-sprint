import { createHash, randomBytes } from 'node:crypto';

/**
 * A new player key: 32 random bytes, URL-safe. It is shown to the player
 * once and identifies them from then on. It is not a password: there is no
 * sign-in in this exercise (docs/spec.md, section 8).
 */
export function newPlayerKey(): string {
  return randomBytes(32).toString('base64url');
}

/** What the database stores instead of the key. */
export function hashPlayerKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/** The key in an "Authorization: Bearer <key>" header, or null. */
export function keyFromHeader(header: string | undefined): string | null {
  const match = /^Bearer (\S+)$/.exec(header ?? '');
  return match ? match[1] : null;
}
