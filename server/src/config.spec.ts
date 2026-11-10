import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DATABASE_URL,
  DEFAULT_HOST,
  DEFAULT_PORT,
  databaseUrl,
  host,
  port,
} from './config.js';

describe('config', () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it('falls back to the local defaults', () => {
    delete process.env.DATABASE_URL;
    delete process.env.API_PORT;
    delete process.env.API_HOST;

    expect(databaseUrl()).toBe(DEFAULT_DATABASE_URL);
    expect(port()).toBe(DEFAULT_PORT);
    expect(host()).toBe(DEFAULT_HOST);
  });

  it('prefers its own variables in the environment', () => {
    process.env.DATABASE_URL = 'postgres://elsewhere/db';
    process.env.API_PORT = '9999';
    process.env.API_HOST = '0.0.0.0';

    expect(databaseUrl()).toBe('postgres://elsewhere/db');
    expect(port()).toBe(9999);
    expect(host()).toBe('0.0.0.0');
  });

  it('ignores PORT and HOST, which tools set for the web server', () => {
    process.env.PORT = '5193';
    process.env.HOST = 'localhost';
    delete process.env.API_PORT;
    delete process.env.API_HOST;

    expect(port()).toBe(DEFAULT_PORT);
    expect(host()).toBe(DEFAULT_HOST);
  });
});
