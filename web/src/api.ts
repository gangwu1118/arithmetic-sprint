// The only module that talks to the API. The types follow docs/spec.md,
// section 8, which is the contract between the browser and the server.

export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

/** "a operation b". The answer is not sent. */
export type Problem = { a: number; b: number; operation: Operation };

export type Player = { id: string; displayName: string; isSample: boolean };

export type Round = { id: string; durationMs: number; problems: Problem[] };

export type Attempt = { problemIndex: number; answer: number; atMs: number };

export type InputType = 'keyboard' | 'touch';

export type OperationPace = {
  operation: Operation;
  solved: number;
  secondsPerProblem: number | null;
};

export type Result = {
  roundId: string;
  completedAt: string;
  localDay: string;
  solved: number;
  mistakes: number;
  tooFast: number;
  usualPace: number;
  previousUsualPace: number | null;
  operations: OperationPace[];
  slowest: (Problem & { answer: number; seconds: number })[];
};

export type Progress = {
  player: Player;
  summary: {
    roundsCompleted: number;
    usualPace: number | null;
    startingPace: number | null;
    change: number | null;
    paceWindow: number;
    roundsForChange: number;
  };
  week: {
    today: string;
    goalDays: number;
    daysPractised: number;
    days: { date: string; rounds: number }[];
  };
  operations: OperationPace[];
  rounds: {
    roundId: string;
    completedAt: string;
    localDay: string;
    solved: number;
    mistakes: number;
    inputType: InputType;
    usualPace: number;
  }[];
};

/** An error the API sent back, with its code from the spec. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call<T>(
  method: 'GET' | 'POST',
  path: string,
  options: { key?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.key) headers.Authorization = `Bearer ${options.key}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body ?? {}) as { code?: string; message?: string };
    throw new ApiError(
      response.status,
      error.code ?? 'unknown_error',
      error.message ?? `The server answered ${response.status}.`,
    );
  }
  return body as T;
}

/** The browser's IANA time zone, which decides the player's "today". */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const api = {
  createPlayer: (displayName: string) =>
    call<{ player: Player; playerKey: string }>('POST', '/players', {
      body: { displayName },
    }),

  me: (key: string) => call<{ player: Player }>('GET', '/me', { key }),

  startRound: (key: string) =>
    call<{ round: Round }>('POST', '/rounds', { key }),

  submitResult: (
    key: string,
    roundId: string,
    result: { attempts: Attempt[]; inputType: InputType },
  ) =>
    call<{ result: Result }>('POST', `/rounds/${roundId}/result`, {
      key,
      body: { ...result, timeZone: browserTimeZone() },
    }),

  progress: (key: string) =>
    call<Progress>(
      'GET',
      `/progress?timeZone=${encodeURIComponent(browserTimeZone())}`,
      { key },
    ),
};
