import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller.js';
import { ProgressRepository } from './progress.repository.js';

@Module({
  controllers: [ProgressController],
  providers: [ProgressRepository],
})
export class ProgressModule {}
