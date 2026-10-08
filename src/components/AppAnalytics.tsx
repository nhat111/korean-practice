import { Analytics } from '@vercel/analytics/react';
import { getPrefs } from '../storage/prefs';

/** Page views for Vercel Web Analytics, dropped when the learner turned stats off. */
export function AppAnalytics() {
  return <Analytics beforeSend={(event) => (getPrefs().analytics ? event : null)} />;
}
