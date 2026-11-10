import { Controller, Get } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Public } from '../common/public.decorator.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    @InjectDrizzle()
    private readonly db: NodePgDatabase,
  ) {}

  // Answers only when the database answers, so "ok" means the whole path
  // from HTTP to PostgreSQL works.
  @Get()
  async check(): Promise<{ ok: true }> {
    await this.db.execute(sql`select 1`);
    return { ok: true };
  }
}
