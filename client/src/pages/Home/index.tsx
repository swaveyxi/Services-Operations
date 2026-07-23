import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listMyCampaigns, listUnitCampaigns, getClientById } from '@/services';
import type { Campaign } from '@shared/types';
import { StatusBadge } from '@/components/StatusBadge';
import { LifecyclePipeline } from '@/components/LifecyclePipeline';
import { Pager } from '@/components/Pager';
import { formatDate, ciEq } from '@/utils/format';
import { toCampaignDisplayStatus } from '@/utils/status';
import { CAMPAIGN_STATUSES, BUSINESS_UNITS } from '@shared/constants';
import s from './Home.module.css';

const PAGE_SIZE = 5;

function CaseRow({
  c,
  clientName,
  onClick,
}: {
  c: Campaign;
  clientName: string;
  onClick: () => void;
}) {
  return (
    <div className={`card card-interactive ${s.row}`} onClick={onClick}>
      <div>
        <div className={s.idLine}>
          <span className={s.cid}>{c.campaign_id}</span>
          <StatusBadge kind='campaign' value={toCampaignDisplayStatus(c.campaign_status)} />
        </div>
        <div className={s.client}>{clientName || '—'}</div>
      </div>

      <LifecyclePipeline approval_status={c.approval_status} campaign_status={c.campaign_status} />

      <div className={s.right}>
        <div className={s.meta}>
          <div className={s.metaUnit}>{c.unit || '—'}</div>
          <div className={s.metaDate}>{formatDate(c.created_at)}</div>
        </div>
        <i className={`fa-solid fa-chevron-right ${s.chevron}`} aria-hidden='true' />
      </div>
    </div>
  );
}

export default function Home() {
  const { userEmail } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Campaign[]>([]);
  const [unitCases, setUnitCases] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [bu, setBu] = useState('');
  const [page, setPage] = useState(1);
  const [qUnit, setQUnit] = useState('');
  const [statusUnit, setStatusUnit] = useState('');
  const [buUnit, setBuUnit] = useState('');
  const [pageUnit, setPageUnit] = useState(1);

  useEffect(() => {
    let active = true;
    Promise.all([listMyCampaigns(), listUnitCampaigns()]).then(async ([mine, unit]) => {
      if (!active) return;
      setCases(mine);
      setUnitCases(unit);
      setLoading(false);
      const ids = [
        ...new Set([...mine, ...unit].map((x) => x.client_id).filter(Boolean)),
      ] as string[];
      const entries = await Promise.all(
        ids.map((id) =>
          getClientById(id).then((cl) => (cl ? ([id, cl.display_name] as const) : null)),
        ),
      );
      if (active) setClientNames(Object.fromEntries(entries.filter(Boolean) as [string, string][]));
    });
    return () => {
      active = false;
    };
  }, [userEmail]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    return cases.filter((c) => {
      const matchesQ = !needle || c.campaign_id.toLowerCase().includes(needle);
      const matchesS = !status || ciEq(toCampaignDisplayStatus(c.campaign_status), status);
      const matchesBu = !bu || c.unit === bu;
      return matchesQ && matchesS && matchesBu;
    });
  }, [cases, q, status, bu]);

  const unitFiltered = useMemo(() => {
    const needle = qUnit.toLowerCase().trim();
    return unitCases.filter((c) => {
      const matchesQ = !needle || c.campaign_id.toLowerCase().includes(needle);
      const matchesS = !statusUnit || ciEq(toCampaignDisplayStatus(c.campaign_status), statusUnit);
      const matchesBu = !buUnit || c.unit === buUnit;
      return matchesQ && matchesS && matchesBu;
    });
  }, [unitCases, qUnit, statusUnit, buUnit]);

  useEffect(() => setPage(1), [q, status, bu]);
  useEffect(() => setPageUnit(1), [qUnit, statusUnit, buUnit]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const unitPageItems = unitFiltered.slice((pageUnit - 1) * PAGE_SIZE, pageUnit * PAGE_SIZE);

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
        <div className={s.filterGroup}>
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
          <select
            className={`select ${s.statusSelect}`}
            value={bu}
            onChange={(e) => setBu(e.target.value)}
          >
            <option value=''>All units</option>
            {BUSINESS_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
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
              <CaseRow
                key={c.id}
                c={c}
                clientName={(c.client_id && clientNames[c.client_id]) || ''}
                onClick={() => navigate(`/tracker/${c.id}`)}
              />
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

      <div className={`page-head ${s.unitSection}`}>
        <div>
          <h1 className='page-title'>My Unit&rsquo;s Cases</h1>
          <p className='page-sub'>Cases in the business units your teams cover.</p>
        </div>
      </div>

      <div className={s.filters}>
        <input
          className={`input ${s.search}`}
          placeholder='Search campaign ID…'
          value={qUnit}
          onChange={(e) => setQUnit(e.target.value)}
        />
        <div className={s.filterGroup}>
          <select
            className={`select ${s.statusSelect}`}
            value={statusUnit}
            onChange={(e) => setStatusUnit(e.target.value)}
          >
            <option value=''>All statuses</option>
            {CAMPAIGN_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <select
            className={`select ${s.statusSelect}`}
            value={buUnit}
            onChange={(e) => setBuUnit(e.target.value)}
          >
            <option value=''>All units</option>
            {BUSINESS_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className='loading-state'>Loading cases…</div>
      ) : unitFiltered.length === 0 ? (
        <div className='empty-state'>
          {unitCases.length === 0
            ? "No cases found for your team's business unit."
            : 'No cases match your search.'}
        </div>
      ) : (
        <>
          <div className={s.list}>
            {unitPageItems.map((c) => (
              <CaseRow
                key={c.id}
                c={c}
                clientName={(c.client_id && clientNames[c.client_id]) || ''}
                onClick={() => navigate(`/tracker/${c.id}`)}
              />
            ))}
          </div>
          <Pager
            page={pageUnit}
            pageSize={PAGE_SIZE}
            totalItems={unitFiltered.length}
            noun='cases'
            onPage={setPageUnit}
          />
        </>
      )}
    </>
  );
}
