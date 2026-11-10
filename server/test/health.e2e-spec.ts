import { afterAll, beforeAll, describe, it } from 'vitest';
import { createTestApp, type TestApp } from './test-app.js';

describe('GET /api/health', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('answers ok when the database is reachable, with no player key', async () => {
    await testApp.http().get('/api/health').expect(200).expect({ ok: true });
  });

  it('is served under the /api prefix only', async () => {
    await testApp.http().get('/health').expect(404);
  });
});
