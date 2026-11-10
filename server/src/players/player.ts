import type { PlayerRow } from '../db/schema.js';

/** A player as the API shows it. The key hash never leaves the server. */
export type Player = { id: string; displayName: string; isSample: boolean };

export function toPlayer(row: PlayerRow): Player {
  return { id: row.id, displayName: row.displayName, isSample: row.isSample };
}

/** The request after the player key guard has found the player. */
export type PlayerRequest = { player?: PlayerRow };
