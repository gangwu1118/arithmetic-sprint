import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../common/errors.js';
import { IS_PUBLIC } from '../common/public.decorator.js';
import type { PlayerRequest } from './player.js';
import { hashPlayerKey, keyFromHeader } from './player-keys.js';
import { PlayersRepository } from './players.repository.js';

/**
 * Registered as a global guard, so it runs before every route that is not
 * marked @Public(). It turns the key in the Authorization header into the
 * player, and puts the player on the request for @CurrentPlayer().
 */
@Injectable()
export class PlayerKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly players: PlayersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & PlayerRequest>();
    const key = keyFromHeader(request.headers.authorization);
    const player = key
      ? await this.players.findByKeyHash(hashPlayerKey(key))
      : undefined;
    if (!player) {
      throw new AppError(
        HttpStatus.UNAUTHORIZED,
        'unauthorized',
        'Send a valid player key: Authorization: Bearer <playerKey>.',
      );
    }
    request.player = player;
    return true;
  }
}
