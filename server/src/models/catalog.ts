import { eq, inArray } from 'drizzle-orm';
import { db } from '../db/database';
import { serviceIncomes, serviceCosts, parentAccounts, workplanTemplates, associatedCosts } from '../db/schema';

export type ServiceIncomeRow = typeof serviceIncomes.$inferSelect;
export type ServiceIncomeInsert = typeof serviceIncomes.$inferInsert;
export type ServiceCostRow = typeof serviceCosts.$inferSelect;
export type ServiceCostInsert = typeof serviceCosts.$inferInsert;
export type ParentAccountRow = typeof parentAccounts.$inferSelect;
export type ParentAccountInsert = typeof parentAccounts.$inferInsert;
export type WorkplanTemplateRow = typeof workplanTemplates.$inferSelect;
export type ServiceIncomeWithCosts = ServiceIncomeRow & { associated_cost_ids: string[] };

type Unit = 'Recruitment' | 'Scholarships' | 'Testing';

// ─── Service incomes ──────────────────────────────────────────────────────────

export async function getIncomesByUnit(unit: Unit): Promise<ServiceIncomeWithCosts[]> {
  const incomes = await db.select().from(serviceIncomes).where(eq(serviceIncomes.unit, unit));
  if (!incomes.length) return [];

  const links = await db
    .select({ income_id: associatedCosts.income_id, cost_id: associatedCosts.cost_id })
    .from(associatedCosts)
    .where(inArray(associatedCosts.income_id, incomes.map((i) => i.id)));

  const costMap = new Map<string, string[]>();
  for (const link of links) {
    const arr = costMap.get(link.income_id) ?? [];
    arr.push(link.cost_id);
    costMap.set(link.income_id, arr);
  }

  return incomes.map((i) => ({ ...i, associated_cost_ids: costMap.get(i.id) ?? [] }));
}

// ─── Service costs ────────────────────────────────────────────────────────────

// Testing draws from both Recruitment and Scholarships cost pools (no Testing-specific accounts).
export async function getCostsByUnit(unit: Unit): Promise<ServiceCostRow[]> {
  if (unit === 'Testing') {
    return db
      .select()
      .from(serviceCosts)
      .where(inArray(serviceCosts.unit, ['Recruitment', 'Scholarships']));
  }
  return db.select().from(serviceCosts).where(eq(serviceCosts.unit, unit));
}

// ─── QB sync (polling + webhook) ──────────────────────────────────────────────

export async function findIncomeByAcctNum(acctNum: string): Promise<ServiceIncomeRow | null> {
  const [row] = await db.select().from(serviceIncomes).where(eq(serviceIncomes.acct_num, acctNum)).limit(1);
  return row ?? null;
}

export async function findIncomeByQbId(qbId: string): Promise<ServiceIncomeRow | null> {
  const [row] = await db.select().from(serviceIncomes).where(eq(serviceIncomes.qb_id, qbId)).limit(1);
  return row ?? null;
}

export async function insertServiceIncome(data: ServiceIncomeInsert): Promise<void> {
  await db.insert(serviceIncomes).values(data);
}

// Webhook path only — updates the existing row's fields. Polling never calls this.
export async function upsertServiceIncome(data: ServiceIncomeInsert): Promise<void> {
  await db
    .insert(serviceIncomes)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        service: data.service,
        qb_id: data.qb_id,
        parent_account: data.parent_account,
        synced_at: data.synced_at,
      },
    });
}

export async function deleteIncomeByQbId(qbId: string): Promise<void> {
  await db.delete(serviceIncomes).where(eq(serviceIncomes.qb_id, qbId));
}

export async function findCostByAcctNum(acctNum: string): Promise<ServiceCostRow | null> {
  const [row] = await db.select().from(serviceCosts).where(eq(serviceCosts.acct_num, acctNum)).limit(1);
  return row ?? null;
}

export async function findCostByQbId(qbId: string): Promise<ServiceCostRow | null> {
  const [row] = await db.select().from(serviceCosts).where(eq(serviceCosts.qb_id, qbId)).limit(1);
  return row ?? null;
}

export async function insertServiceCost(data: ServiceCostInsert): Promise<void> {
  await db.insert(serviceCosts).values(data);
}

// Webhook path only — updates the existing row's fields. Polling never calls this.
export async function upsertServiceCost(data: ServiceCostInsert): Promise<void> {
  await db
    .insert(serviceCosts)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        service: data.service,
        qb_id: data.qb_id,
        parent_account: data.parent_account,
        sub_category: data.sub_category,
        synced_at: data.synced_at,
      },
    });
}

export async function deleteCostByQbId(qbId: string): Promise<void> {
  await db.delete(serviceCosts).where(eq(serviceCosts.qb_id, qbId));
}

// ─── Parent accounts ──────────────────────────────────────────────────────────

export async function getAllParentAccounts(): Promise<ParentAccountRow[]> {
  return db.select().from(parentAccounts);
}

export async function findParentAccountByNumber(accountNumber: string): Promise<ParentAccountRow | null> {
  const [row] = await db
    .select()
    .from(parentAccounts)
    .where(eq(parentAccounts.account_number, accountNumber))
    .limit(1);
  return row ?? null;
}

// Webhook path only for updates — polling never overwrites an existing row.
// service_type is deliberately never written here: it's a manually-curated
// tag with no QBO equivalent field, so sync must never touch it.
export async function upsertParentAccount(
  data: Pick<ParentAccountInsert, 'account_number' | 'account_name' | 'account_type' | 'qb_id'>,
): Promise<void> {
  await db
    .insert(parentAccounts)
    .values(data)
    .onDuplicateKeyUpdate({
      set: { account_name: data.account_name, account_type: data.account_type, qb_id: data.qb_id },
    });
}

export async function deleteParentAccountByQbId(qbId: string): Promise<void> {
  await db.delete(parentAccounts).where(eq(parentAccounts.qb_id, qbId));
}

// ─── Workplan templates ───────────────────────────────────────────────────────

export async function getWorkplanTemplates(unit?: Unit): Promise<WorkplanTemplateRow[]> {
  if (unit) {
    return db
      .select()
      .from(workplanTemplates)
      .where(eq(workplanTemplates.unit, unit))
      .orderBy(workplanTemplates.template_id, workplanTemplates.sequence);
  }
  return db
    .select()
    .from(workplanTemplates)
    .orderBy(workplanTemplates.template_id, workplanTemplates.sequence);
}
