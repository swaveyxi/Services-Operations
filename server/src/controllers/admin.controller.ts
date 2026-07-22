import { Request, Response } from 'express';
import createError from 'http-errors';
import {
  listUsers,
  grantRole,
  revokeRole,
  deactivateUser,
  getTeamMembers,
  addMember,
  removeMember,
  setGroupEmail,
  clearGroupEmail,
  createTeam,
} from '../services/admin.service';
import { findAllCampaigns } from '../models/campaigns';
import { findAllTeams } from '../models/teams';

function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 10));
  return { limit, offset: (page - 1) * limit };
}

// GET /api/admin/campaigns
export async function adminListCampaigns(req: Request, res: Response): Promise<void> {
  const { status, unit, owner_id } = req.query as Record<string, string | undefined>;
  const { limit, offset } = parsePagination(req.query);
  const campaigns = await findAllCampaigns({ status: status as never, unit: unit as never, ownerId: owner_id, limit, offset });
  res.json(campaigns);
}

// GET /api/admin/users
export async function adminListUsers(_req: Request, res: Response): Promise<void> {
  const users = await listUsers();
  res.json(users);
}

// PATCH /api/admin/users/:id/roles
export async function adminPatchUserRoles(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { action, role } = req.body;

  if (action === 'grant') {
    await grantRole(id, role);
    res.json({ message: `Role "${role}" granted.` });
    return;
  }

  if (action === 'revoke') {
    await revokeRole(id, role);
    res.json({ message: `Role "${role}" revoked.` });
    return;
  }

  throw createError(400, 'action must be "grant" or "revoke".');
}

// DELETE /api/admin/users/:id
export async function adminDeactivateUser(req: Request, res: Response): Promise<void> {
  await deactivateUser(String(req.params.id));
  res.json({ message: 'User deactivated.' });
}

// GET /api/admin/teams
export async function adminListTeams(_req: Request, res: Response): Promise<void> {
  const teams = await findAllTeams();
  res.json(teams);
}

// POST /api/admin/teams
export async function adminCreateTeam(req: Request, res: Response): Promise<void> {
  const { team_key, team_name } = req.body;
  const team = await createTeam(team_key, team_name);
  res.status(201).json(team);
}

// GET /api/admin/teams/:key/members
export async function adminGetTeamMembers(req: Request, res: Response): Promise<void> {
  const members = await getTeamMembers(String(req.params.key));
  res.json(members);
}

// POST /api/admin/teams/:key/members
export async function adminAddTeamMember(req: Request, res: Response): Promise<void> {
  const { user_id } = req.body;
  await addMember(String(req.params.key), user_id);
  res.status(201).json({ message: 'Member added.' });
}

// DELETE /api/admin/teams/:key/members/:user_id
export async function adminRemoveTeamMember(req: Request, res: Response): Promise<void> {
  await removeMember(String(req.params.key), String(req.params.user_id));
  res.status(204).send();
}

// PATCH /api/admin/teams/:key/group-email
export async function adminSetGroupEmail(req: Request, res: Response): Promise<void> {
  const key = String(req.params.key);
  const { email } = req.body;
  if (email === null || email === '') {
    await clearGroupEmail(key);
  } else {
    if (!email) throw createError(400, 'email is required.');
    await setGroupEmail(key, email);
  }
  res.json({ message: 'Group email updated.' });
}
