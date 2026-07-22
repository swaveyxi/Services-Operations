import { Request, Response } from 'express';
import { approveCampaign, rejectCampaign } from '../services/campaigns.service';
import { findAllCampaigns, getRevenueItemsBatch, getCostItemsBatch } from '../models/campaigns';
import createError from 'http-errors';

function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 10));
  return { limit, offset: (page - 1) * limit };
}

// GET /api/approvals
export async function listPendingApprovals(req: Request, res: Response): Promise<void> {
  const { limit, offset } = parsePagination(req.query);
  const rows = await findAllCampaigns({ approvalStatus: 'Pending', limit, offset });
  const ids = rows.map((c) => c.id);
  const [revenueMap, costMap] = await Promise.all([
    getRevenueItemsBatch(ids),
    getCostItemsBatch(ids),
  ]);
  const campaigns = rows.map((c) => ({
    ...c,
    revenue_items: revenueMap.get(c.id) ?? [],
    cost_items: costMap.get(c.id) ?? [],
  }));
  res.json(campaigns);
}

// POST /api/approvals/:id/approve
export async function approve(req: Request, res: Response): Promise<void> {
  const { note } = req.body;
  await approveCampaign(String(req.params.id), req.user!.name, note);
  res.json({ message: 'Campaign approved.' });
}

// POST /api/approvals/:id/reject
export async function reject(req: Request, res: Response): Promise<void> {
  const { note } = req.body;
  await rejectCampaign(String(req.params.id), req.user!.name, note);
  res.json({ message: 'Campaign rejected.' });
}
