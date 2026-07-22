import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listMyCampaigns, getClientById } from '@/services';
import type { Campaign } from '@shared/types';
import { StatusBadge } from '@/components/StatusBadge';
import { LifecyclePipeline } from '@/components/LifecyclePipeline';
import { Pager } from '@/components/Pager';
import { formatDate, ciEq } from '@/utils/format';
import { toCampaignDisplayStatus } from '@/utils/status';
import { CAMPAIGN_STATUSES } from '@shared/constants';
import s from './Home.module.css';

const PAGE_SIZE = 6;

export default function Home() {
  const { userEmail } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    listMyCampaigns().then(async (c) => {
      if (!active) return;
      setCases(c);
      setLoading(false);
      const ids = [...new Set(c.map((x) => x.client_id).filter(Boolean))] as string[];
      const entries = await Promise.all(
        ids.map((id) => getClientById(id).then((cl) => cl ? [id, cl.display_name] as const : null)),
      );
      if (active) setClientNames(Object.fromEntries(entries.filter(Boolean) as [string, string][]));
    });
    return () => { active = false; };
  }, [userEmail]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return cases.filter((c) => {
      const matchesQ = !needle || c.campaign_id.toLowerCase().includes(needle);
      const matchesS = !status || ciEq(toCampaignDisplayStatus(c.campaign_status), status);
      return matchesQ && matchesS;
    });
  }, [cases, q, status]);

  useEffect(() => setPage(1), [q, status]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>My Cases</h1>
          <p className='page-sub'>Business cases you own, newest first.</p>
        </div>
        <button className='btn btn-primary' onClick={() => navigate('/builder')}>
          <i className='fa-solid fa-plus' aria-hidden='true' /> New Case
        </button>
      </div>

      <div className={s.filters}>
        <input
          className={`input ${s.search}`}
          placeholder='Search campaign ID…'
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={`select ${s.statusSelect}`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value=''>All statuses</option>
          {CAMPAIGN_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className='loading-state'>Loading cases…</div>
      ) : filtered.length === 0 ? (
        <div className='empty-state'>
          {cases.length === 0
            ? 'You have no cases yet. Create one to get started.'
            : 'No cases match your filters.'}
        </div>
      ) : (
        <>
          <div className={s.list}>
            {pageItems.map((c) => (
              <div
                key={c.id}
                className={`card card-interactive ${s.row}`}
                onClick={() => navigate(`/tracker/${c.id}`)}
              >
                <div>
                  <div className={s.idLine}>
                    <span className={s.cid}>{c.campaign_id}</span>
                    <StatusBadge kind='campaign' value={toCampaignDisplayStatus(c.campaign_status)} />
                  </div>
                  <div className={s.client}>{(c.client_id && clientNames[c.client_id]) || '—'}</div>
                </div>

                <LifecyclePipeline
                  approval_status={c.approval_status}
                  campaign_status={c.campaign_status}
                />

                <div className={s.right}>
                  <div className={s.meta}>
                    <div className={s.metaUnit}>{c.unit || '—'}</div>
                    <div className={s.metaDate}>{formatDate(c.created_at)}</div>
                  </div>
                  <i className={`fa-solid fa-chevron-right ${s.chevron}`} aria-hidden='true' />
                </div>
              </div>
            ))}
          </div>
          <Pager
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            noun='cases'
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}
