import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../common/public.decorator.js';
import type { PlayerRow } from '../db/schema.js';
import { MAX_DISPLAY_NAME_LENGTH } from '../domain/config.js';
import { CurrentPlayer } from './current-player.decorator.js';
import { toPlayer, type Player } from './player.js';
import { hashPlayerKey, newPlayerKey } from './player-keys.js';
import { PlayersRepository } from './players.repository.js';

const createPlayerSchema = z.object({
  displayName: z.string().trim().min(1).max(MAX_DISPLAY_NAME_LENGTH),
});

@Controller()
export class PlayersController {
  constructor(private readonly players: PlayersRepository) {}

  /** The only time the key is sent. The database keeps its hash. */
  @Public()
  @Post('players')
  async create(
    @Body({ schema: createPlayerSchema })
    body: z.infer<typeof createPlayerSchema>,
  ): Promise<{ player: Player; playerKey: string }> {
    const playerKey = newPlayerKey();
    const row = await this.players.create({
      displayName: body.displayName,
      keyHash: hashPlayerKey(playerKey),
    });
    return { player: toPlayer(row), playerKey };
  }

  @Get('me')
  me(@CurrentPlayer() player: PlayerRow): { player: Player } {
    return { player: toPlayer(player) };
  }
}
