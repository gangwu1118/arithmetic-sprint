import type { Operation, Problem } from './api.ts';

export const OPERATION_SIGN: Record<Operation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
};

export const OPERATION_NAME: Record<Operation, string> = {
  add: 'Addition',
  subtract: 'Subtraction',
  multiply: 'Multiplication',
  divide: 'Division',
};

export function formatProblem(problem: Problem): string {
  return `${problem.a} ${OPERATION_SIGN[problem.operation]} ${problem.b}`;
}

export function formatSeconds(seconds: number | null): string {
  return seconds === null ? '–' : `${seconds.toFixed(1)} s`;
}

/** A pace is a median of whole scores, so it is whole or ends in .5. */
export function formatPace(pace: number | null): string {
  if (pace === null) return '–';
  return Number.isInteger(pace) ? String(pace) : pace.toFixed(1);
}

export function formatChange(change: number): string {
  if (change > 0) return `+${formatPace(change)}`;
  if (change < 0) return `−${formatPace(-change)}`;
  return '0';
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * A calendar date (YYYY-MM-DD) such as "Tue 10 Nov". The API already gives
 * the player's local day, so this reads it at midnight UTC and never moves
 * it to another day.
 */
export function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export function weekdayOf(day: string): string {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}
