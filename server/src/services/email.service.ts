// Email delivery layer.
// DEV_BYPASS or missing Azure creds → console.log only; errors never propagate to callers.

import { graphSendMail } from './graph';
import { findUsersByRole } from '../models/users';
import {
  EXCO_ROLE,
  MD_ROLE,
  COO_ROLE,
  getBusinessUnitTeam,
  type BusinessUnit,
} from '@shared/constants';
import {
  pendingMDApprovalEmail,
  pendingMDApprovalReminderEmail,
  workplanSubmittedEmail,
  workplanAmendedEmail,
  workplanAcceptedEmail,
  workplanResubmittedEmail,
  workplanReviewReminderEmail,
  workplanAmendedReminderEmail,
  campaignApprovedEmail,
  campaignRejectedEmail,
  campaignArchivedEmail,
  campaignDeletedEmail,
  formSubmittedEmail,
  handoffSentEmail,
  handoffAcknowledgedEmail,
  handoffCompletedEmail,
  formAcknowledgedEmail,
  formCompletedEmail,
  testOrderCEEmail,
  testSessionsUpdatedEmail,
  resourceScalingRequestedEmail,
  resourceScalingCompletedEmail,
  resourceScalingReminderEmail,
  resourceScalingEscalationEmail,
  jobsWeeklyDigestEmail,
  type WorkplanSubmittedData,
  type WorkplanAmendedData,
  type WorkplanAcceptedData,
  type WorkplanResubmittedData,
  type WorkplanReviewReminderData,
  type WorkplanAmendedReminderData,
  type CampaignApprovedData,
  type CampaignRejectedData,
  type CampaignArchivedData,
  type CampaignDeletedData,
  type FormSubmittedData,
  type HandoffSentData,
  type HandoffAcknowledgedData,
  type HandoffCompletedData,
  type PendingMDApprovalData,
  type PendingMDApprovalReminderData,
  type FormAcknowledgedData,
  type FormCompletedData,
  type TestOrderCEData,
  type TestSessionsUpdatedData,
  type ResourceScalingRequestedData,
  type ResourceScalingCompletedData,
  type ResourceScalingReminderData,
  type ResourceScalingEscalationData,
} from './email.templates';
import type { JobsReport } from '../../../shared/types';
import { findTeamByName, findTeamMembers } from '../models/teams';
import { findUserById } from '../models/users';

// ─── Primitives ───────────────────────────────────────────────────────────────

function isGraphConfigured(): boolean {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.GRAPH_SENDER_EMAIL
  );
}

async function deliver(to: string | string[], subject: string, html: string): Promise<void> {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) return;

  if (!isGraphConfigured()) {
    console.log('[EMAIL] Graph not configured — logging only:', { to: recipients, subject });
    return;
  }

  try {
    await graphSendMail(recipients, subject, html);
  } catch (err) {
    console.error('[EMAIL] delivery failed:', err);
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function teamRecipients(teamName: string): Promise<string[]> {
  const team = await findTeamByName(teamName);
  if (!team) {
    console.warn(`[EMAIL] team not found: "${teamName}"`);
    return [];
  }
  if (team.group_email) return [team.group_email];
  const members = await findTeamMembers(team.team_key);
  if (!members.length) {
    console.warn(
      `[EMAIL] team "${teamName}" has no members assigned — notification silently dropped`,
    );
  }
  return members.map((m) => m.email);
}

/* Resource-scaling reminders go to whoever holds the 'cloud' role; the
   team's group email is the fallback when no such user exists. Distinct
   from teamRecipients()'s group-email-then-all-members fallback, which
   escalation still uses. */
async function cloudRoleRecipients(teamName: string): Promise<string[]> {
  const cloudUsers = await findUsersByRole('cloud');
  const emails = cloudUsers.map((u) => u.email).filter(Boolean);
  if (emails.length) return emails;
  const team = await findTeamByName(teamName);
  if (team?.group_email) return [team.group_email];
  console.warn(
    `[EMAIL] no "cloud"-role users and no group email for "${teamName}" — notification silently dropped`,
  );
  return [];
}

async function ownerEmail(ownerUserId: string): Promise<string | null> {
  const user = await findUserById(ownerUserId);
  return user?.email ?? null;
}

// ─── Workplan notifications ───────────────────────────────────────────────────

export async function notifyWorkplanSubmitted(
  d: WorkplanSubmittedData,
  opsTeamName: string,
): Promise<void> {
  const to = await teamRecipients(opsTeamName);
  if (!to.length) return;
  const { subject, html } = workplanSubmittedEmail(d);
  await deliver(to, subject, html);
}

export async function notifyWorkplanAmended(
  d: WorkplanAmendedData,
  ownerUserId: string,
): Promise<void> {
  const email = await ownerEmail(ownerUserId);
  if (!email) return;
  const { subject, html } = workplanAmendedEmail(d);
  await deliver(email, subject, html);
}

export async function notifyWorkplanAccepted(
  d: WorkplanAcceptedData,
  ownerUserId: string,
): Promise<void> {
  const email = await ownerEmail(ownerUserId);
  if (!email) return;
  const { subject, html } = workplanAcceptedEmail(d);
  await deliver(email, subject, html);
}

export async function notifyWorkplanResubmitted(
  d: WorkplanResubmittedData,
  opsTeamName: string,
): Promise<void> {
  const to = await teamRecipients(opsTeamName);
  if (!to.length) return;
  const { subject, html } = workplanResubmittedEmail(d);
  await deliver(to, subject, html);
}

export async function notifyWorkplanReviewReminder(
  d: WorkplanReviewReminderData,
  opsTeamName: string,
): Promise<void> {
  const to = await teamRecipients(opsTeamName);
  if (!to.length) return;
  const { subject, html } = workplanReviewReminderEmail(d);
  await deliver(to, subject, html);
}

export async function notifyWorkplanAmendedReminder(
  d: WorkplanAmendedReminderData,
  ownerUserId: string,
): Promise<void> {
  const email = await ownerEmail(ownerUserId);
  if (!email) return;
  const { subject, html } = workplanAmendedReminderEmail(d);
  await deliver(email, subject, html);
}

// ─── MD approval request ─────────────────────────────────────────────────────

export async function notifyMDPendingApproval(d: PendingMDApprovalData): Promise<void> {
  const mds = await findUsersByRole('md');
  const to = mds.map((u) => u.email).filter(Boolean);
  if (!to.length) {
    console.warn('[EMAIL] notifyMDPendingApproval: no users with role "md" found');
    return;
  }
  const { subject, html } = pendingMDApprovalEmail(d);
  await deliver(to, subject, html);
}

export async function notifyMDApprovalReminder(d: PendingMDApprovalReminderData): Promise<void> {
  const mds = await findUsersByRole('md');
  const to = mds.map((u) => u.email).filter(Boolean);
  if (!to.length) {
    console.warn('[EMAIL] notifyMDApprovalReminder: no users with role "md" found');
    return;
  }
  const { subject, html } = pendingMDApprovalReminderEmail(d);
  await deliver(to, subject, html);
}

// ─── Campaign notifications ───────────────────────────────────────────────────

/* Full case report (approved or rejected) — goes to the owner, the business
   unit's ops team, Finance, exco-role users, and md-role users, all at once
   (deduped). Same recipient set for both outcomes. */
async function fullCaseReportRecipients(
  ownerUserId: string,
  unit: BusinessUnit,
): Promise<string[]> {
  const [owner, unitTeam, financeTeam, excoUsers, mdUsers] = await Promise.all([
    ownerEmail(ownerUserId),
    teamRecipients(getBusinessUnitTeam(unit)),
    teamRecipients('Finance'),
    findUsersByRole(EXCO_ROLE),
    findUsersByRole('md'),
  ]);
  return [
    ...new Set([
      ...(owner ? [owner] : []),
      ...unitTeam,
      ...financeTeam,
      ...excoUsers.map((u) => u.email),
      ...mdUsers.map((u) => u.email),
    ]),
  ].filter(Boolean);
}

export async function notifyCampaignApproved(
  d: CampaignApprovedData,
  ownerUserId: string,
): Promise<void> {
  const to = await fullCaseReportRecipients(ownerUserId, d.unit);
  if (!to.length) return;
  const { subject, html } = campaignApprovedEmail(d);
  await deliver(to, subject, html);
}

export async function notifyCampaignRejected(
  d: CampaignRejectedData,
  ownerUserId: string,
): Promise<void> {
  const to = await fullCaseReportRecipients(ownerUserId, d.unit);
  if (!to.length) return;
  const { subject, html } = campaignRejectedEmail(d);
  await deliver(to, subject, html);
}

export async function notifyCampaignArchived(
  d: CampaignArchivedData,
  ownerUserId: string,
): Promise<void> {
  const to = await fullCaseReportRecipients(ownerUserId, d.unit);
  if (!to.length) return;
  const { subject, html } = campaignArchivedEmail(d);
  await deliver(to, subject, html);
}

export async function notifyCampaignDeleted(
  d: CampaignDeletedData,
  ownerUserId: string,
): Promise<void> {
  const to = await fullCaseReportRecipients(ownerUserId, d.unit);
  if (!to.length) return;
  const { subject, html } = campaignDeletedEmail(d);
  await deliver(to, subject, html);
}

// ─── Form notifications ───────────────────────────────────────────────────────

export async function notifyFormSubmitted(
  d: Omit<FormSubmittedData, 'operationsTeam'>,
  opsTeamName: string,
): Promise<void> {
  const to = await teamRecipients(opsTeamName);
  if (!to.length) return;
  const { subject, html } = formSubmittedEmail({ ...d, operationsTeam: opsTeamName });
  await deliver(to, subject, html);
}

export async function notifyHandoffAcknowledged(
  d: Omit<HandoffAcknowledgedData, 'fromTeam'>,
  fromTeamName: string,
  ownerUserId?: string,
): Promise<void> {
  const [teamTo, ownerMail] = await Promise.all([
    teamRecipients(fromTeamName),
    ownerUserId ? ownerEmail(ownerUserId) : Promise.resolve(null),
  ]);
  // The owner is always included — previously this went ONLY to fromTeamName,
  // so an unpopulated team (see teamRecipients' warn above) meant nobody at
  // all heard that their handoff was acknowledged.
  const to = [...new Set([...teamTo, ...(ownerMail ? [ownerMail] : [])])];
  if (!to.length) return;
  const { subject, html } = handoffAcknowledgedEmail({ ...d, fromTeam: fromTeamName });
  await deliver(to, subject, html);
}

export async function notifyHandoffSent(
  d: Omit<HandoffSentData, 'toTeam'>,
  toTeamName: string,
): Promise<void> {
  const to = await teamRecipients(toTeamName);
  if (!to.length) return;
  const { subject, html } = handoffSentEmail({ ...d, toTeam: toTeamName });
  await deliver(to, subject, html);
}

export async function notifyHandoffCompleted(
  d: HandoffCompletedData,
  ownerUserId: string,
  opsTeamName: string,
): Promise<void> {
  const [ownerMail, opsRecipients] = await Promise.all([
    ownerEmail(ownerUserId),
    teamRecipients(opsTeamName),
  ]);
  const to = [...(ownerMail ? [ownerMail] : []), ...opsRecipients];
  if (!to.length) return;
  const { subject, html } = handoffCompletedEmail(d);
  await deliver(to, subject, html);
}

// ─── Delivery status notifications ───────────────────────────────────────────

/* Owner + the case's business-unit team (group email, else all members),
   deduped. The case owner alone isn't enough now that any team member can
   act on a unit's cases (see "My Unit's Cases") — everyone on the team needs
   to see form status updates, not just whoever happens to be the owner. */
async function ownerAndUnitTeamRecipients(
  ownerUserId: string,
  unit: BusinessUnit,
): Promise<string[]> {
  const [owner, unitTeam] = await Promise.all([
    ownerEmail(ownerUserId),
    teamRecipients(getBusinessUnitTeam(unit)),
  ]);
  return [...new Set([...(owner ? [owner] : []), ...unitTeam])];
}

export async function notifyFormAcknowledged(
  d: FormAcknowledgedData,
  ownerUserId: string,
  unit: BusinessUnit,
): Promise<void> {
  const to = await ownerAndUnitTeamRecipients(ownerUserId, unit);
  if (!to.length) return;
  const { subject, html } = formAcknowledgedEmail(d);
  await deliver(to, subject, html);
}

export async function notifyFormCompleted(
  d: FormCompletedData,
  ownerUserId: string,
  unit: BusinessUnit,
): Promise<void> {
  const to = await ownerAndUnitTeamRecipients(ownerUserId, unit);
  if (!to.length) return;
  const { subject, html } = formCompletedEmail(d);
  await deliver(to, subject, html);
}

// ─── Test Order — Candidate Experience ───────────────────────────────────────

const CE_TEAM = 'Candidate Experience';
const TECH_TEAM = 'Tech';

export async function notifyTestOrderSubmitted(d: TestOrderCEData): Promise<void> {
  const to = await teamRecipients(CE_TEAM);
  if (!to.length) return;
  const { subject, html } = testOrderCEEmail(d);
  await deliver(to, subject, html);
}

export async function notifyTestSessionsUpdated(
  d: TestSessionsUpdatedData,
  opsTeamName: string,
): Promise<void> {
  const [opsTo, ceTo] = await Promise.all([teamRecipients(opsTeamName), teamRecipients(CE_TEAM)]);
  const to = [...new Set([...opsTo, ...ceTo])];
  if (!to.length) return;
  const { subject, html } = testSessionsUpdatedEmail(d);
  await deliver(to, subject, html);
}

// ─── Resource Scaling notifications ──────────────────────────────────────────

export async function notifyResourceScalingRequested(
  d: ResourceScalingRequestedData,
): Promise<void> {
  const to = await cloudRoleRecipients(TECH_TEAM);
  if (!to.length) return;
  const { subject, html } = resourceScalingRequestedEmail(d);
  await deliver(to, subject, html);
}

export async function notifyResourceScalingCompleted(
  d: ResourceScalingCompletedData,
  ownerUserId: string,
): Promise<void> {
  const email = await ownerEmail(ownerUserId);
  if (!email) return;
  const { subject, html } = resourceScalingCompletedEmail(d);
  await deliver(email, subject, html);
}

export async function notifyResourceScalingReminder(d: ResourceScalingReminderData): Promise<void> {
  const to = await cloudRoleRecipients(TECH_TEAM);
  if (!to.length) return;
  const { subject, html } = resourceScalingReminderEmail(d);
  await deliver(to, subject, html);
}

export async function notifyResourceScalingEscalation(
  d: ResourceScalingEscalationData,
): Promise<void> {
  const to = await teamRecipients(TECH_TEAM);
  if (!to.length) return;
  const { subject, html } = resourceScalingEscalationEmail(d);
  await deliver(to, subject, html);
}

export async function notifyResourceScalingSessionsUpdated(
  d: TestSessionsUpdatedData,
): Promise<void> {
  const to = await cloudRoleRecipients(TECH_TEAM);
  if (!to.length) return;
  const { subject, html } = testSessionsUpdatedEmail(d);
  await deliver(to, subject, html);
}

// ─── Jobs Report ──────────────────────────────────────────────────────────────

export async function notifyJobsWeeklyDigest(d: JobsReport): Promise<void> {
  const [mds, coos] = await Promise.all([findUsersByRole(MD_ROLE), findUsersByRole(COO_ROLE)]);
  const to = [...new Set([...mds, ...coos].map((u) => u.email).filter(Boolean))];
  if (!to.length) {
    console.warn('[EMAIL] notifyJobsWeeklyDigest: no users with role "md" or "coo" found');
    return;
  }
  const { subject, html } = jobsWeeklyDigestEmail(d);
  await deliver(to, subject, html);
}

// ─── Legacy compat — kept so old direct call sites still compile ──────────────

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
): Promise<void> {
  await deliver(to, subject, html);
}

export async function resolveTeamRecipients(teamName: string): Promise<string[]> {
  return teamRecipients(teamName);
}
