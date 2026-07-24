import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '../db/database';
import { campaigns, campaignRevenueItems, campaignCostItems } from '../db/schema';

export type CampaignRow = typeof campaigns.$inferSelect;
export type RevenueItemRow = typeof campaignRevenueItems.$inferSelect;
export type CostItemRow = typeof campaignCostItems.$inferSelect;
export type CampaignInsert = typeof campaigns.$inferInsert;
export type RevenueItemInsert = Omit<typeof campaignRevenueItems.$inferInsert, 'id' | 'created_at'>;
export type CostItemInsert = Omit<typeof campaignCostItems.$inferInsert, 'id' | 'created_at'>;

export type CampaignFilters = {
  status?: CampaignRow['campaign_status'];
  approvalStatus?: CampaignRow['approval_status'];
  unit?: CampaignRow['unit'] | CampaignRow['unit'][];
  ownerId?: string;
  excludeOwnerId?: string;
  limit?: number;
  offset?: number;
};

// ─── Campaigns ───────────────────────────────────────────────────────────────

export async function findCampaignById(id: string): Promise<CampaignRow | null> {
  const [row] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return row ?? null;
}

export async function findCampaignByKey(campaignId: string): Promise<CampaignRow | null> {
  const [row] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.campaign_id, campaignId))
    .limit(1);
  return row ?? null;
}

export async function findCampaignsByOwner(
  ownerId: string,
  opts: { status?: CampaignRow['campaign_status']; limit?: number; offset?: number } = {},
): Promise<CampaignRow[]> {
  const conditions = [eq(campaigns.owner_user_id, ownerId)];
  if (opts.status) conditions.push(eq(campaigns.campaign_status, opts.status));
  const query = db
    .select()
    .from(campaigns)
    .where(and(...conditions))
    .orderBy(desc(campaigns.created_at));
  if (opts.limit === undefined) return query;
  return query.limit(opts.limit).offset(opts.offset ?? 0);
}

export async function findAllCampaigns(opts: CampaignFilters = {}): Promise<CampaignRow[]> {
  const conditions = [];
  if (opts.status) conditions.push(eq(campaigns.campaign_status, opts.status));
  if (opts.approvalStatus) conditions.push(eq(campaigns.approval_status, opts.approvalStatus));
  if (opts.unit) {
    conditions.push(
      Array.isArray(opts.unit) ? inArray(campaigns.unit, opts.unit) : eq(campaigns.unit, opts.unit),
    );
  }
  if (opts.ownerId) conditions.push(eq(campaigns.owner_user_id, opts.ownerId));
  if (opts.excludeOwnerId) conditions.push(ne(campaigns.owner_user_id, opts.excludeOwnerId));
  const query = db
    .select()
    .from(campaigns)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(campaigns.created_at));
  if (opts.limit === undefined) return query;
  return query.limit(opts.limit).offset(opts.offset ?? 0);
}

export async function createCampaign(data: CampaignInsert): Promise<void> {
  await db.insert(campaigns).values(data);
}

export async function updateCampaign(
  id: string,
  data: Partial<Omit<CampaignRow, 'id' | 'created_at'>>,
): Promise<void> {
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

// ─── Profitability (batch — one DB round-trip for N campaigns) ────────────────

export type ProfitRow = { campaign_id: string; total_revenue: string; total_cost: string };

export async function getProfitabilityBatch(
  campaignIds: string[],
): Promise<Map<string, { total_revenue: number; total_cost: number }>> {
  if (!campaignIds.length) return new Map();

  const [revenues, costs] = await Promise.all([
    db
      .select({
        campaign_id: campaignRevenueItems.campaign_id,
        total: sql<string>`SUM(${campaignRevenueItems.quantity} * ${campaignRevenueItems.rate})`,
      })
      .from(campaignRevenueItems)
      .where(inArray(campaignRevenueItems.campaign_id, campaignIds))
      .groupBy(campaignRevenueItems.campaign_id),

    db
      .select({
        campaign_id: campaignCostItems.campaign_id,
        total: sql<string>`SUM(${campaignCostItems.quantity} * ${campaignCostItems.rate})`,
      })
      .from(campaignCostItems)
      .where(inArray(campaignCostItems.campaign_id, campaignIds))
      .groupBy(campaignCostItems.campaign_id),
  ]);

  const map = new Map<string, { total_revenue: number; total_cost: number }>();
  for (const id of campaignIds) map.set(id, { total_revenue: 0, total_cost: 0 });
  for (const r of revenues) {
    const entry = map.get(r.campaign_id);
    if (entry) entry.total_revenue = parseFloat(r.total ?? '0');
  }
  for (const c of costs) {
    const entry = map.get(c.campaign_id);
    if (entry) entry.total_cost = parseFloat(c.total ?? '0');
  }
  return map;
}

// ─── Revenue & cost items ─────────────────────────────────────────────────────

export async function getRevenueItems(campaignId: string): Promise<RevenueItemRow[]> {
  return db
    .select()
    .from(campaignRevenueItems)
    .where(eq(campaignRevenueItems.campaign_id, campaignId));
}

export async function getCostItems(campaignId: string): Promise<CostItemRow[]> {
  return db
    .select()
    .from(campaignCostItems)
    .where(eq(campaignCostItems.campaign_id, campaignId));
}

export async function getRevenueItemsBatch(
  campaignIds: string[],
): Promise<Map<string, RevenueItemRow[]>> {
  if (!campaignIds.length) return new Map();
  const rows = await db
    .select()
    .from(campaignRevenueItems)
    .where(inArray(campaignRevenueItems.campaign_id, campaignIds));
  const map = new Map<string, RevenueItemRow[]>(campaignIds.map((id) => [id, []]));
  for (const r of rows) map.get(r.campaign_id)?.push(r);
  return map;
}

export async function getCostItemsBatch(
  campaignIds: string[],
): Promise<Map<string, CostItemRow[]>> {
  if (!campaignIds.length) return new Map();
  const rows = await db
    .select()
    .from(campaignCostItems)
    .where(inArray(campaignCostItems.campaign_id, campaignIds));
  const map = new Map<string, CostItemRow[]>(campaignIds.map((id) => [id, []]));
  for (const r of rows) map.get(r.campaign_id)?.push(r);
  return map;
}

export async function replaceRevenueItems(
  campaignId: string,
  items: RevenueItemInsert[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(campaignRevenueItems)
      .where(eq(campaignRevenueItems.campaign_id, campaignId));
    if (items.length) {
      await tx.insert(campaignRevenueItems).values(
        items.map((item) => ({ ...item, id: randomUUID(), campaign_id: campaignId })),
      );
    }
  });
}

export async function replaceCostItems(
  campaignId: string,
  items: CostItemInsert[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(campaignCostItems)
      .where(eq(campaignCostItems.campaign_id, campaignId));
    if (items.length) {
      await tx.insert(campaignCostItems).values(
        items.map((item) => ({ ...item, id: randomUUID(), campaign_id: campaignId })),
      );
    }
  });
}
