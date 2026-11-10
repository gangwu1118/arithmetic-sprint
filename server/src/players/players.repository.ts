import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/database.js';
import { players, type PlayerRow } from '../db/schema.js';

@Injectable()
export class PlayersRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async create(values: {
    displayName: string;
    keyHash: string;
    isSample?: boolean;
  }): Promise<PlayerRow> {
    const [row] = await this.db.insert(players).values(values).returning();
    return row;
  }

  async findByKeyHash(keyHash: string): Promise<PlayerRow | undefined> {
    const [row] = await this.db
      .select()
      .from(players)
      .where(eq(players.keyHash, keyHash));
    return row;
  }
}
