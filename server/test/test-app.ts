import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { TEST_DATABASE_URL } from './test-database.js';

// The real application, wired exactly like src/main.ts, against the test
// database. Tests talk to it over HTTP with supertest.
export async function createTestApp(): Promise<INestApplication<App>> {
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}
