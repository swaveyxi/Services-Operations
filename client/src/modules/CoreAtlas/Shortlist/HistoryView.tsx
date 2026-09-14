import { useEffect, useState } from 'react';
import { formatShortlistIdentifier, getShortlistDetail } from '../services/shortlist';
import type { PipelineStage, Shortlist, ShortlistDetail } from '../types';
import { Workspace } from './Workspace';
import { RightPanel } from './RightPanel';
import s from './Shortlist.module.css';

// The secondary, read-only view: an archive of every PROGRESSED shortlist
// for this campaign, any stage, for reference and CSV export only. There is
// no creation, locking, discarding, querying or uploading here — that all
// lives on the Stages tab, which is the only place a DRAFT/LOCKED shortlist
// is ever worked on. Once a shortlist progresses it becomes immutable
// history, and this is where it's found afterwards.
export function HistoryView({
  campaignId,
  campaignBusinessKey,
  stages,
  shortlists,
  onChanged,
}: {
  campaignId: string;
  campaignBusinessKey: string;
  stages: PipelineStage[];
  shortlists: Shortlist[];
  onChanged: () => Promise<void>;
}) {
  const progressed = shortlists.filter((sl) => sl.status === 'PROGRESSED');
  const [selectedId, setSelectedId] = useState<string | null>(() => progressed[0]?.id ?? null);
  const [detail, setDetail] = useState<ShortlistDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!selectedId) {
      setDetail(undefined);
      return;
    }
    let active = true;
    setDetail(undefined);
    getShortlistDetail(campaignId, selectedId).then((d) => {
      if (active) setDetail(d);
    });
    return () => {
      active = false;
    };
  }, [campaignId, selectedId]);

  const selectedSummary = progressed.find((sl) => sl.id === selectedId) ?? null;

  return (
    <>
      <div className={s.selectorBar}>
        <select
          className="select"
          style={{ maxWidth: 460 }}
          value={selectedId ?? ''}
          onChange={(e) => setSelectedId(e.target.value || null)}
        >
          {progressed.length === 0 && <option value="">No progressed shortlists yet</option>}
          {progressed.map((sl) => (
            <option key={sl.id} value={sl.id}>
              {formatShortlistIdentifier(campaignBusinessKey, sl.platform_slug, sl.version)}
            </option>
          ))}
        </select>
      </div>

      {!selectedSummary ? (
        <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
          <i className="fa-solid fa-list-check" aria-hidden="true" /> No progressed shortlists yet — progress one from the Stages tab
          to see it here.
        </div>
      ) : (
        <div className={s.layout}>
          <div className={s.main}>
            <Workspace campaignId={campaignId} stages={stages} summary={selectedSummary} detail={detail} onChanged={onChanged} />
          </div>
          <div className={s.aside}>
            <RightPanel
              campaignId={campaignId}
              campaignBusinessKey={campaignBusinessKey}
              stages={stages}
              summary={selectedSummary}
              detail={detail}
              onChanged={onChanged}
            />
          </div>
        </div>
      )}
    </>
  );
}
