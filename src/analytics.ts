// Anonymous usage stats via Vercel Web Analytics: page views plus a few named
// events (no cookies, no recordings, no learning content). Learners can turn
// it off in Settings; every event checks that preference.

import { track } from '@vercel/analytics';
import { getPrefs } from './storage/prefs';

type EventProps = Record<string, string | number | boolean>;

export function trackEvent(name: 'onboarding' | 'daily_done' | 'install_hint', props?: EventProps): void {
  if (!getPrefs().analytics) return;
  try {
    track(name, props);
  } catch {
    // Stats are optional.
  }
}
