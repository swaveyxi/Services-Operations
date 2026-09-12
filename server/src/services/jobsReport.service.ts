import { getFormsStatusBreakdown, type FormsStatusCount } from '../models/forms';
import { getHandoffsStatusBreakdown, type HandoffsStatusCount } from '../models/formHandoffs';
import type { JobsReport, JobsReportBreakdown } from '../../../shared/types';

// Rolls grouped (key, status, count) rows into one JobsReportBreakdown per key,
// splitting each row into the open or completed bucket by its status.
function rollupByKey<T extends { count: number }>(
  rows: T[],
  keyOf: (row: T) => string,
  statusOf: (row: T) => string,
): JobsReportBreakdown[] {
  const map = new Map<string, { open: number; completed: number }>();
  for (const row of rows) {
    const key = keyOf(row);
    const entry = map.get(key) ?? { open: 0, completed: 0 };
    const count = Number(row.count);
    if (statusOf(row) === 'Completed') entry.completed += count;
    else entry.open += count;
    map.set(key, entry);
  }
  return [...map.entries()]
    .map(([key, { open, completed }]) => ({ key, open, completed, total: open + completed }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function sumField(rows: JobsReportBreakdown[], field: 'open' | 'completed'): number {
  return rows.reduce((sum, r) => sum + r[field], 0);
}

export async function getJobsReport(): Promise<JobsReport> {
  const [formsRows, handoffsRows]: [FormsStatusCount[], HandoffsStatusCount[]] = await Promise.all([
    getFormsStatusBreakdown(),
    getHandoffsStatusBreakdown(),
  ]);

  const byUnit = rollupByKey(formsRows, (r) => r.unit, (r) => r.delivery_status);
  const byTeam = rollupByKey(formsRows, (r) => r.operations_team, (r) => r.delivery_status);
  const handoffsByTeam = rollupByKey(handoffsRows, (r) => r.team, (r) => r.status);

  const formsOpen = sumField(byUnit, 'open');
  const formsCompleted = sumField(byUnit, 'completed');
  const handoffsOpen = sumField(handoffsByTeam, 'open');
  const handoffsCompleted = sumField(handoffsByTeam, 'completed');

  return {
    generated_at: new Date().toISOString(),
    forms: {
      total: formsOpen + formsCompleted,
      open: formsOpen,
      completed: formsCompleted,
      by_unit: byUnit,
      by_team: byTeam,
    },
    handoffs: {
      total: handoffsOpen + handoffsCompleted,
      open: handoffsOpen,
      completed: handoffsCompleted,
      by_team: handoffsByTeam,
    },
  };
}
