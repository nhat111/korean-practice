import { vi } from '../i18n/vi';
import type { WeekDay } from '../practice/today';
import { Icon } from './Icon';

/** Monday-to-Sunday row: a check on practiced days, today outlined. */
export function WeekDots({ days }: { days: WeekDay[] }) {
  return (
    <ol className="week-dots" aria-label={vi.home.today.week}>
      {days.map((d, i) => {
        const label = vi.home.weekdays[i];
        const cls = ['week-dot', d.active && 'week-dot--on', d.isToday && 'week-dot--today', d.future && 'week-dot--future']
          .filter(Boolean)
          .join(' ');
        return (
          <li key={d.date} className={cls} aria-label={vi.home.weekDay(label, d.active)}>
            <span className="week-dot-label" aria-hidden>
              {label}
            </span>
            <span className="week-dot-mark" aria-hidden>
              {d.active && <Icon name="check" size={14} />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
