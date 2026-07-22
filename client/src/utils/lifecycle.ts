import type { Campaign } from '@shared/types';
import { ciEq } from './format';

export type LifecycleStep = {
  label: string;
  state: 'done' | 'current' | 'todo';
};

/* The case state machine: Draft → Workplan → Profitability → Active. */
export function computeLifecycle(c: {
  campaign_status: string;
  approval_status: string | null;
}): LifecycleStep[] {
  const labels = ['Draft', 'Workplan', 'Profitability', 'Active'];
  const done = [
    true,
    !ciEq(c.campaign_status, 'Draft'),
    ciEq(c.approval_status ?? '', 'Approved'),
    ciEq(c.campaign_status, 'Active'),
  ];
  let completed = 0;
  for (const d of done) {
    if (d) completed++;
    else break;
  }
  return labels.map((label, i) => ({
    label,
    state: i < completed ? 'done' : i === completed ? 'current' : 'todo',
  }));
}

export function computeLifecycleFromCampaign(c: Campaign): LifecycleStep[] {
  return computeLifecycle(c);
}
