import type { SupportForm, OneDriveFile } from '@shared/types';
import { api } from './api';

export async function listFormsForCampaign(campaignId: string): Promise<SupportForm[]> {
  const res = await api.get(`/campaigns/${campaignId}/forms`);
  return res.json();
}

export async function listAllForms(): Promise<SupportForm[]> {
  const res = await api.get('/forms');
  return res.json();
}

export async function getFormById(id: string): Promise<SupportForm | null> {
  const res = await api.get(`/forms/${id}`).catch(() => null);
  if (!res) return null;
  return res.json();
}

export async function listFormsForTeams(teams: string[]): Promise<SupportForm[]> {
  const results = await Promise.all(
    teams.map(async (teamKey) => {
      const res = await api.get(`/teams/${teamKey}/forms`);
      const data: SupportForm[] = await res.json();
      return data;
    }),
  );
  return results.flat().sort((a, b) => {
    const ax = Date.parse(a.submitted_on ?? '') || 0;
    const bx = Date.parse(b.submitted_on ?? '') || 0;
    return bx - ax;
  });
}

export type CreateFormInput = {
  campaign_id: string;
  form_type: string;
  operations_team: string;
  form_details: Record<string, unknown>;
};

export async function createForm(input: CreateFormInput): Promise<SupportForm> {
  const res = await api.post('/forms', {
    campaign_id: input.campaign_id,
    form_type: input.form_type,
    operations_team: input.operations_team,
    form_details: input.form_details,
  });
  return res.json();
}

export async function completeForm(
  id: string,
  _completedBy: string,
  note: string,
  evidence: OneDriveFile[] | null,
): Promise<SupportForm> {
  await api.patch(`/forms/${id}`, {
    action: 'deliver',
    ...(note.trim() ? { note: note.trim() } : {}),
    ...(evidence && evidence.length ? { evidence } : {}),
  });
  return (await getFormById(id))!;
}

export async function handoffForm(
  id: string,
  _by: string,
  toTeam: string,
  attachment: OneDriveFile[] | null,
): Promise<SupportForm> {
  await api.patch(`/forms/${id}`, { action: 'handoff', handoff_team: toTeam, attachment });
  return (await getFormById(id))!;
}

export async function acknowledgeHandoff(formId: string, handoffId: string): Promise<SupportForm> {
  await api.patch(`/forms/${formId}`, { action: 'acknowledge-handoff', handoff_id: handoffId });
  return (await getFormById(formId))!;
}

export async function completeHandoff(
  formId: string,
  handoffId: string,
  report: OneDriveFile[] | null,
): Promise<SupportForm> {
  await api.patch(`/forms/${formId}`, { action: 'complete-handoff', handoff_id: handoffId, report });
  return (await getFormById(formId))!;
}

export async function listHandoffsForTeam(teamName: string): Promise<SupportForm[]> {
  const res = await api.get(`/teams/${teamName}/handoffs`);
  return res.json();
}

export async function updateFormDetails(id: string, form_details: Record<string, unknown>): Promise<SupportForm> {
  await api.patch(`/forms/${id}`, { form_details });
  return (await getFormById(id))!;
}

export async function updateFormStatus(_id: string, _status: string): Promise<SupportForm> {
  return (await getFormById(_id))!;
}

export async function acknowledgeForm(id: string, _by: string): Promise<SupportForm> {
  await api.patch(`/forms/${id}`, { action: 'acknowledge' });
  return (await getFormById(id))!;
}
