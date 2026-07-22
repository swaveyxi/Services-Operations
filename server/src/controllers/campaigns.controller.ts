import { Request, Response } from 'express';
import createError from 'http-errors';
import {
  createNewCampaign,
  getCampaignDetail,
  listMyCampaigns,
  listAllCampaigns,
  updateCommercials,
  submitForApproval,
} from '../services/campaigns.service';
import { updateCampaign } from '../models/campaigns';
import { findFormsByCampaign } from '../models/forms';
import { findWorkplansByCampaign } from '../models/workplans';

function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 10));
  return { limit, offset: (page - 1) * limit };
}

// GET /api/campaigns
export async function listCampaigns(req: Request, res: Response): Promise<void> {
  const { scope, status, unit } = req.query as Record<string, string | undefined>;

  if (scope === 'all') {
    const canViewAll = ['operations', 'operations_admin', 'super_admin', 'md'].some((r) =>
      req.user!.roles.includes(r),
    );
    if (!canViewAll) throw createError(403, 'Insufficient permissions to view all campaigns.');
    // Callers of scope=all always expect the complete set (org-wide dashboards,
    // campaign lookup maps) — only paginate if a page/limit was explicitly requested.
    const explicitPaging = req.query.page !== undefined || req.query.limit !== undefined;
    const { limit, offset } = explicitPaging ? parsePagination(req.query) : { limit: undefined, offset: undefined };
    const campaigns = await listAllCampaigns({
      status: status as never,
      unit: unit as never,
      limit,
      offset,
    });
    res.json(campaigns);
    return;
  }

  const { limit, offset } = parsePagination(req.query);
  const campaigns = await listMyCampaigns(req.user!.id, { status: status as never, limit, offset });
  res.json(campaigns);
}

// GET /api/campaigns/:id
export async function getCampaign(req: Request, res: Response): Promise<void> {
  const campaign = await getCampaignDetail(String(req.params.id));
  res.json(campaign);
}

// POST /api/campaigns
export async function createCampaign(req: Request, res: Response): Promise<void> {
  const { client_id, unit, description, revenue_items, cost_items } = req.body;
  const campaign = await createNewCampaign(
    { client_id, unit, description, revenue_items, cost_items },
    req.user!.id,
  );
  res.status(201).json(campaign);
}

// PATCH /api/campaigns/:id — update commercials or general fields
export async function patchCampaign(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { revenue_items, cost_items, client_id, description } = req.body;

  if (revenue_items !== undefined || cost_items !== undefined) {
    const profitability = await updateCommercials(id, revenue_items ?? [], cost_items ?? []);
    res.json({ profitability });
    return;
  }

  await updateCampaign(id, { client_id, description });
  res.json({ message: 'Campaign updated.' });
}

// POST /api/campaigns/:id/submit
export async function submitCampaign(req: Request, res: Response): Promise<void> {
  await submitForApproval(String(req.params.id));
  res.json({ message: 'Campaign submitted for approval.' });
}

// POST /api/campaigns/:id/close
export async function closeCampaign(req: Request, res: Response): Promise<void> {
  if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('md')) {
    throw createError(403, 'Only admin or MD can close campaigns.');
  }
  await updateCampaign(String(req.params.id), { campaign_status: 'Closed' });
  res.json({ message: 'Campaign closed.' });
}

// GET /api/campaigns/:id/workplans
export async function getCampaignWorkplans(req: Request, res: Response): Promise<void> {
  const workplans = await findWorkplansByCampaign(String(req.params.id));
  res.json(workplans);
}

// GET /api/campaigns/:id/forms
export async function getCampaignForms(req: Request, res: Response): Promise<void> {
  const forms = await findFormsByCampaign(String(req.params.id));
  res.json(forms);
}
