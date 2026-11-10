import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { createTestApp } from './test-app.js';

describe('GET /api/health', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers ok when the database is reachable', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ ok: true });
  });

  it('is served under the /api prefix only', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });
});
