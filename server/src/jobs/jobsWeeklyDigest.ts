import cron from 'node-cron';
import { getJobsReport } from '../services/jobsReport.service';
import { notifyJobsWeeklyDigest } from '../services/email.service';
import { JOBS_WEEKLY_DIGEST_CRON } from '@shared/jobs';

// ─── Scheduler ────────────────────────────────────────────────────────────────
// Weekly snapshot of every open/completed job (support forms + handoffs) across
// the org, emailed to MD-role users every Monday morning.

let digestLock = false;

async function runWeeklyDigest(): Promise<void> {
  if (digestLock) return;
  digestLock = true;
  try {
    const report = await getJobsReport();
    await notifyJobsWeeklyDigest(report);
    console.log(
      `[Jobs Weekly Digest] sent — ${report.forms.total} jobs (${report.forms.open} open, ${report.forms.completed} completed)`,
    );
  } catch (err) {
    console.error('[Jobs Weekly Digest] failed', err);
  } finally {
    digestLock = false;
  }
}

export function scheduleJobsWeeklyDigest(): void {
  console.log('[Jobs Weekly Digest] scheduling weekly digest (Monday 08:00)');
  cron.schedule(JOBS_WEEKLY_DIGEST_CRON, () => {
    void runWeeklyDigest();
  });
}
