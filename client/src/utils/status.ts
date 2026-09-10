
export type BadgeTone = 'neutral' | 'pending' | 'positive' | 'negative' | 'info';

/* Ops review status → display label (mirrors the Tracker: Pending → "Pending Review"). */
export function opsStatusLabel(status: string): string {
  return status === 'Pending' ? 'Pending Review' : status || 'Not Started';
}

export function resolveDeliveryStatus(
  deliveryStatus: string | null | undefined,
  _submittedOn?: string | null,
): string {
  if (deliveryStatus) return deliveryStatus;
  return 'Submitted';
}

export function deliveryTone(status: string): BadgeTone {
  if (status === 'Completed') return 'positive';
  if (status === 'Acknowledged') return 'info';
  if (status === 'Delivered') return 'info';
  return 'pending';
}

/* Map internal DB pipeline stages to user-facing campaign statuses.
   'Workplan' just means a workplan row exists — set the moment the case
   owner saves a draft (createConfiguredWorkplan), whether or not it's ever
   been submitted. 'Profitability' only happens inside submitWorkplan, in the
   same transaction as submitForApproval setting approval_status: 'Pending' —
   so only that stage genuinely means "awaiting a decision". A rejection closes
   the case (campaign_status: 'Closed'), so it falls under 'Inactive' below —
   re-triggering approval after a rejection isn't scoped yet. */
export function toCampaignDisplayStatus(dbStatus: string): string {
  const s = (dbStatus || '').toLowerCase();
  if (s === 'profitability') return 'Pending';
  if (s === 'closed') return 'Inactive';
  if (s === 'draft' || s === 'workplan') return 'Draft';
  if (s === 'active') return 'Active';
  return dbStatus;
}

export function campaignStatusTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'active') return 'positive';
  if (s === 'inactive') return 'negative';
  if (s === 'pending' || s === 'submitted') return 'pending';
  return 'neutral';
}

export function approvalTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'approved') return 'positive';
  if (s === 'rejected') return 'negative';
  if (s === 'pending') return 'pending';
  return 'neutral';
}

export function opsTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === 'accepted') return 'positive';
  if (s === 'amended') return 'info';
  if (s === 'pending' || s === 'pending review' || s === 'submitted') return 'pending';
  return 'neutral';
}

export function handoffTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  return s === 'completed' || s === 'job complete' ? 'positive' : 'pending';
}
