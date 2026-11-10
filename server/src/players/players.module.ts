import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PlayerKeyGuard } from './player-key.guard.js';
import { PlayersController } from './players.controller.js';
import { PlayersRepository } from './players.repository.js';

@Module({
  controllers: [PlayersController],
  providers: [
    PlayersRepository,
    // Global: every route of every module needs a key unless it is @Public().
    { provide: APP_GUARD, useClass: PlayerKeyGuard },
  ],
  exports: [PlayersRepository],
})
export class PlayersModule {}
