import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Database } from '../db/database.js';
import { rounds, type RoundRow } from '../db/schema.js';
import type { InputType } from '../domain/config.js';
import type { Problem } from '../domain/problems.js';
import type { Attempt, OperationTotals } from '../domain/scoring.js';

/** What completing a round writes into its result columns. */
export type RoundResultValues = {
  completedAt: Date;
  attempts: Attempt[];
  solved: number;
  mistakes: number;
  tooFast: number;
  operationStats: OperationTotals;
  inputType: InputType;
  localDay: string;
  timeZone: string;
  scoringVersion: number;
};

// Every query takes the player's id, so a player can only ever reach their
// own rounds.
@Injectable()
export class RoundsRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async issue(values: {
    playerId: string;
    problems: Problem[];
    durationMs: number;
    issuedAt: Date;
  }): Promise<RoundRow> {
    const [row] = await this.db.insert(rounds).values(values).returning();
    return row;
  }

  async findForPlayer(
    playerId: string,
    roundId: string,
  ): Promise<RoundRow | undefined> {
    const [row] = await this.db
      .select()
      .from(rounds)
      .where(and(eq(rounds.id, roundId), eq(rounds.playerId, playerId)));
    return row;
  }

  /**
   * Writes the result if, and only if, the round is this player's and has no
   * result yet. The condition is part of the UPDATE, so of two results that
   * arrive together only one is stored. Returns whether this one was.
   */
  async complete(
    playerId: string,
    roundId: string,
    values: RoundResultValues,
  ): Promise<boolean> {
    const updated = await this.db
      .update(rounds)
      .set(values)
      .where(
        and(
          eq(rounds.id, roundId),
          eq(rounds.playerId, playerId),
          isNull(rounds.completedAt),
        ),
      )
      .returning({ id: rounds.id });
    return updated.length === 1;
  }

  /** The score of each of the player's completed rounds, oldest first. */
  async completedRoundScores(
    playerId: string,
  ): Promise<{ roundId: string; solved: number }[]> {
    const rows = await this.db
      .select({ roundId: rounds.id, solved: rounds.solved })
      .from(rounds)
      .where(and(eq(rounds.playerId, playerId), isNotNull(rounds.completedAt)))
      .orderBy(asc(rounds.completedAt));
    return rows.map((row) => ({
      roundId: row.roundId,
      solved: row.solved ?? 0,
    }));
  }
}
