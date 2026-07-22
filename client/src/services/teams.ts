import { api } from './api';

/* Team key → display name + icon. Membership lives in ops_team_members (DB);
   workplan/form-to-team routing lives in shared/constants.ts (OPS_TEAM_NAME_MAP,
   FORM_CATALOG_META) — pages read those directly rather than through this file. */
const TEAM_NAME: Record<string, string> = {
  client_engagement: 'Client Engagement',
  scholarship_services: 'Scholarship Services',
  testing_operations: 'Testing Operations',
  candidate_experience: 'Candidate Experience',
  verification_operations: 'Verifications Operations',
  marketing: 'Marketing',
  tech: 'Tech',
  finance: 'Finance',
};
const TEAM_ICON: Record<string, string> = {
  client_engagement: 'fa-handshake',
  scholarship_services: 'fa-graduation-cap',
  testing_operations: 'fa-clipboard-check',
  candidate_experience: 'fa-user-check',
  verification_operations: 'fa-shield-halved',
  marketing: 'fa-bullhorn',
  tech: 'fa-gears',
  finance: 'fa-sack-dollar',
};

export type Team = { key: string; slug: string; name: string; icon: string };

const titleish = (key: string) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const nameOf = (key: string) => TEAM_NAME[key] ?? titleish(key);

export const TEAMS: Team[] = Object.keys(TEAM_NAME).map((key) => ({
  key,
  slug: key.replace(/_/g, '-'),
  name: nameOf(key),
  icon: TEAM_ICON[key] ?? 'fa-people-group',
}));

export async function fetchMyTeams(): Promise<Team[]> {
  try {
    const res = await api.get('/teams/mine');
    const data: { team_key: string; team_name: string }[] = await res.json();
    return data.map((t) => ({
      key: t.team_key,
      slug: t.team_key.replace(/_/g, '-'),
      name: TEAM_NAME[t.team_key] ?? titleish(t.team_key),
      icon: TEAM_ICON[t.team_key] ?? 'fa-people-group',
    }));
  } catch {
    return [];
  }
}

export function getTeamBySlug(slug: string): Team | null {
  return TEAMS.find((t) => t.slug === slug) ?? null;
}
