import cron from 'node-cron';
import { findPendingScalingHandoffs, updateHandoff, type HandoffRow } from '../models/formHandoffs';
import { findFormById } from '../models/forms';
import { findCampaignById } from '../models/campaigns';
import { RESOURCE_SCALING_CANDIDATE_THRESHOLD } from '../../../shared/constants';
import {
  notifyResourceScalingReminder,
  notifyResourceScalingEscalation,
} from '../services/email.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TestSession = { startDate?: string; [key: string]: unknown };

function getEarliestTestDate(formDetails: Record<string, unknown>): Date | null {
  const sessions = formDetails['testingSessions'];
  if (!Array.isArray(sessions) || sessions.length === 0) return null;
  const dates = (sessions as TestSession[])
    .map((s) => s.startDate)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
    .map((d) => new Date(d));
  if (dates.length === 0) return null;
  return dates.reduce((min, d) => (d < min ? d : min));
}

async function markReminderSent(handoff: HandoffRow, key: string): Promise<void> {
  const sent = Array.isArray(handoff.reminders_sent) ? [...handoff.reminders_sent] : [];
  if (sent.includes(key)) return;
  sent.push(key);
  await updateHandoff(handoff.id, { reminders_sent: sent });
}

// ─── Core check ───────────────────────────────────────────────────────────────

async function checkHandoff(handoff: HandoffRow): Promise<void> {
  const form = await findFormById(handoff.form_id);
  if (!form) return;

  // Handoffs created before the resource-scaling candidate threshold existed
  const candidateCount = Number(
    (form.form_details as Record<string, unknown> | null)?.candidateCount,
  );
  if (!Number.isFinite(candidateCount) || candidateCount < RESOURCE_SCALING_CANDIDATE_THRESHOLD)
    return;

  const testDate = getEarliestTestDate((form.form_details ?? {}) as Record<string, unknown>);
  if (!testDate) return;

  const hoursRemaining = (testDate.getTime() - Date.now()) / 3_600_000;
  if (hoursRemaining < 0) return;
  if (hoursRemaining > 48) return;

  const campaign = await findCampaignById(form.campaign_id);
  const sent = Array.isArray(handoff.reminders_sent) ? handoff.reminders_sent : [];
  const base = {
    campaignDisplayId: campaign?.campaign_id ?? form.campaign_id,
    campaignUuid: form.campaign_id,
  };

  if (hoursRemaining > 24 && !sent.includes('48h')) {
    await notifyResourceScalingReminder({ ...base, hoursRemaining: 48 });
    await markReminderSent(handoff, '48h');
    console.log(
      `[Scaling Reminders] 48h reminder sent — campaign ${base.campaignDisplayId} (handoff ${handoff.id})`,
    );
    return;
  }

  if (hoursRemaining <= 12 && !sent.includes('escalation')) {
    await notifyResourceScalingEscalation(base);
    await markReminderSent(handoff, 'escalation');
    console.log(
      `[Scaling Reminders] ESCALATION sent — campaign ${base.campaignDisplayId}, ${hoursRemaining.toFixed(1)}h remaining (handoff ${handoff.id})`,
    );
  }

  if (hoursRemaining <= 24 && hoursRemaining > 0) {
    const bucketKey = `t-${Math.floor(Date.now() / (CHECK_INTERVAL_MIN * 60_000))}`;
    if (!sent.includes(bucketKey)) {
      await notifyResourceScalingReminder({ ...base, hoursRemaining: Math.ceil(hoursRemaining) });
      await markReminderSent(handoff, bucketKey);
      console.log(
        `[Scaling Reminders] reminder sent — campaign ${base.campaignDisplayId}, ${hoursRemaining.toFixed(1)}h remaining (handoff ${handoff.id})`,
      );
    }
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

// Must match the cron interval below. Each run gets a unique bucket key so
// reminders fire on every check — not just once per hour-remaining bucket.
const CHECK_INTERVAL_MIN = 60;

let reminderLock = false;

async function runReminderCheck(): Promise<void> {
  if (reminderLock) return;
  reminderLock = true;
  try {
    const handoffs = await findPendingScalingHandoffs();
    if (handoffs.length === 0) return;
    console.log(`[Scaling Reminders] checking ${handoffs.length} pending handoff(s)`);
    for (const handoff of handoffs) {
      await checkHandoff(handoff);
    }
  } catch (err) {
    console.error('[Scaling Reminders] check failed', err);
  } finally {
    reminderLock = false;
  }
}

export function scheduleScalingReminders(): void {
  console.log(`[Scaling Reminders] scheduling SLA checks (every ${CHECK_INTERVAL_MIN} min)`);
  cron.schedule('0 */1 * * *', () => {
    void runReminderCheck();
  });
}
