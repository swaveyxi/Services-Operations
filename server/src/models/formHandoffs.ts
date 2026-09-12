import { and, asc, eq, getTableColumns, inArray, ne, sql } from 'drizzle-orm';
import { db } from '../db/database';
import { formHandoffs, supportForms, campaigns } from '../db/schema';

export type HandoffRow = typeof formHandoffs.$inferSelect;
export type HandoffInsert = typeof formHandoffs.$inferInsert;

export async function createHandoff(data: HandoffInsert): Promise<HandoffRow> {
  await db.insert(formHandoffs).values(data);
  const [row] = await db
    .select()
    .from(formHandoffs)
    .where(eq(formHandoffs.id, data.id!))
    .limit(1);
  return row;
}

export async function updateHandoff(
  id: string,
  data: Partial<Omit<HandoffRow, 'id' | 'form_id' | 'created_at'>>,
): Promise<void> {
  await db.update(formHandoffs).set(data).where(eq(formHandoffs.id, id));
}

// Two-hop join to campaigns (via supportForms) so acknowledgeHandoff/completeHandoff —
// which both start from this lookup — are blocked once the owning campaign is
// deleted, same rule as findFormById/findWorkplanById. Archived stays readable.
export async function findHandoffById(id: string): Promise<HandoffRow | null> {
  const [row] = await db
    .select(getTableColumns(formHandoffs))
    .from(formHandoffs)
    .innerJoin(supportForms, eq(formHandoffs.form_id, supportForms.id))
    .innerJoin(campaigns, eq(supportForms.campaign_id, campaigns.id))
    .where(and(eq(formHandoffs.id, id), eq(campaigns.is_deleted, false)))
    .limit(1);
  return row ?? null;
}

export async function findHandoffsByFormId(formId: string): Promise<HandoffRow[]> {
  return db
    .select()
    .from(formHandoffs)
    .where(eq(formHandoffs.form_id, formId))
    .orderBy(asc(formHandoffs.created_at));
}

// Used by findHandoffsByTeam and findHandoffsByFormIds
export async function findHandoffsByFormIds(formIds: string[]): Promise<HandoffRow[]> {
  if (formIds.length === 0) return [];
  return db
    .select()
    .from(formHandoffs)
    .where(inArray(formHandoffs.form_id, formIds))
    .orderBy(asc(formHandoffs.created_at));
}

// Returns all form IDs that have any handoff (active or completed) for the team.
export async function findFormIdsByTeam(team: string): Promise<string[]> {
  const rows = await db
    .select({ form_id: formHandoffs.form_id })
    .from(formHandoffs)
    .where(eq(formHandoffs.team, team));
  return [...new Set(rows.map((r) => r.form_id))];
}

// Used by scalingReminders scheduler.
export async function findPendingScalingHandoffs(): Promise<HandoffRow[]> {
  return db
    .select()
    .from(formHandoffs)
    .where(
      and(
        eq(formHandoffs.team, 'Tech'),
        eq(formHandoffs.auto, 1),
        inArray(formHandoffs.status, ['Pending', 'Acknowledged']),
      ),
    );
}

// For the Jobs Report: per-(team, status) handoff counts across every visible
// campaign, mirroring getFormsStatusBreakdown in models/forms.ts.
export type HandoffsStatusCount = { team: string; status: HandoffRow['status']; count: number };

export async function getHandoffsStatusBreakdown(): Promise<HandoffsStatusCount[]> {
  return db
    .select({
      team: formHandoffs.team,
      status: formHandoffs.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(formHandoffs)
    .innerJoin(supportForms, eq(formHandoffs.form_id, supportForms.id))
    .innerJoin(campaigns, eq(supportForms.campaign_id, campaigns.id))
    .where(and(eq(campaigns.is_deleted, false), eq(campaigns.is_archived, false)))
    .groupBy(formHandoffs.team, formHandoffs.status);
}

// Check if a form has an active (non-Completed) handoff to a specific team.
export async function hasActiveHandoffToTeam(formId: string, team: string): Promise<boolean> {
  const [row] = await db
    .select({ id: formHandoffs.id })
    .from(formHandoffs)
    .where(
      and(
        eq(formHandoffs.form_id, formId),
        eq(formHandoffs.team, team),
        ne(formHandoffs.status, 'Completed'),
      ),
    )
    .limit(1);
  return !!row;
}
