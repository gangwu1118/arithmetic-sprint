import type { Progress } from '../api.ts';
import { formatDay, weekdayOf } from '../format.ts';

export function WeekStrip({ week }: { week: Progress['week'] }) {
  const reached = week.daysPractised >= week.goalDays;

  return (
    <section className="card">
      <h2>This week</h2>
      <ol className="week">
        {week.days.map((day) => (
          <li
            key={day.date}
            className={[
              day.rounds > 0 ? 'practised' : '',
              day.date === week.today ? 'today' : '',
            ].join(' ')}
            aria-label={`${formatDay(day.date)}: ${day.rounds} ${day.rounds === 1 ? 'round' : 'rounds'}`}
          >
            <span className="weekday">{weekdayOf(day.date)}</span>
            <span className="mark" aria-hidden="true">
              {day.rounds > 0 ? '✓' : ''}
            </span>
          </li>
        ))}
      </ol>
      <p>
        <strong>
          {week.daysPractised} of {week.goalDays} days
        </strong>{' '}
        this week.{' '}
        {reached
          ? 'Goal reached.'
          : `No streak to keep: any ${week.goalDays} days this week will do.`}
      </p>
    </section>
  );
}
