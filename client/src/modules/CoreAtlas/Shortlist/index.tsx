import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { humanizeSlug } from '@/utils/format';
import { getCampaign, getPipelineStages } from '../services/campaigns';
import { getShortlistDetail, listShortlists } from '../services/shortlist';
import type { AtlasCampaign, PipelineStage, Shortlist as ShortlistType, ShortlistDetail } from '../types';
import { AtlasBreadcrumb } from '../components/AtlasBreadcrumb';
import { CreateShortlistModal } from './CreateShortlistModal';
import { Workspace } from './Workspace';
import { RightPanel } from './RightPanel';
import s from './Shortlist.module.css';

export default function Shortlist() {
  const { id = '' } = useParams();
  const { showToast } = useToast();

  const [campaign, setCampaign] = useState<AtlasCampaign | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [shortlists, setShortlists] = useState<ShortlistType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ShortlistDetail | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getCampaign(id), getPipelineStages(id), listShortlists(id)]).then(([c, st, sl]) => {
      if (!active) return;
      setCampaign(c);
      setStages(st);
      setShortlists(sl);
      setSelectedId(sl.find((x) => x.status !== 'DISCARDED')?.id ?? null);
      setLoading(false);
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
    getShortlistDetail(id, selectedId).then((d) => {
      if (active) setDetail(d);
    });
    return () => {
      active = false;
    };
  }, [id, selectedId]);

  async function afterMutate() {
    const sl = await listShortlists(id);
    setShortlists(sl);
    const visible = sl.filter((x) => x.status !== 'DISCARDED');
    // The selected shortlist may have just been discarded itself — it no
    // longer belongs in the visible list, so fall back to another one rather
    // than keep pointing at a shortlist the dropdown no longer offers.
    if (selectedId && !visible.some((x) => x.id === selectedId)) {
      setSelectedId(visible[0]?.id ?? null);
      return;
    }
    if (selectedId) {
      const d = await getShortlistDetail(id, selectedId);
      setDetail(d);
    }
  }

  async function handleCreated(shortlist: ShortlistType) {
    setCreateOpen(false);
    const sl = await listShortlists(id);
    setShortlists(sl);
    setSelectedId(shortlist.id);
    showToast('Shortlist created.', 'success');
  }

  if (loading || !campaign) {
    return <div className="loading-state">Loading shortlists…</div>;
  }

  // Discarded shortlists are a soft status, kept for audit purposes, but they
  // no longer belong in the active selector — same treatment SUPERSEDED
  // shortlists don't get, but the user asked for discard to actually drop
  // out of the dropdown rather than just showing a "Discarded" status.
  const visibleShortlists = shortlists.filter((sl) => sl.status !== 'DISCARDED');
  const selectedSummary = visibleShortlists.find((sl) => sl.id === selectedId) ?? null;

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
          <div className={s.selectorBar}>
            <select
              className="select"
              style={{ maxWidth: 460 }}
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value || null)}
            >
              {visibleShortlists.length === 0 && <option value="">No shortlists yet</option>}
              {visibleShortlists.map((sl) => {
                const stage = stages.find((st) => st.platform_slug === sl.platform_slug);
                return (
                  <option key={sl.id} value={sl.id}>
                    {stage?.platform_name ?? humanizeSlug(sl.platform_slug)} — {sl.name} · v{sl.version} · {humanizeSlug(sl.status)}
                  </option>
                );
              })}
            </select>
            <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> New shortlist
            </button>
          </div>

          {!selectedSummary ? (
            <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
              <i className="fa-solid fa-list-check" aria-hidden="true" /> No shortlists yet for this case — create one to get started.
            </div>
          ) : (
            <div className={s.layout}>
              <div className={s.main}>
                <Workspace campaignId={id} stages={stages} summary={selectedSummary} detail={detail} onChanged={afterMutate} />
              </div>
              <div className={s.aside}>
                <RightPanel campaignId={id} stages={stages} summary={selectedSummary} detail={detail} onChanged={afterMutate} />
              </div>
            </div>
          )}
        </>
      )}

      {createOpen && (
        <CreateShortlistModal campaignId={id} stages={stages} onCancel={() => setCreateOpen(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
