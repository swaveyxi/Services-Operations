import type { CSSProperties } from 'react';
import { Badge } from '@/components/Badge';
import type { PipelineStage, PipelineStageStatus } from '../types';
import s from './Dashboard.module.css';

// The one place a stage's status maps to a badge tone/label — shared with
// StageCard so the top rail and the per-stage cards below it can never
// disagree about what "this stage" is doing right now.
export const STAGE_STATUS_TONE: Record<
  PipelineStageStatus,
  { badge: 'pending' | 'info' | 'neutral' | 'positive'; label: string; css: string }
> = {
  NEEDS_ACTION: { badge: 'pending', label: 'Needs action', css: 'needs_action' },
  ACTIVE: { badge: 'info', label: 'Active', css: 'active' },
  AWAITING: { badge: 'neutral', label: 'Awaiting', css: 'awaiting' },
  COMPLETED: { badge: 'positive', label: 'Completed', css: 'completed' },
};

/**
 * A stage's raw `status` only advances to COMPLETED via a posted result or an
 * explicit operator override (Core Atlas's stage.service.ts) — an entry/
 * MANUAL stage that onboards candidates by invite rather than posted results
 * (e.g. DragnetScreening) never gets a result posted to it, so it can never
 * earn COMPLETED that way even once everyone has moved past it. Displayed
 * status corrects for that: a stage nobody currently occupies, but which has
 * genuinely sent candidates onward before, reads as Completed instead of
 * staying stuck on Active forever.
 */
export function effectiveStageStatus(stage: PipelineStage): PipelineStageStatus {
  if (stage.status === 'NEEDS_ACTION' || stage.status === 'COMPLETED') return stage.status;
  if (stage.candidates === 0 && stage.stats.progressed_count > 0) return 'COMPLETED';
  return stage.status;
}

export function StageRail({
  stages,
  totalCandidates,
  onRefresh,
  refreshing = false,
}: {
  stages: PipelineStage[];
  totalCandidates: number;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const needsAction = stages.filter((s) => effectiveStageStatus(s) === 'NEEDS_ACTION').length;
  const active = stages.filter((s) => effectiveStageStatus(s) === 'ACTIVE').length;
  const awaiting = stages.filter((s) => effectiveStageStatus(s) === 'AWAITING').length;

  return (
    <div className="card card-pad">
      <div className={s.stageRailHead}>
        <div>
          <span className="eyebrow">Campaign workflow</span>
          <div className={s.stageRailSummary}>
            <strong>{stages.length} stages</strong> · {needsAction} needs action · {active} active · {awaiting} awaiting
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={refreshing}>
          <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`} aria-hidden="true" /> Refresh
        </button>
      </div>

      <div className={s.stageGrid} style={{ '--stage-count': stages.length } as CSSProperties}>
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          const status = effectiveStageStatus(stage);
          const tone = STAGE_STATUS_TONE[status];
          return (
            <div key={stage.platform_slug} className={s.stageNode}>
              {!isLast && <div className={s.stageConnector} />}
              <div className={s.stageContent}>
                <div className={`${s.stageCircle} ${s[tone.css] ?? ''}`}>
                  <span>{i + 1}</span>
                  {status === 'NEEDS_ACTION' && <span className={s.stageBadge}>!</span>}
                </div>
                <div className={s.stageName}>{stage.platform_name}</div>
                <div className={s.stageCount}>{stage.candidates}</div>
                <div className={s.stageCountLabel}>candidates</div>
                <Badge tone={tone.badge}>{tone.label}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      <div className={s.railTotal}>
        <span className="eyebrow">Total candidates</span>
        <div className={s.railTotalNum}>{totalCandidates}</div>
      </div>
    </div>
  );
}
