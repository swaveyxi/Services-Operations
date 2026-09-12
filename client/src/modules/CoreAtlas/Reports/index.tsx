import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { getReports, getReportById } from '../services/reports';
import { getCampaign, getPipelineStages } from '../services/campaigns';
import type { AtlasCampaign, PipelineStage, ReportDetail, ReportSummary } from '../types';
import { LeftPanel } from './LeftPanel';
import { ExportBar } from './ExportBar';
import { GenerateReportModal } from './GenerateReportModal';
import { ReportDocument } from './documents/ReportDocument';
import { AtlasBreadcrumb } from '../components/AtlasBreadcrumb';
import s from './Reports.module.css';

export default function Reports() {
  const { id = '' } = useParams();
  const { showToast } = useToast();

  const [campaign, setCampaign] = useState<AtlasCampaign | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReportDetail | null | undefined>(undefined);
  const [generateOpen, setGenerateOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getCampaign(id), getPipelineStages(id), getReports(id)]).then(([c, st, r]) => {
      if (!active) return;
      setCampaign(c);
      setStages(st);
      setReports(r);
      const firstReady = r.find((x) => x.status === 'READY');
      setSelectedId(firstReady?.id ?? r[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(undefined);
      return;
    }
    let active = true;
    setDetail(undefined);
    getReportById(id, selectedId).then((d) => {
      if (active) setDetail(d);
    });
    return () => {
      active = false;
    };
  }, [id, selectedId]);

  // Poll while the selected report is still generating — real generation is
  // async on Atlas's side (always returns 202 immediately).
  useEffect(() => {
    if (!selectedId || detail?.status !== 'GENERATING') return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const d = await getReportById(id, selectedId);
      if (cancelled || !d) return;
      setDetail(d);
      if (d.status !== 'GENERATING') {
        clearInterval(interval);
        getReports(id).then((r) => {
          if (!cancelled) setReports(r);
        });
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, selectedId, detail?.status]);

  function handleGenerated(report: ReportSummary) {
    setGenerateOpen(false);
    setReports((prev) => [report, ...prev]);
    setSelectedId(report.id);
    showToast('Report generation started.', 'success');
  }

  const selectedSummary = reports.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      {campaign && <AtlasBreadcrumb id={id} label={campaign.campaign_id} current="Reports" />}
      <div className="page-head">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-sub">{campaign?.campaign_id ?? ''}</p>
        </div>
      </div>

      <div className={s.layout}>
        <div className={s.aside}>
          <LeftPanel
            campaignLabel={campaign?.campaign_id ?? ''}
            reports={reports}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onGenerateClick={() => setGenerateOpen(true)}
          />
        </div>

        <div className={s.main}>
          <div className="card" style={{ overflow: 'hidden' }}>
            {selectedSummary && detail?.data && <ExportBar title={selectedSummary.title} campaignId={id} reportId={selectedSummary.id} />}
            <div className={s.previewBody}>
              {!selectedId ? (
                <EmptyPreview />
              ) : detail === undefined ? (
                <Skeleton />
              ) : detail?.status === 'GENERATING' ? (
                <div className="loading-state">
                  <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Generating report…
                </div>
              ) : detail?.data ? (
                <ReportDocument data={detail.data} />
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
                  <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {detail?.error || 'This report is not ready yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {generateOpen && (
        <GenerateReportModal campaignId={id} stages={stages} onCancel={() => setGenerateOpen(false)} onGenerated={handleGenerated} />
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div className={s.skeletonPage}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
        <div className={s.skeleton} style={{ width: 110, height: 26 }} />
      </div>
      <div className={s.skeleton} style={{ width: '55%', height: 24, margin: '0 auto 10px' }} />
      <div className={s.skeleton} style={{ width: '35%', height: 13, margin: '0 auto 26px' }} />
      <div className={s.skeleton} style={{ width: '22%', height: 14, marginBottom: 14 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={s.skeleton} style={{ height: 13, marginBottom: 9, width: i === 2 ? '80%' : '100%' }} />
      ))}
      <div className={s.skeleton} style={{ height: 150, margin: '22px 0' }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={s.skeleton} style={{ height: 30, marginBottom: 8 }} />
      ))}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
      <i className="fa-solid fa-file-lines" aria-hidden="true" /> Select a report from the left to preview it.
    </div>
  );
}
