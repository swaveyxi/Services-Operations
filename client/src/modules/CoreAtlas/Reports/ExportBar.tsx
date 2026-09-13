import { getReportExportUrl } from '../services/reports';
import s from './Reports.module.css';

export function ExportBar({ title, campaignId, reportId }: { title: string; campaignId: string; reportId: string }) {
  return (
    <div className={s.exportBar}>
      <div style={{ minWidth: 0 }}>
        <span className="eyebrow" style={{ fontSize: '0.62rem' }}>
          Previewing
        </span>
        <div className={s.exportBarTitle}>{title}</div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        <a className="btn btn-primary btn-sm" href={getReportExportUrl(campaignId, reportId, 'pdf')} target="_blank" rel="noreferrer">
          <i className="fa-solid fa-download" aria-hidden="true" /> Export PDF
        </a>
      </div>
    </div>
  );
}
