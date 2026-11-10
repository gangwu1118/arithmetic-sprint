import { Module } from '@nestjs/common';
import { DrizzleModule } from '@nestjs/drizzle';
import { drizzle } from 'drizzle-orm/node-postgres';
import { CommonModule } from './common/common.module.js';
import { databaseUrl } from './config.js';
import { HealthController } from './health/health.controller.js';
import { PlayersModule } from './players/players.module.js';
import { RoundsModule } from './rounds/rounds.module.js';

@Module({
  imports: [
    CommonModule,
    // One connection pool per application, closed when the application
    // closes. The factory runs when the application is created, so tests
    // can point DATABASE_URL at their own database first.
    DrizzleModule.forRootAsync({
      useFactory: () => ({ drizzle, connection: databaseUrl() }),
    }),
    PlayersModule,
    RoundsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
