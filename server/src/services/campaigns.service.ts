import createError from 'http-errors';
import { randomUUID } from 'node:crypto';
import { AUTO_APPROVE_THRESHOLD } from '../../../shared/constants';
import {
  findCampaignById,
  findCampaignByKey,
  findCampaignsByOwner,
  findAllCampaigns,
  createCampaign,
  updateCampaign,
  getProfitabilityBatch,
  getRevenueItems,
  getCostItems,
  getRevenueItemsBatch,
  getCostItemsBatch,
  upsertRevenueItems,
  upsertCostItems,
  type CampaignRow,
  type RevenueItemInsert,
  type CostItemInsert,
  type CampaignFilters,
} from '../models/campaigns';
import { findClientById } from '../models/clients';
import { calcProfitability, type ProfitabilitySummary } from './profitability.service';
import { notifyCampaignApproved, notifyCampaignRejected, notifyMDPendingApproval } from './email.service';
import { findUserById, findUsersByIds } from '../models/users';
import { findTeamsByUser } from '../models/teams';
import { getBusinessUnitsForTeams } from '../../../shared/constants';

// Full month names — must match the format legacy-migrated campaign_ids already
// use (e.g. "CHEVRON/JULY/2026"), or generateCampaignId can't detect an existing
// campaign for the same client+month and starts a parallel numbering sequence
// under the abbreviated form (e.g. "CHEVRON/JUL/2026") instead of continuing it.
const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

// ─── Campaign ID generation ───────────────────────────────────────────────────

async function generateCampaignId(abbr: string, date: Date): Promise<string> {
  const upper = abbr.toUpperCase();
  const tail = `/${MONTHS[date.getMonth()]}/${date.getFullYear()}`;
  const base = `${upper}${tail}`;
  if (!(await findCampaignByKey(base))) return base;
  for (let i = 2; i <= 99; i++) {
    const candidate = `${upper}${i}${tail}`;
    if (!(await findCampaignByKey(candidate))) return candidate;
  }
  throw createError(409, 'Could not generate a unique campaign ID for this client and date.');
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateCampaignInput = {
  client_id?: string | null;
  unit: CampaignRow['unit'];
  name: string;
  description?: string | null;
  revenue_items?: RevenueItemInsert[];
  cost_items?: CostItemInsert[];
};

export async function createNewCampaign(
  input: CreateCampaignInput,
  owner_id: string,
): Promise<CampaignRow> {
  let abbr = 'DRG';
  if (input.client_id) {
    const client = await findClientById(input.client_id);
    if (!client) throw createError(404, 'Client not found.');
    // Defensive: strip whitespace even though the abbreviation field itself
    // is now constrained — the display_name-slice fallback below isn't, and
    // could still land mid-word (e.g. "AB C Ltd".slice(0, 6) -> "AB C L").
    abbr = (client.abbreviation?.trim() || client.display_name.slice(0, 6)).toUpperCase().replace(/\s+/g, '');
  }

  const campaignId = await generateCampaignId(abbr, new Date());
  const id = randomUUID();

  await createCampaign({
    id,
    campaign_id: campaignId,
    client_id: input.client_id ?? null,
    owner_user_id: owner_id,
    unit: input.unit,
    name: input.name,
    description: input.description ?? null,
    campaign_status: 'Draft',
  });

  if (input.revenue_items?.length) await upsertRevenueItems(id, input.revenue_items, owner_id);
  if (input.cost_items?.length) await upsertCostItems(id, input.cost_items, owner_id);

  return (await findCampaignById(id))!;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getCampaignDetail(id: string): Promise<
  CampaignRow & {
    revenue_items: Awaited<ReturnType<typeof getRevenueItems>>;
    cost_items: Awaited<ReturnType<typeof getCostItems>>;
    profitability: ProfitabilitySummary;
    owner_name: string | null;
  }
> {
  const campaign = await findCampaignById(id);
  if (!campaign) throw createError(404, 'Campaign not found.');

  const [revenue_items, cost_items, owner] = await Promise.all([
    getRevenueItems(id),
    getCostItems(id),
    findUserById(campaign.owner_user_id),
  ]);

  return {
    ...campaign,
    revenue_items,
    cost_items,
    profitability: calcProfitability(revenue_items, cost_items),
    owner_name: owner?.name ?? null,
  };
}

function profFromTotals(totals: { total_revenue: number; total_cost: number }): ProfitabilitySummary {
  const gross_profit = totals.total_revenue - totals.total_cost;
  const profit_percent =
    totals.total_revenue > 0 ? (gross_profit / totals.total_revenue) * 100 : 0;
  return { ...totals, gross_profit, profit_percent };
}

async function getOwnerNamesBatch(ownerIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ownerIds)];
  const owners = await findUsersByIds(uniqueIds);
  return new Map(owners.map((u) => [u.id, u.name]));
}

export async function listMyCampaigns(
  ownerId: string,
  opts: { status?: CampaignRow['campaign_status']; limit?: number; offset?: number } = {},
) {
  const rows = await findCampaignsByOwner(ownerId, opts);
  const [profMap, ownerMap] = await Promise.all([
    getProfitabilityBatch(rows.map((r) => r.id)),
    getOwnerNamesBatch(rows.map((r) => r.owner_user_id)),
  ]);
  return rows.map((r) => ({
    ...r,
    profitability: profFromTotals(profMap.get(r.id)!),
    owner_name: ownerMap.get(r.owner_user_id) ?? null,
  }));
}

export async function listUnitCampaigns(
  userId: string,
  opts: { limit?: number; offset?: number } = {},
) {
  const teams = await findTeamsByUser(userId);
  const units = getBusinessUnitsForTeams(teams.map((t) => t.team_name));
  if (units.length === 0) return [];

  const rows = await findAllCampaigns({ unit: units, limit: opts.limit, offset: opts.offset });
  const [profMap, ownerMap] = await Promise.all([
    getProfitabilityBatch(rows.map((r) => r.id)),
    getOwnerNamesBatch(rows.map((r) => r.owner_user_id)),
  ]);
  return rows.map((r) => ({
    ...r,
    profitability: profFromTotals(profMap.get(r.id)!),
    owner_name: ownerMap.get(r.owner_user_id) ?? null,
  }));
}

export async function listAllCampaigns(filters: CampaignFilters = {}) {
  const rows = await findAllCampaigns(filters);
  const ids = rows.map((r) => r.id);
  const [profMap, revenueMap, costMap] = await Promise.all([
    getProfitabilityBatch(ids),
    getRevenueItemsBatch(ids),
    getCostItemsBatch(ids),
  ]);
  return rows.map((r) => ({
    ...r,
    revenue_items: revenueMap.get(r.id) ?? [],
    cost_items: costMap.get(r.id) ?? [],
    profitability: profFromTotals(profMap.get(r.id)!),
  }));
}

// ─── Commercials update ───────────────────────────────────────────────────────

export async function updateCommercials(
  id: string,
  revenueItems: RevenueItemInsert[],
  costItems: CostItemInsert[],
  actorId: string,
): Promise<ProfitabilitySummary> {
  const campaign = await findCampaignById(id);
  if (!campaign) throw createError(404, 'Campaign not found.');
  if (campaign.campaign_status === 'Active' || campaign.campaign_status === 'Closed') {
    throw createError(409, 'Commercials cannot be edited once the campaign is Active or Closed.');
  }

  await Promise.all([
    upsertRevenueItems(id, revenueItems, actorId),
    upsertCostItems(id, costItems, actorId),
  ]);

  const [updatedRevenue, updatedCosts] = await Promise.all([getRevenueItems(id), getCostItems(id)]);

  return calcProfitability(updatedRevenue, updatedCosts);
}

// ─── Approval flow ────────────────────────────────────────────────────────────

export async function submitForApproval(id: string, actorId: string): Promise<void> {
  const campaign = await findCampaignById(id);
  if (!campaign) throw createError(404, 'Campaign not found.');
  if (campaign.campaign_status !== 'Profitability') {
    throw createError(409, 'Campaign must be in Profitability stage before submitting for approval.');
  }

  const [revenueItems, costItems] = await Promise.all([getRevenueItems(id), getCostItems(id)]);
  if (calcProfitability(revenueItems, costItems).total_revenue <= 0) {
    throw createError(409, 'Cannot submit for approval — no revenue commercials have been configured for this case.');
  }

  await updateCampaign(id, { approval_status: 'Pending', updated_by: actorId });
  await autoApproveIfEligible(id);
}

/* Full case + profitability breakdown shared by the approved and rejected
   case-report emails — only the outcome-specific fields (approvedBy/
   approverComments/auto vs. rejectedBy/note) differ between the two. */
async function buildCaseReportData(campaign: CampaignRow) {
  const [revenueItems, costItems, owner, client] = await Promise.all([
    getRevenueItems(campaign.id),
    getCostItems(campaign.id),
    findUserById(campaign.owner_user_id),
    campaign.client_id ? findClientById(campaign.client_id) : null,
  ]);
  const { total_revenue, total_cost, gross_profit, profit_percent } = calcProfitability(
    revenueItems,
    costItems,
  );

  return {
    campaignDisplayId: campaign.campaign_id,
    campaignUuid: campaign.id,
    unit: campaign.unit,
    clientName: client?.display_name ?? 'N/A',
    description: campaign.description,
    ownerName: owner?.name ?? 'Case Owner',
    totalRevenue: total_revenue,
    totalCost: total_cost,
    grossProfit: gross_profit,
    profitPercent: profit_percent,
    revenueItems,
    costItems,
  };
}

export async function autoApproveIfEligible(id: string): Promise<void> {
  const [revenueItems, costItems] = await Promise.all([getRevenueItems(id), getCostItems(id)]);
  const { profit_percent } = calcProfitability(revenueItems, costItems);

  const campaign = await findCampaignById(id);
  if (!campaign) return;

  if (profit_percent >= AUTO_APPROVE_THRESHOLD) {
    await updateCampaign(id, {
      campaign_status: 'Active',
      approval_status: 'Approved',
      approved_by: 'System',
    });
    const data = { ...(await buildCaseReportData(campaign)), approvedBy: 'System', auto: true };
    await notifyCampaignApproved(data, campaign.owner_user_id);
  } else {
    const owner = await findUserById(campaign.owner_user_id);
    await notifyMDPendingApproval({
      campaignDisplayId: campaign.campaign_id,
      campaignUuid: campaign.id,
      ownerName: owner?.name ?? 'Case Owner',
      profitPercent: profit_percent,
    });
  }
}

export async function approveCampaign(
  id: string,
  approvedBy: string,
  actorId: string,
  note?: string,
): Promise<void> {
  const campaign = await findCampaignById(id);
  if (!campaign) throw createError(404, 'Campaign not found.');
  if (campaign.approval_status !== 'Pending') {
    throw createError(409, 'Campaign is not pending approval.');
  }

  await updateCampaign(id, {
    campaign_status: 'Active',
    approval_status: 'Approved',
    approved_by: approvedBy,
    approval_note: note ?? null,
    updated_by: actorId,
  });

  const data = { ...(await buildCaseReportData(campaign)), approvedBy, approverComments: note, auto: false };
  await notifyCampaignApproved(data, campaign.owner_user_id);
}

export async function rejectCampaign(
  id: string,
  rejectedBy: string,
  actorId: string,
  note: string,
): Promise<void> {
  const campaign = await findCampaignById(id);
  if (!campaign) throw createError(404, 'Campaign not found.');
  if (campaign.approval_status !== 'Pending') {
    throw createError(409, 'Campaign is not pending approval.');
  }

  await updateCampaign(id, {
    approval_status: 'Rejected',
    approved_by: rejectedBy,
    approval_note: note,
    updated_by: actorId,
  });

  const data = { ...(await buildCaseReportData(campaign)), rejectedBy, note };
  await notifyCampaignRejected(data, campaign.owner_user_id);
}
