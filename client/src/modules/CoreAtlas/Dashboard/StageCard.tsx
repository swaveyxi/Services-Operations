import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { Stat } from '../components/ui/Stat';
import type { PipelineStage } from '../types';
import { effectiveStageStatus, STAGE_STATUS_TONE } from './StageRail';
import s from './Dashboard.module.css';

// Short badge code from a platform slug — "dragnet_screening" -> "DS",
// "fot" -> "FOT", "veriport" -> "VER". Generic since a campaign's stages are
// fully configurable in the Builder, not a fixed pair.
function platformCode(slug: string): string {
  const words = slug.split('_').filter(Boolean);
  if (words.length > 1) return words.map((w) => w[0]).join('').toUpperCase();
  return slug.slice(0, 3).toUpperCase();
}

function humanizeCategory(category: string): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export function StageCard({ stage }: { stage: PipelineStage }) {
  const { id } = useParams();
  const { stats } = stage;
  const isScored = stats.mean_score !== null;
  const hasThreshold = stage.progression_mode === 'AUTOMATIC' && stage.threshold !== null;
  // Same status the top rail reads — never a second, independently-derived
  // guess, or the two can (and did) show contradictory badges for one stage.
  const status = effectiveStageStatus(stage);
  const tone = STAGE_STATUS_TONE[status];

  return (
    <section className="card">
      <header className={s.cardHead}>
        <div className={s.cardBadge} style={{ background: 'var(--c-navy)', color: '#fff' }}>
          {platformCode(stage.platform_slug)}
        </div>
        <div style={{ flex: 1 }}>
          <div className={s.cardHeadTitle}>{stage.platform_name}</div>
          <div className={s.cardHeadSub}>{humanizeCategory(stage.platform_category)}</div>
        </div>
        <Badge tone={tone.badge}>
          {status === 'NEEDS_ACTION' && <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}{' '}
          {tone.label}
        </Badge>
      </header>

      {isScored && (
        <div className={s.fotHeadline}>
          <div>
            <span className="eyebrow">Mean score</span>
            <div className={s.fotHeadlineValue}>
              <span className={s.fotHeadlineNum}>{stats.mean_score ?? '—'}</span>
            </div>
          </div>
          <div className={s.fotHeadlineDivider} />
          <div>
            <span className="eyebrow">Pass rate</span>
            <div className={s.fotHeadlineValue}>
              <span className={s.fotHeadlineNum}>{stats.pass_rate}</span>
              <span style={{ fontSize: '1.1rem', color: 'var(--c-text-muted)' }}>%</span>
            </div>
          </div>
          {hasThreshold && (
            <>
              <div className={s.fotHeadlineDivider} />
              <div>
                <span className="eyebrow">Threshold</span>
                <div className={s.fotHeadlineValue}>
                  <span className={s.fotHeadlineNum}>{stage.threshold}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className={s.statsRow}>
        {/* candidate_count is who is HERE right now; progressed_count is how
            many this stage has ever sent forward to the next one — two
            independent facts, not subtracted against each other. */}
        <Stat value={stats.candidate_count} label="Candidates in stage" small={isScored} />
        <Stat value={stats.progressed_count} label="Candidates progressed" divider small={isScored} />
      </div>

      <footer className={s.cardFooter}>
        <div className={s.footerMeta}>
          {stats.flag_count > 0 && (
            <span>
              <i className="fa-solid fa-flag" aria-hidden="true" /> {stats.flag_count} flagged
            </span>
          )}
        </div>
        <Link to={`/atlas/${id}/shortlist`} className="btn btn-primary btn-sm">
          Review & Shortlist <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </Link>
      </footer>
    </section>
  );
}
