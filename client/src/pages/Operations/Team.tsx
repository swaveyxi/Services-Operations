import { useEffect, useMemo, useState } from 'react';
import { Outlet, useMatch, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  listCampaigns,
  listAllWorkplans,
  listFormsForTeams,
  listHandoffsForTeam,
  listUsers,
  getTeamBySlug,
  type Team,
} from '@/services';
import { useUserTeams } from '@/hooks/useUserTeams';
import type { Campaign, ConfiguredWorkplan, SupportForm, OpsUser } from '@shared/types';
import { SECTION_COMPONENTS, sectionsForTeam } from './workspace';

/* Shared with the detail panes (FormPanel / HandoffPanel) via <Outlet context>. */
export type TeamOutletContext = {
  team: Team;
  forms: SupportForm[];
  handoffs: SupportForm[];
  campaignMap: Record<string, string>; // campaign UUID → human-readable campaign_id
  userMap: Record<string, string>;     // user UUID → display name
  onFormChanged: (form: SupportForm) => void;
};

export default function OperationsTeam() {
  const { team: slug = '' } = useParams();
  const navigate = useNavigate();
  const { userEmail } = useAuth();

  const team = useMemo(() => getTeamBySlug(slug), [slug]);
  const myTeams = useUserTeams();
  const allowed = useMemo(() => myTeams.some((t) => t.slug === slug), [myTeams, slug]);
  const formMatch = useMatch('/operations/:team/form/:formId');
  const handoffMatch = useMatch('/operations/:team/handoff/:formId');
  const activeFormId = formMatch?.params.formId ?? handoffMatch?.params.formId ?? null;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [workplans, setWorkplans] = useState<ConfiguredWorkplan[]>([]);
  const [forms, setForms] = useState<SupportForm[]>([]);
  const [handoffs, setHandoffs] = useState<SupportForm[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!team || !allowed) {
      setLoading(false);
      return;
    }
    let alive = true;
    Promise.all([
      listCampaigns(),
      listAllWorkplans(),
      listFormsForTeams([team.name]),
      listHandoffsForTeam(team.name),
      listUsers(),
    ]).then(([cs, wps, fs, hs, users]) => {
      if (!alive) return;
      setCampaigns(cs);
      setWorkplans(wps);
      setForms(fs);
      setHandoffs(hs);
      setUserMap(Object.fromEntries((users as OpsUser[]).map((u) => [u.id, u.name])));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [team, allowed]);

  function onFormChanged(updated: SupportForm) {
    setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setHandoffs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }

  if (!team) return <div className="error-state">Unknown team.</div>;
  if (!allowed)
    return (
      <>
        <Head team={team} backLabel="All Teams" onBack={() => navigate('/operations')} />
        <div className="empty-state">You don’t have access to the {team.name} workspace.</div>
      </>
    );
  if (loading) return <div className="loading-state">Loading {team.name} workspace…</div>;

  const detailOpen = !!(formMatch || handoffMatch);
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c.campaign_id]));
  const ctx: TeamOutletContext = { team, forms, handoffs, campaignMap, userMap, onFormChanged };
  const sections = sectionsForTeam(team.key);

  return (
    <>
      <Head
        team={team}
        backLabel={detailOpen ? `Back to ${team.name}` : 'All Teams'}
        onBack={() => navigate(detailOpen ? `/operations/${team.slug}` : '/operations')}
      />

      {detailOpen ? (
        <Outlet context={ctx} />
      ) : (
        <div>
          {sections.map((id) => {
            const Section = SECTION_COMPONENTS[id];
            return (
              <Section
                key={id}
                team={team}
                campaigns={campaigns}
                workplans={workplans}
                forms={forms}
                handoffs={handoffs}
                activeFormId={activeFormId}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function Head({ team, backLabel, onBack }: { team: Team; backLabel: string; onBack: () => void }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">
          <i
            className={`fa-solid ${team.icon}`}
            aria-hidden="true"
            style={{ color: 'var(--c-brand)', marginRight: 10 }}
          />
          {team.name}
        </h1>
        <p className="page-sub">Workplan reviews, support forms, and jobs &amp; handoffs for your team.</p>
      </div>
      <button className="btn btn-secondary" onClick={onBack}>
        <i className="fa-solid fa-arrow-left" aria-hidden="true" /> {backLabel}
      </button>
    </div>
  );
}
