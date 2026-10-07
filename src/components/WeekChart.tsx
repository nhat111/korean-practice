import { vi } from '../i18n/vi';
import type { DayPoint } from '../practice/weak';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function weekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/**
 * Minutes recorded per day (one series, so no legend). Only today's and the
 * highest bar carry a value label; every bar has a tooltip, and the hidden
 * table is the text alternative.
 */
export function WeekChart({ days }: { days: DayPoint[] }) {
  const max = Math.max(...days.map((d) => d.minutes));
  const today = days[days.length - 1]?.date;
  return (
    <figure className="week-chart">
      <div className="week-bars" aria-hidden>
        {days.map((d) => {
          const label = d.date === today || (d.minutes > 0 && d.minutes === max);
          const tip = vi.progress.dayTip(weekday(d.date), d.minutes, d.spoken);
          return (
            <div key={d.date} className="week-col" title={tip}>
              <span className="week-value">{label ? d.minutes : ''}</span>
              <span className="week-track">
                <span
                  className={d.minutes > 0 ? 'week-bar' : 'week-bar week-bar--empty'}
                  style={{ height: max > 0 ? `${(100 * d.minutes) / max}%` : '0%' }}
                />
              </span>
              <span className={d.date === today ? 'week-day week-day--today' : 'week-day'}>{weekday(d.date)}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="muted small">{vi.progress.weekCaption}</figcaption>
      <table className="sr-only">
        <caption>{vi.progress.weekCaption}</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{vi.progress.dayTip(weekday(d.date), d.minutes, d.spoken)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
