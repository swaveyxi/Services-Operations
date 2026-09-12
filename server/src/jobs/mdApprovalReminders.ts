import cron from 'node-cron';
import { findAllCampaigns, getProfitabilityBatch } from '../models/campaigns';
import { findUserById } from '../models/users';
import { notifyMDApprovalReminder } from '../services/email.service';
import { autoApproveIfEligible } from '../services/campaigns.service';
import { AUTO_APPROVE_THRESHOLD } from '../../../shared/constants';
import { MD_APPROVAL_REMINDERS_CRON } from '../../../shared/jobs';

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
      const totals = profMap.get(campaign.id);
      const profitPercent =
        totals && totals.total_revenue > 0
          ? ((totals.total_revenue - totals.total_cost) / totals.total_revenue) * 100
          : 0;

      // Migrated/edited campaigns can end up Pending despite already
      // qualifying (e.g. commercials changed after the fact, or legacy rows
      // imported straight into 'Pending' without ever running this check) —
      // resolve it instead of repeating a stale "still awaiting approval"
      // reminder that would be factually wrong about the threshold.
      if (profitPercent >= AUTO_APPROVE_THRESHOLD) {
        await autoApproveIfEligible(campaign.id);
        console.log(`[MD Approval Reminders] auto-approved ${campaign.campaign_id} (${profitPercent.toFixed(1)}%)`);
        continue;
      }

      const owner = await findUserById(campaign.owner_user_id);
      const updatedMs = campaign.updated_at?.getTime();
      const createdMs = campaign.created_at?.getTime();
      const baseMs = Number.isFinite(updatedMs) ? updatedMs : createdMs;
      const pendingDays = Number.isFinite(baseMs)
        ? Math.max(0, Math.floor((Date.now() - baseMs!) / 86_400_000))
        : 0;
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
  cron.schedule(MD_APPROVAL_REMINDERS_CRON, () => {
    void runReminderCheck();
  });
}
