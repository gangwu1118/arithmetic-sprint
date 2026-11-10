import {
  createParamDecorator,
  type ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { PlayerRow } from '../db/schema.js';
import type { PlayerRequest } from './player.js';

/**
 * The player the guard found from the key. Controllers take the player from
 * here, never from the URL or the body.
 */
export const CurrentPlayer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PlayerRow => {
    const { player } = context.switchToHttp().getRequest<PlayerRequest>();
    // Only reachable if a public route asks for the player by mistake.
    if (!player) throw new InternalServerErrorException('No current player');
    return player;
  },
);
