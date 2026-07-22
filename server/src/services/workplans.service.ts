import createError from 'http-errors';
import { randomUUID } from 'node:crypto';
import {
  findWorkplanById,
  findWorkplansByCampaign,
  createWorkplan,
  updateWorkplan,
  deleteWorkplan,
  type WorkplanRow,
  type WorkplanInsert,
} from '../models/workplans';
import { findCampaignById, updateCampaign } from '../models/campaigns';
import { findUserById } from '../models/users';
import {
  notifyWorkplanSubmitted,
  notifyWorkplanResubmitted,
  notifyWorkplanAmended,
  notifyWorkplanAccepted,
} from './email.service';
import { submitForApproval } from './campaigns.service';
import { getOpsTeam } from '../../../shared/constants';

// ─── Aggregate status ─────────────────────────────────────────────────────────
// Priority: Amended > Pending Review > Draft > Submitted > Accepted

const STATUS_PRIORITY: Record<WorkplanRow['status'], number> = {
  Amended: 5,
  'Pending Review': 4,
  Draft: 3,
  Submitted: 2,
  Accepted: 1,
};

export function aggregateWorkplanStatus(workplans: WorkplanRow[]): WorkplanRow['status'] {
  if (!workplans.length) return 'Draft';
  return workplans.reduce((highest, wp) =>
    STATUS_PRIORITY[wp.status] > STATUS_PRIORITY[highest.status] ? wp : highest,
  ).status;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateWorkplanInput = Omit<WorkplanInsert, 'id'>;

export async function createConfiguredWorkplan(input: CreateWorkplanInput): Promise<WorkplanRow> {
  const campaign = await findCampaignById(input.campaign_id);
  if (!campaign) throw createError(404, 'Campaign not found.');

  const id = randomUUID();
  await createWorkplan({ ...input, id });

  if (campaign.campaign_status === 'Draft') {
    await updateCampaign(campaign.id, { campaign_status: 'Workplan' });
  }

  return (await findWorkplanById(id))!;
}

// ─── Submit / Resubmit ────────────────────────────────────────────────────────

export async function submitWorkplan(id: string): Promise<void> {
  const wp = await findWorkplanById(id);
  if (!wp) throw createError(404, 'Workplan not found.');
  if (wp.status !== 'Draft' && wp.status !== 'Amended') {
    throw createError(409, `Cannot submit a workplan with status "${wp.status}".`);
  }

  const isResubmit = wp.status === 'Amended';
  await updateWorkplan(id, { status: 'Submitted' });

  const campaign = await findCampaignById(wp.campaign_id);
  if (campaign && campaign.campaign_status === 'Workplan') {
    await updateCampaign(wp.campaign_id, { campaign_status: 'Profitability' });
    await submitForApproval(wp.campaign_id);
  }

  const opsTeamName = getOpsTeam(wp.template_name);
  const ownerName = campaign
    ? ((await findUserById(campaign.owner_user_id))?.name ?? 'Case Owner')
    : 'Case Owner';
  const base = {
    templateName: wp.template_name,
    campaignDisplayId: campaign?.campaign_id ?? wp.campaign_id,
    campaignUuid: wp.campaign_id,
    ownerName,
  };

  if (isResubmit) {
    await notifyWorkplanResubmitted(base, opsTeamName);
  } else {
    await notifyWorkplanSubmitted(base, opsTeamName);
  }
}

// ─── Accept (ops) ─────────────────────────────────────────────────────────────

export async function acceptWorkplan(id: string): Promise<void> {
  const wp = await findWorkplanById(id);
  if (!wp) throw createError(404, 'Workplan not found.');
  if (!['Submitted', 'Pending Review', 'Amended'].includes(wp.status)) {
    throw createError(409, `Cannot accept a workplan with status "${wp.status}".`);
  }

  await updateWorkplan(id, { status: 'Accepted' });

  const campaign = await findCampaignById(wp.campaign_id);
  if (campaign) {
    const opsTeamName = getOpsTeam(wp.template_name);
    await notifyWorkplanAccepted(
      {
        templateName: wp.template_name,
        campaignDisplayId: campaign.campaign_id,
        campaignUuid: campaign.id,
        teamName: opsTeamName,
      },
      campaign.owner_user_id,
    );
  }
}

// ─── Amend (ops counter) ──────────────────────────────────────────────────────

export type AmendWorkplanInput = {
  activities?: WorkplanRow['activities'];
  ops_start_date?: WorkplanRow['ops_start_date'];
  ops_end_date?: WorkplanRow['ops_end_date'];
};

export async function amendWorkplan(id: string, data: AmendWorkplanInput): Promise<void> {
  const wp = await findWorkplanById(id);
  if (!wp) throw createError(404, 'Workplan not found.');
  if (wp.status !== 'Submitted' && wp.status !== 'Pending Review') {
    throw createError(409, `Cannot amend a workplan with status "${wp.status}".`);
  }

  await updateWorkplan(id, { status: 'Amended', ...data });

  const campaign = await findCampaignById(wp.campaign_id);
  if (campaign) {
    const opsTeamName = getOpsTeam(wp.template_name);
    await notifyWorkplanAmended(
      {
        templateName: wp.template_name,
        campaignDisplayId: campaign.campaign_id,
        campaignUuid: campaign.id,
        teamName: opsTeamName,
      },
      campaign.owner_user_id,
    );
  }
}

// ─── Update (draft edits) ─────────────────────────────────────────────────────

export async function updateWorkplanDraft(
  id: string,
  data: Partial<Pick<WorkplanRow, 'activities' | 'ops_start_date' | 'ops_end_date' | 'template_name'>>,
): Promise<void> {
  const wp = await findWorkplanById(id);
  if (!wp) throw createError(404, 'Workplan not found.');
  if (wp.status === 'Accepted') {
    throw createError(409, 'Accepted workplans cannot be edited.');
  }
  await updateWorkplan(id, data);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function removeWorkplan(id: string): Promise<void> {
  const wp = await findWorkplanById(id);
  if (!wp) throw createError(404, 'Workplan not found.');
  if (wp.status === 'Accepted') {
    throw createError(409, 'Accepted workplans cannot be deleted.');
  }
  await deleteWorkplan(id);
}
