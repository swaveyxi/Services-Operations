import createError from 'http-errors';
import { randomUUID } from 'node:crypto';
import {
  findFormById,
  findFormsByCampaign,
  findFormsByOpsTeam,
  findHandoffsByTeam,
  createForm,
  updateForm,
  type FormRow,
  type FormInsert,
} from '../models/forms';
import {
  createHandoff,
  updateHandoff,
  findHandoffById,
  hasActiveHandoffToTeam,
} from '../models/formHandoffs';
import { findCampaignById } from '../models/campaigns';
import { findUserById } from '../models/users';
import { FORM_TITLE_TO_KEY, RESOURCE_SCALING_CANDIDATE_THRESHOLD } from '../../../shared/constants';
import {
  notifyFormSubmitted,
  notifyHandoffAcknowledged,
  notifyHandoffSent,
  notifyHandoffCompleted,
  notifyFormAcknowledged,
  notifyFormCompleted,
  notifyTestOrderSubmitted,
  notifyTestSessionsUpdated,
  notifyResourceScalingRequested,
  notifyResourceScalingCompleted,
  notifyResourceScalingSessionsUpdated,
} from './email.service';
import { formUrl, handoffUrl } from './email.templates';
import type { OneDriveFile } from '../../../shared/types';

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateFormInput = Omit<FormInsert, 'id'>;

export async function submitForm(input: CreateFormInput): Promise<FormRow> {
  const campaign = await findCampaignById(input.campaign_id);
  if (!campaign) throw createError(404, 'Campaign not found.');

  const isTestOrder = FORM_TITLE_TO_KEY[input.form_type] === 'test-order';
  const candidateCount = Number((input.form_details as Record<string, unknown> | null)?.candidateCount);
  const needsResourceScaling =
    isTestOrder && Number.isFinite(candidateCount) && candidateCount >= RESOURCE_SCALING_CANDIDATE_THRESHOLD;
  const id = randomUUID();

  await createForm({ ...input, id, submitted_on: input.submitted_on ?? new Date() });

  if (needsResourceScaling) {
    await createHandoff({
      id: randomUUID(),
      form_id: id,
      team: 'Tech',
      status: 'Pending',
      sent_by: 'System',
      sent_at: new Date(),
      auto: 1,
      reminders_sent: [],
    });
  }

  const submitter = input.submitter_user_id ? await findUserById(input.submitter_user_id) : null;

  const base = {
    formType: input.form_type,
    campaignDisplayId: campaign.campaign_id,
    campaignUuid: campaign.id,
  };

  await notifyFormSubmitted(
    { ...base, formId: id, submitterName: submitter?.name },
    input.operations_team,
  );
  await updateForm(id, { delivery_status: 'Delivered' });

  if (isTestOrder) {
    await notifyTestOrderSubmitted({
      campaignDisplayId: campaign.campaign_id,
      campaignUuid: campaign.id,
      formId: id,
      formDetails: (input.form_details ?? {}) as Record<string, unknown>,
    });
  }
  if (needsResourceScaling) {
    await notifyResourceScalingRequested({
      campaignDisplayId: campaign.campaign_id,
      campaignUuid: campaign.id,
      formId: id,
    });
  }

  return (await findFormById(id))!;
}

// ─── Delivery lifecycle ───────────────────────────────────────────────────────

export async function acknowledgeDelivery(id: string, acknowledgedBy: string): Promise<void> {
  const form = await findFormById(id);
  if (!form) throw createError(404, 'Form not found.');
  if (form.delivery_status === 'Acknowledged' || form.delivery_status === 'Completed') {
    throw createError(409, 'Form has already been acknowledged.');
  }
  const currentDetails = (form.form_details ?? {}) as Record<string, unknown>;
  await updateForm(id, {
    delivery_status: 'Acknowledged',
    form_details: {
      ...currentDetails,
      _acknowledged: { by: acknowledgedBy, on: new Date().toISOString() },
    },
  });

  const campaign = await findCampaignById(form.campaign_id);
  if (campaign) {
    await notifyFormAcknowledged(
      {
        formType: form.form_type,
        campaignDisplayId: campaign.campaign_id,
        campaignUuid: campaign.id,
      },
      campaign.owner_user_id,
      campaign.unit,
    );
  }
}

export async function markDelivered(
  id: string,
  completedBy: string,
  note?: string,
  evidence?: OneDriveFile[],
): Promise<void> {
  const form = await findFormById(id);
  if (!form) throw createError(404, 'Form not found.');
  if (form.delivery_status !== 'Acknowledged') {
    throw createError(409, 'Form must be acknowledged before marking as completed.');
  }
  const currentDetails = (form.form_details ?? {}) as Record<string, unknown>;
  await updateForm(id, {
    delivery_status: 'Completed',
    form_details: {
      ...currentDetails,
      _completion: {
        completedBy,
        completedOn: new Date().toISOString(),
        ...(note ? { note } : {}),
        ...(evidence ? { evidence } : {}),
      },
    },
  });

  const campaign = await findCampaignById(form.campaign_id);
  if (campaign) {
    await notifyFormCompleted(
      {
        formType: form.form_type,
        campaignDisplayId: campaign.campaign_id,
        campaignUuid: campaign.id,
        completedBy,
        evidence: evidence ?? null,
      },
      campaign.owner_user_id,
      campaign.unit,
    );
  }
}

// ─── Session / details update ─────────────────────────────────────────────────

export async function updateFormDetails(
  id: string,
  details: Record<string, unknown>,
): Promise<FormRow> {
  const form = await findFormById(id);
  if (!form) throw createError(404, 'Form not found.');

  const merged = { ...(form.form_details ?? {}), ...details };
  await updateForm(id, { form_details: merged });

  const isTestOrder = FORM_TITLE_TO_KEY[form.form_type] === 'test-order';
  if (isTestOrder && 'testingSessions' in details) {
    const sessions = details.testingSessions;
    const sessionCount = Array.isArray(sessions) ? sessions.length : 0;
    const campaign = await findCampaignById(form.campaign_id);
    const baseSessionData = {
      campaignDisplayId: campaign?.campaign_id ?? form.campaign_id,
      campaignUuid: form.campaign_id,
      sessionCount,
      formId: id,
      formDetails: merged as Record<string, unknown>,
    };
    await notifyTestSessionsUpdated(
      { ...baseSessionData, viewUrl: formUrl(form.operations_team, id) },
      form.operations_team,
    );
    const scalingActive = await hasActiveHandoffToTeam(id, 'Tech');
    if (scalingActive) {
      await notifyResourceScalingSessionsUpdated({
        ...baseSessionData,
        viewUrl: handoffUrl('Tech', id),
      });
    }
  }

  return (await findFormById(id))!;
}

// ─── Handoff lifecycle ────────────────────────────────────────────────────────

export async function sendHandoff(
  id: string,
  toTeam: string,
  sentBy: string,
  attachment?: OneDriveFile[],
): Promise<void> {
  const form = await findFormById(id);
  if (!form) throw createError(404, 'Form not found.');
  if (form.delivery_status === 'Submitted') {
    throw createError(409, 'Form must be delivered before a handoff can be sent.');
  }

  const alreadyActive = await hasActiveHandoffToTeam(id, toTeam);
  if (alreadyActive) {
    throw createError(409, `An active handoff to "${toTeam}" already exists for this form.`);
  }

  await createHandoff({
    id: randomUUID(),
    form_id: id,
    team: toTeam,
    status: 'Pending',
    sent_by: sentBy,
    sent_at: new Date(),
    auto: 0,
    attachment: attachment ?? null,
    reminders_sent: [],
  });

  const campaign = await findCampaignById(form.campaign_id);
  await notifyHandoffSent(
    {
      formType: form.form_type,
      campaignDisplayId: campaign?.campaign_id ?? form.campaign_id,
      campaignUuid: form.campaign_id,
      fromTeam: form.operations_team,
      formId: id,
      attachment: attachment ?? null,
    },
    toTeam,
  );
}

export async function acknowledgeHandoff(handoffId: string, acknowledgedBy: string): Promise<void> {
  const handoff = await findHandoffById(handoffId);
  if (!handoff) throw createError(404, 'Handoff not found.');
  if (handoff.status !== 'Pending') {
    throw createError(409, `Cannot acknowledge: handoff status is "${handoff.status}".`);
  }
  await updateHandoff(handoffId, {
    status: 'Acknowledged',
    acknowledged_by: acknowledgedBy,
    acknowledged_at: new Date(),
  });

  const form = await findFormById(handoff.form_id);
  if (!form) return;
  const campaign = await findCampaignById(form.campaign_id);
  if (!campaign) return;

  await notifyHandoffAcknowledged(
    {
      formType: form.form_type,
      campaignDisplayId: campaign.campaign_id,
      campaignUuid: campaign.id,
      acknowledgedBy,
      toTeam: handoff.team,
      formId: form.id,
    },
    form.operations_team,
    campaign.owner_user_id,
  );
}

export async function completeHandoff(
  handoffId: string,
  completedBy: string,
  report?: OneDriveFile[],
): Promise<void> {
  const handoff = await findHandoffById(handoffId);
  if (!handoff) throw createError(404, 'Handoff not found.');
  if (handoff.status !== 'Pending' && handoff.status !== 'Acknowledged') {
    throw createError(409, `Cannot complete: handoff status is "${handoff.status}".`);
  }

  await updateHandoff(handoffId, {
    status: 'Completed',
    completed_by: completedBy,
    completed_at: new Date(),
    report: report ?? null,
  });

  const form = await findFormById(handoff.form_id);
  const campaign = form ? await findCampaignById(form.campaign_id) : null;
  if (campaign) {
    if (handoff.auto === 1) {
      await notifyResourceScalingCompleted(
        {
          campaignDisplayId: campaign.campaign_id,
          campaignUuid: campaign.id,
          completedBy,
          report: report ?? null,
        },
        campaign.owner_user_id,
      );
    } else {
      await notifyHandoffCompleted(
        {
          formType: form!.form_type,
          campaignDisplayId: campaign.campaign_id,
          campaignUuid: campaign.id,
          completedBy,
          report: report ?? null,
        },
        campaign.owner_user_id,
        form!.operations_team,
      );
    }
  }
}

// ─── Read helpers (used by Operations page) ───────────────────────────────────

export { findFormsByCampaign, findFormsByOpsTeam, findHandoffsByTeam };
