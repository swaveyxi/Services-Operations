import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCampaign, getPipelineStages } from '../services/campaigns';
import { listShortlists } from '../services/shortlist';
import type { AtlasCampaign, PipelineStage, Shortlist as ShortlistType } from '../types';
import { AtlasBreadcrumb } from '../components/AtlasBreadcrumb';
import { StagesView } from './StagesView';
import { HistoryView } from './HistoryView';
import s from './Shortlist.module.css';

export default function Shortlist() {
  const { id = '' } = useParams();

  const [campaign, setCampaign] = useState<AtlasCampaign | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [shortlists, setShortlists] = useState<ShortlistType[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'stages' | 'history'>('stages');

  useEffect(() => {
    let active = true;
    Promise.all([getCampaign(id), getPipelineStages(id), listShortlists(id)]).then(([c, st, sl]) => {
      if (!active) return;
      setCampaign(c);
      setStages(st);
      setShortlists(sl);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  // The one shared refresh path for both views — every mutation anywhere on
  // this page (create/lock/discard/progress/add/remove/upload, from either
  // a stage card or the History dropdown) goes through this single
  // `listShortlists` call, never a per-stage duplicate fetch.
  const refreshShortlists = useCallback(async () => {
    setShortlists(await listShortlists(id));
  }, [id]);

  if (loading || !campaign) {
    return <div className="loading-state">Loading shortlists…</div>;
  }

  return (
    <>
      <AtlasBreadcrumb id={id} label={campaign.campaign_id} current="Shortlist" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Shortlists</h1>
          <p className="page-sub">{campaign.campaign_id}</p>
        </div>
      </div>

      {stages.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
          <i className="fa-solid fa-diagram-project" aria-hidden="true" /> No application stages configured for this case yet — add them
          in the Business Case Builder.
        </div>
      ) : (
        <>
          <div className={s.viewTabBar}>
            <button
              className={view === 'stages' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
              onClick={() => setView('stages')}
            >
              <i className="fa-solid fa-layer-group" aria-hidden="true" /> Stages
            </button>
            <button
              className={view === 'history' ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
              onClick={() => setView('history')}
            >
              <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /> History
            </button>
          </div>

          {view === 'stages' ? (
            <StagesView
              campaignId={id}
              campaignBusinessKey={campaign.campaign_id}
              stages={stages}
              shortlists={shortlists}
              onChanged={refreshShortlists}
            />
          ) : (
            <HistoryView
              campaignId={id}
              campaignBusinessKey={campaign.campaign_id}
              stages={stages}
              shortlists={shortlists}
              onChanged={refreshShortlists}
            />
          )}
        </>
      )}
    </>
  );
}
