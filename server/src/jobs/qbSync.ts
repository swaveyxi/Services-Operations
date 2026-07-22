import cron from 'node-cron';
import { getAccessToken } from './qbOAuth';
import { queryAllAccountsAndCustomers } from '../services/qbClient.service';
import { syncAccountFromQB, syncClientFromQB, type SyncResult } from '../services/qbSync.service';
import { updateQbTokens } from '../models/qbTokens';

function tally(results: SyncResult[]): Partial<Record<SyncResult, number>> {
  const counts: Partial<Record<SyncResult, number>> = {};
  for (const r of results) counts[r] = (counts[r] ?? 0) + 1;
  return counts;
}

// Safety net — inserts anything QB currently has that we don't, regardless of
// whether QBO considers it "changed" (a full listing, not a delta query).
// This is what recovers a row that's missing locally for any reason (a
// missed webhook delivery, accidental local deletion, etc.). Never updates
// or deletes an existing row; that's the webhook's job exclusively (see
// controllers/qbWebhook.controller.ts) — it owns creates and updates.
export async function runSync(): Promise<void> {
  const startedAt = new Date();
  console.log(`[QB Sync] run started at ${startedAt.toISOString()}`);

  const token = await getAccessToken();
  const { accounts, customers } = await queryAllAccountsAndCustomers(token);
  console.log(`[QB Sync] QBO has ${accounts.length} account(s), ${customers.length} customer(s)`);

  const accountResults: SyncResult[] = [];
  for (const account of accounts) {
    accountResults.push(await syncAccountFromQB(account, 'insert-only'));
  }

  const clientResults: SyncResult[] = [];
  for (const customer of customers) {
    clientResults.push(await syncClientFromQB(customer, 'insert-only'));
  }

  // Informational only now (shown in Admin > Integrations) — no longer used
  // as a query cursor, since every run re-checks the full QBO listing.
  await updateQbTokens({ last_polled_at: startedAt });

  const durationMs = Date.now() - startedAt.getTime();
  console.log(
    `[QB Sync] run finished in ${durationMs}ms — accounts: ${JSON.stringify(tally(accountResults))}, customers: ${JSON.stringify(tally(clientResults))}`,
  );
}

let syncLock = false;

async function runSyncGuarded(trigger: 'startup' | 'scheduled'): Promise<void> {
  if (syncLock) {
    console.warn(`[QB Sync] ${trigger} run skipped — a sync is already in progress`);
    return;
  }
  syncLock = true;
  console.log(`[QB Sync] ${trigger} run triggered`);
  try {
    await runSync();
  } catch (err) {
    console.error(`[QB Sync] ${trigger} run failed`, err);
  } finally {
    syncLock = false;
  }
}

export function scheduleQbSync(): void {
  console.log('[QB Sync] scheduling run');
  cron.schedule('0 8 * * *', () => {
    void runSyncGuarded('scheduled');
  });
  void runSyncGuarded('startup');
}

// Manual "run sync now" trigger (Admin > Integrations). Unlike the scheduled
// runner, errors propagate to the caller instead of being swallowed.
export async function triggerManualSync(): Promise<{ ranSync: boolean }> {
  if (syncLock) {
    console.warn('[QB Sync] manual run skipped — a sync is already in progress');
    return { ranSync: false };
  }
  syncLock = true;
  console.log('[QB Sync] manual run triggered');
  try {
    await runSync();
    return { ranSync: true };
  } finally {
    syncLock = false;
  }
}
