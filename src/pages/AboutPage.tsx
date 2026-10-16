import { vi } from '../i18n/vi';

/** Optional public contact address (Vercel env var); unset = point to the in-app report button. */
const CONTACT_EMAIL = typeof import.meta.env.VITE_CONTACT_EMAIL === 'string' ? import.meta.env.VITE_CONTACT_EMAIL.trim() : '';
const FEEDBACK_URL = typeof import.meta.env.VITE_FEEDBACK_URL === 'string' ? import.meta.env.VITE_FEEDBACK_URL : '';

/** Who makes the app, what it does with the learner's data, credits. Linked from Home and Settings. */
export function AboutPage() {
  const a = vi.about;
  return (
    <div className="stack">
      <h1>{a.title}</h1>

      <section className="card stack-sm">
        <h2>{a.whatTitle}</h2>
        <p>{a.what}</p>
        <p>{a.project}</p>
      </section>

      <section className="card stack-sm">
        <h2>{a.whoTitle}</h2>
        <p>{a.who}</p>
      </section>

      <section className="card stack-sm">
        <h2>{a.dataTitle}</h2>
        <ul className="about-list">
          {a.data.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p>
          <strong>{a.noSell}</strong>
        </p>
      </section>

      <section className="card stack-sm">
        <h2>{a.contentTitle}</h2>
        <p>{a.content}</p>
      </section>

      <section className="card stack-sm">
        <h2>{a.contactTitle}</h2>
        {CONTACT_EMAIL ? (
          <p>
            {a.contactEmail} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        ) : (
          !FEEDBACK_URL && <p className="muted">{a.contactNone}</p>
        )}
        {FEEDBACK_URL && (
          <a href={FEEDBACK_URL} target="_blank" rel="noreferrer" className="btn btn--ghost">
            {vi.growth.feedback}
          </a>
        )}
      </section>

      <section className="card stack-sm">
        <h2>{a.creditsTitle}</h2>
        <ul className="about-list muted small">
          {a.credits.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <p className="muted small center">{a.updated}</p>
    </div>
  );
}
