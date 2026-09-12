/* Cron schedules for every background job in server/src/jobs/ — kept in one
   place so the cadence of each job is visible without opening every file. */

// Daily 08:00 — pulls the latest QuickBooks catalog sync.
export const QB_SYNC_CRON = '0 8 * * *';

// Hourly — nags on overdue resource-scaling handoffs.
export const SCALING_REMINDERS_CRON = '0 */1 * * *';

// Daily 09:00 — nudges MDs on campaigns still awaiting approval.
export const MD_APPROVAL_REMINDERS_CRON = '0 9 * * *';

// Hourly — nags on workplans stuck awaiting review/amendment.
export const WORKPLAN_REMINDERS_CRON = '0 * * * *';

// Weekly, Monday 08:00 — jobs (support forms + handoffs) snapshot emailed to MDs.
// Currently overridden to every 5 minutes for testing — restore to
// '0 8 * * 1' before shipping.
export const JOBS_WEEKLY_DIGEST_CRON = '0 8 * * 1';
