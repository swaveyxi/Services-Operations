import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { Pager } from '@/components/Pager';
import { teamCampaignBuckets, getOpsTeam, ACTIONABLE_WORKPLAN_STATUSES } from '@/utils/opsTeams';
import s from '../Operations.module.css';
import type { SectionProps } from './types';

const PAGE = 5;

function workplanAggregate(statuses: string[]): string {
  if (statuses.every((s) => s === 'Accepted')) return 'Accepted';
  if (statuses.includes('Amended')) return 'Amended';
  if (statuses.some((s) => s === 'Submitted' || s === 'Pending Review')) return 'Pending Review';
  return 'Draft';
}

export default function ReviewsSection({ team, campaigns, workplans }: SectionProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const { reviews, active } = teamCampaignBuckets(team.name, campaigns, workplans);
  const combined = [...reviews, ...active];
  const sorted = [...combined].sort((a, b) => {
    const diff = Date.parse(a.created_at) - Date.parse(b.created_at);
    return sortDir === 'desc' ? -diff : diff;
  });
  const pageItems = sorted.slice((page - 1) * PAGE, page * PAGE);

  const byCampaign: Record<string, string[]> = {};
  for (const w of workplans) {
    if (getOpsTeam(w.template_name) !== team.name) continue;
    (byCampaign[w.campaign_id] ||= []).push(w.status);
  }

  return (
    <section className={`card card-pad ${s.section}`}>
      <div className="section-head">
        <h2 className="section-title">Workplans</h2>
        <div className={s.sectionMeta}>
          <button
            className={s.sortToggle}
            title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
            onClick={() => { setSortDir((d) => d === 'desc' ? 'asc' : 'desc'); setPage(1); }}
          >
            <i className={`fa-solid fa-arrow-${sortDir === 'desc' ? 'down' : 'up'}-short-wide`} aria-hidden="true" />
            {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
          <span className="muted" style={{ fontSize: '0.8rem' }}>{combined.length}</span>
        </div>
      </div>
      {combined.length === 0 ? (
        <div className="empty-state">No workplans yet.</div>
      ) : (
        <>
          {pageItems.map((c) => {
            const statuses = byCampaign[c.id] ?? [];
            const aggStatus = workplanAggregate(statuses);
            const canAct = statuses.some((s) => ACTIONABLE_WORKPLAN_STATUSES.includes(s));
            return (
              <div key={c.id} className={s.workItem}>
                <div>
                  <div className={s.workTitle}>
                    Workplan <StatusBadge kind="ops" value={aggStatus} />
                  </div>
                  <div className={s.workMeta}>
                    <span className={s.cid}>{c.campaign_id}</span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/workplan-review/${c.id}`)}
                >
                  {canAct ? 'Review' : 'View'}
                </button>
              </div>
            );
          })}
          <Pager page={page} pageSize={PAGE} totalItems={sorted.length} noun="workplans" onPage={setPage} />
        </>
      )}
    </section>
  );
}
