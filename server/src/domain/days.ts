/** A calendar date, written YYYY-MM-DD. */
export type LocalDay = string;

const MS_PER_DAY = 86_400_000;

/**
 * The time zone's usual spelling, for example 'Australia/Sydney' for
 * 'australia/sydney', or null when it is not an IANA name the runtime knows.
 * Fixed offsets such as '+10:00' are refused: browsers send IANA names, and
 * an offset would ignore daylight saving.
 */
export function canonicalTimeZone(timeZone: string): string | null {
  let name: string;
  try {
    name = Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions()
      .timeZone;
  } catch {
    return null;
  }
  return /^[+-]/.test(name) ? null : name;
}

/** The calendar date at an instant, in a time zone. */
export function localDay(instant: Date, timeZone: string): LocalDay {
  const parts = Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: 'year' | 'month' | 'day') =>
    parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// Dates are calendar dates, not instants, so the arithmetic below happens
// at midnight UTC, where days are always 24 hours long.

function toUtcMs(day: LocalDay): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date);
}

function fromUtcMs(ms: number): LocalDay {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: LocalDay, count: number): LocalDay {
  return fromUtcMs(toUtcMs(day) + count * MS_PER_DAY);
}

/** Monday to Sunday of the week that holds the day. */
export function weekOf(day: LocalDay): LocalDay[] {
  // getUTCDay counts from Sunday (0); this counts from Monday (0).
  const daysSinceMonday = (new Date(toUtcMs(day)).getUTCDay() + 6) % 7;
  const monday = addDays(day, -daysSinceMonday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
