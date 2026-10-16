import { useState } from 'react';
import { trackEvent } from '../analytics';
import { vi } from '../i18n/vi';
import {
  DEFAULT_REMINDER_TIME,
  googleCalendarUrl,
  REMINDER_MINUTES,
  reminderIcsPath,
  REMINDER_TIMES,
  type ReminderTime,
} from '../practice/reminder';
import { todayKey } from '../srs/sm2';
import { setReminderTime, usePrefs } from '../storage/prefs';
import { Icon } from './Icon';

/** Daily study reminder through the phone's calendar (src/practice/reminder.ts). */
export function ReminderCard() {
  const { reminderTime } = usePrefs();
  const [time, setTime] = useState<ReminderTime>(reminderTime ?? DEFAULT_REMINDER_TIME);

  const text = { title: vi.reminder.eventTitle, details: vi.reminder.eventDetails };
  const google = googleCalendarUrl(time, REMINDER_MINUTES, text, todayKey(), window.location.origin);

  function added(via: 'ics' | 'google') {
    setReminderTime(time);
    trackEvent('reminder', { via, time });
  }

  return (
    <section id="reminder" className="card stack-sm">
      <h2>{vi.reminder.title}</h2>
      <p className="muted small">{vi.reminder.help}</p>
      <label className="field">
        <span>{vi.reminder.time}</span>
        <select
          className="select"
          value={time}
          onChange={(e) => setTime(REMINDER_TIMES.find((t) => t === e.target.value) ?? DEFAULT_REMINDER_TIME)}
        >
          {REMINDER_TIMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <a className="btn" href={reminderIcsPath(time)} target="_blank" rel="noopener" onClick={() => added('ics')}>
        <Icon name="bell" size={18} /> {vi.reminder.addIcs}
      </a>
      <a className="btn btn--ghost" href={google} target="_blank" rel="noopener" onClick={() => added('google')}>
        <Icon name="external" size={18} /> {vi.reminder.addGoogle}
      </a>
      {reminderTime && <p className="muted small">{vi.reminder.added(reminderTime)}</p>}
      <p className="muted small">{vi.reminder.why}</p>
    </section>
  );
}
