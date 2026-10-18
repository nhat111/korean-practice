import { Link } from 'react-router';
import { vi } from '../i18n/vi';
import { movedTo } from '../practice/domainMove';

/** On the old kodevtalk.vercel.app address: where the app moved, and how to keep progress. */
export function DomainMoveBanner() {
  const target = movedTo(window.location.host, __SITE_URL__);
  if (target === null) return null;
  return (
    <div className="backend-banner backend-banner--update" role="status">
      <span>{vi.domainMove.message(target)}</span>
      <Link to="/settings" className="link-btn">
        {vi.domainMove.backup}
      </Link>
      <a href={__SITE_URL__} className="link-btn">
        {vi.domainMove.open}
      </a>
    </div>
  );
}
