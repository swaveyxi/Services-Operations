import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/Badge';
import { createShortlist, getShortlistDetail } from '../services/shortlist';
import type { PipelineStage, Shortlist, ShortlistDetail } from '../types';
import { STAGE_STATUS_TONE } from '../Dashboard/StageRail';
import { Workspace } from './Workspace';
import { RightPanel } from './RightPanel';
import s from './Shortlist.module.css';

// One stage, always visible regardless of whether it has ever had a
// shortlist. `activeShortlists` is this stage's own DRAFT/LOCKED shortlists
// (already filtered + sorted most-recently-updated first by StagesView) —
// everything this component does is scoped to `stage`/`activeShortlists[0]`,
// never a page-level "current stage" variable, so two stage sections can
// never cross-contaminate each other's query/roster/upload state.
//
// A stage with no active shortlist yet gets one created silently the moment
// its tab is opened — never a manual "Create shortlist" step. This is what
// keeps Browse roster / AI query / Upload CSV always available per stage
// (all three need a real shortlist id to attach to; query and upload can't
// work against a "live roster, no shortlist" placeholder view at all), while
// still meaning the operator never has to think about shortlist creation as
// its own action — only curating, then locking/progressing.
export function StageSection({
  campaignId,
  campaignBusinessKey,
  stages,
  stage,
  activeShortlists,
  onChanged,
}: {
  campaignId: string;
  campaignBusinessKey: string;
  stages: PipelineStage[];
  stage: PipelineStage;
  activeShortlists: Shortlist[];
  onChanged: () => Promise<void>;
}) {
  const activeShortlist = activeShortlists[0];
  const [detail, setDetail] = useState<ShortlistDetail | null | undefined>(undefined);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  // Persists across React StrictMode's dev-only double-invoke of this effect
  // (mount → cleanup → mount again) so the silent create-on-open never fires
  // twice for one real mount.
  const ensuringRef = useRef(false);

  async function ensureShortlist() {
    ensuringRef.current = true;
    setEnsureError(null);
    try {
      await createShortlist(campaignId, stage.platform_slug, `${stage.platform_name} shortlist`);
      await onChanged();
    } catch (err) {
      ensuringRef.current = false;
      setEnsureError(err instanceof Error ? err.message : 'Failed to set up this stage.');
    }
  }

  useEffect(() => {
    if (activeShortlist || ensuringRef.current) return;
    ensureShortlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShortlist]);

  useEffect(() => {
    if (!activeShortlist) {
      setDetail(undefined);
      return;
    }
    let active = true;
    setDetail(undefined);
    getShortlistDetail(campaignId, activeShortlist.id).then((d) => {
      if (active) setDetail(d);
    });
    return () => {
      active = false;
    };
  }, [campaignId, activeShortlist]);

  async function handleChanged() {
    await onChanged();
    if (activeShortlist) {
      const d = await getShortlistDetail(campaignId, activeShortlist.id);
      setDetail(d);
    }
  }

  const tone = STAGE_STATUS_TONE[stage.status];

  return (
    <div>
      <div className={s.stageSectionHead}>
        <span className={s.stageSectionTitle}>{stage.platform_name}</span>
        <Badge tone={tone.badge}>{tone.label}</Badge>
        {stage.progression_mode === 'AUTOMATIC' && <span className="badge badge--neutral">Automatic</span>}
      </div>

      {!activeShortlist ? (
        ensureError ? (
          <div className="empty-state" style={{ borderColor: 'var(--t-negative-bd)' }}>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {ensureError}{' '}
            <button className="btn btn-ghost btn-sm" onClick={ensureShortlist}>
              Retry
            </button>
          </div>
        ) : (
          <div className="loading-state">Setting up this stage…</div>
        )
      ) : (
        <>
          {activeShortlists.length > 1 && (
            <div className="empty-state" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)' }}>
              <i className="fa-solid fa-circle-info" aria-hidden="true" /> {activeShortlists.length} active shortlists for this
              stage — showing the most recently updated. See History for the others.
            </div>
          )}
          {/* Same standalone Workspace + RightPanel pairing as History — the
              RightPanel is its own card here, not nested inside anything
              stage-specific, exactly like the History tab renders it. */}
          <div className={s.layout}>
            <div className={s.main}>
              <Workspace campaignId={campaignId} stages={stages} summary={activeShortlist} detail={detail} onChanged={handleChanged} />
            </div>
            <div className={s.aside}>
              <RightPanel
                campaignId={campaignId}
                campaignBusinessKey={campaignBusinessKey}
                stages={stages}
                summary={activeShortlist}
                detail={detail}
                onChanged={handleChanged}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
