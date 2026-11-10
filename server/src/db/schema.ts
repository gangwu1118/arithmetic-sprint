// The database tables (docs/spec.md, section 7). Migrations are generated
// from this file with `npm run db:generate -w server` and committed as SQL.
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { InputType } from '../domain/config.js';
import type { Problem } from '../domain/problems.js';
import type { Attempt, OperationTotals } from '../domain/scoring.js';

export const players = pgTable('players', {
  id: uuid().primaryKey().defaultRandom(),
  displayName: text('display_name').notNull(),
  // SHA-256 of the player key. The key itself is never stored.
  keyHash: text('key_hash').notNull().unique(),
  isSample: boolean('is_sample').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One row per round issued. The result columns stay null until the round
// is completed, so an abandoned round is a row with completed_at null.
export const rounds = pgTable(
  'rounds',
  {
    id: uuid().primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    // As issued, so a round can be scored again if the rules change.
    problems: jsonb().$type<Problem[]>().notNull(),
    durationMs: integer('duration_ms').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    // As received.
    attempts: jsonb().$type<Attempt[]>(),
    solved: integer(),
    mistakes: integer(),
    tooFast: integer('too_fast'),
    operationStats: jsonb('operation_stats').$type<OperationTotals>(),
    inputType: text('input_type').$type<InputType>(),
    localDay: date('local_day', { mode: 'string' }),
    timeZone: text('time_zone'),
    scoringVersion: integer('scoring_version'),
  },
  (table) => [
    index('rounds_player_id_completed_at_idx').on(
      table.playerId,
      table.completedAt,
    ),
  ],
);

export type PlayerRow = typeof players.$inferSelect;
export type RoundRow = typeof rounds.$inferSelect;
