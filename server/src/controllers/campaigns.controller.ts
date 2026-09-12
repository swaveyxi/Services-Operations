import { Request, Response } from 'express';
import createError from 'http-errors';
import {
  createNewCampaign,
  getCampaignDetail,
  listMyCampaigns,
  listUnitCampaigns,
  listAllCampaigns,
  listArchivedCampaigns,
  updateCommercials,
  submitForApproval,
  archiveCampaign,
  unarchiveCampaign,
  deleteCampaign,
  assertCampaignActionable,
  assertCampaignVisible,
} from '../services/campaigns.service';
import { updateCampaign, findCampaignById } from '../models/campaigns';
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

  // Callers that don't pass page/limit always expect the complete set (org-wide
  // dashboards, "My Cases", campaign lookup maps) — only paginate if explicitly requested.
  const explicitPaging = req.query.page !== undefined || req.query.limit !== undefined;
  const { limit, offset } = explicitPaging ? parsePagination(req.query) : { limit: undefined, offset: undefined };

  if (scope === 'all') {
    const canViewAll = ['operations', 'operations_admin', 'super_admin', 'md'].some((r) =>
      req.user!.roles.includes(r),
    );
    if (!canViewAll) throw createError(403, 'Insufficient permissions to view all campaigns.');
    const campaigns = await listAllCampaigns({
      status: status as never,
      unit: unit as never,
      limit,
      offset,
    });
    res.json(campaigns);
    return;
  }

  if (scope === 'unit') {
    const campaigns = await listUnitCampaigns(req.user!.id, { limit, offset });
    res.json(campaigns);
    return;
  }

  const campaigns = await listMyCampaigns(req.user!.id, { status: status as never, limit, offset });
  res.json(campaigns);
}

// GET /api/campaigns/archived — current user's own archived cases
export async function listArchived(req: Request, res: Response): Promise<void> {
  const campaigns = await listArchivedCampaigns(req.user!.id);
  res.json(campaigns);
}

// GET /api/campaigns/:id
export async function getCampaign(req: Request, res: Response): Promise<void> {
  const campaign = await getCampaignDetail(String(req.params.id), req.user!);
  res.json(campaign);
}

// POST /api/campaigns
export async function createCampaign(req: Request, res: Response): Promise<void> {
  const { client_id, unit, name, description, revenue_items, cost_items, atlas_stages } = req.body;
  const campaign = await createNewCampaign(
    { client_id, unit, name, description, revenue_items, cost_items, atlas_stages },
    req.user!.id,
  );
  res.status(201).json(campaign);
}

// PATCH /api/campaigns/:id — update commercials or general fields
export async function patchCampaign(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const { revenue_items, cost_items, client_id, description } = req.body;

  if (revenue_items !== undefined || cost_items !== undefined) {
    const profitability = await updateCommercials(
      id,
      revenue_items ?? [],
      cost_items ?? [],
      req.user!.id,
      req.user!.roles,
    );
    res.json({ profitability });
    return;
  }

  const campaign = await assertCampaignActionable(id);
  await assertCampaignVisible(campaign, req.user!);
  await updateCampaign(id, { client_id, description, updated_by: req.user!.id });
  res.json({ message: 'Campaign updated.' });
}

// POST /api/campaigns/:id/submit
export async function submitCampaign(req: Request, res: Response): Promise<void> {
  await submitForApproval(String(req.params.id), req.user!.id, req.user!.roles);
  res.json({ message: 'Campaign submitted for approval.' });
}

// POST /api/campaigns/:id/close
export async function closeCampaign(req: Request, res: Response): Promise<void> {
  if (!req.user!.roles.includes('admin') && !req.user!.roles.includes('md')) {
    throw createError(403, 'Only admin or MD can close campaigns.');
  }
  await assertCampaignActionable(String(req.params.id));
  await updateCampaign(String(req.params.id), {
    campaign_status: 'Closed',
    updated_by: req.user!.id,
  });
  res.json({ message: 'Campaign closed.' });
}

// POST /api/campaigns/:id/archive
export async function archive(req: Request, res: Response): Promise<void> {
  await archiveCampaign(String(req.params.id), req.user!.id, req.user!.name);
  res.json({ message: 'Case archived.' });
}

// POST /api/campaigns/:id/unarchive
export async function unarchive(req: Request, res: Response): Promise<void> {
  await unarchiveCampaign(String(req.params.id), req.user!.id);
  res.json({ message: 'Case restored.' });
}

// DELETE /api/campaigns/:id
export async function removeCampaign(req: Request, res: Response): Promise<void> {
  await deleteCampaign(String(req.params.id), req.user!.id, req.user!.name);
  res.json({ message: 'Case deleted.' });
}

// GET /api/campaigns/:id/workplans
export async function getCampaignWorkplans(req: Request, res: Response): Promise<void> {
  const campaign = await findCampaignById(String(req.params.id));
  if (!campaign) throw createError(404, 'Campaign not found.');
  await assertCampaignVisible(campaign, req.user!);
  const workplans = await findWorkplansByCampaign(campaign.id);
  res.json(workplans);
}

// GET /api/campaigns/:id/forms
export async function getCampaignForms(req: Request, res: Response): Promise<void> {
  const campaign = await findCampaignById(String(req.params.id));
  if (!campaign) throw createError(404, 'Campaign not found.');
  await assertCampaignVisible(campaign, req.user!);
  const forms = await findFormsByCampaign(campaign.id);
  res.json(forms);
}
