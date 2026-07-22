import type { Activity, ConfiguredWorkplan } from '@shared/types';
import { api } from './api';
import { getWorkplanTemplates } from './catalog';

export { getWorkplanTemplates as getTemplates };

export async function listWorkplansForCampaign(campaignId: string): Promise<ConfiguredWorkplan[]> {
  const res = await api.get(`/campaigns/${campaignId}/workplans`);
  return res.json();
}

export async function listAllWorkplans(): Promise<ConfiguredWorkplan[]> {
  const res = await api.get('/workplans');
  return res.json();
}

export type WorkplanInput = {
  template_id: string;
  template_name: string;
  activities: Activity[];
};

/* Upsert workplans for a campaign: patch existing, create new, delete deselected.
   Accepted workplans are never touched. */
export async function saveWorkplans(
  campaignId: string,
  items: WorkplanInput[],
  submit: boolean,
  _submitter?: { name: string; email: string },
): Promise<ConfiguredWorkplan[]> {
  const res = await api.get(`/campaigns/${campaignId}/workplans`);
  const existing: ConfiguredWorkplan[] = await res.json();
  const existingByTemplateId = new Map(existing.map((w) => [w.template_id, w]));
  const keepIds = new Set(items.map((i) => i.template_id));

  // Delete deselected (skip Accepted)
  await Promise.all(
    existing
      .filter((w) => !keepIds.has(w.template_id) && w.status !== 'Accepted')
      .map((w) => api.del(`/workplans/${w.id}`)),
  );

  // Create or update
  for (const item of items) {
    const cur = existingByTemplateId.get(item.template_id);
    if (cur?.status === 'Accepted') continue;

    if (cur) {
      await api.patch(`/workplans/${cur.id}`, { activities: item.activities });
      if (submit && (cur.status === 'Draft' || cur.status === 'Amended')) {
        await api.patch(`/workplans/${cur.id}`, { action: 'submit' });
      }
    } else {
      const createRes = await api.post('/workplans', {
        campaign_id: campaignId,
        template_id: item.template_id,
        template_name: item.template_name,
        activities: item.activities,
      });
      if (submit) {
        const created: ConfiguredWorkplan = await createRes.json();
        await api.patch(`/workplans/${created.id}`, { action: 'submit' });
      }
    }
  }

  const final = await api.get(`/campaigns/${campaignId}/workplans`);
  return final.json();
}

export async function acceptWorkplans(workplanIds: string[]): Promise<void> {
  await Promise.all(workplanIds.map((id) => api.patch(`/workplans/${id}`, { action: 'accept' })));
}

export async function amendWorkplan(
  id: string,
  activities: Activity[],
  changed: boolean,
): Promise<void> {
  if (changed) {
    await api.patch(`/workplans/${id}`, { action: 'amend', activities });
  } else {
    await api.patch(`/workplans/${id}`, { activities });
  }
}
