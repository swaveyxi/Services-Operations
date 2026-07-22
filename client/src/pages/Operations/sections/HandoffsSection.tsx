import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pager } from '@/components/Pager';
import { FORM_CATALOG_META, FORM_TITLE_TO_KEY } from '@shared/constants';
import { formatDate } from '@/utils/format';
import s from '../Operations.module.css';
import type { SectionProps } from './types';

const PAGE = 5;

function earliestTeamHandoffTs(f: SectionProps['handoffs'][0], teamName: string): number {
  const ts = f.handoffs.filter((h) => h.team === teamName).map((h) => Date.parse(h.sent_at));
  return ts.length ? Math.min(...ts) : 0;
}

export default function HandoffsSection({ team, campaigns, handoffs, activeFormId }: SectionProps) {
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c.campaign_id]));
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const sorted = [...handoffs].sort((a, b) => {
    const diff = earliestTeamHandoffTs(a, team.name) - earliestTeamHandoffTs(b, team.name);
    return sortDir === 'desc' ? -diff : diff;
  });
  const pageItems = sorted.slice((page - 1) * PAGE, page * PAGE);

  return (
    <section className={`card card-pad ${s.section}`}>
      <div className='section-head'>
        <h2 className='section-title'>Jobs &amp; Handoffs</h2>
        <div className={s.sectionMeta}>
          <button
            className={s.sortToggle}
            title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
            onClick={() => {
              setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
              setPage(1);
            }}
          >
            <i
              className={`fa-solid fa-arrow-${sortDir === 'desc' ? 'down' : 'up'}-short-wide`}
              aria-hidden='true'
            />
            {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
          <span className='muted' style={{ fontSize: '0.8rem' }}>
            {handoffs.length}
          </span>
        </div>
      </div>
      {handoffs.length === 0 ? (
        <div className='empty-state'>No pending jobs.</div>
      ) : (
        <>
          {pageItems.map((f) => {
            const title = FORM_CATALOG_META[FORM_TITLE_TO_KEY[f.form_type]]?.title || f.form_type;
            const teamHandoffs = f.handoffs.filter((h) => h.team === team.name);
            const earliestHandoff = [...teamHandoffs].sort(
              (a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at),
            )[0];

            return (
              <div
                key={f.id}
                className={`${s.formRow} ${s.formItem} ${f.id === activeFormId ? s.formItemActive : ''}`}
                onClick={() => navigate(`/operations/${team.slug}/handoff/${f.id}`)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                  <div className={s.workMeta}>
                    <span className={s.cid}>{campaignMap[f.campaign_id] ?? f.campaign_id}</span> ·{' '}
                    From <strong>{f.operations_team}</strong> ·{' '}
                    {formatDate(earliestHandoff?.sent_at)}
                  </div>
                </div>
                <div className={s.formRight}>
                  <div className={s.handoffChips}>
                    {teamHandoffs.map((h) => {
                      const chipMod =
                        h.status === 'Acknowledged'
                          ? s.handoffChipAcknowledged
                          : h.status === 'Completed'
                            ? s.handoffChipCompleted
                            : '';
                      return (
                        <span key={h.id} className={`${s.handoffChip} ${chipMod}`}>
                          {Boolean(h.auto) && <i className='fa-solid fa-bolt' aria-hidden='true' />}
                          {h.status}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <Pager
            page={page}
            pageSize={PAGE}
            totalItems={sorted.length}
            noun='handoffs'
            onPage={setPage}
          />
        </>
      )}
    </section>
  );
}
