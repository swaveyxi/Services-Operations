import { formatDate, humanizeSlug } from '@/utils/format';
import type { ReportStatus, ReportSummary, ReportType } from '../types';
import s from './Reports.module.css';

const TYPE_LABELS: Record<ReportType, string> = {
  STAGE: 'Stage reports',
  CAMPAIGN: 'Campaign report',
  CUSTOM: 'Custom reports',
};

function groupByType(reports: ReportSummary[]): Partial<Record<ReportType, ReportSummary[]>> {
  const out: Partial<Record<ReportType, ReportSummary[]>> = {};
  for (const r of reports) (out[r.report_type] ??= []).push(r);
  return out;
}

export function LeftPanel({
  campaignLabel,
  reports,
  selectedId,
  onSelect,
  onGenerateClick,
}: {
  campaignLabel: string;
  reports: ReportSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onGenerateClick: () => void;
}) {
  const grouped = groupByType(reports);
  const order: ReportType[] = ['STAGE', 'CAMPAIGN', 'CUSTOM'];

  return (
    <div className="card">
      <div style={{ padding: 'var(--space-4) var(--space-4) var(--space-2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.15rem' }}>
            Reports
          </h1>
          <p className="page-sub" style={{ fontSize: '0.75rem' }}>
            {campaignLabel}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onGenerateClick} title="Generate report">
          <i className="fa-solid fa-plus" aria-hidden="true" />
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-5)' }}>
          <i className="fa-solid fa-file-lines" aria-hidden="true" /> No reports generated for this campaign yet.
        </div>
      ) : (
        order
          .filter((type) => grouped[type]?.length)
          .map((type) => (
            <div className={s.panelSection} key={type}>
              <div className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>
                {TYPE_LABELS[type]}
              </div>
              {grouped[type]!.map((r) => (
                <ReportItem key={r.id} report={r} selected={r.id === selectedId} onClick={() => onSelect(r.id)} />
              ))}
            </div>
          ))
      )}
    </div>
  );
}

function ReportItem({ report, selected, onClick }: { report: ReportSummary; selected: boolean; onClick: () => void }) {
  return (
    <div className={`${s.reportItem} ${selected ? s.selected : ''}`} onClick={onClick}>
      <div className={`${s.reportIcon} ${report.report_type === 'CAMPAIGN' ? s.accent : ''}`}>{report.report_type.slice(0, 2)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={s.reportTitle}>{report.title}</div>
        <div className={s.reportSub}>
          {report.scope_slug ? humanizeSlug(report.scope_slug) : 'All stages'} · v{report.version}
        </div>
        <div className={s.reportStatus}>
          <StatusTag status={report.status} />
          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--c-text-faint)' }}>
            {formatDate(report.generated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusTag({ status }: { status: ReportStatus }) {
  if (status === 'READY')
    return (
      <span className={s.generatedTag}>
        <i className="fa-solid fa-check" aria-hidden="true" /> Ready
      </span>
    );
  if (status === 'GENERATING')
    return (
      <span className="badge badge--pending">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Generating
      </span>
    );
  return <span className="badge badge--negative">Failed</span>;
}
