// Daily study reminder through the device calendar. A static site cannot send
// push notifications on its own (Web Push needs a server, and iOS only allows
// it for Home Screen apps), but every phone's calendar can: an .ics event
// that repeats daily with an alarm, or a Google Calendar template link.
// Pure, so vite.config.ts can build the .ics files with it (no Vite globals).

/** Times offered in the UI; each has a prebuilt file at reminderIcsPath(time). */
export const REMINDER_TIMES = ['07:00', '08:00', '12:00', '18:00', '20:00', '21:00', '22:00'] as const;
export type ReminderTime = (typeof REMINDER_TIMES)[number];
export const DEFAULT_REMINDER_TIME: ReminderTime = '20:00';
/** Length of the event in the prebuilt files. */
export const REMINDER_MINUTES = 10;

/** Production address written into the calendar event (same as the Open Graph tags in index.html). */
export const APP_URL = 'https://kodevtalk.vercel.app';

/** Same UID for every time, so importing another time can replace the old event. */
const UID = 'daily-reminder@kodevtalk.vercel.app';

/** First day of the repeating event; any past date works with a daily rule. */
const START_DAY = '20260101';

export interface ReminderText {
  title: string;
  details: string;
}

export function reminderIcsPath(time: ReminderTime): string {
  return `/reminder/${time.replace(':', '')}.ics`;
}

function compact(time: ReminderTime): string {
  return `${time.replace(':', '')}00`;
}

/** Adds minutes to an HH:MM time, staying within the day. */
function endTime(time: ReminderTime, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}00`;
}

/** RFC 5545 TEXT escaping. */
function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Folds lines longer than 75 octets (RFC 5545 §3.1), without splitting a UTF-8 character. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > (out.length === 0 ? 75 : 74)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

/**
 * A daily event at `time` (floating local time: it follows the phone's time
 * zone) lasting `minutes`, with an alarm when it starts.
 */
export function buildReminderIcs(time: ReminderTime, minutes: number, text: ReminderText, url: string = APP_URL): string {
  const link = `${url}/daily`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KoDevTalk//Reminder//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${UID}`,
    `DTSTAMP:${START_DAY}T000000Z`,
    `DTSTART:${START_DAY}T${compact(time)}`,
    `DTEND:${START_DAY}T${endTime(time, minutes)}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText(text.title)}`,
    `DESCRIPTION:${escapeText(`${text.details}\n${link}`)}`,
    `URL:${link}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(text.title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/**
 * Google Calendar "add event" link (Android, desktop), starting on `day`
 * (YYYY-MM-DD, local). Google applies its own reminder (default 10 min before).
 */
export function googleCalendarUrl(time: ReminderTime, minutes: number, text: ReminderText, day: string, url: string): string {
  const d = day.replace(/-/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: text.title,
    details: `${text.details}\n${url}/daily`,
    dates: `${d}T${compact(time)}/${d}T${endTime(time, minutes)}`,
    recur: 'RRULE:FREQ=DAILY',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
