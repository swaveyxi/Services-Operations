import type { Campaign, LineItem } from '@shared/types';
import { api } from './api';

export async function listCampaigns(): Promise<Campaign[]> {
  const res = await api.get('/campaigns?scope=all');
  return res.json();
}

export async function listMyCampaigns(): Promise<Campaign[]> {
  const res = await api.get('/campaigns');
  return res.json();
}

export async function listUnitCampaigns(): Promise<Campaign[]> {
  const res = await api.get('/campaigns?scope=unit');
  return res.json();
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const res = await api.get(`/campaigns/${id}`).catch(() => null);
  if (!res) return null;
  return res.json();
}

export async function getCampaignByBusinessId(campaignId: string): Promise<Campaign | null> {
  const res = await api.get('/campaigns?scope=all');
  const data: Campaign[] = await res.json();
  return data.find((c) => c.campaign_id === campaignId) ?? null;
}

export type CreateCampaignInput = {
  unit: string;
  name: string;
  client_id?: string | null;
  description?: string | null;
  revenue_items?: LineItem[];
  cost_items?: LineItem[];
};

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const res = await api.post('/campaigns', {
    unit: input.unit,
    name: input.name,
    client_id: input.client_id ?? null,
    description: input.description ?? null,
    revenue_items: input.revenue_items ?? [],
    cost_items: input.cost_items ?? [],
  });
  return res.json();
}

export async function updateCampaign(id: string, patch: Partial<Campaign>): Promise<Campaign> {
  if (patch.revenue_items !== undefined || patch.cost_items !== undefined) {
    await api.patch(`/campaigns/${id}`, {
      revenue_items: patch.revenue_items ?? [],
      cost_items: patch.cost_items ?? [],
    });
  }
  if (patch.client_id !== undefined) {
    await api.patch(`/campaigns/${id}`, { client_id: patch.client_id ?? null });
  }
  return (await getCampaign(id))!;
}

export async function listPendingApprovals(): Promise<Campaign[]> {
  const res = await api.get('/approvals');
  return res.json();
}

export async function approveCampaign(id: string, note?: string): Promise<Campaign> {
  await api.post(`/approvals/${id}/approve`, { note });
  return (await getCampaign(id))!;
}

export async function rejectCampaign(id: string, note: string): Promise<Campaign> {
  await api.post(`/approvals/${id}/reject`, { note });
  return (await getCampaign(id))!;
}

export async function listArchivedCampaigns(): Promise<Campaign[]> {
  const res = await api.get('/campaigns/archived');
  return res.json();
}

export async function archiveCampaign(id: string): Promise<void> {
  await api.post(`/campaigns/${id}/archive`, {});
}

export async function unarchiveCampaign(id: string): Promise<void> {
  await api.post(`/campaigns/${id}/unarchive`, {});
}

export async function deleteCampaign(id: string): Promise<void> {
  await api.del(`/campaigns/${id}`);
}
