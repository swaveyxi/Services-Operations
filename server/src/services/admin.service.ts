import createError from 'http-errors';
import {
  findUserById,
  findAllUsers,
  updateUserRoles,
  setUserActive,
} from '../models/users';
import {
  findTeamByKey,
  findTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateGroupEmail,
  createTeam as createTeamRow,
} from '../models/teams';

// ─── User role management ─────────────────────────────────────────────────────

export async function listUsers() {
  return findAllUsers();
}

export async function grantRole(userId: string, role: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw createError(404, 'User not found.');
  if (user.roles.includes(role)) return;
  await updateUserRoles(userId, [...user.roles, role]);
}

export async function revokeRole(userId: string, role: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw createError(404, 'User not found.');
  await updateUserRoles(userId, user.roles.filter((r) => r !== role));
}

export async function deactivateUser(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw createError(404, 'User not found.');
  await setUserActive(userId, false);
}

// ─── Team management ──────────────────────────────────────────────────────────

export async function getTeamMembers(teamKey: string) {
  const team = await findTeamByKey(teamKey);
  if (!team) throw createError(404, 'Team not found.');
  return findTeamMembers(teamKey);
}

export async function addMember(teamKey: string, userId: string): Promise<void> {
  const [team, user] = await Promise.all([findTeamByKey(teamKey), findUserById(userId)]);
  if (!team) throw createError(404, 'Team not found.');
  if (!user) throw createError(404, 'User not found.');
  await addTeamMember(team.id, userId);
}

export async function removeMember(teamKey: string, userId: string): Promise<void> {
  const team = await findTeamByKey(teamKey);
  if (!team) throw createError(404, 'Team not found.');
  await removeTeamMember(team.id, userId);
}

export async function setGroupEmail(teamKey: string, email: string): Promise<void> {
  const team = await findTeamByKey(teamKey);
  if (!team) throw createError(404, 'Team not found.');
  await updateGroupEmail(teamKey, email);
}

export async function clearGroupEmail(teamKey: string): Promise<void> {
  const team = await findTeamByKey(teamKey);
  if (!team) throw createError(404, 'Team not found.');
  await updateGroupEmail(teamKey, null);
}

export async function createTeam(teamKey: string, teamName: string) {
  const existing = await findTeamByKey(teamKey);
  if (existing) throw createError(409, 'Team already exists.');
  return createTeamRow(teamKey, teamName);
}
