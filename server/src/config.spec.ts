import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DATABASE_URL,
  DEFAULT_PORT,
  databaseUrl,
  port,
} from './config.js';

describe('config', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('falls back to the local defaults', () => {
    delete process.env.DATABASE_URL;
    delete process.env.PORT;

    expect(databaseUrl()).toBe(DEFAULT_DATABASE_URL);
    expect(port()).toBe(DEFAULT_PORT);
  });

  it('prefers the environment', () => {
    process.env.DATABASE_URL = 'postgres://elsewhere/db';
    process.env.PORT = '9999';

    expect(databaseUrl()).toBe('postgres://elsewhere/db');
    expect(port()).toBe(9999);
  });
});
