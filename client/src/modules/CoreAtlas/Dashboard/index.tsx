import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCampaign, getPipelineStages } from '../services/campaigns';
import { humanizeSlug } from '@/utils/format';
import type { AtlasCampaign, PipelineStage } from '../types';
import { StageRail } from './StageRail';
import { StageCard } from './StageCard';
import { AtlasBreadcrumb } from '../components/AtlasBreadcrumb';
import s from './Dashboard.module.css';

function daysRemaining(targetCloseAt: string | null): number | null {
  if (!targetCloseAt) return null;
  const ms = new Date(targetCloseAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function Dashboard() {
  const { id = '' } = useParams();
  const [campaign, setCampaign] = useState<AtlasCampaign | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => Promise.all([getCampaign(id), getPipelineStages(id)]), [id]);

  useEffect(() => {
    let active = true;
    load().then(([c, st]) => {
      if (!active) return;
      setCampaign(c);
      setStages(st);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    try {
      const [c, st] = await load();
      setCampaign(c);
      setStages(st);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || !campaign) {
    return <div className='loading-state'>Loading campaign…</div>;
  }

  const daysLeft = daysRemaining(campaign.target_close_at);

  const liveStages = stages.filter((st) => st.status !== 'AWAITING');

  return (
    <>
      <AtlasBreadcrumb id={id} label={campaign.campaign_id} />
      <div className='page-head'>
        <div>
          <h1 className='page-title'>{campaign.name || campaign.campaign_id}</h1>
          <p className='page-sub'>
            {campaign.client?.display_name ?? 'Unknown client'} · {campaign.unit}
          </p>
        </div>
        <div className={s.headActions}>
          <span className={s.statusChip}>
            <span className={s.statusDot} />
            {humanizeSlug(campaign.atlas_status)}
            {daysLeft !== null && (
              <span style={{ color: 'var(--c-text-faint)', fontWeight: 500 }}>
                &nbsp;· {daysLeft}d left
              </span>
            )}
          </span>
        </div>
      </div>

      <div className={s.main}>
        <StageRail stages={stages} onRefresh={refresh} refreshing={refreshing} />
        {liveStages.map((st) => (
          <StageCard key={st.platform_slug} stage={st} />
        ))}
      </div>
    </>
  );
}
