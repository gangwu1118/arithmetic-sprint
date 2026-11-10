import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { players } from '../src/db/schema.js';
import { hashPlayerKey } from '../src/players/player-keys.js';
import { createPlayer, createTestApp, type TestApp } from './test-app.js';
import {
  emptyTables,
  openTestDatabase,
  type TestDatabase,
} from './test-database.js';

// Every route that needs a player key (docs/spec.md, section 8).
const A_ROUND_ID = '00000000-0000-4000-8000-000000000000';

const PROTECTED_ROUTES: [method: 'get' | 'post', path: string][] = [
  ['get', '/api/me'],
  ['post', '/api/rounds'],
  ['post', `/api/rounds/${A_ROUND_ID}/result`],
  ['get', '/api/progress?timeZone=UTC'],
];

describe('players', () => {
  let testApp: TestApp;
  let db: TestDatabase;

  beforeAll(async () => {
    testApp = await createTestApp();
    db = openTestDatabase();
  });

  beforeEach(async () => {
    await emptyTables(db);
  });

  afterAll(async () => {
    await testApp.app.close();
    await db.$client.end();
  });

  describe('criterion 12: creating a player returns the key once', () => {
    it('returns the player and a key, and the key identifies the player', async () => {
      const created = await testApp
        .http()
        .post('/api/players')
        .send({ displayName: '  Ada  ' })
        .expect(201);
      const body = created.body as {
        player: { id: string; displayName: string; isSample: boolean };
        playerKey: string;
      };

      expect(body.player.displayName).toBe('Ada');
      expect(body.player.isSample).toBe(false);

      const me = await testApp
        .http()
        .get('/api/me')
        .set('Authorization', `Bearer ${body.playerKey}`)
        .expect(200);
      expect(me.body).toEqual({ player: body.player });
    });

    it('stores only the hash of the key', async () => {
      const { key, id } = await createPlayer(testApp);
      const [row] = await db.select().from(players).where(eq(players.id, id));

      expect(row.keyHash).toBe(hashPlayerKey(key));
      expect(Object.values(row).map(String)).not.toContain(key);
    });
  });

  describe('criterion 13: every protected route answers 401 without a valid key', () => {
    const headers: [label: string, value: string | undefined][] = [
      ['no header', undefined],
      ['a header of another scheme', 'Basic abc123'],
      ['an empty key', 'Bearer '],
      ['a key nobody has', 'Bearer not-a-real-key'],
    ];

    for (const [method, path] of PROTECTED_ROUTES) {
      it.each(headers)(
        `${method.toUpperCase()} ${path} with %s`,
        async (_label, value) => {
          const call = testApp.http()[method](path);
          if (value !== undefined) call.set('Authorization', value);
          const response = await call.send({});

          expect(response.status).toBe(401);
          expect((response.body as { code: string }).code).toBe('unauthorized');
        },
      );
    }
  });

  describe('criterion 25: a display name must be 1 to 40 characters after trimming', () => {
    it.each([
      ['empty', ''],
      ['only spaces', '   '],
      ['41 characters', 'x'.repeat(41)],
      ['not a string', 42],
      ['missing', undefined],
    ])('refuses a name that is %s', async (_label, displayName) => {
      const response = await testApp
        .http()
        .post('/api/players')
        .send(displayName === undefined ? {} : { displayName })
        .expect(400);

      const body = response.body as {
        code: string;
        issues: { path: string }[];
      };
      expect(body.code).toBe('invalid_request');
      expect(body.issues.map((issue) => issue.path)).toEqual(['displayName']);
      expect(await db.select().from(players)).toHaveLength(0);
    });

    it('accepts 40 characters', async () => {
      await testApp
        .http()
        .post('/api/players')
        .send({ displayName: 'x'.repeat(40) })
        .expect(201);
    });
  });
});
