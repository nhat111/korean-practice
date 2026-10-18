import { describe, expect, it } from 'vitest';
import { buildReminderIcs, googleCalendarUrl, reminderIcsPath, REMINDER_TIMES } from './reminder';

const text = { title: 'KoDevTalk: luyện 5 phút', details: 'Mở buổi luyện, hôm nay; nhé' };

describe('buildReminderIcs', () => {
  const ics = buildReminderIcs('20:00', 5, text);
  const lines = ics.split('\r\n');

  it('is a daily event in floating local time with an alarm', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(lines).toContain('DTSTART:20260101T200000');
    expect(lines).toContain('DTEND:20260101T200500');
    expect(lines).toContain('RRULE:FREQ=DAILY');
    expect(lines).toContain('TRIGGER:PT0M');
    expect(lines).toContain('URL:https://kodevtalk.nhatlab.com/daily');
  });

  it('escapes text and folds long lines within 75 bytes', () => {
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('DESCRIPTION:Mở buổi luyện\\, hôm nay\\; nhé\\nhttps://kodevtalk.nhatlab.com/daily');
    for (const l of lines) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
  });

  it('keeps the event inside the day', () => {
    expect(buildReminderIcs('22:00', 15, text)).toContain('DTEND:20260101T221500');
  });
});

describe('reminder paths and links', () => {
  it('gives every time its own file', () => {
    const paths = REMINDER_TIMES.map(reminderIcsPath);
    expect(new Set(paths).size).toBe(paths.length);
    expect(reminderIcsPath('07:00')).toBe('/reminder/0700.ics');
  });

  it('builds a repeating Google Calendar link', () => {
    const u = new URL(googleCalendarUrl('07:00', 10, text, '2026-10-17', 'https://x.app'));
    expect(u.searchParams.get('dates')).toBe('20261017T070000/20261017T071000');
    expect(u.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY');
    expect(u.searchParams.get('details')).toContain('https://x.app/daily');
  });
});
