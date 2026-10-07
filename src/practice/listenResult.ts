import { review, todayKey } from '../srs/sm2';
import { getProgressSnapshot, saveReview } from '../storage/progress';

/** Every answered question schedules its line in the SRS (key "listen:<source>"). */
export function saveListenResult(key: string, correct: boolean) {
  const k = `listen:${key}`;
  saveReview(k, review(getProgressSnapshot().srs[k], correct ? 4 : 1, todayKey()));
}
