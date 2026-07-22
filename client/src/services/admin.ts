import type { OpsUser } from '@shared/types';
import { PLATFORM_ROLES, type PlatformRole } from '@shared/constants';
import { api } from './api';

export { PLATFORM_ROLES, type PlatformRole };

export async function listUsers(): Promise<OpsUser[]> {
  const res = await api.get('/admin/users');
  return res.json();
}

export async function grantRole(email: string, role: PlatformRole): Promise<OpsUser> {
  const users = await listUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('User not found');
  await api.patch(`/admin/users/${user.id}/roles`, { action: 'grant', role });
  return { ...user, roles: [...new Set([...user.roles, role])] };
}

export async function revokeRole(email: string, role: PlatformRole): Promise<OpsUser> {
  const users = await listUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('User not found');
  await api.patch(`/admin/users/${user.id}/roles`, { action: 'revoke', role });
  return { ...user, roles: user.roles.filter((r) => r !== role) };
}

export async function listTeamMembers(teamKey: string): Promise<string[]> {
  const res = await api.get(`/admin/teams/${teamKey}/members`);
  const data: { id: string; name: string; email: string }[] = await res.json();
  return data.map((m) => m.email);
}

export async function addTeamMember(teamKey: string, email: string): Promise<string[]> {
  const users = await listUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('User not found');
  await api.post(`/admin/teams/${teamKey}/members`, { user_id: user.id });
  return listTeamMembers(teamKey);
}

export async function removeTeamMember(teamKey: string, email: string): Promise<string[]> {
  const users = await listUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('User not found');
  await api.del(`/admin/teams/${teamKey}/members/${user.id}`);
  return listTeamMembers(teamKey);
}

export async function getTeamGroupEmail(teamKey: string): Promise<string | null> {
  const res = await api.get(`/teams/${teamKey}`);
  const data = await res.json() as { group_email?: string | null };
  return data.group_email ?? null;
}

export async function setTeamGroupEmail(teamKey: string, email: string): Promise<string> {
  await api.patch(`/admin/teams/${teamKey}/group-email`, { email });
  return email;
}

export async function clearTeamGroupEmail(teamKey: string): Promise<null> {
  await api.patch(`/admin/teams/${teamKey}/group-email`, { email: null });
  return null;
}

export async function createTeam(teamKey: string, teamName: string): Promise<void> {
  await api.post('/admin/teams', { team_key: teamKey, team_name: teamName });
}
