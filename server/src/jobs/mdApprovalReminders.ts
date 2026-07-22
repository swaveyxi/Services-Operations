import cron from 'node-cron';
import { findAllCampaigns, getProfitabilityBatch } from '../models/campaigns';
import { findUserById } from '../models/users';
import { notifyMDApprovalReminder } from '../services/email.service';

// ─── Scheduler ────────────────────────────────────────────────────────────────
// Daily nudge for campaigns still awaiting MD approval — no escalation tier,
// just a repeat of the original approval-required email until it's actioned.

let reminderLock = false;

async function runReminderCheck(): Promise<void> {
  if (reminderLock) return;
  reminderLock = true;
  try {
    const pending = await findAllCampaigns({ approvalStatus: 'Pending' });
    if (pending.length === 0) return;

    const profMap = await getProfitabilityBatch(pending.map((c) => c.id));
    console.log(`[MD Approval Reminders] reminding on ${pending.length} pending campaign(s)`);

    for (const campaign of pending) {
      const owner = await findUserById(campaign.owner_user_id);
      const totals = profMap.get(campaign.id);
      const profitPercent =
        totals && totals.total_revenue > 0
          ? ((totals.total_revenue - totals.total_cost) / totals.total_revenue) * 100
          : 0;
      const pendingDays = Math.max(
        0,
        Math.floor((Date.now() - campaign.updated_at.getTime()) / 86_400_000),
      );
      await notifyMDApprovalReminder({
        campaignDisplayId: campaign.campaign_id,
        campaignUuid: campaign.id,
        ownerName: owner?.name ?? 'Case Owner',
        profitPercent,
        pendingDays,
      });
    }
  } catch (err) {
    console.error('[MD Approval Reminders] check failed', err);
  } finally {
    reminderLock = false;
  }
}

export function scheduleMdApprovalReminders(): void {
  console.log('[MD Approval Reminders] scheduling daily reminder (09:00)');
  cron.schedule('0 9 * * *', () => {
    void runReminderCheck();
  });
}
