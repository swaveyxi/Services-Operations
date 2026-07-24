import type { Campaign, ConfiguredWorkplan } from '@shared/types';
import { getOpsTeam } from '@shared/constants';
import { ciEq } from './format';

export { getOpsTeam };

/* Workplan statuses that still need ops action — excludes 'Draft' (not yet
   submitted) and 'Accepted' (already resolved). */
export const ACTIONABLE_WORKPLAN_STATUSES = ['Submitted', 'Pending Review', 'Amended'];

/* Campaign-level ops aggregate from per-template statuses (Amended > Pending > Accepted). */
export function deriveAggregateOpsStatus(statuses: string[]): string {
  if (statuses.length === 0) return 'Not Started';
  if (statuses.every((s) => s === 'Accepted')) return 'Accepted';
  if (statuses.includes('Amended')) return 'Amended';
  if (statuses.includes('Pending')) return 'Pending';
  return 'Not Started';
}

/* Split a team's campaigns into the work it must still review vs. work it has
   already accepted — `active` stays populated (not dropped) so accepted
   workplans remain visible in the team's Workplans list instead of vanishing
   once resolved; `reviews` alone is what should count as "needs attention". */
export function teamCampaignBuckets(
  teamName: string,
  campaigns: Campaign[],
  workplans: ConfiguredWorkplan[],
): { reviews: Campaign[]; active: Campaign[] } {
  const byCampaign: Record<string, ConfiguredWorkplan[]> = {};
  for (const w of workplans) (byCampaign[w.campaign_id] ||= []).push(w);

  const reviews: Campaign[] = [];
  const active: Campaign[] = [];
  for (const c of campaigns) {
    const wps = (byCampaign[c.id] || []).filter(
      (w) => getOpsTeam(w.template_name) === teamName,
    );
    if (wps.length === 0) continue;
    if (wps.some((w) => ACTIONABLE_WORKPLAN_STATUSES.includes(w.status))) reviews.push(c);
    else if (wps.every((w) => w.status === 'Accepted')) active.push(c);
    // else: nothing but Draft/Not Started — the case owner hasn't submitted
    // anything for this team yet, so there's nothing for ops to see at all.
  }
  return { reviews, active };
}
