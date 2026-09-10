// Branded HTML email templates for every notification event.
// Each function returns { subject, html }.

import type { BusinessUnit } from '@shared/constants';
import type { OneDriveFile } from '../../../shared/types';

const APP_URL = process.env.APP_URL;

function teamSlug(teamName: string): string {
  return teamName.toLowerCase().replace(/\s+/g, '-');
}

function opsUrl(team: string): string {
  return `${APP_URL}/operations/${teamSlug(team)}`;
}

export function formUrl(team: string, formId: string): string {
  return `${APP_URL}/operations/${teamSlug(team)}/form/${formId}`;
}

export function handoffUrl(team: string, formId: string): string {
  return `${APP_URL}/operations/${teamSlug(team)}/handoff/${formId}`;
}

function layout(body: string, maxWidth = 560): string {
  const wide = maxWidth > 560;
  const bodyPadding = wide ? '36px 36px 32px' : '28px 28px 24px';
  const headerPadding = wide ? '26px 36px' : '20px 28px';
  const footerPadding = wide ? '16px 36px' : '14px 28px';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:36px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" style="max-width:${maxWidth}px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#0f1c2e;padding:${headerPadding};">
          <div style="color:#ffffff;font-size:${wide ? 18 : 16}px;font-weight:700;letter-spacing:-0.3px;">Dragnet Solutions</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.8px;text-transform:uppercase;margin-top:3px;">Service &amp; Operations</div>
        </td>
      </tr>
      <tr><td style="background:#c41e1e;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr>
        <td style="padding:${bodyPadding};color:#1a1a2e;font-size:${wide ? 15 : 14}px;line-height:1.65;">
          ${body}
        </td>
      </tr>
      <tr>
        <td style="padding:${footerPadding};background:#f7f7f7;border-top:1px solid #e8e8e8;">
          <p style="margin:0;color:#aaa;font-size:11px;line-height:1.5;">This is an automated message from Dragnet Solutions Service &amp; Operations. Please do not reply to this email.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function cta(label: string, url: string): string {
  return `<p style="margin:20px 0 0;">
    <a href="${url}" style="display:inline-block;background:#c41e1e;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:0.2px;">${label} &rarr;</a>
  </p>`;
}

function caseTag(campaignDisplayId: string): string {
  return `<p style="margin:12px 0 0;font-size:12px;color:#666;">
    Campaign: <span style="font-family:monospace;background:#f0f0f0;padding:2px 6px;border-radius:3px;color:#c41e1e;font-weight:600;">${campaignDisplayId}</span>
  </p>`;
}

/* Renders a labeled list of quick-reference links for any OneDrive/SharePoint
   attachment(s) recorded on a form or handoff — empty string if none. */
function attachmentLinksHtml(label: string, files?: OneDriveFile[] | null): string {
  if (!files?.length) return '';
  const links = files
    .map((f) => `<a href="${f.web_url}" style="color:#c41e1e;text-decoration:none;">${f.name}</a>`)
    .join('<br/>');
  return `<p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>${label}:</strong><br/>${links}</p>`;
}

// ─── Workplan notifications ───────────────────────────────────────────────────

export type WorkplanSubmittedData = {
  templateName: string;
  campaignDisplayId: string;
  campaignUuid: string;
  ownerName: string;
};

export function workplanSubmittedEmail(d: WorkplanSubmittedData) {
  return {
    subject: `Workplan Submitted for Review — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">New Workplan for Review</h2>
      <p style="margin:0;">A workplan has been submitted for your team's review.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Workplan:</strong> ${d.templateName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Submitted by:</strong> ${d.ownerName}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to review the proposed dates and accept or counter the workplan.</p>
      ${cta('Review Workplan', `${APP_URL}/workplan-review/${d.campaignUuid}`)}
    `),
  };
}

export type WorkplanAmendedData = {
  templateName: string;
  campaignDisplayId: string;
  campaignUuid: string;
  teamName: string;
};

export function workplanAmendedEmail(d: WorkplanAmendedData) {
  return {
    subject: `Workplan Amended — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Your Workplan Has Been Amended</h2>
      <p style="margin:0;">${d.teamName} has reviewed your workplan and proposed revised dates.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Workplan:</strong> ${d.templateName}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to view the proposed changes. You can either accept the new dates or reconfigure and resubmit with your preferred dates.</p>
      ${cta('View Amendment', `${APP_URL}/workplan-view/${d.campaignUuid}`)}
    `),
  };
}

export type WorkplanAcceptedData = {
  templateName: string;
  campaignDisplayId: string;
  campaignUuid: string;
  teamName: string;
};

export function workplanAcceptedEmail(d: WorkplanAcceptedData) {
  return {
    subject: `Workplan Accepted — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Workplan Accepted</h2>
      <p style="margin:0;">Your workplan has been reviewed and accepted by ${d.teamName}.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Workplan:</strong> ${d.templateName}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">No further action is required for this template.</p>
      ${cta('View Case', `${APP_URL}/tracker/${d.campaignUuid}`)}
    `),
  };
}

export type WorkplanResubmittedData = {
  templateName: string;
  campaignDisplayId: string;
  campaignUuid: string;
  ownerName: string;
};

export function workplanResubmittedEmail(d: WorkplanResubmittedData) {
  return {
    subject: `Workplan Resubmitted — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Workplan Resubmitted After Amendment</h2>
      <p style="margin:0;">The case owner has resubmitted the workplan with updated dates following your counter.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Workplan:</strong> ${d.templateName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Owner:</strong> ${d.ownerName}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to review the revised dates.</p>
      ${cta('Review Workplan', `${APP_URL}/workplan-review/${d.campaignUuid}`)}
    `),
  };
}

export type WorkplanReviewReminderData = {
  templateName: string;
  campaignDisplayId: string;
  campaignUuid: string;
  ownerName: string;
  pendingHours: number;
};

export function workplanReviewReminderEmail(d: WorkplanReviewReminderData) {
  return {
    subject: `[Reminder] Workplan Awaiting Review — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Reminder: Workplan Awaiting Your Team's Review</h2>
      <p style="margin:0;">This workplan is still waiting on your team to review and accept or counter it.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Workplan:</strong> ${d.templateName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Submitted by:</strong> ${d.ownerName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Pending for:</strong> ${d.pendingHours} hour${d.pendingHours === 1 ? '' : 's'}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to review the proposed dates and accept or counter the workplan.</p>
      ${cta('Review Workplan', `${APP_URL}/workplan-review/${d.campaignUuid}`)}
    `),
  };
}

export type WorkplanAmendedReminderData = {
  templateName: string;
  campaignDisplayId: string;
  campaignUuid: string;
  teamName: string;
  pendingHours: number;
};

export function workplanAmendedReminderEmail(d: WorkplanAmendedReminderData) {
  return {
    subject: `[Reminder] Workplan Needs Your Response — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Reminder: Amended Workplan Awaiting Your Response</h2>
      <p style="margin:0;">${d.teamName} proposed revised dates on this workplan and is still waiting on you to accept or resubmit.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Workplan:</strong> ${d.templateName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Pending for:</strong> ${d.pendingHours} hour${d.pendingHours === 1 ? '' : 's'}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to accept the new dates or reconfigure and resubmit with your preferred dates.</p>
      ${cta('View Amendment', `${APP_URL}/workplan-view/${d.campaignUuid}`)}
    `),
  };
}

// ─── MD approval request ─────────────────────────────────────────────────────

export type PendingMDApprovalData = {
  campaignDisplayId: string;
  campaignUuid: string;
  ownerName: string;
  profitPercent: number;
};

export function pendingMDApprovalEmail(d: PendingMDApprovalData) {
  return {
    subject: `Approval Required — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Campaign Pending Your Approval</h2>
      <p style="margin:0;">A campaign requires your review and approval before it can proceed to active status.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Case Owner:</strong> ${d.ownerName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Profitability:</strong> <span style="color:#c41e1e;font-weight:700;">${d.profitPercent.toFixed(1)}%</span> &mdash; below the auto-approval threshold.</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to review the commercials and approve or reject the case.</p>
      ${cta('Review & Approve', `${APP_URL}/approvals`)}
    `),
  };
}

export type PendingMDApprovalReminderData = {
  campaignDisplayId: string;
  campaignUuid: string;
  ownerName: string;
  profitPercent: number;
  pendingDays: number;
};

export function pendingMDApprovalReminderEmail(d: PendingMDApprovalReminderData) {
  return {
    subject: `[Reminder] Approval Required — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Reminder: Campaign Pending Your Approval</h2>
      <p style="margin:0;">This case is still awaiting your review and approval before it can proceed to active status.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Case Owner:</strong> ${d.ownerName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Profitability:</strong> <span style="color:#c41e1e;font-weight:700;">${d.profitPercent.toFixed(1)}%</span> &mdash; below the auto-approval threshold.</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Pending for:</strong> ${d.pendingDays} day${d.pendingDays === 1 ? '' : 's'}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to review the commercials and approve or reject the case.</p>
      ${cta('Review & Approve', `${APP_URL}/approvals`)}
    `),
  };
}

// ─── Campaign approval notifications ─────────────────────────────────────────

export type ProfitabilityLineItem = {
  service_name: string;
  quantity: string | number;
  rate: string | number;
};

export type CampaignApprovedData = {
  campaignDisplayId: string;
  campaignUuid: string;
  unit: BusinessUnit;
  clientName: string;
  description?: string | null;
  ownerName: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitPercent: number;
  revenueItems: ProfitabilityLineItem[];
  costItems: ProfitabilityLineItem[];
  approvedBy?: string;
  approverComments?: string | null;
  auto?: boolean;
};

const NAIRA = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
});

function lineItemsTable(title: string, items: ProfitabilityLineItem[]): string {
  if (!items.length) return '';
  const rows = items
    .map((i) => {
      const subtotal = parseFloat(i.quantity as string) * parseFloat(i.rate as string);
      return `<tr>
        <td style="padding:8px 10px 8px 0;font-size:14px;color:#222;">${i.service_name}</td>
        <td style="padding:8px 10px;font-size:14px;color:#444;text-align:right;">${i.quantity}</td>
        <td style="padding:8px 10px;font-size:14px;color:#444;text-align:right;">${NAIRA.format(parseFloat(i.rate as string))}</td>
        <td style="padding:8px 0 8px 10px;font-size:14px;color:#222;font-weight:600;text-align:right;">${NAIRA.format(subtotal)}</td>
      </tr>`;
    })
    .join('');
  return `
    <p style="margin:20px 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#888;">${title}</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb;">
      <thead><tr>
        <th style="padding:8px 10px 8px 0;font-size:12px;text-align:left;color:#999;">Service</th>
        <th style="padding:8px 10px;font-size:12px;text-align:right;color:#999;">Qty</th>
        <th style="padding:8px 10px;font-size:12px;text-align:right;color:#999;">Rate</th>
        <th style="padding:8px 0 8px 10px;font-size:12px;text-align:right;color:#999;">Subtotal</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function campaignApprovedEmail(d: CampaignApprovedData) {
  return {
    subject: `Case Approved — ${d.campaignDisplayId}`,
    html: layout(
      `
      <h2 style="margin:0 0 14px;font-size:20px;color:#0f1c2e;font-weight:700;">Case Approved</h2>
      <p style="margin:0;">This case has been approved and is now active.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:14px 0 0;font-size:14px;color:#444;"><strong>Business Unit:</strong> ${d.unit}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Client:</strong> ${d.clientName}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Case Owner:</strong> ${d.ownerName}</p>
      ${d.description ? `<p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Description:</strong> ${d.description}</p>` : ''}
      ${lineItemsTable('Revenue Items', d.revenueItems)}
      ${lineItemsTable('Cost Items', d.costItems)}
      <p style="margin:20px 0 0;padding:14px;background:#f7f7f7;border-radius:6px;font-size:14px;color:#222;">
        <strong>Total Revenue:</strong> ${NAIRA.format(d.totalRevenue)} &nbsp;·&nbsp;
        <strong>Total Cost:</strong> ${NAIRA.format(d.totalCost)} &nbsp;·&nbsp;
        <strong>Gross Profit:</strong> ${NAIRA.format(d.grossProfit)} &nbsp;·&nbsp;
        <strong>Profitability:</strong> <span style="color:#c41e1e;font-weight:700;">${d.profitPercent.toFixed(1)}%</span>
      </p>
      <p style="margin:14px 0 0;font-size:14px;color:#444;"><strong>Approved by:</strong> ${d.approvedBy ?? 'System'}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Approver Comments:</strong> ${d.approverComments?.trim() || 'None'}</p>
      <p style="margin:20px 0 0;font-size:14px;color:#666;">You can proceed with delivery activities.</p>
      ${cta('View Case', `${APP_URL}/org-dashboard`)}
    `,
      720,
    ),
  };
}

export type CampaignRejectedData = {
  campaignDisplayId: string;
  campaignUuid: string;
  unit: BusinessUnit;
  clientName: string;
  description?: string | null;
  ownerName: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitPercent: number;
  revenueItems: ProfitabilityLineItem[];
  costItems: ProfitabilityLineItem[];
  rejectedBy: string;
  note: string;
};

export function campaignRejectedEmail(d: CampaignRejectedData) {
  return {
    subject: `Case Not Approved — ${d.campaignDisplayId}`,
    html: layout(
      `
      <h2 style="margin:0 0 14px;font-size:20px;color:#0f1c2e;font-weight:700;">Case Not Approved</h2>
      <p style="margin:0;">This case has been reviewed and was not approved at this time.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:14px 0 0;font-size:14px;color:#444;"><strong>Business Unit:</strong> ${d.unit}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Client:</strong> ${d.clientName}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Case Owner:</strong> ${d.ownerName}</p>
      ${d.description ? `<p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Description:</strong> ${d.description}</p>` : ''}
      ${lineItemsTable('Revenue Items', d.revenueItems)}
      ${lineItemsTable('Cost Items', d.costItems)}
      <p style="margin:20px 0 0;padding:14px;background:#f7f7f7;border-radius:6px;font-size:14px;color:#222;">
        <strong>Total Revenue:</strong> ${NAIRA.format(d.totalRevenue)} &nbsp;·&nbsp;
        <strong>Total Cost:</strong> ${NAIRA.format(d.totalCost)} &nbsp;·&nbsp;
        <strong>Gross Profit:</strong> ${NAIRA.format(d.grossProfit)} &nbsp;·&nbsp;
        <strong>Profitability:</strong> <span style="color:#c41e1e;font-weight:700;">${d.profitPercent.toFixed(1)}%</span>
      </p>
      <p style="margin:14px 0 0;font-size:14px;color:#444;"><strong>Rejected by:</strong> ${d.rejectedBy}</p>
      <p style="margin:8px 0 0;padding:14px;background:#fff5f5;border-left:3px solid #c41e1e;font-size:14px;color:#444;"><strong>Rejection Reason:</strong> ${d.note}</p>
      <p style="margin:20px 0 0;font-size:14px;color:#666;">Please review the reason above, update the commercials if needed, and resubmit.</p>
      ${cta('View Case', `${APP_URL}/org-dashboard`)}
    `,
      720,
    ),
  };
}

export type CampaignArchivedData = {
  campaignDisplayId: string;
  campaignUuid: string;
  campaignName: string;
  unit: BusinessUnit;
  clientName: string;
  ownerName: string;
  archivedBy: string;
};

export function campaignArchivedEmail(d: CampaignArchivedData) {
  return {
    subject: `Case Archived — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 14px;font-size:20px;color:#0f1c2e;font-weight:700;">Case Archived</h2>
      <p style="margin:0;">This case has been archived and is no longer active. No further action can be taken on it while archived — it can be restored at any time by the case owner.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:14px 0 0;font-size:14px;color:#444;"><strong>Business Unit:</strong> ${d.unit}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Client:</strong> ${d.clientName}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Case Owner:</strong> ${d.ownerName}</p>
      <p style="margin:14px 0 0;font-size:14px;color:#444;"><strong>Archived by:</strong> ${d.archivedBy}</p>
    `),
  };
}

export type CampaignDeletedData = {
  campaignDisplayId: string;
  campaignUuid: string;
  unit: BusinessUnit;
  clientName: string;
  ownerName: string;
  deletedBy: string;
};

export function campaignDeletedEmail(d: CampaignDeletedData) {
  return {
    subject: `Case Deleted — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 14px;font-size:20px;color:#0f1c2e;font-weight:700;">Case Deleted</h2>
      <p style="margin:0;">This case has been permanently deleted and is no longer active. No further action can be taken on it — this cannot be undone.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:14px 0 0;font-size:14px;color:#444;"><strong>Business Unit:</strong> ${d.unit}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Client:</strong> ${d.clientName}</p>
      <p style="margin:5px 0 0;font-size:14px;color:#444;"><strong>Case Owner:</strong> ${d.ownerName}</p>
      <p style="margin:14px 0 0;font-size:14px;color:#444;"><strong>Deleted by:</strong> ${d.deletedBy}</p>
    `),
  };
}

// ─── Form notifications ───────────────────────────────────────────────────────

export type FormSubmittedData = {
  formType: string;
  campaignDisplayId: string;
  campaignUuid: string;
  operationsTeam: string;
  formId: string;
  submitterName?: string;
};

export function formSubmittedEmail(d: FormSubmittedData) {
  const submitterNote = d.submitterName
    ? `<p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Submitted by:</strong> ${d.submitterName}</p>`
    : '';
  return {
    subject: `New Support Form — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">New Support Form Submitted</h2>
      <p style="margin:0;">A support form has been submitted and is assigned to your team.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Form Type:</strong> ${d.formType}</p>
      ${submitterNote}
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to review and action the form.</p>
      ${cta('View Form', formUrl(d.operationsTeam, d.formId))}
    `),
  };
}

export type HandoffSentData = {
  formType: string;
  campaignDisplayId: string;
  campaignUuid: string;
  fromTeam: string;
  toTeam: string;
  formId: string;
  attachment?: OneDriveFile[] | null;
};

export function handoffSentEmail(d: HandoffSentData) {
  return {
    subject: `Job & Handoff Triggered — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Form Handoff</h2>
      <p style="margin:0;">${d.fromTeam} has sent a form to your team and the Job has officially been created.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Type:</strong> ${d.formType}</p>
      ${attachmentLinksHtml('Attachment', d.attachment)}
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to review the handoff details and take the necessary action.</p>
      ${cta('View Handoff', handoffUrl(d.toTeam, d.formId))}
    `),
  };
}

export type HandoffAcknowledgedData = {
  formType: string;
  campaignDisplayId: string;
  campaignUuid: string;
  acknowledgedBy: string;
  toTeam: string;
  fromTeam: string;
  formId: string;
};

export function handoffAcknowledgedEmail(d: HandoffAcknowledgedData) {
  return {
    subject: `Job & Handoff Acknowledged — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Handoff Acknowledged </h2>
      <p style="margin:0;">${d.toTeam} has acknowledged the handoff and is now actioning it.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Type:</strong> ${d.formType}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Acknowledged by:</strong> ${d.acknowledgedBy}</p>
      ${cta('View Form', formUrl(d.fromTeam, d.formId))}
    `),
  };
}

export type HandoffCompletedData = {
  formType: string;
  campaignDisplayId: string;
  campaignUuid: string;
  completedBy: string;
  report?: OneDriveFile[] | null;
};

export function handoffCompletedEmail(d: HandoffCompletedData) {
  return {
    subject: `Job Complete — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Job Complete</h2>
      <p style="margin:0;">A Job & handoff for this case has been completed.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Type:</strong> ${d.formType}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Completed by:</strong> ${d.completedBy}</p>
      ${attachmentLinksHtml('Evidence', d.report)}
      ${cta('View Case', `${APP_URL}/tracker/${d.campaignUuid}`)}
    `),
  };
}

// ─── Delivery status notifications ───────────────────────────────────────────

export type FormAcknowledgedData = {
  formType: string;
  campaignDisplayId: string;
  campaignUuid: string;
};

export function formAcknowledgedEmail(d: FormAcknowledgedData) {
  return {
    subject: `Support Form Acknowledged — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Form  Acknowledged</h2>
      <p style="margin:0;">The operations team has acknowledged receipt of your submitted form.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Form Type:</strong> ${d.formType}</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Your form is now being processed. You will be notified once it has been completed.</p>
      ${cta('View Case', `${APP_URL}/tracker/${d.campaignUuid}`)}
    `),
  };
}

export type FormCompletedData = {
  formType: string;
  campaignDisplayId: string;
  campaignUuid: string;
  completedBy: string;
  evidence?: OneDriveFile[] | null;
};

export function formCompletedEmail(d: FormCompletedData) {
  return {
    subject: `Support Form Completed — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Form Processing Complete</h2>
      <p style="margin:0;">Your submitted form has been processed and marked as complete.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Form Type:</strong> ${d.formType}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#444;"><strong>Completed by:</strong> ${d.completedBy}</p>
      ${attachmentLinksHtml('Attachment', d.evidence)}
      ${cta('View Case', `${APP_URL}/tracker/${d.campaignUuid}`)}
    `),
  };
}

// ─── Test Order — Candidate Experience notifications ──────────────────────────

export type TestOrderCEData = {
  campaignDisplayId: string;
  campaignUuid: string;
  formId: string;
  formDetails?: Record<string, unknown>;
};

const TEST_ORDER_LABELS: Record<string, string> = {
  testType: 'Test Type',
  candidateCount: 'Number of Candidates',
  testingPlatform: 'Testing Platform',
  otherPlatform: 'Platform (Other)',
  assessmentType: 'Assessment Type',
  assessmentDeployed: 'Assessment to be Deployed',
  assessmentSource: 'Assessment Source',
  proctoringOption: 'Proctoring Option',
  instantResult: 'Instant Result Display',
  deploySurvey: 'Deploy Survey?',
  surveyLink: 'Survey Link',
  resultsAccess: 'Results Access',
  communicationTemplates: 'Communication Templates',
  specialInstructions: 'Special Instructions',
  physicalLocations: 'Physical Locations',
  invitationTemplate: 'Invitation Template',
  candidateList: 'Candidate List',
};

// Fields stored as OneDriveFile[] (the 'onedrive-files' field kind in the form
// catalog) rather than plain text — must render as links, not String(val).
const TEST_ORDER_FILE_FIELDS = new Set(['invitationTemplate', 'candidateList']);

const TEST_ORDER_FIELD_ORDER = Object.keys(TEST_ORDER_LABELS);

function fileLinksInline(files: OneDriveFile[]): string {
  return files
    .map((f) => `<a href="${f.web_url}" style="color:#c41e1e;text-decoration:none;">${f.name}</a>`)
    .join('<br/>');
}

function testOrderDetailsHtml(details: Record<string, unknown>): string {
  const rows: string[] = [];

  for (const key of TEST_ORDER_FIELD_ORDER) {
    const val = details[key];
    if (val === undefined || val === null || val === '') continue;
    if (TEST_ORDER_FILE_FIELDS.has(key) && (!Array.isArray(val) || val.length === 0)) continue;
    const label = TEST_ORDER_LABELS[key];
    const rendered = TEST_ORDER_FILE_FIELDS.has(key)
      ? fileLinksInline(val as OneDriveFile[])
      : String(val);
    rows.push(`
      <tr>
        <td style="padding:6px 12px 6px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#888;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:6px 0;font-size:13px;color:#222;vertical-align:top;">${rendered}</td>
      </tr>`);
  }

  const sessions = details['testingSessions'];
  if (Array.isArray(sessions) && sessions.length > 0) {
    const sessionRows = sessions
      .map((s: Record<string, unknown>, i: number) => {
        const cells = [
          s['startDate']
            ? `<b>Start:</b> ${s['startDate']}${s['startTime'] ? ` ${s['startTime']}` : ''}`
            : '',
          s['endDate']
            ? `<b>End:</b> ${s['endDate']}${s['endTime'] ? ` ${s['endTime']}` : ''}`
            : '',
        ]
          .filter(Boolean)
          .join(' &nbsp;·&nbsp; ');
        return `<div style="font-size:12px;color:#444;margin-bottom:4px;"><span style="color:#c41e1e;font-weight:700;font-size:11px;">SESSION ${i + 1}</span> &nbsp; ${cells}</div>`;
      })
      .join('');
    rows.push(`
      <tr>
        <td style="padding:6px 12px 6px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#888;white-space:nowrap;vertical-align:top;">Sessions</td>
        <td style="padding:6px 0;vertical-align:top;">${sessionRows}</td>
      </tr>`);
  }

  if (rows.length === 0) return '';
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #e5e7eb;">
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

export function testOrderCEEmail(d: TestOrderCEData) {
  const details = d.formDetails ? testOrderDetailsHtml(d.formDetails) : '';
  return {
    subject: `Test Order — Preparation Notice — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Test Order — Preparation Notice</h2>
      <p style="margin:0;">A Test Order Form has been submitted for the following case. Your team will need to prepare accordingly once the sessions are confirmed.</p>
      ${caseTag(d.campaignDisplayId)}
      ${details}
      <p style="margin:16px 0 0;font-size:13px;color:#666;">You will receive a handoff request when the order is ready for candidate experience processing.</p>
      ${cta('View Handoff', handoffUrl('Candidate Experience', d.formId))}
    `),
  };
}

export type TestSessionsUpdatedData = {
  campaignDisplayId: string;
  campaignUuid: string;
  sessionCount: number;
  formId: string;
  viewUrl: string;
  formDetails?: Record<string, unknown>;
};

export function testSessionsUpdatedEmail(d: TestSessionsUpdatedData) {
  const details = d.formDetails ? testOrderDetailsHtml(d.formDetails) : '';
  return {
    subject: `Test Sessions Updated — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Test Sessions Updated</h2>
      <p style="margin:0;">The test session schedule for this case has been updated.</p>
      ${caseTag(d.campaignDisplayId)}
      ${details}
      <p style="margin:16px 0 0;font-size:13px;color:#666;">Please review the updated schedule to ensure your team is prepared.</p>
      ${cta('View in Operations', d.viewUrl)}
    `),
  };
}

// ─── Resource Scaling (Tech / Cloud Engineer) notifications ───────────────────

export type ResourceScalingRequestedData = {
  campaignDisplayId: string;
  campaignUuid: string;
  formId: string;
};

export function resourceScalingRequestedEmail(d: ResourceScalingRequestedData) {
  return {
    subject: `Resource Scaling Required — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Resource Scaling Action Required</h2>
      <p style="margin:0;">A Test Order has been submitted. You are required to prepare and scale the necessary infrastructure before the scheduled test sessions.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please log in to review the test order details, acknowledge this request, and complete your scaling action with supporting evidence.</p>
      ${cta('View Handoff', handoffUrl('Tech', d.formId))}
    `),
  };
}

export type ResourceScalingCompletedData = {
  campaignDisplayId: string;
  campaignUuid: string;
  completedBy: string;
  report?: OneDriveFile[] | null;
};

export function resourceScalingCompletedEmail(d: ResourceScalingCompletedData) {
  return {
    subject: `Resource Scaling Completed — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Resource Scaling Complete</h2>
      <p style="margin:0;">The Tech team has completed the resource scaling action for the upcoming test sessions on this case.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Completed by:</strong> ${d.completedBy}</p>
      ${attachmentLinksHtml('Evidence', d.report)}
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Infrastructure is ready. No further action is required from you at this stage.</p>
      ${cta('View Case', `${APP_URL}/tracker/${d.campaignUuid}`)}
    `),
  };
}

export type ResourceScalingReminderData = {
  campaignDisplayId: string;
  campaignUuid: string;
  hoursRemaining: number;
};

export function resourceScalingReminderEmail(d: ResourceScalingReminderData) {
  const urgency =
    d.hoursRemaining <= 6
      ? `<p style="margin:12px 0 0;padding:12px;background:#fff5f5;border-left:3px solid #c41e1e;font-size:13px;color:#c41e1e;font-weight:700;">⚠ Urgent: only ${d.hoursRemaining} hour${d.hoursRemaining === 1 ? '' : 's'} remaining.</p>`
      : '';
  return {
    subject: `[Reminder] Resource Scaling Pending — ${d.campaignDisplayId} (${d.hoursRemaining}h remaining)`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#0f1c2e;font-weight:700;">Resource Scaling Pending</h2>
      <p style="margin:0;">This is a reminder that a resource scaling action is still pending for an upcoming test order.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;font-size:13px;color:#444;"><strong>Time remaining:</strong> approximately ${d.hoursRemaining} hour${d.hoursRemaining === 1 ? '' : 's'} before the first test session.</p>
      ${urgency}
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please complete the scaling action and submit your evidence as soon as possible.</p>
      ${cta('View in Operations', opsUrl('Tech'))}
    `),
  };
}

export type ResourceScalingEscalationData = {
  campaignDisplayId: string;
  campaignUuid: string;
};

export function resourceScalingEscalationEmail(d: ResourceScalingEscalationData) {
  return {
    subject: `[Escalation] Resource Scaling Escalation — ${d.campaignDisplayId}`,
    html: layout(`
      <h2 style="margin:0 0 12px;font-size:18px;color:#c41e1e;font-weight:700;">Resource Scaling Overdue</h2>
      <p style="margin:0;">A resource scaling action is still incomplete with less than 12 hours until the scheduled test sessions. Immediate action is required.</p>
      ${caseTag(d.campaignDisplayId)}
      <p style="margin:12px 0 0;padding:12px;background:#fff5f5;border-left:3px solid #c41e1e;font-size:13px;color:#c41e1e;font-weight:700;">⚠ This campaign is at risk. Test sessions may be impacted if infrastructure is not prepared immediately.</p>
      <p style="margin:12px 0 0;font-size:13px;color:#666;">Please ensure the scaling action is completed and documented in the system before the sessions begin.</p>
      ${cta('View in Operations', opsUrl('Tech'))}
    `),
  };
}
