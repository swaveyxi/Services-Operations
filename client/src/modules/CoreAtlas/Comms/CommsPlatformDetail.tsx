import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPlatformDetail } from '../services/comms';
import type { CommsPlatform } from '../types';
import { humanizeSlug } from '@/utils/format';
import s from './Comms.module.css';

function healthFromFailureRate(rate: number): 'healthy' | 'warning' | 'critical' {
  if (rate >= 10) return 'critical';
  if (rate >= 2) return 'warning';
  return 'healthy';
}

export default function CommsPlatformDetail() {
  const { id = '', platformId = '' } = useParams();
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<CommsPlatform | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getPlatformDetail(id, platformId).then((d) => {
      if (active) setPlatform(d);
    });
    return () => {
      active = false;
    };
  }, [id, platformId]);

  if (platform === undefined) return <div className="loading-state">Loading platform detail…</div>;

  const backBtn = (
    <button className={s.backBtn} onClick={() => navigate(`/atlas/${id}/communications`)}>
      <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Back to overview
    </button>
  );

  if (!platform) {
    return (
      <>
        {backBtn}
        <div className="empty-state">
          <i className="fa-solid fa-circle-info" aria-hidden="true" /> {humanizeSlug(platformId)} — detail not available for this platform.
        </div>
      </>
    );
  }

  const health = healthFromFailureRate(platform.failure_rate);

  return (
    <>
      {backBtn}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <h1 className="page-title">{humanizeSlug(platform.platform_slug)}</h1>
            <span className={`badge badge--${health === 'critical' ? 'negative' : health === 'warning' ? 'pending' : 'positive'}`}>{health}</span>
          </div>
          <div className={s.platformHeadMeta}>
            <span className="mono">{platform.sent}</span> sent ·{' '}
            <span className="mono" style={{ color: platform.failed > 0 ? 'var(--c-brand)' : 'inherit' }}>
              {platform.failed}
            </span>{' '}
            failed · <span className="mono">{platform.delivery_rate.toFixed(1)}%</span> delivery rate
          </div>
        </div>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="section-head" style={{ padding: 'var(--space-3) var(--space-5)', marginBottom: 0, borderBottom: '1px solid var(--c-border)' }}>
          <h2 className="section-title">All candidates · {platform.sent}</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/atlas/${id}/candidates`)}>
            Open in Candidates →
          </button>
        </div>
        <div style={{ padding: 'var(--space-4) var(--space-5)', fontSize: '0.8125rem', color: 'var(--c-text-muted)', lineHeight: 1.5 }}>
          The full per-candidate communications record lives in Candidates and each candidate's own timeline. Check the overview's "Requires attention"
          list for the items that need action now.
        </div>
      </section>
    </>
  );
}
