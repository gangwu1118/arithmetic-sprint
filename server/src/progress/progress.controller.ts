import { Controller, Get, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { CLOCK, type Clock } from '../common/clock.js';
import { timeZoneSchema } from '../common/time-zone.schema.js';
import type { PlayerRow } from '../db/schema.js';
import { localDay } from '../domain/days.js';
import { buildProgress, type ProgressReport } from '../domain/progress.js';
import { CurrentPlayer } from '../players/current-player.decorator.js';
import { toPlayer, type Player } from '../players/player.js';
import { ProgressRepository } from './progress.repository.js';

const progressQuerySchema = z.object({ timeZone: timeZoneSchema });

/** The progress report as the API sends it: dates as ISO strings. */
export type Progress = Omit<ProgressReport, 'rounds'> & {
  player: Player;
  rounds: (Omit<ProgressReport['rounds'][number], 'completedAt'> & {
    completedAt: string;
  })[];
};

@Controller('progress')
export class ProgressController {
  constructor(
    private readonly progress: ProgressRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** The time zone decides which day is today, and so which week to show. */
  @Get()
  async get(
    @CurrentPlayer() player: PlayerRow,
    @Query({ schema: progressQuerySchema })
    query: z.infer<typeof progressQuerySchema>,
  ): Promise<Progress> {
    const report = buildProgress(
      await this.progress.completedRounds(player.id),
      localDay(this.clock.now(), query.timeZone),
    );
    return {
      player: toPlayer(player),
      ...report,
      rounds: report.rounds.map((round) => ({
        ...round,
        completedAt: round.completedAt.toISOString(),
      })),
    };
  }
}
