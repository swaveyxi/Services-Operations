// Real accessors — call this app's own /api/atlas/* proxy (see
// server/src/services/atlas.service.ts), which resolves this app's campaign
// id to Core Atlas's own id and reshapes the response into this app's
// snake_case convention. There is no more mock data behind these.
import { api } from '@/services/api';
import type { AtlasCampaign, PipelineStage } from '../types';

export async function getCampaign(id: string): Promise<AtlasCampaign> {
  const res = await api.get(`/atlas/campaigns/${id}`);
  return res.json();
}

export async function getPipelineStages(id: string): Promise<PipelineStage[]> {
  const res = await api.get(`/atlas/campaigns/${id}/stages`);
  return res.json();
}
