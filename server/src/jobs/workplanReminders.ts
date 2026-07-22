import cron from 'node-cron';
import { getOpsTeam } from '@shared/constants';
import { findWorkplansByStatus } from '../models/workplans';
import { findCampaignById } from '../models/campaigns';
import { findUserById } from '../models/users';
import {
  notifyWorkplanReviewReminder,
  notifyWorkplanAmendedReminder,
} from '../services/email.service';

// ─── Scheduler ────────────────────────────────────────────────────────────────
// Hourly nag for workplans stuck awaiting action — no escalation tier, just a
// repeat of the relevant email until the workplan moves out of the status.

let reminderLock = false;

function hoursPending(updatedAt: Date): number {
  return Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 3_600_000));
}

async function remindReview(): Promise<void> {
  const workplans = await findWorkplansByStatus(['Submitted', 'Pending Review']);
  for (const wp of workplans) {
    const campaign = await findCampaignById(wp.campaign_id);
    if (!campaign) continue;
    const owner = await findUserById(campaign.owner_user_id);
    await notifyWorkplanReviewReminder(
      {
        templateName: wp.template_name,
        campaignDisplayId: campaign.campaign_id,
        campaignUuid: campaign.id,
        ownerName: owner?.name ?? 'Case Owner',
        pendingHours: hoursPending(wp.updated_at),
      },
      getOpsTeam(wp.template_name),
    );
  }
}

async function remindAmended(): Promise<void> {
  const workplans = await findWorkplansByStatus(['Amended']);
  for (const wp of workplans) {
    const campaign = await findCampaignById(wp.campaign_id);
    if (!campaign) continue;
    await notifyWorkplanAmendedReminder(
      {
        templateName: wp.template_name,
        campaignDisplayId: campaign.campaign_id,
        campaignUuid: campaign.id,
        teamName: getOpsTeam(wp.template_name),
        pendingHours: hoursPending(wp.updated_at),
      },
      campaign.owner_user_id,
    );
  }
}

async function runReminderCheck(): Promise<void> {
  if (reminderLock) return;
  reminderLock = true;
  try {
    await remindReview();
    await remindAmended();
  } catch (err) {
    console.error('[Workplan Reminders] check failed', err);
  } finally {
    reminderLock = false;
  }
}

export function scheduleWorkplanReminders(): void {
  console.log('[Workplan Reminders] scheduling hourly reminder');
  cron.schedule('0 * * * *', () => {
    void runReminderCheck();
  });
}
