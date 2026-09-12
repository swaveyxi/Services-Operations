import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCommsOverview, getCommsPlatforms, getFlaggedCandidates } from '../services/comms';
import { getCampaign } from '../services/campaigns';
import { formatDate, humanizeSlug } from '@/utils/format';
import type { AtlasCampaign, CommsOverview as CommsOverviewData, CommsPlatform, FlaggedCandidate } from '../types';
import { HealthDot } from './shared';
import { AtlasBreadcrumb } from '../components/AtlasBreadcrumb';
import s from './Comms.module.css';

function healthFromFailureRate(rate: number): 'healthy' | 'warning' | 'critical' {
  if (rate >= 10) return 'critical';
  if (rate >= 2) return 'warning';
  return 'healthy';
}

function severityFromFailedCount(count: number): 'critical' | 'warning' {
  return count >= 3 ? 'critical' : 'warning';
}

export default function CommsOverview() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<AtlasCampaign | null>(null);
  const [overview, setOverview] = useState<CommsOverviewData | null>(null);
  const [platforms, setPlatforms] = useState<CommsPlatform[]>([]);
  const [flagged, setFlagged] = useState<FlaggedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getCampaign(id), getCommsOverview(id), getCommsPlatforms(id), getFlaggedCandidates(id)]).then(([camp, o, p, f]) => {
      if (!active) return;
      setCampaign(camp);
      setOverview(o);
      setPlatforms(p);
      setFlagged(f);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading || !overview || !campaign) {
    return <div className="loading-state">Loading communications…</div>;
  }

  const list = showAll ? flagged : flagged.slice(0, 5);

  return (
    <>
      <AtlasBreadcrumb id={id} label={campaign.campaign_id} current="Communications" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Communications</h1>
          <p className="page-sub">All platforms</p>
        </div>
      </div>

      <div className={s.metrics}>
        <div className={s.metric}>
          <span className="eyebrow">Total messages</span>
          <div className={s.metricValue}>{overview.totals.messages.toLocaleString()}</div>
        </div>
        <div className={`${s.metric} ${s.divider}`}>
          <span className="eyebrow">Delivery rate</span>
          <div className={s.metricValue} style={{ color: 'var(--t-positive-fg)' }}>
            {overview.rates.deliveryRate.toFixed(1)}%
          </div>
        </div>
        <div className={`${s.metric} ${s.divider}`}>
          <span className="eyebrow">Open rate</span>
          <div className={s.metricValue} style={{ color: 'var(--t-pending-fg)' }}>
            {overview.rates.openRate.toFixed(1)}%
          </div>
        </div>
        <div className={`${s.metric} ${s.divider}`}>
          <span className="eyebrow">Failures</span>
          <div className={s.metricValue} style={{ color: 'var(--c-brand)' }}>
            {overview.totals.failed}
          </div>
          <div className={s.metricSub}>require attention</div>
        </div>
      </div>

      <section className="card table-wrap" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="section-head" style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}>
          <h2 className="section-title">Platforms</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--c-text-muted)' }}>{platforms.length} active</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th style={{ textAlign: 'right' }}>Sent</th>
              <th>Delivered</th>
              <th style={{ textAlign: 'right' }}>Failed</th>
              <th>Health</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((p) => {
              const health = healthFromFailureRate(p.failure_rate);
              return (
                <tr
                  key={p.platform_slug}
                  className={`${s.platformRow} ${p.has_detail ? s.clickable : ''} ${health === 'critical' ? s.critical : ''}`}
                  onClick={() => p.has_detail && navigate(`/atlas/${id}/communications/${p.platform_slug}`)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div className={s.platformIcon}>{p.platform_slug.slice(0, 2).toUpperCase()}</div>
                      <span style={{ fontWeight: 600 }}>{humanizeSlug(p.platform_slug)}</span>
                    </div>
                  </td>
                  <td className="mono" style={{ textAlign: 'right' }}>
                    {p.sent}
                  </td>
                  <td>
                    <Bar value={p.delivered} pct={p.delivery_rate} tone="var(--t-positive-fg)" />
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: p.failed > 0 ? 'var(--c-brand)' : 'var(--c-text-muted)', fontWeight: p.failed > 0 ? 600 : 400 }}>
                    {p.failed}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                      <HealthDot health={health} />
                      {p.has_detail && (
                        <span className={s.viewLink}>
                          View <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ overflow: 'hidden', borderLeft: '3px solid var(--c-brand)' }}>
        <div className="section-head" style={{ padding: 'var(--space-4) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}>
          <div>
            <h2 className="section-title">Requires attention</h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: 2 }}>{flagged.length} candidates have unresolved communication issues</div>
          </div>
          {flagged.length > 5 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show top 5' : `View all ${flagged.length}`}
            </button>
          )}
        </div>
        {list.length === 0 ? (
          <div className="empty-state">No unresolved communication issues.</div>
        ) : (
          <div>
            {list.map((c) => {
              const severity = severityFromFailedCount(c.failed_count);
              return (
                <div key={`${c.id}-${c.channel}`} className={s.flaggedItem}>
                  <span className={s.flagIcon} style={{ background: severity === 'critical' ? 'var(--t-negative-bg)' : 'var(--t-pending-bg)', color: severity === 'critical' ? 'var(--t-negative-fg)' : 'var(--t-pending-fg)' }}>
                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                      <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.id}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginTop: 2 }}>
                      {c.failed_count} failed {humanizeSlug(c.channel)} message{c.failed_count === 1 ? '' : 's'} · {c.message_types.map((t) => humanizeSlug(t)).join(', ')} · last {formatDate(c.last_failure_at)}
                    </div>
                  </div>
                  <span className="badge badge--neutral">{humanizeSlug(c.channel)}</span>
                  <Link to={`/atlas/${id}/communications/candidates/${c.guid}`} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
                    View timeline <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function Bar({ value, pct, tone }: { value: number; pct: number; tone: string }) {
  return (
    <div className={s.bar}>
      <span className={`mono ${s.barValue}`}>{value}</span>
      <div className={s.barTrack}>
        <div className={s.barFill} style={{ width: `${pct}%`, background: tone }} />
      </div>
      <span className={`mono ${s.barPct}`}>{pct.toFixed(1)}%</span>
    </div>
  );
}
