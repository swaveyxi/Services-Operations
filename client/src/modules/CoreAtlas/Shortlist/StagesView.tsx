import { useState } from 'react';
import type { PipelineStage, Shortlist } from '../types';
import { StageSection } from './StageSection';
import s from './Shortlist.module.css';

// A stage's own DRAFT/LOCKED shortlists, most-recently-updated first.
// SUPERSEDED/DISCARDED/PROGRESSED are deliberately excluded — a stage whose
// only shortlist is any of those has no "active" one, and falls back to the
// live roster exactly like a stage that never had a shortlist at all.
function activeShortlistsFor(shortlists: Shortlist[], platformSlug: string): Shortlist[] {
  return shortlists
    .filter((sl) => sl.platform_slug === platformSlug && (sl.status === 'DRAFT' || sl.status === 'LOCKED'))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

// The default view: every configured stage, reachable via a horizontal tab
// bar, each showing who is currently there right now — independent of
// whether anyone has ever created a shortlist for it (see StageSection for
// why this matters on an AUTOMATIC stage).
export function StagesView({
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
  const sortedStages = stages.slice().sort((a, b) => a.stage_order - b.stage_order);
  const [selectedSlug, setSelectedSlug] = useState(sortedStages[0]?.platform_slug ?? '');
  const selectedStage = sortedStages.find((st) => st.platform_slug === selectedSlug) ?? sortedStages[0];

  if (!selectedStage) return null;

  return (
    <>
      <div className={s.stageTabBar}>
        {sortedStages.map((stage) => (
          <button
            key={stage.platform_slug}
            className={stage.platform_slug === selectedStage.platform_slug ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setSelectedSlug(stage.platform_slug)}
          >
            {stage.platform_name}
          </button>
        ))}
      </div>
      <StageSection
        key={selectedStage.platform_slug}
        campaignId={campaignId}
        campaignBusinessKey={campaignBusinessKey}
        stages={stages}
        stage={selectedStage}
        activeShortlists={activeShortlistsFor(shortlists, selectedStage.platform_slug)}
        onChanged={onChanged}
      />
    </>
  );
}
