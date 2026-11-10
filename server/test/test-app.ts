import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { CLOCK, type Clock } from '../src/common/clock.js';
import { RANDOM } from '../src/common/random.js';
import { configureApp } from '../src/configure-app.js';
import { seededRandom, type Random } from '../src/domain/random.js';
import { TEST_DATABASE_URL } from './test-database.js';

/** A clock the test moves by hand. It starts at 13:00 UTC on 10 November 2026. */
export class TestClock implements Clock {
  private ms = Date.parse('2026-11-10T13:00:00.000Z');

  now(): Date {
    return new Date(this.ms);
  }

  advance(ms: number): void {
    this.ms += ms;
  }

  set(iso: string): void {
    this.ms = Date.parse(iso);
  }
}

export type TestApp = {
  app: INestApplication<App>;
  clock: TestClock;
  /** A request to the running application. */
  http: () => ReturnType<typeof request>;
};

/**
 * The real application, wired exactly like src/main.ts, against the test
 * database, with the clock and the random source replaced.
 */
export async function createTestApp(
  random: Random = seededRandom(1),
): Promise<TestApp> {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const clock = new TestClock();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(RANDOM)
    .useValue(random)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return { app, clock, http: () => request(app.getHttpServer()) };
}

/** Creates a player through the API and returns its key and id. */
export async function createPlayer(
  testApp: TestApp,
  displayName = 'Ada',
): Promise<{ key: string; id: string }> {
  const response = await testApp
    .http()
    .post('/api/players')
    .send({ displayName })
    .expect(201);
  const body = response.body as { player: { id: string }; playerKey: string };
  return { key: body.playerKey, id: body.player.id };
}
