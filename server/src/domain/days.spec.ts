import { describe, expect, it } from 'vitest';
import { canonicalTimeZone, localDay, weekOf } from './days.js';

describe("criterion 15: a day is the player's local calendar day", () => {
  it('puts 13:30 UTC on 10 November on 11 November in Sydney', () => {
    expect(localDay(new Date('2026-11-10T13:30:00Z'), 'Australia/Sydney')).toBe(
      '2026-11-11',
    );
  });

  it('keeps that instant on 10 November in UTC', () => {
    expect(localDay(new Date('2026-11-10T13:30:00Z'), 'UTC')).toBe(
      '2026-11-10',
    );
  });

  it('puts 03:00 UTC on 11 November on 10 November in Los Angeles', () => {
    expect(
      localDay(new Date('2026-11-11T03:00:00Z'), 'America/Los_Angeles'),
    ).toBe('2026-11-10');
  });

  it('follows daylight saving: Sydney moves from UTC+10 to UTC+11 on 4 October 2026', () => {
    // 13:30 UTC is 23:30 the same day before the change, and 00:30 the
    // next day after it.
    expect(localDay(new Date('2026-10-03T13:30:00Z'), 'Australia/Sydney')).toBe(
      '2026-10-03',
    );
    expect(localDay(new Date('2026-10-04T13:30:00Z'), 'Australia/Sydney')).toBe(
      '2026-10-05',
    );
  });
});

describe('time zone names', () => {
  it('accepts IANA names, in their usual spelling', () => {
    expect(canonicalTimeZone('Australia/Sydney')).toBe('Australia/Sydney');
    expect(canonicalTimeZone('australia/sydney')).toBe('Australia/Sydney');
    expect(canonicalTimeZone('UTC')).toBe('UTC');
  });

  it('rejects unknown names and the empty string', () => {
    expect(canonicalTimeZone('Mars/Olympus_Mons')).toBeNull();
    expect(canonicalTimeZone('')).toBeNull();
  });
});

describe('criterion 16: a week runs from Monday to Sunday', () => {
  const weekOfMonday9November = [
    '2026-11-09',
    '2026-11-10',
    '2026-11-11',
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
    '2026-11-15',
  ];

  it.each(['2026-11-09', '2026-11-11', '2026-11-15'])(
    '%s is in the week of Monday 9 November',
    (day) => {
      expect(weekOf(day)).toEqual(weekOfMonday9November);
    },
  );

  it('starts a new week on Monday 16 November', () => {
    expect(weekOf('2026-11-16')[0]).toBe('2026-11-16');
  });

  it('crosses the end of a month and of a year', () => {
    expect(weekOf('2026-12-31')).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
  });
});
