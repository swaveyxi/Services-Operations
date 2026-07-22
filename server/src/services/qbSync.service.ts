import {
  catalogKind,
  subCategory,
  unitFromAcctNum,
  parentAccountNumberFor,
  isKnownParentAccountNumber,
} from '../utils/qbAccounts';
import {
  findParentAccountByNumber,
  upsertParentAccount,
  deleteParentAccountByQbId,
  findIncomeByAcctNum,
  findCostByAcctNum,
  upsertServiceIncome,
  upsertServiceCost,
  deleteIncomeByQbId,
  deleteCostByQbId,
} from '../models/catalog';
import { findClientByQbId, upsertClient, deleteClientByQbId } from '../models/clients';
import type { QbAccount, QbCustomer } from './qbClient.service';

// 'insert-only' is the daily polling job — it only fills gaps, never touches
// an existing row. 'upsert' is the webhook path, which is allowed to update.
export type SyncMode = 'insert-only' | 'upsert';

// Reported back so the caller (jobs/qbSync.ts) can log what actually happened,
// not just that the job ran.
export type SyncResult =
  | 'inserted'
  | 'updated'
  | 'skipped_existing'
  | 'skipped_unmapped'
  | 'skipped_job';

export async function syncAccountFromQB(account: QbAccount, mode: SyncMode): Promise<SyncResult> {
  if (!account.AcctNum) return 'skipped_unmapped';

  // Only sync the specific parent accounts our own catalog ranges reference
  // (40000, 41000, 44000, 50000, 50100, 50200, 51000, 51100, 51200, 51300,
  // 52500) — NOT "any top-level QBO account," which is most of the chart of
  // accounts (bank accounts, AP/AR, equity, generic expenses, ...).
  if (isKnownParentAccountNumber(account.AcctNum)) {
    const existingParent = await findParentAccountByNumber(account.AcctNum);
    return syncParentAccountFromQB(account, mode, existingParent);
  }

  const unit = unitFromAcctNum(account.AcctNum);
  const kind = catalogKind(account.AcctNum);
  if (!unit || !kind) return 'skipped_unmapped';

  const existing =
    kind === 'income'
      ? await findIncomeByAcctNum(account.AcctNum)
      : await findCostByAcctNum(account.AcctNum);
  if (mode === 'insert-only' && existing) return 'skipped_existing';

  const parentNumber = parentAccountNumberFor(account.AcctNum);
  const parent = parentNumber ? await findParentAccountByNumber(parentNumber) : null;

  const common = {
    acct_num: account.AcctNum,
    unit,
    service: account.Name,
    qb_id: account.Id,
    parent_account: parent?.account_name ?? null,
    synced_at: new Date(),
  };

  if (kind === 'income') {
    await upsertServiceIncome(common);
  } else {
    await upsertServiceCost({ ...common, sub_category: subCategory(account.AcctNum) });
  }
  return existing ? 'updated' : 'inserted';
}

async function syncParentAccountFromQB(
  account: QbAccount,
  mode: SyncMode,
  existing: Awaited<ReturnType<typeof findParentAccountByNumber>>,
): Promise<SyncResult> {
  if (!account.AcctNum) return 'skipped_unmapped';
  if (mode === 'insert-only' && existing) return 'skipped_existing';

  await upsertParentAccount({
    account_number: account.AcctNum,
    account_name: account.Name,
    account_type: account.AccountType ?? existing?.account_type ?? 'Unknown',
    qb_id: account.Id,
  });
  return existing ? 'updated' : 'inserted';
}

export async function deleteAccountByQbId(qbId: string): Promise<void> {
  await deleteIncomeByQbId(qbId);
  await deleteCostByQbId(qbId);
  await deleteParentAccountByQbId(qbId);
}

export async function syncClientFromQB(customer: QbCustomer, mode: SyncMode): Promise<SyncResult> {
  // Only top-level customers are tracked, matching the legacy flow's `WHERE Job = false`.
  if (customer.Job) return 'skipped_job';

  const existing = await findClientByQbId(customer.Id);
  if (mode === 'insert-only' && existing) return 'skipped_existing';

  await upsertClient({
    qb_id: customer.Id,
    display_name: customer.DisplayName,
    company_name: customer.CompanyName ?? null,
    email: customer.PrimaryEmailAddr?.Address ?? null,
    phone: customer.PrimaryPhone?.FreeFormNumber ?? null,
    created_on: customer.MetaData?.CreateTime ? new Date(customer.MetaData.CreateTime) : null,
    synced_at: new Date(),
  });
  return existing ? 'updated' : 'inserted';
}

export async function deleteClientFromQB(qbId: string): Promise<void> {
  await deleteClientByQbId(qbId);
}
