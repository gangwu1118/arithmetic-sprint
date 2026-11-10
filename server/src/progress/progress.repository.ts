import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import type { Database } from '../db/database.js';
import { rounds } from '../db/schema.js';
import type { CompletedRound } from '../domain/progress.js';

@Injectable()
export class ProgressRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * The player's completed rounds, oldest first. A round that was issued and
   * never completed has no completed_at, so it is left out here.
   */
  async completedRounds(playerId: string): Promise<CompletedRound[]> {
    const rows = await this.db
      .select()
      .from(rounds)
      .where(and(eq(rounds.playerId, playerId), isNotNull(rounds.completedAt)))
      .orderBy(asc(rounds.completedAt));

    return rows.map((row) => {
      if (
        !row.completedAt ||
        !row.localDay ||
        row.solved === null ||
        row.mistakes === null ||
        !row.inputType ||
        !row.operationStats
      ) {
        throw new Error(`Round ${row.id} is completed but has no result`);
      }
      return {
        roundId: row.id,
        completedAt: row.completedAt,
        localDay: row.localDay,
        solved: row.solved,
        mistakes: row.mistakes,
        inputType: row.inputType,
        operations: row.operationStats,
      };
    });
  }
}
