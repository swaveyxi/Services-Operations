import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { Pager } from '@/components/Pager';
import { FORM_CATALOG_META, FORM_TITLE_TO_KEY } from '@shared/constants';
import { formatDate } from '@/utils/format';
import s from '../Operations.module.css';
import type { SectionProps } from './types';

const PAGE = 5;

export default function FormsSection({ team, campaigns, forms, activeFormId }: SectionProps) {
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c.campaign_id]));
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const sorted = [...forms].sort((a, b) => {
    const diff = Date.parse(a.submitted_on ?? '') - Date.parse(b.submitted_on ?? '');
    return sortDir === 'desc' ? -diff : diff;
  });
  const pageItems = sorted.slice((page - 1) * PAGE, page * PAGE);

  return (
    <section className={`card card-pad ${s.section}`}>
      <div className="section-head">
        <h2 className="section-title">Support Forms</h2>
        <div className={s.sectionMeta}>
          <button
            className={s.sortToggle}
            title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
            onClick={() => { setSortDir((d) => d === 'desc' ? 'asc' : 'desc'); setPage(1); }}
          >
            <i className={`fa-solid fa-arrow-${sortDir === 'desc' ? 'down' : 'up'}-short-wide`} aria-hidden="true" />
            {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
          <span className="muted" style={{ fontSize: '0.8rem' }}>{forms.length}</span>
        </div>
      </div>
      {forms.length === 0 ? (
        <div className="empty-state">No submitted forms for this team.</div>
      ) : (
        <>
          {pageItems.map((f) => {
            const title = FORM_CATALOG_META[FORM_TITLE_TO_KEY[f.form_type]]?.title || f.form_type;
            const activeHandoffs = f.handoffs.filter((h) => h.status !== 'Completed');
            const handoffLabel = f.handoffs.length === 0
              ? null
              : activeHandoffs.length === 0
              ? 'Job Complete'
              : `Sent to ${activeHandoffs.map((h) => h.team).join(', ')}`;
            return (
              <div
                key={f.id}
                className={`${s.formRow} ${s.formItem} ${f.id === activeFormId ? s.formItemActive : ''}`}
                onClick={() => navigate(`/operations/${team.slug}/form/${f.id}`)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                  <div className={s.workMeta}>
                    {formatDate(f.submitted_on)} ·{' '}
                    <span className={s.cid}>{campaignMap[f.campaign_id] ?? f.campaign_id}</span>
                  </div>
                </div>
                <div className={s.formRight}>
                  <span className={s.badgeGroup}>
                    <span className={s.badgeLabel}>Delivery Status:</span>
                    <StatusBadge kind="delivery" value={f.delivery_status} submittedOn={f.submitted_on} />
                  </span>
                  {handoffLabel && (
                    <span className={s.badgeGroup}>
                      <span className={s.badgeLabel}>Handoff Status:</span>
                      <StatusBadge kind="handoff" value={handoffLabel} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <Pager page={page} pageSize={PAGE} totalItems={sorted.length} noun="forms" onPage={setPage} />
        </>
      )}
    </section>
  );
}
