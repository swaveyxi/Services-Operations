import { and, desc, eq, getTableColumns, inArray } from 'drizzle-orm';
import { db } from '../db/database';
import { supportForms, users } from '../db/schema';
import {
  findHandoffsByFormId,
  findHandoffsByFormIds,
  findFormIdsByTeam,
  type HandoffRow,
} from './formHandoffs';

export type FormRow = typeof supportForms.$inferSelect;
export type FormRowWithSubmitter = FormRow & { submitter_name: string | null };
export type FormRowWithHandoffs = FormRowWithSubmitter & { handoffs: HandoffRow[] };
export type FormInsert = typeof supportForms.$inferInsert;

const formCols = () => ({ ...getTableColumns(supportForms), submitter_name: users.name });

export async function findAllForms(): Promise<FormRowWithHandoffs[]> {
  const forms = await db
    .select(formCols())
    .from(supportForms)
    .leftJoin(users, eq(supportForms.submitter_user_id, users.id))
    .orderBy(desc(supportForms.submitted_on));
  if (forms.length === 0) return [];
  const allHandoffs = await findHandoffsByFormIds(forms.map((f) => f.id));
  const handoffsByForm = new Map<string, HandoffRow[]>();
  for (const h of allHandoffs) {
    const arr = handoffsByForm.get(h.form_id) ?? [];
    arr.push(h);
    handoffsByForm.set(h.form_id, arr);
  }
  return forms.map((f) => ({ ...f, handoffs: handoffsByForm.get(f.id) ?? [] }));
}

export async function findFormById(id: string): Promise<FormRowWithHandoffs | null> {
  const [row] = await db
    .select(formCols())
    .from(supportForms)
    .leftJoin(users, eq(supportForms.submitter_user_id, users.id))
    .where(eq(supportForms.id, id))
    .limit(1);
  if (!row) return null;
  const handoffs = await findHandoffsByFormId(id);
  return { ...row, handoffs };
}

export async function findFormsByCampaign(campaignId: string): Promise<FormRowWithHandoffs[]> {
  const forms = await db
    .select(formCols())
    .from(supportForms)
    .leftJoin(users, eq(supportForms.submitter_user_id, users.id))
    .where(eq(supportForms.campaign_id, campaignId));
  if (forms.length === 0) return [];
  const allHandoffs = await findHandoffsByFormIds(forms.map((f) => f.id));
  const handoffsByForm = new Map<string, HandoffRow[]>();
  for (const h of allHandoffs) {
    const arr = handoffsByForm.get(h.form_id) ?? [];
    arr.push(h);
    handoffsByForm.set(h.form_id, arr);
  }
  return forms.map((f) => ({ ...f, handoffs: handoffsByForm.get(f.id) ?? [] }));
}

// Forms assigned to a team as the primary ops team
export async function findFormsByOpsTeam(
  teamKey: string,
  deliveryStatus?: FormRow['delivery_status'],
): Promise<FormRowWithHandoffs[]> {
  const conditions = [eq(supportForms.operations_team, teamKey)];
  if (deliveryStatus) conditions.push(eq(supportForms.delivery_status, deliveryStatus));
  const forms = await db
    .select(formCols())
    .from(supportForms)
    .leftJoin(users, eq(supportForms.submitter_user_id, users.id))
    .where(and(...conditions));
  if (forms.length === 0) return [];
  const allHandoffs = await findHandoffsByFormIds(forms.map((f) => f.id));
  const handoffsByForm = new Map<string, HandoffRow[]>();
  for (const h of allHandoffs) {
    const arr = handoffsByForm.get(h.form_id) ?? [];
    arr.push(h);
    handoffsByForm.set(h.form_id, arr);
  }
  return forms.map((f) => ({ ...f, handoffs: handoffsByForm.get(f.id) ?? [] }));
}

// Forms with at least one active (non-Completed) handoff to this team, with all their handoffs attached.
export async function findHandoffsByTeam(teamKey: string): Promise<FormRowWithHandoffs[]> {
  const activeFormIds = await findFormIdsByTeam(teamKey);
  if (activeFormIds.length === 0) return [];

  const forms = await db
    .select(formCols())
    .from(supportForms)
    .leftJoin(users, eq(supportForms.submitter_user_id, users.id))
    .where(inArray(supportForms.id, activeFormIds))
    .orderBy(desc(supportForms.submitted_on));

  const allHandoffs = await findHandoffsByFormIds(activeFormIds);
  const handoffsByForm = new Map<string, HandoffRow[]>();
  for (const h of allHandoffs) {
    const arr = handoffsByForm.get(h.form_id) ?? [];
    arr.push(h);
    handoffsByForm.set(h.form_id, arr);
  }

  return forms.map((f) => ({ ...f, handoffs: handoffsByForm.get(f.id) ?? [] }));
}

export async function createForm(data: FormInsert): Promise<void> {
  await db.insert(supportForms).values(data);
}

export async function updateForm(
  id: string,
  data: Partial<Omit<FormRow, 'id' | 'campaign_id' | 'created_at'>>,
): Promise<void> {
  await db.update(supportForms).set(data).where(eq(supportForms.id, id));
}
