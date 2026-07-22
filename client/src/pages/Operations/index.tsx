import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listCampaigns, listAllWorkplans, listAllForms, type Team } from '@/services';
import { useUserTeams } from '@/hooks/useUserTeams';
import type { Campaign, ConfiguredWorkplan, SupportForm } from '@shared/types';
import { teamCampaignBuckets } from '@/utils/opsTeams';
import { ciEq } from '@/utils/format';
import { OPERATIONS_ROLE, OPERATIONS_ADMIN_ROLE, SUPER_ADMIN_ROLE } from '@shared/constants';
import s from './Operations.module.css';

export default function Operations() {
  const { userEmail, hasRole } = useAuth();
  const navigate = useNavigate();
  const teams = useUserTeams();
  const canViewOperations =
    hasRole(OPERATIONS_ROLE) || hasRole(OPERATIONS_ADMIN_ROLE) || hasRole(SUPER_ADMIN_ROLE);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [workplans, setWorkplans] = useState<ConfiguredWorkplan[]>([]);
  const [forms, setForms] = useState<SupportForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canViewOperations) return;
    let alive = true;
    Promise.all([listCampaigns(), listAllWorkplans(), listAllForms()])
      .then(([c, w, f]) => {
        if (!alive) return;
        setCampaigns(c);
        setWorkplans(w);
        setForms(f);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [canViewOperations]);

  if (!canViewOperations) {
    return (
      <>
        <div className='page-head'>
          <div>
            <h1 className='page-title'>Operations</h1>
          </div>
        </div>
        <div className='empty-state'>You do not have access to this section.</div>
      </>
    );
  }

  const summaries = useMemo(
    () =>
      teams.map((t) => {
        const { reviews, active } = teamCampaignBuckets(t.name, campaigns, workplans);
        const open = forms.filter(
          (f) => f.operations_team === t.name && !ciEq(f.delivery_status, 'Completed'),
        ).length;
        const activeJobs = forms.filter((f) =>
          (f.handoffs ?? []).some((h) => h.team === t.name && h.status !== 'Completed'),
        ).length;
        return { team: t, reviews: reviews.length, active: active.length, open, activeJobs };
      }),
    [teams, campaigns, workplans, forms],
  );

  return (
    <>
      <div className='page-head'>
        <div>
          <h1 className='page-title'>Operations</h1>
          <p className='page-sub'>Your team workspaces — pick a team to action its work.</p>
        </div>
      </div>

      {error ? (
        <div className='empty-state'>Could not load team summaries. Please try again.</div>
      ) : teams.length === 0 ? (
        <div className='empty-state'>You are not assigned to any operations team.</div>
      ) : loading ? (
        <div className='loading-state'>Loading team summaries…</div>
      ) : (
        <div className={s.teamGrid}>
          {summaries.map(({ team, reviews, active, open, activeJobs }) => (
            <TeamCard
              key={team.slug}
              team={team}
              reviews={reviews}
              active={active}
              open={open}
              activeJobs={activeJobs}
              onOpen={() => navigate(`/operations/${team.slug}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function TeamCard({
  team,
  reviews,
  active,
  open,
  activeJobs,
  onOpen,
}: {
  team: Team;
  reviews: number;
  active: number;
  open: number;
  activeJobs: number;
  onOpen: () => void;
}) {
  const pending = reviews + open + activeJobs;
  return (
    <div className={`card card-interactive ${s.teamCard}`} onClick={onOpen}>
      <div className={s.teamCardHead}>
        <span className={s.teamIcon}>
          <i className={`fa-solid ${team.icon}`} aria-hidden='true' />
        </span>
        <div>
          <div className={s.teamName}>{team.name}</div>
          <div className={s.teamSub}>
            {pending > 0
              ? `${pending} item${pending === 1 ? '' : 's'} need attention`
              : 'All caught up'}
          </div>
        </div>
      </div>
      <div className={s.teamStats}>
        <div className={s.teamStat}>
          <div className={`${s.teamStatVal} ${reviews ? s.alert : ''}`}>{reviews}</div>
          <div className={s.teamStatLabel}>Reviews</div>
        </div>
        <div className={s.teamStat}>
          <div className={`${s.teamStatVal} ${open ? s.alert : ''}`}>{open}</div>
          <div className={s.teamStatLabel}>Open Forms</div>
        </div>
        <div className={s.teamStat}>
          <div className={`${s.teamStatVal} ${activeJobs ? s.alert : ''}`}>{activeJobs}</div>
          <div className={s.teamStatLabel}>Jobs</div>
        </div>
      </div>
      <div className={s.teamCardFoot}>
        Open workspace <i className='fa-solid fa-arrow-right' aria-hidden='true' />
      </div>
    </div>
  );
}
