import { Link } from 'react-router-dom';
import s from './AtlasBreadcrumb.module.css';

// {label} > Dashboard > {current} — the first crumb returns to the S&O
// Tracker page and Dashboard returns to the Atlas dashboard, both keyed by
// the campaign's internal id (the /atlas/:id route param). `label` is the
// human-readable campaign_id string shown as that first crumb's text — a
// different value from `id`, since the route uses the real UUID. Omit
// `current` when rendering this on the Dashboard page itself, so it
// collapses to {label} > Dashboard with Dashboard as the non-clickable
// current crumb.
export function AtlasBreadcrumb({
  id,
  label,
  current,
}: {
  id: string;
  label: string;
  current?: string;
}) {
  return (
    <nav className={s.breadcrumb} aria-label="Breadcrumb">
      <Link to={`/tracker/${id}`} className={s.crumbLink}>
        {label}
      </Link>
      <i className={`fa-solid fa-chevron-right ${s.chevron}`} aria-hidden="true" />
      {current ? (
        <Link to={`/atlas/${id}`} className={s.crumbLink}>
          Dashboard
        </Link>
      ) : (
        <span className={s.crumbCurrent}>Dashboard</span>
      )}
      {current && (
        <>
          <i className={`fa-solid fa-chevron-right ${s.chevron}`} aria-hidden="true" />
          <span className={s.crumbCurrent}>{current}</span>
        </>
      )}
    </nav>
  );
}
