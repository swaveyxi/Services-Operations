import { Request, Response } from 'express';
import createError from 'http-errors';
import { findAllTeams, findTeamByKey, findTeamMembers, findTeamsByUser } from '../models/teams';
import { findFormsByOpsTeam, findHandoffsByTeam } from '../models/forms';

// GET /api/teams/mine
export async function getMyTeams(req: Request, res: Response): Promise<void> {
  const teams = await findTeamsByUser(req.user!.id);
  res.json(teams);
}

// GET /api/teams
export async function listTeams(_req: Request, res: Response): Promise<void> {
  const teams = await findAllTeams();
  res.json(teams);
}

// GET /api/teams/:key
export async function getTeam(req: Request, res: Response): Promise<void> {
  const key = String(req.params.key);
  const team = await findTeamByKey(key);
  if (!team) throw createError(404, 'Team not found.');
  const members = await findTeamMembers(key);
  res.json({ ...team, members });
}

// GET /api/teams/:key/forms
export async function getTeamForms(req: Request, res: Response): Promise<void> {
  const forms = await findFormsByOpsTeam(String(req.params.key));
  res.json(forms);
}

// GET /api/teams/:key/handoffs
export async function getTeamHandoffs(req: Request, res: Response): Promise<void> {
  const handoffs = await findHandoffsByTeam(String(req.params.key));
  res.json(handoffs);
}
