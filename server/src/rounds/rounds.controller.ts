import { Body, Controller, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { timeZoneSchema } from '../common/time-zone.schema.js';
import type { PlayerRow } from '../db/schema.js';
import { INPUT_TYPES, MAX_ANSWER, MAX_ATTEMPTS } from '../domain/config.js';
import { CurrentPlayer } from '../players/current-player.decorator.js';
import { type Result, type Round, RoundsService } from './rounds.service.js';

// The shape of a result. Its meaning (is each attempt possible?) is checked
// by the replay in the domain.
const resultSchema = z.object({
  attempts: z
    .array(
      z.object({
        problemIndex: z.int().min(0),
        answer: z.int().min(0).max(MAX_ANSWER),
        atMs: z.int().min(0),
      }),
    )
    .max(MAX_ATTEMPTS),
  inputType: z.enum(INPUT_TYPES),
  timeZone: timeZoneSchema,
});

@Controller('rounds')
export class RoundsController {
  constructor(private readonly rounds: RoundsService) {}

  @Post()
  async issue(@CurrentPlayer() player: PlayerRow): Promise<{ round: Round }> {
    return { round: await this.rounds.issue(player) };
  }

  @Post(':roundId/result')
  async submit(
    @CurrentPlayer() player: PlayerRow,
    @Param('roundId', { schema: z.uuid() }) roundId: string,
    @Body({ schema: resultSchema }) body: z.infer<typeof resultSchema>,
  ): Promise<{ result: Result }> {
    return { result: await this.rounds.submit(player, roundId, body) };
  }
}
