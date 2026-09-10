import { and, eq, getTableColumns, inArray } from 'drizzle-orm';
import { db } from '../db/database';
import { configuredWorkplans, campaigns } from '../db/schema';

export type WorkplanRow = typeof configuredWorkplans.$inferSelect;
export type WorkplanInsert = typeof configuredWorkplans.$inferInsert;

export async function findAllWorkplans(): Promise<WorkplanRow[]> {
  return db.select().from(configuredWorkplans);
}

export async function findWorkplansByStatus(
  statuses: WorkplanRow['status'][],
): Promise<WorkplanRow[]> {
  return db.select().from(configuredWorkplans).where(inArray(configuredWorkplans.status, statuses));
}

// Joined to campaigns and filtered on is_deleted: this is the shared lookup every
// workplan mutation (submit/accept/amend/update/remove) starts from, so gating it
// here is what makes a deleted campaign's workplans unreachable everywhere at once.
// Archived campaigns are NOT excluded — their workplans stay readable (Tracker's
// read-only archived view depends on that).
export async function findWorkplanById(id: string): Promise<WorkplanRow | null> {
  const [row] = await db
    .select(getTableColumns(configuredWorkplans))
    .from(configuredWorkplans)
    .innerJoin(campaigns, eq(configuredWorkplans.campaign_id, campaigns.id))
    .where(and(eq(configuredWorkplans.id, id), eq(campaigns.is_deleted, false)))
    .limit(1);
  return row ?? null;
}

export async function findWorkplansByCampaign(campaignId: string): Promise<WorkplanRow[]> {
  return db
    .select()
    .from(configuredWorkplans)
    .where(eq(configuredWorkplans.campaign_id, campaignId));
}

export async function createWorkplan(data: WorkplanInsert): Promise<void> {
  await db.insert(configuredWorkplans).values(data);
}

export async function updateWorkplan(
  id: string,
  data: Partial<Omit<WorkplanRow, 'id' | 'campaign_id' | 'created_at'>>,
): Promise<void> {
  await db.update(configuredWorkplans).set(data).where(eq(configuredWorkplans.id, id));
}

export async function deleteWorkplan(id: string): Promise<void> {
  await db.delete(configuredWorkplans).where(eq(configuredWorkplans.id, id));
}
