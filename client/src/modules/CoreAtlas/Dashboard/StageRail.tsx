import type { CSSProperties } from 'react';
import { Badge } from '@/components/Badge';
import type { PipelineStage, PipelineStageStatus } from '../types';
import s from './Dashboard.module.css';

const TONE: Record<PipelineStageStatus, { badge: 'pending' | 'info' | 'neutral' | 'positive'; label: string; css: string }> = {
  NEEDS_ACTION: { badge: 'pending', label: 'Needs action', css: 'needs_action' },
  ACTIVE: { badge: 'info', label: 'Active', css: 'active' },
  AWAITING: { badge: 'neutral', label: 'Awaiting', css: 'awaiting' },
  COMPLETED: { badge: 'positive', label: 'Completed', css: 'completed' },
};

export function StageRail({
  stages,
  onRefresh,
  refreshing = false,
}: {
  stages: PipelineStage[];
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const needsAction = stages.filter((s) => s.status === 'NEEDS_ACTION').length;
  const active = stages.filter((s) => s.status === 'ACTIVE').length;
  const awaiting = stages.filter((s) => s.status === 'AWAITING').length;

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
          const tone = TONE[stage.status];
          return (
            <div key={stage.platform_slug} className={s.stageNode}>
              {!isLast && <div className={s.stageConnector} />}
              <div className={s.stageContent}>
                <div className={`${s.stageCircle} ${s[tone.css] ?? ''}`}>
                  <span>{i + 1}</span>
                  {stage.status === 'NEEDS_ACTION' && <span className={s.stageBadge}>!</span>}
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
    </div>
  );
}
