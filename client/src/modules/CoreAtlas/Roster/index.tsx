import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCandidates, getPipelineDistribution } from '../services/candidates';
import { getCampaign, getPipelineStages } from '../services/campaigns';
import { formatDate, humanizeSlug } from '@/utils/format';
import type { AtlasCampaign, Candidate, CandidateStatus, PipelineDistribution, PipelineStage } from '../types';
import { AtlasBreadcrumb } from '../components/AtlasBreadcrumb';
import s from './Roster.module.css';

const STATUS_FILTERS: CandidateStatus[] = ['ACTIVE', 'COMPLETED', 'WITHDRAWN'];

export default function Roster() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<AtlasCampaign | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [distribution, setDistribution] = useState<PipelineDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    let active = true;
    Promise.all([getCampaign(id), getCandidates(id), getPipelineDistribution(id), getPipelineStages(id)]).then(
      ([camp, c, d, st]) => {
        if (!active) return;
        setCampaign(camp);
        setCandidates(c);
        setDistribution(d);
        setStages(st);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  // Every configured pipeline stage, not just the ones someone currently
  // happens to be sitting at — otherwise a stage nobody is currently at
  // (because everyone has already moved past it) silently drops out of the
  // filter entirely.
  const stageOptions = useMemo(
    () => stages.slice().sort((a, b) => a.stage_order - b.stage_order),
    [stages],
  );

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (q && !(c.name.toLowerCase().includes(q.toLowerCase()) || c.id.toLowerCase().includes(q.toLowerCase()))) return false;
      if (stageFilter !== 'All' && c.current_stage_slug !== stageFilter) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      return true;
    });
  }, [candidates, q, stageFilter, statusFilter]);

  if (loading || !distribution || !campaign) {
    return <div className="loading-state">Loading candidates…</div>;
  }

  return (
    <>
      <AtlasBreadcrumb id={id} label={campaign.campaign_id} current="Candidates" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Candidates</h1>
          <p className="page-sub">
            <span className="mono">{distribution.total_candidates}</span> total candidates
          </p>
        </div>
        <div className={s.filters}>
          <div className={s.searchWrap}>
            <i className={`fa-solid fa-magnifying-glass ${s.searchIcon}`} aria-hidden="true" />
            <input
              className={s.searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or ID"
            />
          </div>
          <select className={s.select} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="All">All stages</option>
            {stageOptions.map((st) => (
              <option key={st.platform_slug} value={st.platform_slug}>{st.platform_name}</option>
            ))}
          </select>
          <select className={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="All">All statuses</option>
            {STATUS_FILTERS.map((v) => (
              <option key={v} value={v}>{humanizeSlug(v)}</option>
            ))}
          </select>
          <button className="btn btn-ghost btn-sm">
            <i className="fa-solid fa-download" aria-hidden="true" /> Export
          </button>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 'var(--space-4)' }}>
        <div className={s.distHead}>
          <span className="eyebrow">Pipeline distribution</span>
        </div>
        <div
          className={s.distBars}
          style={{
            gridTemplateColumns: `${distribution.active}fr ${distribution.completed}fr ${distribution.withdrawn}fr`,
          }}
        >
          <div className={`${s.distBar} ${s.fot}`} />
          <div className={`${s.distBar} ${s.awaiting}`} />
          <div className={`${s.distBar} ${s.withdrawn}`} />
        </div>
        <div className={s.distStats}>
          <PipeStat label="Active" n={distribution.active} sub="Currently progressing through the pipeline" tone="ink" />
          <PipeStat label="Completed" n={distribution.completed} sub="Reached the end of the pipeline" tone="amber" divider />
          <PipeStat label="Withdrawn" n={distribution.withdrawn} sub="From various stages" tone="muted" divider />
        </div>
        {distribution.needs_action > 0 && (
          <div style={{ marginTop: 'var(--space-3)', fontSize: '0.75rem', color: 'var(--t-pending-fg)' }}>
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {distribution.needs_action} candidate{distribution.needs_action === 1 ? '' : 's'} need action on their current stage.
          </div>
        )}
      </div>

      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Current stage</th>
              <th>Identity</th>
              <th>Invited</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className={`${s.rowLink} ${c.status === 'WITHDRAWN' ? s.withdrawn : ''}`}
                onClick={() => navigate(`/atlas/${id}/candidates/${c.id}`)}
              >
                <td>
                  <div className={s.candCell}>
                    <div className={`${s.avatar} ${c.status === 'WITHDRAWN' ? s.withdrawn : ''}`}>
                      {initials(c.name)}
                    </div>
                    <div>
                      <div className={s.candName}>{c.name}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <StageBadge candidate={c} />
                </td>
                <td>
                  <span className={s.identityCell}>
                    <span className={`${s.identityDot} ${c.identity_state === 'CONFIRMED' ? s.confirmed : s.provisional}`} />
                    {c.identity_state === 'CONFIRMED' ? 'NIN confirmed' : c.identity_state === 'FLAGGED' ? 'Flagged' : 'Provisional'}
                  </span>
                </td>
                <td>{formatDate(c.invited_at)}</td>
                <td style={{ textAlign: 'right' }}>
                  <span className={s.viewLink}>
                    View profile <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> No candidates match your filters.
          </div>
        )}
      </div>
      <div className="pager">
        <span className="pager-summary">
          Showing <span className="mono">{filtered.length}</span> of <span className="mono">{distribution.total_candidates}</span> total in campaign
        </span>
      </div>
    </>
  );
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('');
}

function PipeStat({ label, n, sub, tone, divider }: { label: string; n: number; sub: string; tone: 'amber' | 'ink' | 'muted'; divider?: boolean }) {
  return (
    <div style={divider ? { borderLeft: '1px solid var(--c-border)', paddingLeft: 'var(--space-4)' } : undefined}>
      <span className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>
        {label}
      </span>
      <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 600, color: tone === 'muted' ? 'var(--c-text-muted)' : 'var(--c-text)' }}>
        {n}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--c-text-muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function StageBadge({ candidate }: { candidate: Candidate }) {
  if (candidate.status === 'WITHDRAWN') return <span className="badge badge--neutral">Withdrawn</span>;
  if (!candidate.current_stage_slug) return <span className="badge badge--neutral">Not started</span>;
  if (candidate.current_platform_status === 'NEEDS_ACTION') return <span className="badge badge--pending">{humanizeSlug(candidate.current_stage_slug)} · needs action</span>;
  if (candidate.current_platform_status === 'COMPLETED') return <span className="badge badge--positive">{humanizeSlug(candidate.current_stage_slug)} · complete</span>;
  return <span className="badge badge--info">{humanizeSlug(candidate.current_stage_slug)} · active</span>;
}
