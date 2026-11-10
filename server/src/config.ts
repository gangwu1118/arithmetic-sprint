// Settings that differ between machines. Each one has a default that
// matches docker-compose.yml, so local development needs no .env file.

export const DEFAULT_DATABASE_URL =
  'postgres://sprint:sprint@127.0.0.1:54331/sprint';

export const DEFAULT_PORT = 4320;

// Listen on this machine only unless told otherwise.
export const DEFAULT_HOST = '127.0.0.1';

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

export function port(): number {
  return Number(process.env.PORT ?? DEFAULT_PORT);
}

export function host(): string {
  return process.env.HOST ?? DEFAULT_HOST;
}
