import { Module } from '@nestjs/common';
import { RoundsController } from './rounds.controller.js';
import { RoundsRepository } from './rounds.repository.js';
import { RoundsService } from './rounds.service.js';

@Module({
  controllers: [RoundsController],
  providers: [RoundsService, RoundsRepository],
})
export class RoundsModule {}
