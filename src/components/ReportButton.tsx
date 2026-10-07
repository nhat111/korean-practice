import { vi } from '../i18n/vi';
import { addReport, isReported, removeReport, useReports } from '../storage/reports';
import { Icon } from './Icon';

/** "Báo câu sai": flag a Korean line as wrong/unnatural (with an optional note); tap again to undo. */
export function ReportButton({ reportKey, ko }: { reportKey: string; ko: string }) {
  const reports = useReports();
  const reported = isReported(reports, reportKey, ko);
  return (
    <button
      type="button"
      className={reported ? 'link-btn small report-btn report-btn--on' : 'link-btn small report-btn'}
      aria-pressed={reported}
      onClick={(e) => {
        e.stopPropagation(); // e.g. don't flip a flashcard
        if (reported) {
          removeReport(reportKey, ko);
          return;
        }
        const note = window.prompt(vi.report.prompt, '');
        if (note === null) return; // cancelled
        addReport(reportKey, ko, note);
      }}
    >
      <Icon name="flag" size={16} /> {reported ? vi.report.reported : vi.report.button}
    </button>
  );
}
