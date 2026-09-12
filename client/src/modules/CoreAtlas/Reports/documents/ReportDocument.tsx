import type { ReportData, ReportSection } from '../../types';
import { formatDate, humanizeSlug } from '@/utils/format';
import { Page, H, H3, DTable, MetricsGrid, SignOff } from './primitives';
import s from './documents.module.css';

// Renders any `ReportData` generically off its `sections[]` — matches
// Atlas's own design intent ("a new report type needs no frontend change,
// it just emits a different sequence of sections"), replacing the 4 bespoke
// per-report-type components this module used to have.
export function ReportDocument({ data }: { data: ReportData }) {
  return (
    <Page>
      <div style={{ textAlign: 'center', padding: '6px 0 18px' }}>
        <div style={{ fontSize: 12, letterSpacing: '.3em', color: '#888', fontWeight: 600, marginBottom: 14, textTransform: 'uppercase' }}>
          {humanizeSlug(data.report_type)} Report
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#141414', letterSpacing: '-.01em' }}>{data.title}</div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
          {data.campaign.name} · {data.campaign.client_name} · Generated {formatDate(data.generated_at)}
        </div>
      </div>
      <hr className={s.rule} />

      {data.summary.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <H num="1.0">Summary</H>
          <MetricsGrid metrics={data.summary.map((m) => ({ label: m.label, value: m.unit ? `${m.value}${m.unit}` : m.value }))} />
        </div>
      )}

      {data.sections.map((section, i) => (
        <ReportSectionBlock key={i} section={section} num={`${i + 2}.0`} />
      ))}

      {data.narrative && data.narrative.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {data.narrative.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      <SignOff />
    </Page>
  );
}

function ReportSectionBlock({ section, num }: { section: ReportSection; num: string }) {
  return (
    <div style={{ marginTop: 18 }}>
      <H3 num={num}>{section.heading}</H3>
      {section.kind === 'table' && (
        <DTable
          cols={section.columns.map((c) => ({ label: c.label, align: c.align }))}
          rows={section.rows.map((r) => ({ cells: section.columns.map((c) => String(r[c.key] ?? '—')) }))}
        />
      )}
      {section.kind === 'metrics' && <MetricsGrid metrics={section.metrics} />}
      {section.kind === 'text' && section.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}
